import "server-only";
import {z} from "zod";
import type {Prisma,PrismaClient} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {authorizeActor} from "@/server/admin/content";
import {AccessError} from "@/server/auth/policy";
import {commercialQuery,leadUpdateSchema,packageSchema,sponsorSchema,proposalSchema,campaignSchema} from "@/lib/commercial";
import {publicPackages} from "./intake";
type Db=PrismaClient|Prisma.TransactionClient;
const changed=(actual:Date,expected:string|undefined)=>{if(!expected||actual.toISOString()!==expected)throw new AccessError(409,"El registro cambió. Recarga antes de guardar.");};
const nextDate=(actual:Date)=>new Date(Math.max(Date.now(),actual.getTime()+1));
async function audit(tx:Db,actorId:string,action:string,type:string,id:string) {await tx.auditLog.create({data:{actorId,action:`commercial.${action}`,entityType:type,entityId:id}});}
export async function crmOverview(userId:string,input:unknown,db:PrismaClient=getDatabase()) {
 await authorizeActor(userId,"commercial",db);const query=commercialQuery.parse(input);const match={contains:query.q,mode:"insensitive" as const};
 const where:Prisma.CommercialLeadWhereInput={...(query.status?{status:query.status}:{}),OR:[{companyName:match},{email:match},{reference:match}]};
 const [leads,total,companies,newLeads,waiting,active]=await db.$transaction([
  db.commercialLead.findMany({where,include:{package:{select:{name:true}},sponsor:{select:{name:true}}},orderBy:[{createdAt:"desc"},{id:"asc"}],take:12,skip:(query.page-1)*12}),db.commercialLead.count({where}),db.sponsor.count(),
  db.commercialLead.count({where:{status:"NEW"}}),db.sponsorshipCampaign.count({where:{status:"PENDING_APPROVAL"}}),db.sponsorshipCampaign.count({where:{status:"ACTIVE",startsAt:{lte:new Date()},endsAt:{gt:new Date()}}}),
 ],{isolationLevel:"RepeatableRead"});return {leads:leads.map(row=>({...row,quotedAmountMinor:row.quotedAmountMinor?.toString()??null})),total,companies,newLeads,waiting,active};
}
export async function crmLead(userId:string,id:string,db:PrismaClient=getDatabase()) {
 await authorizeActor(userId,"commercial",db);z.uuid().parse(id);
 const row=await db.commercialLead.findUnique({where:{id},include:{package:{select:{id:true,name:true}},sponsor:{select:{id:true,name:true}},notes:{select:{id:true,text:true,createdAt:true,author:{select:{name:true}}},orderBy:{createdAt:"desc"},take:50},proposals:{select:{id:true,title:true,body:true,createdAt:true},orderBy:{createdAt:"desc"},take:20}}});
 return row?{...row,quotedAmountMinor:row.quotedAmountMinor?.toString()??null,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),consentAt:row.consentAt?.toISOString()??null,approvedAt:row.approvedAt?.toISOString()??null,requestedStartsAt:row.requestedStartsAt?.toISOString()??null,notes:row.notes.map(note=>({...note,createdAt:note.createdAt.toISOString()})),proposals:row.proposals.map(proposal=>({...proposal,createdAt:proposal.createdAt.toISOString()}))}:null;
}
export async function crmCompanies(userId:string,db:PrismaClient=getDatabase()) {
 await authorizeActor(userId,"commercial",db);return db.sponsor.findMany({include:{_count:{select:{leads:true,campaigns:true}}},orderBy:{name:"asc"},take:200});
}
export async function saveCompany(userId:string,input:unknown,id?:string,db:PrismaClient=getDatabase()) {
 const data=sponsorSchema.parse(input);if(id)z.uuid().parse(id);
 return db.$transaction(async tx=>{const actor=await authorizeActor(userId,"commercial",tx);const previous=id?await tx.sponsor.findUnique({where:{id}}):null;if(id&&!previous)throw new AccessError(404,"La empresa no existe.");if(previous)changed(previous.updatedAt,data.expectedUpdatedAt);
  const duplicate=await tx.sponsor.findFirst({where:{name:{equals:data.name,mode:"insensitive"},contactEmail:data.contactEmail,...(id?{id:{not:id}}:{})}});if(duplicate)throw new AccessError(409,"Esta empresa y contacto ya están registrados.");
  const {expectedUpdatedAt:_expected,...fields}=data;void _expected;const result=previous?await tx.sponsor.update({where:{id},data:{...fields,updatedAt:nextDate(previous.updatedAt)}}):await tx.sponsor.create({data:fields});await audit(tx,actor.id,id?"company_updated":"company_created","Sponsor",result.id);return {id:result.id};
 },{isolationLevel:"Serializable"});
}
export async function crmPackages(userId:string,db:PrismaClient=getDatabase()) {await authorizeActor(userId,"commercial",db);return publicPackages(db);}
export async function savePackage(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()) {
 z.uuid().parse(id);const data=packageSchema.parse(input);
 return db.$transaction(async tx=>{const actor=await authorizeActor(userId,"commercial",tx);const previous=await tx.sponsorshipPackage.findUnique({where:{id}});if(!previous)throw new AccessError(404,"El paquete no existe.");changed(previous.updatedAt,data.expectedUpdatedAt);const {expectedUpdatedAt:_expected,...fields}=data;void _expected;
 await tx.sponsorshipPackage.update({where:{id},data:{...fields,amountMinor:fields.amountMinor===null?null:BigInt(fields.amountMinor),updatedAt:nextDate(previous.updatedAt)}});await audit(tx,actor.id,"package_updated","SponsorshipPackage",id);return {saved:true};
 },{isolationLevel:"Serializable"});
}
export async function updateLead(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()) {
 z.uuid().parse(id);const data=leadUpdateSchema.parse(input);
 return db.$transaction(async tx=>{const actor=await authorizeActor(userId,"commercial",tx);const lead=await tx.commercialLead.findUnique({where:{id}});if(!lead)throw new AccessError(404,"La solicitud no existe.");changed(lead.updatedAt,data.expectedUpdatedAt);
 await tx.commercialLead.update({where:{id},data:{status:data.status,sponsorId:data.sponsorId,updatedAt:nextDate(lead.updatedAt)}});await audit(tx,actor.id,"lead_updated","CommercialLead",id);return {saved:true};
 },{isolationLevel:"Serializable"});
}
export async function addLeadNote(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()) {
 z.uuid().parse(id);const data=z.object({text:z.string().trim().min(1).max(5000)}).strict().parse(input);
 return db.$transaction(async tx=>{const actor=await authorizeActor(userId,"commercial",tx);const note=await tx.commercialNote.create({data:{leadId:id,authorId:actor.id,text:data.text}});await audit(tx,actor.id,"note_added","CommercialLead",id);return {id:note.id};});
}
export async function prepareProposal(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()) {
 z.uuid().parse(id);const data=proposalSchema.parse(input);if(new Date(data.validUntil)<=new Date())throw new AccessError(422,"La vigencia debe estar en el futuro.");
 return db.$transaction(async tx=>{const actor=await authorizeActor(userId,"commercial",tx);const lead=await tx.commercialLead.findUnique({where:{id},include:{package:true}});if(!lead)throw new AccessError(404,"La solicitud no existe.");
 const quote={version:1,text:data.text,validUntil:data.validUntil,packageId:lead.package.id,packageName:lead.package.name,amountMinor:lead.package.amountMinor?.toString()??null,currency:lead.package.currency,durationDays:lead.package.durationDays,preparedAt:new Date().toISOString()};
 const draft=await tx.contentDraft.create({data:{leadId:id,kind:"COMMERCIAL_PROPOSAL",title:data.title,body:quote,authorId:actor.id}});await audit(tx,actor.id,"proposal_prepared","CommercialLead",id);return {id:draft.id};
 });
}
export async function crmCampaigns(userId:string,db:PrismaClient=getDatabase()) {
 await authorizeActor(userId,"commercial",db);
 const [campaigns,companies,packages,orders,tools,articles]=await db.$transaction([
 db.sponsorshipCampaign.findMany({include:{sponsor:{select:{name:true}},package:{select:{name:true,kind:true}},order:{select:{reference:true,status:true,environment:true}}},orderBy:{updatedAt:"desc"},take:200}),
 db.sponsor.findMany({select:{id:true,name:true},orderBy:{name:"asc"},take:1000}),db.sponsorshipPackage.findMany({select:{id:true,name:true,kind:true},orderBy:{name:"asc"}}),
 db.paymentOrder.findMany({select:{id:true,reference:true,sponsorId:true,packageId:true,status:true,environment:true},orderBy:{createdAt:"desc"},take:500}),db.tool.findMany({select:{id:true,name:true},orderBy:{name:"asc"},take:1000}),db.article.findMany({select:{id:true,title:true},orderBy:{title:"asc"},take:1000}),
 ]);return {campaigns:campaigns.map(row=>({...row,contractAmountMinor:row.contractAmountMinor?.toString()??null,startsAt:row.startsAt?.toISOString()??null,endsAt:row.endsAt?.toISOString()??null,updatedAt:row.updatedAt.toISOString(),createdAt:row.createdAt.toISOString(),approvedAt:row.approvedAt?.toISOString()??null})),companies,packages,orders,tools,articles:articles.map(row=>({id:row.id,name:row.title}))};
}
export async function saveCampaign(userId:string,input:unknown,id?:string,db:PrismaClient=getDatabase()) {
 const data=campaignSchema.parse(input);if(id)z.uuid().parse(id);
 return db.$transaction(async tx=>{const actor=await authorizeActor(userId,"commercial",tx);const previous=id?await tx.sponsorshipCampaign.findUnique({where:{id}}):null;if(id&&!previous)throw new AccessError(404,"La campaña no existe.");if(previous)changed(previous.updatedAt,data.expectedUpdatedAt);
 const product=await tx.sponsorshipPackage.findUnique({where:{id:data.packageId}});if(!product)throw new AccessError(422,"El paquete no existe.");
 const order=data.orderId?await tx.paymentOrder.findUnique({where:{id:data.orderId}}):null;
 if(data.orderId&&(!order||order.sponsorId!==data.sponsorId||order.packageId!==data.packageId))throw new AccessError(422,"La orden debe corresponder a esta empresa y paquete.");
 if(product.kind==="FEATURED_TOOL_LISTING"&&!data.toolId||product.kind==="SPONSORED_ARTICLE"&&!data.articleId)throw new AccessError(422,"Selecciona el contenido del espacio contratado.");
 if(product.kind!=="FEATURED_TOOL_LISTING"&&data.toolId||product.kind!=="SPONSORED_ARTICLE"&&data.articleId)throw new AccessError(422,"La relación de contenido no corresponde al paquete.");
 const {expectedUpdatedAt:_expected,...fields}=data;void _expected;
 const attributes={...fields,startsAt:new Date(data.startsAt),endsAt:new Date(data.endsAt),status:"DRAFT" as const,approvedAt:null,approvedById:null,contractAmountMinor:order?.amountMinor??product.amountMinor,contractCurrency:order?.currency??product.currency,contractDurationDays:product.durationDays};
 const saved=previous?await tx.sponsorshipCampaign.update({where:{id},data:{...attributes,updatedAt:nextDate(previous.updatedAt)}}):await tx.sponsorshipCampaign.create({data:attributes});await audit(tx,actor.id,previous?"campaign_updated":"campaign_created","SponsorshipCampaign",saved.id);return {id:saved.id};
 },{isolationLevel:"Serializable"});
}
export async function campaignConditions(id:string,db:Db) {
 const row=await db.sponsorshipCampaign.findUnique({where:{id},include:{package:true,order:{include:{transactions:{where:{status:"APPROVED",environment:"PRODUCTION",confirmedAt:{lte:new Date()},events:{some:{verifiedAt:{lte:new Date()},processedAt:{lte:new Date()}}}},select:{id:true}}}},tool:{select:{status:true,isDemo:true,publishedAt:true}},article:{select:{status:true,isDemo:true,publishedAt:true,reviewedAt:true}}}});
 if(!row)throw new AccessError(404,"La campaña no existe.");
 if(!row.package.active)throw new AccessError(422,"El paquete no está habilitado para entregar publicidad.");
 if(!row.order||row.order.status!=="PAID"||row.order.environment!=="PRODUCTION"||row.order.fulfillmentStatus==="ON_HOLD"||!row.order.paidAt||row.order.paidAt>new Date()||!row.order.transactions.length)throw new AccessError(422,"Se requiere una orden de producción pagada con transacción y evento verificados. No se aceptan Sandbox ni confirmaciones manuales desde este panel.");
 if(!row.startsAt||!row.endsAt||row.endsAt<=row.startsAt||row.endsAt<=new Date()||!row.headline||!row.message||!row.destinationUrl||!row.contractDurationDays||!row.contractAmountMinor||row.contractAmountMinor!==row.order.amountMinor||row.contractCurrency!==row.order.currency)throw new AccessError(422,"Completa creatividad, fechas y condiciones del contrato.");
 if(row.endsAt.getTime()-row.startsAt.getTime()>row.contractDurationDays*86400000)throw new AccessError(422,"El periodo excede la duración contratada.");
 const content=row.package.kind==="FEATURED_TOOL_LISTING"?row.tool:row.package.kind==="SPONSORED_ARTICLE"?row.article:null;
 if(!["HOMEPAGE_FEATURED_SPONSOR","NEWSLETTER_SPONSORSHIP"].includes(row.package.kind)&&(!content||content.status!=="PUBLISHED"||content.isDemo||!content.publishedAt||content.publishedAt>new Date()||("reviewedAt" in content&&!content.reviewedAt)))throw new AccessError(422,"El contenido vinculado debe estar publicado y revisado.");
 return row;
}
export async function transitionCampaign(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()) {
 z.uuid().parse(id);const data=z.object({action:z.enum(["request-review","approve","activate","pause","complete","cancel"]),expectedUpdatedAt:z.iso.datetime(),confirmation:z.boolean().optional()}).strict().parse(input);
 return db.$transaction(async tx=>{const actor=await authorizeActor(userId,"commercial",tx);const row=await tx.sponsorshipCampaign.findUnique({where:{id},include:{package:{select:{kind:true}}}});if(!row)throw new AccessError(404,"La campaña no existe.");changed(row.updatedAt,data.expectedUpdatedAt);
 let status:typeof row.status;const fields:Prisma.SponsorshipCampaignUncheckedUpdateInput={updatedAt:nextDate(row.updatedAt)};
 if(data.action==="cancel"){status="CANCELLED";fields.approvedById=null;fields.approvedAt=null;}
 else if(data.action==="pause"){status="DRAFT";fields.approvedById=null;fields.approvedAt=null;}
 else if(data.action==="complete"){if(!["APPROVED","ACTIVE"].includes(row.status)||!row.endsAt||row.endsAt>new Date())throw new AccessError(422,"Solo se finaliza una campaña aprobada cuyo periodo ya terminó.");status="COMPLETED";}
 else if(data.action==="request-review"){if(row.status!=="DRAFT")throw new AccessError(409,"La campaña debe estar en borrador.");status="PENDING_APPROVAL";}
 else {
  if(data.confirmation!==true)throw new AccessError(422,"Confirma la revisión comercial y editorial.");await campaignConditions(id,tx);
  const slot=`ad:${row.packageId}:${row.toolId??row.articleId??"homepage"}`;await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slot}))`;
  const overlap=await tx.sponsorshipCampaign.count({where:{id:{not:id},packageId:row.packageId,status:{in:["APPROVED","ACTIVE"]},toolId:row.toolId,articleId:row.articleId,startsAt:{lt:row.endsAt!},endsAt:{gt:row.startsAt!}}});if(overlap)throw new AccessError(409,"Este espacio ya tiene una campaña aprobada en esas fechas.");
  if(data.action==="approve"){if(row.status!=="PENDING_APPROVAL")throw new AccessError(409,"Solicita revisión primero.");status="APPROVED";fields.approvedAt=new Date();fields.approvedById=actor.id;}
  else {if(row.status!=="APPROVED"||!row.approvedAt||!row.approvedById)throw new AccessError(409,"La campaña requiere aprobación previa.");status="ACTIVE";}
 }
 await tx.sponsorshipCampaign.update({where:{id},data:{...fields,status}});await audit(tx,actor.id,`campaign_${data.action}`,"SponsorshipCampaign",id);return {status};
 },{isolationLevel:"Serializable",timeout:15000});
}
