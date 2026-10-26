import {NextResponse} from 'next/server';
import {z} from 'zod';
import {adminApi,readJson} from '@/server/auth/request';
import {analyticsEnabled,consentChoice,cookieNames,setConsent,checkTrackingOrigin,trackingOrigin} from '@/server/growth/tracking';
import {consentVersion} from '@/lib/growth';
import {googleStatus} from '@/server/growth/google';
const options=()=>({httpOnly:true,secure:trackingOrigin().startsWith('https:'),sameSite:'lax' as const,path:'/'});
export function GET(request:Request){const session=(request.headers.get('cookie')??'').split(';').some(s=>s.trim().startsWith(cookieNames.session+'='));return NextResponse.json({choice:consentChoice(request),enabled:analyticsEnabled(),hasSession:session,ga4Configured:googleStatus().ga4Collection.configured},{headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}});}
export async function POST(request:Request){return adminApi(async()=>{checkTrackingOrigin(request);const data=z.object({accept:z.boolean(),version:z.literal(consentVersion)}).strict().parse(await readJson(request,1000));const result=await setConsent(request,data.accept);const response=NextResponse.json({choice:result.choice,enabled:analyticsEnabled()},{headers:{'Cache-Control':'private, no-store'}});response.cookies.set(cookieNames.consent,`${consentVersion}:${result.choice==='accepted'?'yes':'no'}`,{...options(),maxAge:31536000});if('visitor' in result&&result.visitor&&result.token){response.cookies.set(cookieNames.visitor,result.visitor,{...options(),maxAge:2592000});response.cookies.set(cookieNames.session,result.token,{...options(),maxAge:1800});}else{for(const name of [cookieNames.visitor,cookieNames.session])response.cookies.set(name,'',{...options(),maxAge:0});}return response;});}
