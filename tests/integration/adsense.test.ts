import { after, test } from "node:test";
import { strict as assert } from "node:assert";
import { createDatabaseClient } from "../../src/server/db/client";
import { readAdsenseReport } from "../../src/server/growth/adsense";
import { dateRange } from "../../src/lib/growth";
import { AccessError } from "../../src/server/auth/policy";

if (!/^\/atlas_run_[a-f0-9]{16}_test$/.test(new URL(process.env.DATABASE_URL!).pathname)) throw new Error("Use the isolated test runner");
const db = createDatabaseClient(process.env.DATABASE_URL!);
const users: string[] = [];
after(async () => { await db.auditLog.deleteMany({ where: { actorId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect(); });
async function actor(role: "OWNER" | "EDITOR") {
  const row = await db.user.create({ data: { email: `${role.toLowerCase()}-adsense@fixture.invalid`, role, active: true } }); users.push(row.id); return row.id;
}
async function configured(callback: () => Promise<void>) {
  const values = { ADSENSE_PUBLISHER_ID: "ca-pub-1234567890123456", ADSENSE_REPORT_ACCESS_TOKEN: "isolated-fixture-token", SITE_URL: "https://atlas.example" };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  try { await callback(); } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
}
function fixture() {
  const { start } = dateRange(30);
  return { headers: [{ name: "DATE", type: "DIMENSION" }, { name: "ESTIMATED_EARNINGS", type: "METRIC_CURRENCY", currencyCode: "USD" }],
    rows: [{ cells: [{ value: start.toISOString().slice(0, 10) }, { value: "12.345678" }] }], totalMatchedRows: "1", totals: { cells: [{ value: "" }, { value: "12.345678" }] } };
}
test("AdSense reads require a fresh administrator and explicit private report configuration", async () => {
  const owner = await actor("OWNER"), editor = await actor("EDITOR");
  await assert.rejects(readAdsenseReport(editor, { days: 30 }, db), { status: 403 });
  const previous = process.env.ADSENSE_REPORT_ACCESS_TOKEN; delete process.env.ADSENSE_REPORT_ACCESS_TOKEN;
  try { await assert.rejects(readAdsenseReport(owner, { days: 30 }, db), { status: 503 }); }
  finally { if (previous !== undefined) process.env.ADSENSE_REPORT_ACCESS_TOKEN = previous; }
});
test("official report fixture is domain-scoped, read-only, audited and separate from confirmed revenue", async () => configured(async () => {
  const before = { orders: await db.paymentOrder.count(), conversions: await db.affiliateConversion.count(), snapshots: await db.analyticsExternalSnapshot.count() };
  let calls = 0;
  const report = await readAdsenseReport(users[0]!, { days: 30 }, db, async (input, init) => {
    calls++; const url = new URL(String(input)); assert.equal(url.origin, "https://adsense.googleapis.com");
    assert.equal(url.pathname, "/v2/accounts/pub-1234567890123456/reports:generate");
    assert.equal(url.searchParams.get("filters"), "DOMAIN_NAME==atlas.example");
    assert.equal(url.searchParams.get("metrics"), "ESTIMATED_EARNINGS");
    assert.deepEqual(url.searchParams.getAll('metrics'),['ESTIMATED_EARNINGS','PAGE_VIEWS','IMPRESSIONS','CLICKS','PAGE_VIEWS_RPM','PAGE_VIEWS_CTR','AD_REQUESTS_COVERAGE']);
    assert.equal(url.searchParams.get("reportingTimeZone"), "ACCOUNT_TIME_ZONE");
    assert.ok(!url.search.includes("isolated-fixture-token")); assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer isolated-fixture-token");
    return Response.json(fixture());
  });
  assert.equal(calls, 1); assert.equal(report.totalEstimatedEarnings, "12.345678"); assert.equal(report.hostname, "atlas.example");
  assert.equal(report.source, "ADSENSE_MANAGEMENT_API_V2"); assert.equal((await db.auditLog.count({ where: { action: "growth.adsense_report_read" } })), 1);
  assert.deepEqual({ orders: await db.paymentOrder.count(), conversions: await db.affiliateConversion.count(), snapshots: await db.analyticsExternalSnapshot.count() }, before);
}));
test("provider failures, truncation and mid-flight role revocation never create revenue or expose errors", async () => configured(async () => {
  const before = await db.auditLog.count({ where: { action: "growth.adsense_report_read" } });
  const safeError = (error: unknown) => error instanceof AccessError && error.status === 503 && !error.message.includes("isolated-fixture-token");
  await assert.rejects(readAdsenseReport(users[0]!, { days: 30 }, db, async () => new Response("private provider error isolated-fixture-token", { status: 401 })), safeError);
  await assert.rejects(readAdsenseReport(users[0]!, { days: 30 }, db, async () => Response.json({ ...fixture(), totalMatchedRows: "10" })), safeError);
  try {
    await assert.rejects(readAdsenseReport(users[0]!, { days: 30 }, db, async () => {
      await db.user.update({ where: { id: users[0] }, data: { active: false } }); return Response.json(fixture());
    }), { status: 401 });
  } finally { await db.user.update({ where: { id: users[0] }, data: { active: true } }); }
  assert.equal(await db.auditLog.count({ where: { action: "growth.adsense_report_read" } }), before);
}));
