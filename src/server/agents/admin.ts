import "server-only";
import {z} from "zod";
import type {PrismaClient,Prisma} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {authorizeActor} from "@/server/admin/content";
import {AccessError} from "@/server/auth/policy";
import {agentConfigSchema,taskSchema,configHash,allowedModels,secretLike} from "@/lib/agents";
import {aiConfigured,systemPolicy} from "./provider";
type Db=PrismaClient|Prisma.TransactionClient;
export async function engineLock(db:Db){await db.$executeRaw`SELECT pg_advisory_xact_lock(995901)`;}
export const globalBudget=()=>/^\d{1,12}$/.test(process.env.AGENTS_MONTHLY_BUDGET_USD_MICROS??"")?BigInt(process.env.AGENTS_MONTHLY_BUDGET_USD_MICROS!):0n;
export const concurrencyLimit=()=>Math.max(1,Math.min(8,Number(process.env.AGENTS_MAX_CONCURRENCY)||2));
export async function agentAudit(db:Db,userId:string|null,action:string,id:string){await db.auditLog.create({data:{actorId:userId,action:`agents.${action}`,entityType:"AgentTask",entityId:id}});}
export async function registerAnalyst(userId:string,db:PrismaClient=getDatabase()){
 return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);const row=await tx.agent.upsert({where:{identifier:"system-analyst"},update:{},create:{identifier:"system-analyst",name:"Analista de catálogo · controlado",role:"RESEARCHER",prompt:"Analyze only the supplied public catalog counts. Describe what is present, what is missing and the limits of this snapshot. Do not invent business metrics.",model:allowedModels()[0]??null,allowedTools:["catalog_summary"],enabled:false}});await agentAudit(tx,userId,"registered",row.id);return {id:row.id};});
}
export async function saveAgent(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);const data=agentConfigSchema.parse(input);if(!allowedModels().includes(data.model)||secretLike(data.prompt))throw new AccessError(422,"Modelo no permitido o instrucciones con posible secreto.");
 return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);const current=await tx.agent.findUniqueOrThrow({where:{id}});if(current.updatedAt.toISOString()!==data.expectedUpdatedAt)throw new AccessError(409,"El agente cambió. Recarga antes de guardar.");const {expectedUpdatedAt:_expected,...fields}=data;void _expected;await tx.agent.update({where:{id},data:{...fields,requiresApproval:true,promptVersion:{increment:1}}});if(!data.enabled)await tx.agentTask.updateMany({where:{agentId:id,status:"RUNNING"},data:{cancelRequestedAt:new Date()}});await agentAudit(tx,userId,"configuration_updated",id);return {saved:true};});
}
export async function createAgentTask(userId:string,input:unknown,db:PrismaClient=getDatabase(),trigger:"MANUAL"|"EVENT"="MANUAL"){
 const data=taskSchema.parse(input);return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);const existing=await tx.agentTask.findUnique({where:{idempotencyKey:data.idempotencyKey}});if(existing){if(existing.agentId!==data.agentId||existing.tokenBudget!==data.tokenBudget||existing.budgetUsdMicros!==data.budgetUsdMicros||existing.maxAttempts!==data.maxAttempts||existing.trigger!==trigger)throw new AccessError(409,"La clave ya se utilizó con otra tarea.");return {id:existing.id};}
 await tx.agent.findUniqueOrThrow({where:{id:data.agentId}});const row=await tx.agentTask.create({data:{...data,input:{kind:"CATALOG_ANALYSIS"},trigger,status:"AWAITING_APPROVAL",requiresApproval:true}});await agentAudit(tx,userId,"task_created",row.id);return {id:row.id};});
}
export async function taskAction(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);const data=z.object({action:z.enum(["approve","cancel","approve-result"]),confirmation:z.literal(true),budgetUsdMicros:z.string().regex(/^\d{1,12}$/).transform(BigInt).optional()}).strict().parse(input);
 return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);const task=await tx.agentTask.findUniqueOrThrow({where:{id},include:{agent:true}});
 if(data.action==="cancel"){if(["COMPLETED","FAILED","CANCELLED"].includes(task.status))throw new AccessError(409,"La tarea ya terminó.");await tx.agentTask.update({where:{id},data:{cancelRequestedAt:new Date(),...(task.status==="RUNNING"?{}:{status:"CANCELLED" as const})}});}
 else if(data.action==="approve-result"){if(task.status!=="COMPLETED")throw new AccessError(409,"No hay resultado completado que revisar.");await tx.agentTask.update({where:{id},data:{resultApprovedAt:new Date()}});}
 else{if(task.status!=="AWAITING_APPROVAL"||!task.agent.enabled||!task.agent.model||!allowedModels().includes(task.agent.model)||(data.budgetUsdMicros??task.budgetUsdMicros)<=0n||task.agent.monthlyBudgetUsdMicros<=0n||globalBudget()<=0n||task.agent.inputRateMicrosPerMillion<=0n||task.agent.outputRateMicrosPerMillion<=0n)throw new AccessError(422,"Revisa estado, agente habilitado, modelo, tarifas y límites globales/de tarea antes de aprobar consumo.");await tx.agentTask.update({where:{id},data:{status:"PENDING",budgetUsdMicros:data.budgetUsdMicros??task.budgetUsdMicros,approvedById:userId,approvedAt:new Date(),approvedConfigHash:configHash(task.agent),errorCode:null}});}
 await agentAudit(tx,userId,data.action,id);return {saved:true};});
}
export async function saveSchedule(userId:string,input:unknown,db:PrismaClient=getDatabase()){
 const data=z.object({agentId:z.uuid(),intervalSeconds:z.number().int().min(60).max(2592000),nextRunAt:z.iso.datetime(),enabled:z.boolean()}).strict().parse(input);return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);const existing=await tx.agentSchedule.count({where:{agentId:data.agentId}});if(existing>=10)throw new AccessError(422,"Máximo diez programaciones por agente.");const row=await tx.agentSchedule.create({data:{...data,nextRunAt:new Date(data.nextRunAt)}});await agentAudit(tx,userId,"schedule_created",row.id);return {id:row.id};});
}
export async function toggleSchedule(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);const {enabled}=z.object({enabled:z.boolean()}).strict().parse(input);return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);await tx.agentSchedule.update({where:{id},data:{enabled}});await agentAudit(tx,userId,"schedule_toggled",id);return {saved:true};});
}
export async function agentsOverview(userId:string,db:PrismaClient=getDatabase()){
 await authorizeActor(userId,"agents",db);const [agents,tasks,periods,workers,schedules]=await db.$transaction([db.agent.findMany({orderBy:{identifier:"asc"},take:100}),db.agentTask.findMany({include:{agent:{select:{name:true,identifier:true}},executions:{orderBy:{attempt:"desc"},take:3},drafts:{select:{id:true,title:true,status:true}}},orderBy:{createdAt:"desc"},take:100}),db.agentBudgetPeriod.findMany({orderBy:{key:"desc"},take:100}),db.agentWorkerHeartbeat.findMany({orderBy:{lastSeenAt:"desc"},take:20}),db.agentSchedule.findMany({include:{agent:{select:{name:true}}},orderBy:{nextRunAt:"asc"},take:100})]);return {agents,tasks,periods,workers:workers.map(worker=>({...worker,fresh:Date.now()-worker.lastSeenAt.getTime()<60000})),schedules,models:allowedModels(),aiReady:aiConfigured(),globalBudget:globalBudget(),systemPolicy};
}
