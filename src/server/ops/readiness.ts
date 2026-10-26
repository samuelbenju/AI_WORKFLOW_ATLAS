import 'server-only';
import {timingSafeEqual} from 'node:crypto';
import type {PrismaClient} from '@/generated/prisma/client';
import {getDatabase} from '@/server/db/client';
import {databaseOperation} from '@/server/db/diagnostics';
import {homeCatalog,queryTools,queryWorkflows,getCatalogFacets} from '@/server/data/public-catalog';
export function monitorAuthorized(request:Request){const secret=process.env.OPS_MONITOR_TOKEN??'',provided=request.headers.get('authorization')??'';if(secret.length<32||provided.length>600)return false;const a=Buffer.from('Bearer '+secret),b=Buffer.from(provided);return a.length===b.length&&timingSafeEqual(a,b);}
export async function readiness(database?:PrismaClient,options:{catalog?:boolean}={}){
 const db=await databaseOperation('readiness.connection',async()=>{const client=database??getDatabase();await client.$queryRaw`SELECT 1`;return client;});
 // Opt-in deep probe uses the runtime role and actual public queries, without writes.
 if(options.catalog){
  const query={q:'',sort:'recent' as const,page:1};
  await homeCatalog('published',db);
  await queryTools(query,'published',db);
  await queryWorkflows(query,'published',db);
  await getCatalogFacets('tools','published',db);
  await getCatalogFacets('use-cases','published',db);
 }
 return databaseOperation('readiness.alerts',async()=>{
  const expected=process.env.OPS_EXPECT_WORKER==='true',worker=await db.agentWorkerHeartbeat.findUnique({where:{id:process.env.OPS_WORKER_ID??'docker-local'},select:{lastSeenAt:true,status:true}}),fresh=!!worker&&Date.now()-worker.lastSeenAt.getTime()<60000&&worker.status!=='ERROR';
  const alerts={staleWorker:expected&&!fresh,expiredLeases:await db.agentTask.count({where:{status:'RUNNING',leaseExpiresAt:{lte:new Date()}}}),uncertainEmail:await db.newsletterDelivery.count({where:{status:'UNKNOWN',attemptedAt:{lt:new Date(Date.now()-60000)}}}),productionPaymentsOnHold:await db.paymentOrder.count({where:{environment:'PRODUCTION',fulfillmentStatus:'ON_HOLD'}})};
  return {ok:!alerts.staleWorker&&!alerts.expiredLeases&&!alerts.uncertainEmail&&!alerts.productionPaymentsOnHold,database:true,catalogVerified:options.catalog===true,worker:{expected,fresh:expected?fresh:null},alerts};
 });
}
