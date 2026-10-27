import { test } from "node:test";
import { strict as assert } from "node:assert";
import { advertisingConfiguration, advertisingConsent, advertisingPath, advertisingPurposes, adsTxt, type TcfData } from "../../src/lib/advertising";
import { parseAdsenseReport } from "../../src/lib/adsense-report";

// Synthetic identifiers are confined to tests; browser ad requests are stubbed.
const approved = {
  ADSENSE_ENABLED: "true", ADSENSE_PUBLISHER_ID: "ca-pub-1234567890123456", ADSENSE_SITE_APPROVED: "true", ADSENSE_CONSENT_READY: "true", ADSENSE_PLACEMENTS_REVIEWED: "true",
  ADSENSE_CMP_ID: "300", ADSENSE_CMP_SCRIPT_URL: "https://fundingchoicesmessages.google.com/i/pub-1234567890123456?ers=1",
  SITE_URL: "https://atlas.example", PUBLIC_LAUNCH_CONFIRMED: "true", SEO_INDEXING_ENABLED: "true", CATALOG_DEMO_MODE: "false",
  LEGAL_REVIEW_CONFIRMED: "true", LEGAL_EFFECTIVE_DATE: "2020-01-01", PUBLIC_OPERATOR_NAME: "Isolated operator",
  PUBLIC_OPERATOR_ADDRESS: "Isolated address", PUBLIC_CONTACT_EMAIL: "legal@fixture.invalid",
};
const consent = (): TcfData => ({ cmpId: 300, cmpStatus: "loaded", eventStatus: "useractioncomplete", gdprApplies: true,
  isServiceSpecific: true, tcString: "fixture-not-a-real-consent-string", vendor: { consents: { 755: true } },
  purpose: { consents: Object.fromEntries(advertisingPurposes.map(p => [p, true])) } });

test("ads require every release, approval and CMP gate; test configuration cannot serve ads", () => {
  assert.equal(advertisingConfiguration({}).ready, false); assert.equal(advertisingConfiguration(approved).ready, true);
  for (const change of [{ ADSENSE_ENABLED: "false" }, { ADSENSE_SITE_APPROVED: "false" }, { ADSENSE_CONSENT_READY: "false" },
    { ADSENSE_PLACEMENTS_REVIEWED: "false" }, { PUBLIC_LAUNCH_CONFIRMED: "false" }, { LEGAL_REVIEW_CONFIRMED: "false" }, { PUBLIC_CONTACT_EMAIL: "invalid" },
    { ADSENSE_PUBLISHER_ID: "invalid" }, { ADSENSE_CMP_ID: "0" }, { ADSENSE_MODE: "invented" },
    { ATLAS_ISOLATED_E2E: "true" }, { NODE_ENV: "test" }, { SITE_URL: "http://localhost:3000" }, { CATALOG_DEMO_MODE: "true" }]) {
    assert.equal(advertisingConfiguration({ ...approved, ...change }).ready, false, JSON.stringify(change));
  }
});
test("CMP and unit configuration cannot inject arbitrary scripts or another publisher", () => {
  for (const url of ["https://evil.invalid/i/pub-1234567890123456?ers=1", "https://fundingchoicesmessages.google.com/i/pub-0000000000000000?ers=1",
    approved.ADSENSE_CMP_SCRIPT_URL + "&token=private", approved.ADSENSE_CMP_SCRIPT_URL + "#fragment", "javascript:alert(1)"]) {
    assert.equal(advertisingConfiguration({ ...approved, ADSENSE_CMP_SCRIPT_URL: url }).ready, false);
  }
  assert.deepEqual(advertisingConfiguration({ ...approved, ADSENSE_SLOT_TOOLS: "1234567890", ADSENSE_SLOT_HOME: '1" onclick="attack' }).slots, { tools: "1234567890" });
});
test("CMP signals and explicit purposes/vendor consent are required; analytics acceptance is insufficient", () => {
  assert.equal(advertisingConsent(consent(), 300), true);
  for (const change of [{ cmpId: 999 }, { cmpStatus: "loading" }, { eventStatus: "cmpuishown" }, { gdprApplies: undefined },
    { gdprApplies: false }, { tcString: "" }, { isServiceSpecific: false }, { vendor: { consents: { 755: false } } }]) {
    assert.equal(advertisingConsent({ ...consent(), ...change }, 300), false);
  }
  for (const p of advertisingPurposes) {
    const data = consent(); data.purpose!.consents![p] = false; assert.equal(advertisingConsent(data, 300), false);
    for (const restriction of [0, 2]) assert.equal(advertisingConsent({ ...consent(), publisher: { restrictions: { [p]: { 755: restriction } } } }, 300), false);
  }
  for (const signals of [{ dnt: "1" }, { gpc: true }, { optedOut: true }]) assert.equal(advertisingConsent(consent(), 300, signals), false);
  assert.equal(advertisingConsent(undefined, 300), false);
});
test("ads are confined to content routes and ads.txt needs an approved publisher and public release", () => {
  for (const path of ["/", "/tools", "/use-cases", "/use-cases/a-guide", "/blog/a-reviewed-guide"]) assert.equal(advertisingPath(path), true);
  for (const path of ["/login", "/admin", "/admin/articles", "/api/health", "/payments/return", "/newsletter", "/sponsor", "/privacy", "/tools/a-short-listing", "/tools?q=example"]) assert.equal(advertisingPath(path), false);
  assert.equal(adsTxt({}), null); assert.equal(adsTxt({ ...approved, ADSENSE_SITE_APPROVED: "false" }), null);
  assert.equal(adsTxt({ ...approved, LEGAL_REVIEW_CONFIRMED: "false" }), null);
  assert.equal(adsTxt(approved), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
});
const report = () => ({ headers: [{ name: "DATE", type: "DIMENSION" }, { name: "ESTIMATED_EARNINGS", type: "METRIC_CURRENCY", currencyCode: "USD" }], totalMatchedRows: "1",
  rows: [{ cells: [{ value: "2026-01-10" }, { value: "123456789012345.123456" }] }], totals: { cells: [{ value: "" }, { value: "123456789012345.123456" }] } });
test("external estimates preserve decimals/currency and reject malformed or truncated provider reports", () => {
  const parsed = parseAdsenseReport(report(), "2026-01-01", "2026-01-31");
  assert.equal(parsed.totalEstimatedEarnings, "123456789012345.123456"); assert.equal(parsed.currency, "USD");
  const empty = parseAdsenseReport({ ...report(), rows: [], totals: undefined, totalMatchedRows: "0" }, "2026-01-01", "2026-01-31");
  assert.deepEqual(empty.rows, []); assert.equal(empty.totalEstimatedEarnings, null);
  for (const change of [{ totalMatchedRows: "2" }, { headers: [{ name: "DATE" }, { name: "REVENUE", currencyCode: "USD" }] },
    { rows: [{ cells: [{ value: "2026-02-10" }, { value: "1" }] }] }, { rows: [...report().rows, ...report().rows], totalMatchedRows: "2" },
    { totals: { cells: [{ value: "" }, { value: "NaN" }] } }]) assert.throws(() => parseAdsenseReport({ ...report(), ...change }, "2026-01-01", "2026-01-31"));
});
