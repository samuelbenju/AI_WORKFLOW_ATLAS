import 'server-only';
import {timingSafeEqual} from 'node:crypto';
import type {PrismaClient} from '@/generated/prisma/client';
import {getDatabase} from '@/server/db/client';
export function monitorAuthorized(request:Request){const secret=process.env.OPS_MONITOR_TOKEN??'',provided=request.headers.get('authorization')??'';if(secret.length<32||provided.length>600)return false;const a=Buffer.from('Bearer '+secret),b=Buffer.from(provided);return a.length===b.length&&timingSafeEqual(a,b);}
export async function readiness(db:PrismaClient=getDatabase()){
 await db.$queryRaw`SELECT 1`;
 const expected=process.env.OPS_EXPECT_WORKER==='true',worker=await db.agentWorkerHeartbeat.findUnique({where:{id:process.env.OPS_WORKER_ID??'docker-local'},select:{lastSeenAt:true,status:true}}),fresh=!!worker&&Date.now()-worker.lastSeenAt.getTime()<60000&&worker.status!=='ERROR';
 const alerts={staleWorker:expected&&!fresh,expiredLeases:await db.agentTask.count({where:{status:'RUNNING',leaseExpiresAt:{lte:new Date()}}}),uncertainEmail:await db.newsletterDelivery.count({where:{status:'UNKNOWN',attemptedAt:{lt:new Date(Date.now()-60000)}}}),productionPaymentsOnHold:await db.paymentOrder.count({where:{environment:'PRODUCTION',fulfillmentStatus:'ON_HOLD'}})};
 return {ok:!alerts.staleWorker&&!alerts.expiredLeases&&!alerts.uncertainEmail&&!alerts.productionPaymentsOnHold,database:true,worker:{expected,fresh:expected?fresh:null},alerts};
}
