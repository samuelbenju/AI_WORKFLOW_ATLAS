import { z } from "zod";

const decimal = z.string().regex(/^-?\d{1,16}(?:\.\d{1,6})?$/);
const row = z.object({ cells: z.array(z.object({ value: z.string().max(100) })).length(2) });
const reportSchema = z.object({
  headers: z.array(z.object({ name: z.string(), type: z.string(), currencyCode: z.string().optional() })).length(2),
  rows: z.array(row).max(90).optional(), totals: row.optional(),
  totalMatchedRows: z.string().regex(/^\d{1,10}$/), warnings: z.array(z.string()).max(30).optional(),
});
export function parseAdsenseReport(input: unknown, start: string, end: string) {
  const data = reportSchema.parse(input);
  if (data.headers[0]!.name !== "DATE" || data.headers[0]!.type !== "DIMENSION" || data.headers[1]!.name !== "ESTIMATED_EARNINGS" || data.headers[1]!.type !== "METRIC_CURRENCY") throw new Error("ADSENSE_REPORT_HEADERS");
  const currency = z.string().regex(/^[A-Z]{3}$/).parse(data.headers[1]!.currencyCode);
  const seen = new Set<string>();
  const rows = (data.rows ?? []).map(row => {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(row.cells[0]!.value);
    if (date < start || date > end || seen.has(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("ADSENSE_REPORT_DATE");
    seen.add(date);
    return { date, estimatedEarnings: decimal.parse(row.cells[1]!.value) };
  });
  if (Number(data.totalMatchedRows) !== rows.length) throw new Error("ADSENSE_REPORT_TRUNCATED");
  return { currency, rows, totalEstimatedEarnings: data.totals ? decimal.parse(data.totals.cells[1]!.value) : null, warningCount: data.warnings?.length ?? 0 };
}
