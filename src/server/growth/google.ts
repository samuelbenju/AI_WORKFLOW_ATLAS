import "server-only";
import {z} from "zod";
import type {AnalyticsEvent,PrismaClient} from "@/generated/prisma/client";
import {site} from "@/lib/config/site";
import {AccessError} from "@/server/auth/policy";
import {googleDimensions,googleDimensionSchema,parseGa4Report,type GoogleDimension} from '@/lib/google-reports';
import {publicPath} from "@/lib/growth";
const measurement=()=>/^G-[A-Z0-9]{4,20}$/.test(process.env.GA4_MEASUREMENT_ID??'')?process.env.GA4_MEASUREMENT_ID!:null;
export function googleStatus(){return {ga4Collection:{configured:!!measurement()&&!!process.env.GA4_API_SECRET&&['validation','live'].includes(process.env.GA4_MODE??''),mode:process.env.GA4_MODE==='live'?'live':process.env.GA4_MODE==='validation'?'validation':'disabled'},ga4Reports:{configured:/^\d+$/.test(process.env.GA4_PROPERTY_ID??'')&&!!process.env.GA4_ACCESS_TOKEN},searchConsole:{configured:!!validSearchSite(process.env.GSC_SITE_URL??'')&&!!process.env.GSC_ACCESS_TOKEN}};}
export function validSearchSite(value:string){try{if(/^sc-domain:(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(value))return value;const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash?u.toString():null;}catch{return null;}}
function testTransport(transport:typeof fetch){if(transport!==fetch&&(!process.env.DATABASE_URL||!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')))throw new Error('Fake transports require isolated tests');}
export async function forwardGa4(db:PrismaClient,event:AnalyticsEvent,visitorHash:string,startedAt:Date,transport:typeof fetch=fetch){
 if(!googleStatus().ga4Collection.configured)return;testTransport(transport);
 const mark=await db.analyticsEvent.updateMany({where:{id:event.id,ga4Status:'NOT_CONFIGURED',session:{expiresAt:{gt:new Date()}}},data:{ga4Status:'PENDING',ga4UpdatedAt:new Date()}});if(!mark.count)return;
 const validation=process.env.GA4_MODE==='validation',url=new URL(validation?'https://www.google-analytics.com/debug/mp/collect':'https://www.google-analytics.com/mp/collect');url.searchParams.set('measurement_id',measurement()!);url.searchParams.set('api_secret',process.env.GA4_API_SECRET!);
 const names:Record<string,string>={PAGE_VIEW:'page_view',SEARCH:'atlas_search',TOOL_VIEW:'atlas_tool_view',CAMPAIGN_CLICK:'atlas_campaign_click',NEWSLETTER_SIGNUP:'atlas_newsletter_request',NEWSLETTER_CONFIRM:'sign_up',SPONSOR_REQUEST:'generate_lead',AFFILIATE_CLICK:'atlas_affiliate_click'};
 let state='UNKNOWN';try{const response=await transport(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(3000),headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:visitorHash,timestamp_micros:String(event.createdAt.getTime()*1000),consent:{ad_user_data:'DENIED',ad_personalization:'DENIED'},events:[{name:names[event.kind],params:{page_location:site.origin+event.path,page_referrer:'',session_id:Math.floor(startedAt.getTime()/1000)}}]})});if(!response.ok)state='FAILED';else if(validation){const result=z.object({validationMessages:z.array(z.unknown())}).parse(await response.json());state=result.validationMessages.length?'REJECTED':'VALIDATED_TEST';}else state='ACCEPTED_UNVERIFIED';}catch{state='UNKNOWN';}await db.analyticsEvent.updateMany({where:{id:event.id,ga4Status:'PENDING'},data:{ga4Status:state,ga4UpdatedAt:new Date()}});
}
async function boundedJson(response:Response){if(!response.ok)throw new AccessError(503,`Google respondió HTTP ${response.status}; no se importaron métricas.`);const reader=response.body?.getReader();if(!reader)throw new AccessError(503,'Respuesta Google vacía.');let size=0;const chunks:Uint8Array[]=[];for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>512000){await reader.cancel();throw new AccessError(503,'Respuesta Google demasiado grande.');}chunks.push(p.value);}return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}
export class GoogleReports {
 constructor(private transport:typeof fetch=fetch){}
 async read(provider:'GA4'|'GSC',start:Date,end:Date,dimension:GoogleDimension='date'){googleDimensionSchema.parse(dimension);testTransport(this.transport);const from=start.toISOString().slice(0,10),to=new Date(end.getTime()-86400000).toISOString().slice(0,10);let response:Response;
 if(provider==='GA4'){
  if(!googleStatus().ga4Reports.configured)throw new AccessError(503,'GA4: informes no configurados.');
  response=await this.transport(`https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${process.env.GA4_ACCESS_TOKEN}`,'Content-Type':'application/json'},
   body:JSON.stringify({dateRanges:[{startDate:from,endDate:to}],dimensions:[{name:googleDimensions[dimension]}],
    dimensionFilter:{filter:{fieldName:'hostName',stringFilter:{matchType:'EXACT',value:new URL(site.origin).hostname}}},
    metrics:[{name:'totalUsers'},{name:'sessions'},{name:'screenPageViews'},{name:'activeUsers'}],limit:100,
    orderBys:dimension==='date'?[{dimension:{dimensionName:'date'}}]:[{metric:{metricName:'screenPageViews'},desc:true}]}),
  });
  return {sourceRef:`properties/${process.env.GA4_PROPERTY_ID}`,data:{...parseGa4Report(await boundedJson(response),dimension,from,to),hostname:new URL(site.origin).hostname}};
 }
 if(dimension!=='date')throw new AccessError(400,'Search Console admite el informe diario de este módulo.');
 if(!googleStatus().searchConsole.configured)throw new AccessError(503,'Search Console: no configurado.');const source=validSearchSite(process.env.GSC_SITE_URL!)!;response=await this.transport(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(source)}/searchAnalytics/query`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${process.env.GSC_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({startDate:from,endDate:to,dimensions:['date'],rowLimit:100,dataState:'final'})});const raw=z.object({rows:z.array(z.object({keys:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).length(1),clicks:z.number().finite().nonnegative(),impressions:z.number().finite().nonnegative(),ctr:z.number().finite().min(0).max(1),position:z.number().finite().nonnegative()})).max(100).optional()}).parse(await boundedJson(response));return {sourceRef:source,data:{rows:(raw.rows??[]).map(r=>({date:r.keys[0]!,clicks:r.clicks,impressions:r.impressions,ctr:r.ctr,position:r.position})),note:'Search Console final daily data uses the provider PST date calendar, not the first-party UTC calendar; not interchangeable with consented visits.'}};
 }
}
export function cleanReportPath(value:string){try{return publicPath(new URL(value).pathname);}catch{return publicPath(value);}}
