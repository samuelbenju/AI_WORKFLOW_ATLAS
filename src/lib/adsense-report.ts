import { z } from "zod";

const decimal = z.string().regex(/^-?\d{1,16}(?:\.\d{1,6})?$/);
export const adsenseMetrics = ['ESTIMATED_EARNINGS','PAGE_VIEWS','IMPRESSIONS','CLICKS','PAGE_VIEWS_RPM','PAGE_VIEWS_CTR','AD_REQUESTS_COVERAGE'] as const;
export type AdsenseMetric = Exclude<typeof adsenseMetrics[number],'ESTIMATED_EARNINGS'>;
const types:Record<typeof adsenseMetrics[number],string>={ESTIMATED_EARNINGS:'METRIC_CURRENCY',PAGE_VIEWS:'METRIC_TALLY',IMPRESSIONS:'METRIC_TALLY',CLICKS:'METRIC_TALLY',PAGE_VIEWS_RPM:'METRIC_CURRENCY',PAGE_VIEWS_CTR:'METRIC_RATIO',AD_REQUESTS_COVERAGE:'METRIC_RATIO'};
const row = z.object({ cells: z.array(z.object({ value: z.string().max(100) })).min(2).max(8) });
const reportSchema = z.object({
  headers: z.array(z.object({ name: z.string(), type: z.string(), currencyCode: z.string().optional() })).min(2).max(8),
  rows: z.array(row).max(90).optional(), totals: row.optional(),
  totalMatchedRows: z.string().regex(/^\d{1,10}$/), warnings: z.array(z.string()).max(30).optional(),
});
export function parseAdsenseReport(input: unknown, start: string, end: string) {
  const data = reportSchema.parse(input);
  if (data.headers[0]!.name !== "DATE" || data.headers[0]!.type !== "DIMENSION" || data.headers[1]!.name !== "ESTIMATED_EARNINGS" || data.headers[1]!.type !== "METRIC_CURRENCY") throw new Error("ADSENSE_REPORT_HEADERS");
  const currency = z.string().regex(/^[A-Z]{3}$/).parse(data.headers[1]!.currencyCode);
  if(new Set(data.headers.map(h=>h.name)).size!==data.headers.length)throw Error('ADSENSE_REPORT_HEADERS');
  for(const header of data.headers.slice(1)){
    if(!Object.hasOwn(types,header.name)||types[header.name as keyof typeof types]!==header.type
      ||(header.type==='METRIC_CURRENCY'&&header.currencyCode!==currency))throw Error('ADSENSE_REPORT_HEADERS');
  }
  const metrics=(value:z.infer<typeof row>)=>{
    if(value.cells.length!==data.headers.length)throw Error('ADSENSE_REPORT_CELLS');
    const output:Partial<Record<AdsenseMetric,string>>={};
    for(let i=2;i<data.headers.length;i++){
      const header=data.headers[i]!,text=value.cells[i]!.value;
      output[header.name as AdsenseMetric]=header.type==='METRIC_TALLY'?z.string().regex(/^\d{1,16}$/).parse(text)
        :header.type==='METRIC_RATIO'?z.string().regex(/^(?:0(?:\.\d{1,18})?|1(?:\.0{1,18})?)$/).parse(text):decimal.parse(text);
    }
    return output;
  };
  const seen = new Set<string>();
  const rows = (data.rows ?? []).map(row => {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(row.cells[0]!.value);
    if (date < start || date > end || seen.has(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("ADSENSE_REPORT_DATE");
    seen.add(date);
    return { date, estimatedEarnings: decimal.parse(row.cells[1]!.value),metrics:metrics(row) };
  });
  if (Number(data.totalMatchedRows) !== rows.length) throw new Error("ADSENSE_REPORT_TRUNCATED");
  return { currency, rows, totalEstimatedEarnings: data.totals ? decimal.parse(data.totals.cells[1]!.value) : null,
    totalMetrics:data.totals?metrics(data.totals):null,warningCount: data.warnings?.length ?? 0 };
}
