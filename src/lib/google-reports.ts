import { z } from 'zod';
import { publicPath } from './growth';
export const googleDimensionSchema=z.enum(['date','channels','countries','devices','landing-pages','pages']);
export type GoogleDimension=z.infer<typeof googleDimensionSchema>;
export const googleDimensions={date:'date',channels:'sessionDefaultChannelGroup',countries:'country',devices:'deviceCategory','landing-pages':'landingPage',pages:'pagePath'} as const;
export const googleDimensionLabels:Record<GoogleDimension,string>={date:'Evolución diaria',channels:'Canales de adquisición',countries:'Países',devices:'Dispositivos','landing-pages':'Páginas de entrada',pages:'Páginas consultadas'};
export type Ga4MetricRow={date?:string;label?:string;users:number;sessions:number;pageViews:number;activeUsers:number|null};
export function parseGa4Report(input:unknown,dimension:GoogleDimension,from:string,to:string){
  const raw=z.object({rowCount:z.number().int().nonnegative().optional(),rows:z.array(z.object({
    dimensionValues:z.array(z.object({value:z.string().max(300)})).length(1),
    metricValues:z.array(z.object({value:z.string().regex(/^\d{1,16}$/)})).min(3).max(4),
  })).max(100).optional()}).parse(input);
  let excludedPaths=0;
  const rows=(raw.rows??[]).flatMap<Ga4MetricRow>(row=>{
    const values=row.metricValues.map(m=>Number(m.value));if(values.some(v=>!Number.isSafeInteger(v)))throw Error('GOOGLE_METRIC_RANGE');
    const metrics={users:values[0]!,sessions:values[1]!,pageViews:values[2]!,activeUsers:values[3]??null};
    const label=row.dimensionValues[0]!.value;
    if(dimension==='date'){
      if(!/^\d{8}$/.test(label))throw Error('GOOGLE_DATE');
      const date=`${label.slice(0,4)}-${label.slice(4,6)}-${label.slice(6)}`;
      if(Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<from||date>to)throw Error('GOOGLE_DATE');
      return [{date,...metrics}];
    }
    if(dimension==='pages'||dimension==='landing-pages'){
      const path=publicPath(label);if(!path){excludedPaths++;return [];}
      return [{label:path,...metrics}];
    }
    if(!label.trim()||/[\u0000-\u001f]/.test(label))throw Error('GOOGLE_LABEL');
    return [{label,...metrics}];
  });
  return {dimension,rows,excludedPaths,truncated:(raw.rowCount??0)>(raw.rows?.length??0),
    note:'GA4 property timezone. Unique users belong to each row, not a sum of period or cross-dimension unique users. Paths exclude queries and unrecognized/private pages. Reports reflect only provider data; server-only Measurement Protocol does not establish complete acquisition, geography or device attribution.'};
}
