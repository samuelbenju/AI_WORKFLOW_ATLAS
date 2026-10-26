import "server-only";
import {z} from "zod";
import {teamRole,roleToolsValid,roleOutputs,teamContextSchema} from "@/lib/agent-team";
import {prepareTeamSnapshot,type TeamSnapshot} from "./team-tools";
import {persistTeamProduct,proposeCeoConsolidation} from "./team-products";
import {randomUUID} from "node:crypto";
import type {PrismaClient,Prisma,AgentExecution} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {analysisSchema,allowedModels,ceilCost,configHash,secretLike,taskInputHash} from "@/lib/agents";
import {engineLock,agentAudit,globalBudget,concurrencyLimit} from "./admin";
import {OpenAiResponses,AiFailure,systemPolicy,teamSystemPolicy,type AiProvider,type AiRequest,type AiResponse} from "./provider";
type Db=PrismaClient|Prisma.TransactionClient;
async function approverCurrent(db:Db,id:string|null){if(!id)return false;const user=await db.user.findUnique({where:{id},select:{active:true,role:true}});return !!user?.active&&["OWNER","ADMIN"].includes(user.role);}
const backoff=(attempt:number)=>Math.min(300000,1000*2**Math.min(attempt,8));
async function snapshot(db:Db){const visible={status:"PUBLISHED" as const,isDemo:false,publishedAt:{lte:new Date()}};return {source:"public_catalog",tools:await db.tool.count({where:visible}),useCases:await db.useCase.count({where:visible}),articles:await db.article.count({where:{...visible,reviewedAt:{not:null},body:{path:["version"],equals:1}}}),note:"Counts describe stored published content, not audience, revenue or proven business results."};}
async function settleBudget(db:Db,execution:AgentExecution,charged:bigint){if(!execution.accountingPeriod)return;const task=await db.agentTask.findUniqueOrThrow({where:{id:execution.taskId}});for(const key of [`global:${execution.accountingPeriod}`,`${task.agentId}:${execution.accountingPeriod}`])await db.agentBudgetPeriod.update({where:{key},data:{reservedUsdMicros:{decrement:execution.reservedUsdMicros},spentUsdMicros:{increment:charged}}});}
export async function recoverInterrupted(db:PrismaClient=getDatabase()){
 return db.$transaction(async tx=>{await engineLock(tx);const executions=await tx.agentExecution.findMany({where:{status:"RUNNING",task:{leaseExpiresAt:{lte:new Date()}}},include:{task:true},take:20});
 for(const execution of executions){const uncertain=!!execution.dispatchedAt,cancelled=!!execution.task.cancelRequestedAt,retry=!uncertain&&!cancelled&&execution.task.attempts<execution.task.maxAttempts;await settleBudget(tx,execution,uncertain?execution.reservedUsdMicros:0n);await tx.agentExecution.update({where:{id:execution.id},data:{status:cancelled?"CANCELLED":"FAILED",finishedAt:new Date(),costUsdMicros:uncertain?execution.reservedUsdMicros:0n,costKnown:!uncertain,errorCode:uncertain?"INTERRUPTED_OUTCOME_UNKNOWN":"INTERRUPTED_BEFORE_DISPATCH"}});await tx.agentTask.update({where:{id:execution.taskId},data:{status:cancelled?"CANCELLED":retry?"PENDING":"FAILED",leaseToken:null,leaseExpiresAt:null,errorCode:uncertain?"INTERRUPTED_OUTCOME_UNKNOWN":"INTERRUPTED_BEFORE_DISPATCH",scheduledAt:new Date(Date.now()+backoff(execution.attempt))}});await proposeCeoConsolidation(tx,execution.task);await agentAudit(tx,null,"lease_recovered",execution.taskId);}
 return executions.length;});
}
export async function materializeSchedules(db:PrismaClient=getDatabase()){
 return db.$transaction(async tx=>{await engineLock(tx);const schedules=await tx.agentSchedule.findMany({where:{enabled:true,nextRunAt:{lte:new Date()},agent:{enabled:true}},include:{agent:true},take:20,orderBy:{nextRunAt:"asc"}});
 for(const schedule of schedules){const key=`schedule:${schedule.id}:${schedule.nextRunAt.toISOString()}`;await tx.agentTask.upsert({where:{idempotencyKey:key},update:{},create:{agentId:schedule.agentId,idempotencyKey:key,input:teamRole(schedule.agent)?{kind:"TEAM",context:teamContextSchema.parse({})}:{kind:"CATALOG_ANALYSIS"},trigger:"SCHEDULE",status:"AWAITING_APPROVAL",tokenBudget:teamRole(schedule.agent)?20000:12000,budgetUsdMicros:0n,maxAttempts:3,requiresApproval:true}});await tx.agentSchedule.update({where:{id:schedule.id},data:{nextRunAt:new Date(Date.now()+schedule.intervalSeconds*1000)}});await agentAudit(tx,null,"schedule_enqueued",schedule.id);}
 return schedules.length;});
}
export async function claimTask(db:PrismaClient=getDatabase(),providerName="OPENAI"){
 return db.$transaction(async tx=>{await engineLock(tx);const running=await tx.agentTask.count({where:{status:"RUNNING"}});if(running>=concurrencyLimit())return null;
 const candidates=await tx.agentTask.findMany({where:{status:"PENDING",scheduledAt:{lte:new Date()},cancelRequestedAt:null,agent:{enabled:true}},include:{agent:true},orderBy:[{scheduledAt:"asc"},{id:"asc"}],take:20});
 for(const task of candidates){const agent=task.agent;
 if(await tx.agentTask.count({where:{agentId:agent.id,status:"RUNNING"}})>=agent.maxConcurrency)continue;
 if(!task.approvedAt||!task.approvedById||task.approvedConfigHash!==configHash(agent)||!agent.model||!allowedModels().includes(agent.model)||!roleToolsValid(agent)||(teamRole(agent)!==null&&task.approvedInputHash!==taskInputHash(task.input))||task.attempts>=task.maxAttempts){await tx.agentTask.update({where:{id:task.id},data:{status:"AWAITING_APPROVAL",errorCode:"APPROVAL_OR_CONFIGURATION_CHANGED"}});continue;}
 const actor=await tx.user.findUnique({where:{id:task.approvedById}});if(!actor?.active||!["OWNER","ADMIN"].includes(actor.role)){await tx.agentTask.update({where:{id:task.id},data:{status:"AWAITING_APPROVAL",errorCode:"APPROVER_NO_LONGER_AUTHORIZED"}});continue;}
 let team:TeamSnapshot|null=null;let data:Prisma.InputJsonValue;
 try{if(teamRole(agent)){team=await prepareTeamSnapshot(tx,agent,task);data=team.payload;}else data=await snapshot(tx);}catch{await tx.agentTask.update({where:{id:task.id},data:{status:"AWAITING_APPROVAL",errorCode:"TEAM_CONTEXT_OR_EVIDENCE_INVALID"}});continue;}
 const request:AiRequest={model:agent.model,instructions:`${team?teamSystemPolicy:systemPolicy}\nOperator instructions: ${agent.prompt}`,input:JSON.stringify(data),maxOutputTokens:agent.maxOutputTokens,...(team?{role:team.role,responseSchema:z.toJSONSchema(roleOutputs[team.role])}:{})};
 const inputBound=Buffer.byteLength(request.instructions+request.input+JSON.stringify(request.responseSchema??{}),"utf8")+2048,reservation=ceilCost(inputBound,request.maxOutputTokens,agent.inputRateMicrosPerMillion,agent.outputRateMicrosPerMillion),used=await tx.agentExecution.aggregate({where:{taskId:task.id},_sum:{costUsdMicros:true}});
 const month=new Date().toISOString().slice(0,7),keys=[`global:${month}`,`${agent.id}:${month}`];const buckets=[];
 for(const key of keys)buckets.push(await tx.agentBudgetPeriod.upsert({where:{key},update:{},create:{key}}));
 if(inputBound+request.maxOutputTokens>task.tokenBudget||reservation<=0n||agent.inputRateMicrosPerMillion<=0n||agent.outputRateMicrosPerMillion<=0n||reservation+(used._sum.costUsdMicros??0n)>task.budgetUsdMicros||buckets.some((bucket,index)=>bucket.spentUsdMicros+bucket.reservedUsdMicros+reservation>(index===0?globalBudget():agent.monthlyBudgetUsdMicros))){await tx.agentTask.update({where:{id:task.id},data:{status:"AWAITING_APPROVAL",errorCode:"TOKEN_OR_COST_LIMIT"}});continue;}
 for(const key of keys)await tx.agentBudgetPeriod.update({where:{key},data:{reservedUsdMicros:{increment:reservation}}});
 const token=randomUUID(),attempt=task.attempts+1;const execution=await tx.agentExecution.create({data:{taskId:task.id,attempt,model:agent.model,provider:providerName,leaseToken:token,reservedUsdMicros:reservation,accountingPeriod:month,inputRateMicrosPerMillion:agent.inputRateMicrosPerMillion,outputRateMicrosPerMillion:agent.outputRateMicrosPerMillion,output:{snapshot:data}}});await tx.agentTask.update({where:{id:task.id},data:{status:"RUNNING",attempts:attempt,leaseToken:token,leaseExpiresAt:new Date(Date.now()+120000),errorCode:null}});await tx.agent.update({where:{id:agent.id},data:{lastRunAt:new Date()}});await agentAudit(tx,null,"claimed",task.id);return {execution,taskId:task.id,agentId:agent.id,config:configHash(agent),request,inputBound,snapshot:data,team};
 }
 return null;},{timeout:20000});
}
export async function runOne(db:PrismaClient=getDatabase(),provider:AiProvider=new OpenAiResponses()){
 if(provider.name!=="OPENAI"&&(!process.env.DATABASE_URL||!new URL(process.env.DATABASE_URL).pathname.endsWith("_test")))throw new Error("Test providers require an isolated test database");
 await recoverInterrupted(db);if(!provider.ready())return {state:"BLOCKED",reason:"PROVIDER_DISABLED"};const job=await claimTask(db,provider.name);if(!job)return {state:"IDLE"};
 const permitted=await db.$transaction(async tx=>{await engineLock(tx);const task=await tx.agentTask.findUniqueOrThrow({where:{id:job.taskId},include:{agent:true}});if(!await approverCurrent(tx,task.approvedById)||task.leaseToken!==job.execution.leaseToken||(job.team&&task.approvedInputHash!==taskInputHash(task.input))||task.cancelRequestedAt||!task.agent.enabled||configHash(task.agent)!==job.config)return false;await tx.agentExecution.update({where:{id:job.execution.id},data:{dispatchedAt:new Date()}});return true;});
 let result:AiResponse|undefined,failure:AiFailure|undefined;
 const controller=new AbortController();const abort=()=>controller.abort();const timeout=setTimeout(abort,30000);const polling=setInterval(()=>{void db.agentTask.findUnique({where:{id:job.taskId},select:{cancelRequestedAt:true,leaseToken:true,agent:{select:{enabled:true}},approvedBy:{select:{active:true,role:true}}}}).then(task=>{if(!task||task.cancelRequestedAt||!task.agent.enabled||task.leaseToken!==job.execution.leaseToken||!task.approvedBy?.active||!["OWNER","ADMIN"].includes(task.approvedBy.role))abort();}).catch(abort);},1000);polling.unref();
 try{if(permitted)result=await provider.respond(job.request,controller.signal);else failure=new AiFailure("CANCELLED_BEFORE_DISPATCH");}catch(error){failure=error instanceof AiFailure?error:new AiFailure("PROVIDER_OUTCOME_UNKNOWN",false,true);}finally{clearTimeout(timeout);clearInterval(polling);}
 return db.$transaction(async tx=>{await engineLock(tx);const execution=await tx.agentExecution.findUniqueOrThrow({where:{id:job.execution.id}}),task=await tx.agentTask.findUniqueOrThrow({where:{id:job.taskId},include:{agent:true}});if(execution.status!=="RUNNING"||task.leaseToken!==execution.leaseToken||!task.leaseExpiresAt||task.leaseExpiresAt<=new Date())return {state:"STALE_RESULT_DISCARDED"};
 const validUsage=result&&Number.isSafeInteger(result.inputTokens)&&result.inputTokens>=0&&Number.isSafeInteger(result.outputTokens)&&result.outputTokens>=0;
 const reportedCost=validUsage&&result?ceilCost(result.inputTokens,result.outputTokens,execution.inputRateMicrosPerMillion,execution.outputRateMicrosPerMillion):0n;
 const boundedUsage=!!validUsage&&!!result&&result.inputTokens<=job.inputBound&&result.outputTokens<=job.request.maxOutputTokens&&reportedCost<=execution.reservedUsdMicros;
 const cost=boundedUsage?reportedCost:result||failure?.uncertain?execution.reservedUsdMicros:0n;
 const authorized=await approverCurrent(tx,task.approvedById);
 const cancelled=!!task.cancelRequestedAt||!task.agent.enabled||!permitted||!authorized;const changed=configHash(task.agent)!==job.config;
 let error=failure?.code??result?.errorCode??null;const validResult=(job.team?roleOutputs[job.team.role]:analysisSchema).safeParse(result?.result);
 if(result&&!boundedUsage)error="USAGE_OUT_OF_BOUNDS";
 if(!error&&(!validResult.success||secretLike(JSON.stringify(validResult.data))))error="INVALID_OR_SENSITIVE_RESULT";
 if(changed)error="CONFIGURATION_CHANGED";if(cancelled)error=authorized?"CANCELLED":"APPROVER_REVOKED";
 if(!error&&job.team&&validResult.success)error=await persistTeamProduct(tx,task,job.team,validResult.data);
 const retry=!cancelled&&!changed&&!!failure?.retryable&&!failure.uncertain&&task.attempts<task.maxAttempts;
 const state=cancelled?"CANCELLED":error?retry?"PENDING":"FAILED":"COMPLETED";
 await settleBudget(tx,execution,cost);await tx.agentExecution.update({where:{id:execution.id},data:{status:cancelled?"CANCELLED":error?"FAILED":"COMPLETED",finishedAt:new Date(),providerResponseId:result?.id??null,inputTokens:boundedUsage&&result?result.inputTokens:0,outputTokens:boundedUsage&&result?result.outputTokens:0,costUsdMicros:cost,costKnown:boundedUsage||(!result&&!failure?.uncertain),errorCode:error,output:{snapshot:job.snapshot,...(!error&&validResult.success?{result:validResult.data}:{})}}});
 await tx.agentTask.update({where:{id:task.id},data:{status:state,leaseToken:null,leaseExpiresAt:null,errorCode:error,...(retry?{scheduledAt:new Date(Date.now()+backoff(task.attempts))}:{})}});
 await proposeCeoConsolidation(tx,task);
 if(state==="COMPLETED"&&validResult.success&&!job.team)await tx.contentDraft.create({data:{taskId:task.id,kind:"REPORT",title:"Análisis del catálogo · pendiente de revisión humana",body:validResult.data,status:"DRAFT",authorId:task.approvedById}});
 await agentAudit(tx,null,error?"execution_failed":"execution_completed",task.id);return {state,executionId:execution.id};
 });
}
export async function tick(workerId:string,db:PrismaClient=getDatabase(),provider:AiProvider=new OpenAiResponses()){
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(workerId))throw new Error("Invalid worker ID");await db.agentWorkerHeartbeat.upsert({where:{id:workerId},create:{id:workerId,status:"ACTIVE"},update:{lastSeenAt:new Date(),status:"ACTIVE",errorCode:null}});
 try{await recoverInterrupted(db);await materializeSchedules(db);const result=await runOne(db,provider);await db.agentWorkerHeartbeat.update({where:{id:workerId},data:{lastSeenAt:new Date(),status:result.state,errorCode:result.state==="BLOCKED"?"PROVIDER_DISABLED":null}});return result;}catch{await db.agentWorkerHeartbeat.update({where:{id:workerId},data:{lastSeenAt:new Date(),status:"ERROR",errorCode:"TICK_FAILED"}});throw new Error("Agent tick failed; inspect private task history.");}
}
