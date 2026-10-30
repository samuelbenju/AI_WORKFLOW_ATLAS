import { z } from 'zod';
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export function parseGscReport(input:unknown,from:string,to:string){
 day.parse(from);day.parse(to);if(from>to)throw Error('GSC_RANGE');
 const raw=z.object({rows:z.array(z.object({keys:z.array(day).length(1),clicks:z.number().int().nonnegative(),impressions:z.number().int().nonnegative(),ctr:z.number().finite().min(0).max(1),position:z.number().finite().nonnegative()})).max(100).optional()}).parse(input);
 const seen=new Set<string>();
 return (raw.rows??[]).map(r=>{const date=r.keys[0]!;if(date<from||date>to||seen.has(date)||r.clicks>r.impressions)throw Error('GSC_ROW_INVALID');seen.add(date);return {date,clicks:r.clicks,impressions:r.impressions,ctr:r.ctr,position:r.position};});
}
