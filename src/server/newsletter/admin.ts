import "server-only";
import {z} from "zod";
import {randomUUID} from "node:crypto";
import type {PrismaClient,Prisma} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {authorizeActor} from "@/server/admin/content";
import {AccessError} from "@/server/auth/policy";
import {newsletterDraftSchema,newsletterBodySchema,subscriberQuery} from "@/lib/newsletter";
import {encryptMessage,decryptMessage,emailConfiguration,newsletterOrigin,unsubscribeToken} from "./config";
import {campaignEmail} from "./templates";
import {dispatchDelivery} from "./delivery";
import {campaignConditions} from "@/server/commercial/admin";
type Db=PrismaClient|Prisma.TransactionClient;
import {publishedArticleWhere} from "@/server/editorial/public";
async function approvedArticles(ids:string[],db:Db){const unique=[...new Set(ids)];if(unique.length!==ids.length)throw new AccessError(422,"No repitas artículos.");const rows=await db.article.findMany({where:{...publishedArticleWhere(),publishedAt:{lte:new Date()},id:{in:ids}},select:{id:true,title:true,excerpt:true,slug:true},orderBy:{publishedAt:"desc"}});if(rows.length!==ids.length)throw new AccessError(422,"Los artículos deben estar publicados, revisados y disponibles.");return rows;}
async function audit(db:Db,userId:string,action:string,id:string){await db.auditLog.create({data:{actorId:userId,action:`newsletter.${action}`,entityType:"NewsletterCampaign",entityId:id}});}
export async function newsletterOverview(userId:string,input:unknown,db:PrismaClient=getDatabase()){
 await authorizeActor(userId,"newsletter",db);const query=subscriberQuery.parse(input),where={...(query.status?{status:query.status}:{}),email:{contains:query.q,mode:"insensitive" as const}};
 const [subscribers,total,counts,campaigns,history,articles,sponsors]=await db.$transaction([
 db.newsletterSubscriber.findMany({where,select:{id:true,email:true,status:true,consentAt:true,consentVersion:true,consentSource:true,confirmedAt:true,unsubscribedAt:true},orderBy:[{createdAt:"desc"},{id:"asc"}],take:20,skip:(query.page-1)*20}),db.newsletterSubscriber.count({where}),db.$queryRaw<{status:string;total:bigint}[]>`SELECT "status", count(*) AS "total" FROM "NewsletterSubscriber" GROUP BY "status"`,
 db.newsletterCampaign.findMany({orderBy:{updatedAt:"desc"},take:100,include:{deliveries:{select:{status:true}}}}),
 db.newsletterDelivery.findMany({select:{id:true,kind:true,status:true,mode:true,providerMessageId:true,errorCode:true,createdAt:true,acceptedAt:true,subscriber:{select:{email:true}},campaign:{select:{subject:true}}},orderBy:{createdAt:"desc"},take:100}),
 db.article.findMany({where:{...publishedArticleWhere(),publishedAt:{lte:new Date()}},select:{id:true,title:true},take:100,orderBy:{publishedAt:"desc"}}),
 db.sponsorshipCampaign.findMany({where:{package:{kind:"NEWSLETTER_SPONSORSHIP"}},select:{id:true,name:true,status:true,sponsor:{select:{name:true}}},orderBy:{createdAt:"desc"},take:100})
 ]);return {subscribers,total,counts:counts.map(row=>({status:row.status,_count:Number(row.total)})),campaigns,history,articles,sponsors,config:emailConfiguration()};
}
export async function saveNewsletter(userId:string,input:unknown,id?:string,db:PrismaClient=getDatabase()){
 const data=newsletterDraftSchema.parse(input);if(id)z.uuid().parse(id);
 return db.$transaction(async tx=>{await authorizeActor(userId,"newsletter",tx);if(id)await tx.$queryRaw`SELECT "id" FROM "NewsletterCampaign" WHERE "id"=${id}::uuid FOR UPDATE`;
 const previous=id?await tx.newsletterCampaign.findUnique({where:{id}}):null;if(id&&!previous)throw new AccessError(404,"No existe el boletín.");
 if(previous&&(previous.status!=="DRAFT"||previous.updatedAt.toISOString()!==data.expectedUpdatedAt))throw new AccessError(409,"Solo se edita un borrador actual. Recarga; una audiencia preparada debe cancelarse y copiarse a otro borrador.");
 await approvedArticles(data.sourceArticleIds,tx);
 if(data.sponsorshipCampaignId&&!await tx.sponsorshipCampaign.findFirst({where:{id:data.sponsorshipCampaignId,package:{kind:"NEWSLETTER_SPONSORSHIP"}}}))throw new AccessError(422,"Selecciona una campaña de patrocinio de newsletter.");
 const {expectedUpdatedAt:_expected,...fields}=data;void _expected;
 const row=previous?await tx.newsletterCampaign.update({where:{id},data:{...fields,revision:{increment:1},updatedAt:new Date(Math.max(Date.now(),previous.updatedAt.getTime()+1))}}):await tx.newsletterCampaign.create({data:fields});await audit(tx,userId,previous?"draft_updated":"draft_created",row.id);return {id:row.id};});
}
// Future editor-agent entry point: approved inputs, draft output, no scheduler or sending tool.
export async function proposeNewsletter(userId:string,input:unknown,db:PrismaClient=getDatabase()){
 await authorizeActor(userId,"newsletter",db);const {articleIds}=z.object({articleIds:z.array(z.uuid()).min(1).max(12)}).strict().parse(input);const articles=await approvedArticles(articleIds,db);
 return saveNewsletter(userId,{subject:"From the Atlas: practical AI workflows",preheader:"A selection from our reviewed journal.",body:{version:1,paragraphs:articles.map(article=>`${article.title}\n${article.excerpt}`)},sourceArticleIds:articleIds,sponsorshipCampaignId:null},undefined,db);
}
export async function prepareNewsletter(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);const data=z.object({expectedUpdatedAt:z.iso.datetime(),recipientCount:z.number().int().min(1).max(1000),confirmation:z.literal(true)}).strict().parse(input);
 return db.$transaction(async tx=>{await authorizeActor(userId,"newsletter",tx);await tx.$queryRaw`SELECT "id" FROM "NewsletterCampaign" WHERE "id"=${id}::uuid FOR UPDATE`;
 const row=await tx.newsletterCampaign.findUniqueOrThrow({where:{id}});if(row.status!=="DRAFT"||row.updatedAt.toISOString()!==data.expectedUpdatedAt)throw new AccessError(409,"El borrador cambió o ya tiene audiencia preparada.");
 const body=newsletterBodySchema.parse(row.body),articles=await approvedArticles(row.sourceArticleIds,tx);const config=emailConfiguration();const recipients=await tx.newsletterSubscriber.findMany({where:{status:"CONFIRMED"},take:1001,orderBy:{id:"asc"}});
 if(recipients.length!==data.recipientCount||recipients.length>1000)throw new AccessError(409,"La audiencia cambió o supera 1000 destinatarios. Recarga y revisa el número antes de confirmar.");
 let sponsorshipUpdatedAt:string|undefined;let sponsor:Parameters<typeof campaignEmail>[7];if(row.sponsorshipCampaignId){const ad=await campaignConditions(row.sponsorshipCampaignId,tx);if(ad.package.kind!=="NEWSLETTER_SPONSORSHIP"||ad.status!=="ACTIVE"||!ad.startsAt||ad.startsAt>new Date())throw new AccessError(422,"El patrocinio requiere aprobación, pago real y periodo activo.");sponsorshipUpdatedAt=ad.updatedAt.toISOString();const company=await tx.sponsor.findUniqueOrThrow({where:{id:ad.sponsorId}});sponsor={name:company.name,headline:ad.headline!,message:ad.message!,url:ad.destinationUrl!};}
 const origin=newsletterOrigin();
 for(const subscriber of recipients){const deliveryId=randomUUID(),cancel=new URL("/newsletter/unsubscribe",origin);cancel.hash=new URLSearchParams({token:unsubscribeToken(subscriber.id,subscriber.generation)}).toString();
 const message=campaignEmail(subscriber.email,config.from,row.subject,row.preheader,body,articles.map(article=>({title:article.title,url:new URL(`/blog/${article.slug}`,origin).toString()})),cancel.toString(),sponsor);
 await tx.newsletterDelivery.create({data:{id:deliveryId,subscriberId:subscriber.id,campaignId:id,generation:subscriber.generation,kind:"CAMPAIGN",mode:config.mode,idempotencyKey:`atlas-news-${deliveryId}`,payload:encryptMessage({...message,...(sponsorshipUpdatedAt?{sponsorshipUpdatedAt}:{})})}});}
 await tx.newsletterCampaign.update({where:{id},data:{status:"APPROVED",approvedById:userId,approvedAt:new Date(),preparedMode:config.mode}});await audit(tx,userId,"audience_prepared",id);return {prepared:recipients.length,sent:0};
 },{timeout:20000,isolationLevel:"Serializable"});
}
export async function sendNewsletterBatch(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);const data=z.object({confirmation:z.literal("ENVIAR"),recipientCount:z.number().int().min(1).max(1000),expectedUpdatedAt:z.iso.datetime()}).strict().parse(input);await authorizeActor(userId,"newsletter",db);
 const row=await db.newsletterCampaign.findUniqueOrThrow({where:{id},include:{_count:{select:{deliveries:true}}}});
 if(row.status!=="APPROVED"||row.updatedAt.toISOString()!==data.expectedUpdatedAt||row._count.deliveries!==data.recipientCount)throw new AccessError(409,"Revisa de nuevo la campaña y su audiencia antes de autorizar el envío.");
 const config=emailConfiguration();if(!config.ready||config.mode!==row.preparedMode)throw new AccessError(503,"Proveedor no disponible o modo cambiado. No se envió ningún correo.");
 await audit(db,userId,"batch_authorized",id);
 const deliveries=await db.newsletterDelivery.findMany({where:{campaignId:id,status:{in:["QUEUED","BLOCKED"]}},select:{id:true},take:2,orderBy:{id:"asc"}});const results:Record<string,number>={};
 for(const delivery of deliveries){await authorizeActor(userId,"newsletter",db);const state=await dispatchDelivery(delivery.id,db);results[state]=(results[state]??0)+1;}
 const total=await db.newsletterDelivery.count({where:{campaignId:id}}),accepted=await db.newsletterDelivery.count({where:{campaignId:id,status:"ACCEPTED"}});
 if(total&&accepted===total)await db.newsletterCampaign.updateMany({where:{id,status:"APPROVED"},data:{status:"SENT",sentAt:new Date()}});
 return {processed:deliveries.length,results};
}
export async function cancelNewsletter(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);z.object({confirmation:z.literal("CANCELAR")}).strict().parse(input);
 return db.$transaction(async tx=>{await authorizeActor(userId,"newsletter",tx);const row=await tx.newsletterCampaign.findUniqueOrThrow({where:{id}});if(row.status==="SENT")throw new AccessError(409,"Los correos aceptados no pueden retirarse.");await tx.newsletterCampaign.update({where:{id},data:{status:"CANCELLED"}});await tx.newsletterDelivery.updateMany({where:{campaignId:id,status:{in:["QUEUED","BLOCKED"]}},data:{status:"CANCELLED",errorCode:"CAMPAIGN_CANCELLED"}});await audit(tx,userId,"cancelled",id);return {cancelled:true};});
}
export async function localEmailPreview(userId:string,id:string,db:PrismaClient=getDatabase()){
 await authorizeActor(userId,"newsletter",db);z.uuid().parse(id);if(emailConfiguration().mode!=="capture")throw new AccessError(404,"La captura solo está disponible en bases de pruebas aisladas.");const row=await db.newsletterDelivery.findUniqueOrThrow({where:{id}});if(row.status!=="CAPTURED")throw new AccessError(404,"No existe una captura local.");const message=decryptMessage(row.payload);return {notice:"Captura local, no se envió correo.",text:message.text};
}

export async function copyNewsletter(userId:string,id:string,db:PrismaClient=getDatabase()){
 await authorizeActor(userId,"newsletter",db);z.uuid().parse(id);const row=await db.newsletterCampaign.findUniqueOrThrow({where:{id}});
 return saveNewsletter(userId,{subject:row.subject,preheader:row.preheader,body:row.body,sourceArticleIds:row.sourceArticleIds,sponsorshipCampaignId:row.sponsorshipCampaignId},undefined,db);
}
