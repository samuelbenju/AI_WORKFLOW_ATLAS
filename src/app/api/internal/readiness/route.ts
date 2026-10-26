import {monitorAuthorized,readiness} from '@/server/ops/readiness';
import {DatabaseOperationError} from '@/lib/database-diagnostics';
import {reportDatabaseError} from '@/server/db/diagnostics';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
export async function GET(request:Request){
 if(!monitorAuthorized(request))return Response.json({error:'Unauthorized'},{status:401,headers});
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const catalog=new URL(request.url).searchParams.get('catalog')==='1';
  const result=await Promise.race([readiness(undefined,{catalog}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DatabaseOperationError({stage:'readiness.timeout',codes:['READINESS_TIMEOUT']})),catalog?12000:4000);})]);
  return Response.json(result,{status:result.ok?200:503,headers});
 }catch(error){
  const diagnostic=reportDatabaseError('readiness.connection',error);
  return Response.json({ok:false,error:'READINESS_UNAVAILABLE',diagnostic},{status:503,headers});
 }finally{if(timer)clearTimeout(timer);}
}
