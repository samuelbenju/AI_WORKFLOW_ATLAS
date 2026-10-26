import "server-only";
import {randomUUID} from "node:crypto";
import type {Prisma,AgentTask} from "@/generated/prisma/client";
import {roleOutputs,roleDefinitions,teamContextSchema} from "@/lib/agent-team";
import {articleInputSchema,blankArticle,articleBodySchema} from "@/lib/editorial";
import {authorizeActor} from "@/server/admin/content";
import {AccessError} from "@/server/auth/policy";
import {currentEvidence,type TeamSnapshot} from "./team-tools";
import {agentAudit} from "./admin";
type Db=Prisma.TransactionClient;
export async function persistTeamProduct(tx:Db,task:AgentTask,snapshot:TeamSnapshot,output:unknown):Promise<string|null>{
 if(!task.approvedById)return "APPROVER_MISSING";
 try{await authorizeActor(task.approvedById,"agents",tx);await currentEvidence(tx,snapshot.evidence);}catch{return "APPROVER_OR_EVIDENCE_CHANGED";}
 const role=snapshot.role,evidenceIds=snapshot.evidence.map(e=>e.id);let articleId:string|null=null;const proposals:{leadId:string;packageId:string;text:string;suggestedPriceMinor:string|null;currency:string;priceRationale:string;responseDraft:string}[]=[];
 if(role==="RESEARCHER"){const research=roleOutputs.RESEARCHER.parse(output);if(research.findings.some(f=>f.sourceIds.some(id=>!evidenceIds.includes(id))||f.state==="SOURCE_BACKED"&&!f.sourceIds.length))return "INVALID_RESEARCH_CITATIONS";}
 if(role==="CEO"){const result=roleOutputs.CEO.parse(output);if(new Set(result.assignments.map(a=>a.role)).size!==result.assignments.length)return "DUPLICATE_ASSIGNMENT_ROLE";}
 if(role==="SEO"){const result=roleOutputs.SEO.parse(output);const pageIds=((snapshot.payload as {pages?:{id:string}[]}).pages??[]).map(p=>p.id);if(result.recommendations.some(r=>!pageIds.includes(r.articleId)))return "SEO_TARGET_OUTSIDE_SNAPSHOT";}
 if(role==="COMMERCIAL"){const result=roleOutputs.COMMERCIAL.parse(output);const data=snapshot.payload as {leads?:{id:string}[];packageOptions?:{id:string;currency:string}[]};const leads=(data.leads??[]).map(l=>l.id);for(const p of result.proposals){if(!leads.includes(p.leadId)||!data.packageOptions?.some(x=>x.id===p.packageId&&x.currency===p.currency)||p.suggestedPriceMinor!==null&&BigInt(p.suggestedPriceMinor)<=0n)return "COMMERCIAL_TARGET_OR_CURRENCY_INVALID";const live=await tx.sponsorshipPackage.findUnique({where:{id:p.packageId}});if(!live||!live.active||live.availability!=="AVAILABLE"||live.currency!==p.currency)return "PACKAGE_CURRENCY_CHANGED";proposals.push(p);}if(result.assessments.some(r=>!leads.includes(r.leadId)))return "COMMERCIAL_LEAD_OUTSIDE_SCOPE";}
 if(role==="EDITOR"){
  const result=roleOutputs.EDITOR.parse(output).article;if(!result.sourceIds.length||result.sourceIds.some(id=>!evidenceIds.includes(id)))return "EDITOR_CITATIONS_REQUIRED";
  let previous=null;if(snapshot.context.articleId){await tx.$queryRaw`SELECT "id" FROM "Article" WHERE "id"=${snapshot.context.articleId}::uuid FOR UPDATE`;previous=await tx.article.findUnique({where:{id:snapshot.context.articleId},include:{categories:true,tags:true,tools:true}});if(!previous||previous.status!=="DRAFT"||previous.updatedAt.toISOString()!==snapshot.articleVersion||!articleBodySchema.safeParse(previous.body).success)return "CMS_DRAFT_CHANGED";}
  const categories=await tx.category.findMany({where:{name:{in:result.categorySuggestions,mode:"insensitive"}},select:{id:true}});const sources=snapshot.evidence.filter(e=>result.sourceIds.includes(e.id)).map(s=>({title:s.title,url:s.url,note:`Agent research snapshot ${s.digest}; human editorial verification required.`,status:"PENDING" as const,checkedAt:null}));
  const slug=previous?.slug??`agent-draft-${randomUUID()}`;
  const input=articleInputSchema.parse({...blankArticle,title:result.title,slug,excerpt:result.excerpt,metaTitle:result.title,metaDescription:result.metaDescription,noindex:true,status:"DRAFT",body:{version:1,blocks:result.paragraphs.map(text=>({type:"paragraph",text}))},sources,categoryIds:categories.map(c=>c.id)});
  const fields={title:input.title,excerpt:input.excerpt,body:input.body,sources:input.sources,metaTitle:input.metaTitle,metaDescription:input.metaDescription,noindex:true,status:"DRAFT" as const,reviewedAt:null,reviewedById:null,publishedAt:null,categories:{set:(previous?previous.categories:categories).map(c=>({id:c.id}))}};
  if(previous){await tx.contentDraft.create({data:{articleId:previous.id,taskId:task.id,kind:"ARTICLE",title:previous.title,body:{version:1,reason:"before_agent_draft_update",snapshot:JSON.parse(JSON.stringify(previous))},authorId:task.approvedById}});const updated=await tx.article.update({where:{id:previous.id},data:{...fields,updatedAt:new Date(Math.max(Date.now(),previous.updatedAt.getTime()+1))}});articleId=updated.id;}
  else{const {categories:relation,...base}=fields;void relation;articleId=(await tx.article.create({data:{...base,slug,authorId:task.approvedById,categories:{connect:categories.map(c=>({id:c.id}))}}})).id;}
  await tx.contentDraft.create({data:{articleId,taskId:task.id,kind:"ARTICLE",title:input.title,body:input as unknown as Prisma.InputJsonValue,status:"DRAFT",authorId:task.approvedById}});await tx.auditLog.create({data:{actorId:task.approvedById,action:previous?"article.agent_draft_updated":"article.agent_draft_created",entityType:"Article",entityId:articleId}});
 }
 const product=await tx.agentWorkProduct.create({data:{taskId:task.id,kind:role,body:output as Prisma.InputJsonValue,evidence:snapshot.evidence,sources:{connect:evidenceIds.map(id=>({id}))},articleId,leadId:snapshot.context.leadId}});
 for(const p of proposals){const current=await tx.sponsorshipPackage.findUniqueOrThrow({where:{id:p.packageId}});if(current.currency!==p.currency)throw new AccessError(409,"El precio o moneda del paquete cambió.");await tx.contentDraft.create({data:{taskId:task.id,leadId:p.leadId,kind:"COMMERCIAL_PROPOSAL",title:"Propuesta de agente · no enviada",status:"DRAFT",authorId:task.approvedById,body:{version:1,text:p.text,validUntil:new Date(Date.now()+7*86400000).toISOString(),packageId:current.id,packageName:current.name,amountMinor:current.amountMinor?.toString()??null,currency:current.currency,durationDays:current.durationDays,preparedAt:new Date().toISOString(),suggestedPriceMinor:p.suggestedPriceMinor,priceRationale:p.priceRationale,responseDraft:p.responseDraft,sourceProductId:product.id}}});}
 if(role==="CEO"&&!snapshot.context.coordinationRootId){const result=roleOutputs.CEO.parse(output);for(const assignment of result.assignments){const target=await tx.agent.findUnique({where:{identifier:roleDefinitions[assignment.role].identifier}});if(!target){await agentAudit(tx,null,"assignment_target_missing",task.id);continue;}const context=teamContextSchema.parse({...snapshot.context,coordinationRootId:null,...(assignment.role!=="EDITOR"?{articleId:null,articleVersion:null}:{})});const key=`ceo:${task.id}:${assignment.role}`;const child=await tx.agentTask.upsert({where:{idempotencyKey:key},update:{},create:{agentId:target.id,parentTaskId:task.id,idempotencyKey:key,input:{kind:"TEAM",context,brief:assignment.reason},status:"AWAITING_APPROVAL",requiresApproval:true,trigger:"EVENT",budgetUsdMicros:0n,tokenBudget:20000,maxAttempts:3}});await agentAudit(tx,null,"assignment_proposed",child.id);}}
 await agentAudit(tx,task.approvedById,`product_${role.toLowerCase()}_created`,task.id);return null;
}

// Returning reports is a zero-cost queue operation, never authorization for another model call.
export async function proposeCeoConsolidation(tx:Db,task:AgentTask){
 if(!task.parentTaskId)return;
 const root=await tx.agentTask.findUnique({where:{id:task.parentTaskId},include:{agent:true}});
 if(!root||root.agent.identifier!==roleDefinitions.CEO.identifier||root.agent.role!=="CEO"||root.status!=="COMPLETED")return;
 const children=await tx.agentTask.findMany({where:{parentTaskId:root.id},select:{status:true}});
 if(!children.length||children.some(c=>!["COMPLETED","FAILED","CANCELLED"].includes(c.status)))return;
 const key=`ceo-report:${root.id}`;const existing=await tx.agentTask.findUnique({where:{idempotencyKey:key}});if(existing)return;
 const report=await tx.agentTask.create({data:{agentId:root.agentId,idempotencyKey:key,input:{kind:"TEAM",context:teamContextSchema.parse({coordinationRootId:root.id})},trigger:"EVENT",status:"AWAITING_APPROVAL",requiresApproval:true,tokenBudget:20000,budgetUsdMicros:0n,maxAttempts:3}});
 await agentAudit(tx,null,"reports_returned_to_ceo",report.id);
}
