import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { authorizeActor } from "@/server/admin/content";
import { AccessError } from "@/server/auth/policy";
import { rangeSchema, dateRange } from "@/lib/growth";
import { parseAdsenseReport,adsenseMetrics } from "@/lib/adsense-report";
import { parseSiteOrigin } from "@/lib/config/env";

export function adsenseReportsConfigured() {
  return /^ca-pub-\d{16}$/.test(process.env.ADSENSE_PUBLISHER_ID ?? "") && !!process.env.ADSENSE_REPORT_ACCESS_TOKEN;
}
export async function readAdsenseReport(userId: string, input: unknown, db: PrismaClient = getDatabase(), transport: typeof fetch = fetch) {
  const { days } = rangeSchema.parse(input);
  await authorizeActor(userId, "analytics", db);
  if (!adsenseReportsConfigured()) throw new AccessError(503, "AdSense: informes no configurados; no se consultó Google.");
  if (transport !== fetch && (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.endsWith("_test"))) throw new Error("Fixture transport requires isolated tests");
  const origin = new URL(parseSiteOrigin(process.env.SITE_URL));
  if (origin.protocol !== "https:" || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(origin.hostname) || origin.hostname.endsWith(".localhost")) throw new AccessError(503, "Origen público AdSense no configurado.");
  const { start, end } = dateRange(days), last = new Date(end.getTime() - 86400000);
  const from = start.toISOString().slice(0, 10), to = last.toISOString().slice(0, 10);
  const url = new URL(`https://adsense.googleapis.com/v2/accounts/${process.env.ADSENSE_PUBLISHER_ID!.slice(3)}/reports:generate`);
  url.searchParams.set("dateRange", "CUSTOM"); url.searchParams.set("dimensions", "DATE");
  for(const metric of adsenseMetrics)url.searchParams.append('metrics',metric);
  url.searchParams.set("orderBy", "+DATE");
  url.searchParams.set("reportingTimeZone", "ACCOUNT_TIME_ZONE"); url.searchParams.set("limit", "90");
  url.searchParams.set("filters", `DOMAIN_NAME==${origin.hostname}`);
  for (const [name, date] of [["startDate", start], ["endDate", last]] as const) {
    url.searchParams.set(`${name}.year`, String(date.getUTCFullYear()));
    url.searchParams.set(`${name}.month`, String(date.getUTCMonth() + 1)); url.searchParams.set(`${name}.day`, String(date.getUTCDate()));
  }
  let report: ReturnType<typeof parseAdsenseReport>;
  try {
    const response = await transport(url, { redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${process.env.ADSENSE_REPORT_ACCESS_TOKEN}` } });
    if (!response.ok) throw new Error("ADSENSE_REPORT_HTTP");
    const reader = response.body?.getReader(); if (!reader) throw new Error("ADSENSE_REPORT_EMPTY");
    let bytes = 0; const chunks: Uint8Array[] = [];
    for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > 128000) { await reader.cancel(); throw new Error("ADSENSE_REPORT_SIZE"); } chunks.push(part.value); }
    report = parseAdsenseReport(JSON.parse(Buffer.concat(chunks).toString("utf8")), from, to);
  } catch { throw new AccessError(503, "No se pudo validar el informe de AdSense. No se registraron ingresos ni ceros de sustitución."); }
  await db.$transaction(async tx => {
    await authorizeActor(userId, "analytics", tx);
    await tx.auditLog.create({ data: { actorId: userId, action: "growth.adsense_report_read", entityType: "ExternalReport", entityId: "adsense", metadata: { from, to, rows: report.rows.length } } });
  });
  return { ...report, from, to, hostname: origin.hostname, observedAt: new Date().toISOString(), source: "ADSENSE_MANAGEMENT_API_V2" as const, calendar: "ACCOUNT_TIME_ZONE" as const };
}
