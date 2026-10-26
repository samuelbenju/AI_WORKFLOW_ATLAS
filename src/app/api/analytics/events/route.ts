import {NextResponse} from 'next/server';
import {adminApi,readJson} from '@/server/auth/request';
import {checkTrackingOrigin,recordBrowserEvent,trackingContext,cookieNames,trackingOrigin} from '@/server/growth/tracking';
export async function POST(request:Request){return adminApi(async()=>{checkTrackingOrigin(request);const result=await recordBrowserEvent(request,await readJson(request,1500));const response=NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});const context=trackingContext(request);if(result.recorded&&context)response.cookies.set(cookieNames.session,context.token,{httpOnly:true,secure:trackingOrigin().startsWith('https:'),sameSite:'lax',path:'/',maxAge:1800});return response;});}
