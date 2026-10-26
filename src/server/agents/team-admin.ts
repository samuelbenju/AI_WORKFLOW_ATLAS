import "server-only";
import {z} from "zod";
import type {PrismaClient} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {authorizeActor} from "@/server/admin/content";
import {AccessError} from "@/server/auth/policy";
import {roleDefinitions,businessRoles,teamContextSchema,teamRole} from "@/lib/agent-team";
import {allowedModels} from "@/lib/agents";
import {engineLock,agentAudit} from "./admin";
import {currentEvidence,validateContext} from "./team-tools";
export async function initializeTeam(userId:string|null,db:PrismaClient=getDatabase()){
 return db.$transaction(async tx=>{if(userId)await authorizeActor(userId,"agents",tx);await engineLock(tx);const ids=[];for(const role of businessRoles){const d=roleDefinitions[role];const agent=await tx.agent.upsert({where:{identifier:d.identifier},update:{},create:{identifier:d.identifier,name:d.name,role,prompt:d.instructions,model:allowedModels()[0]??null,allowedTools:[...d.tools],enabled:false,maxOutputTokens:2048,requiresApproval:true,configuration:{profileVersion:1}}});await tx.agentSchedule.upsert({where:{automationKey:d.identifier},update:{},create:{automationKey:d.identifier,agentId:agent.id,enabled:false,intervalSeconds:86400,nextRunAt:new Date(Date.now()+86400000)}});ids.push(agent.id);await agentAudit(tx,userId,`team_${role.toLowerCase()}_registered`,agent.id);}return {agentIds:ids};});
}
export async function reviewProduct(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);const data=z.object({decision:z.enum(["APPROVED","REJECTED"]),note:z.string().trim().min(20).max(2000),confirmation:z.literal(true)}).strict().parse(input);return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);const product=await tx.agentWorkProduct.findUniqueOrThrow({where:{id}});if(product.status!=="PENDING_REVIEW")throw new AccessError(409,"El resultado ya fue revisado; no se reescribe esa decisión.");if(data.decision==="APPROVED")await currentEvidence(tx,product.evidence);await tx.agentWorkProduct.update({where:{id},data:{status:data.decision,reviewedAt:new Date(),reviewedById:userId,reviewNote:data.note}});await agentAudit(tx,userId,`product_${data.decision.toLowerCase()}`,product.taskId);return {saved:true};});
}
export async function updateTaskContext(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);const data=z.object({context:teamContextSchema,expectedUpdatedAt:z.iso.datetime()}).strict().parse(input);return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);const task=await tx.agentTask.findUniqueOrThrow({where:{id},include:{agent:true}});if(task.status!=="AWAITING_APPROVAL"||task.updatedAt.toISOString()!==data.expectedUpdatedAt||!teamRole(task.agent))throw new AccessError(409,"Solo se modifica el contexto de una tarea empresarial pendiente y actual.");const context=await validateContext(task.agent,data.context,tx);await tx.agentTask.update({where:{id},data:{input:{kind:"TEAM",context},approvedAt:null,approvedById:null,approvedConfigHash:null,approvedInputHash:null}});await agentAudit(tx,userId,"task_context_updated",id);return {saved:true};});
}
