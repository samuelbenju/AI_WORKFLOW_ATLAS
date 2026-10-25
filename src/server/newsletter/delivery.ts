import "server-only";
import type {PrismaClient} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {decryptMessage,emailConfiguration} from "./config";
import {ResendEmailService,type EmailService} from "./provider";
import {lockSubscriber} from "./subscribers";
import {publishedArticleWhere} from "@/server/editorial/public";
import {campaignConditions} from "@/server/commercial/admin";
export async function dispatchDelivery(id:string,db:PrismaClient=getDatabase(),provider:EmailService=new ResendEmailService()){
 const candidate=await db.newsletterDelivery.findUniqueOrThrow({where:{id}});
 // Persist an uncertainty barrier BEFORE external I/O. A process/commit failure never
 // leaves a message eligible for another send after the provider idempotency window.
 const claimed=await db.newsletterDelivery.updateMany({where:{id,status:{in:["QUEUED","BLOCKED"]}},data:{status:"UNKNOWN",errorCode:"DISPATCH_IN_PROGRESS",attemptedAt:new Date()}});
 if(!claimed.count)return (await db.newsletterDelivery.findUniqueOrThrow({where:{id}})).status;
 return db.$transaction(async tx=>{
  // Serialize unsubscribe and concurrent delivery on the same consent record.
  await lockSubscriber(tx,candidate.subscriberId);await tx.$queryRaw`SELECT "id" FROM "NewsletterDelivery" WHERE "id"=${id}::uuid FOR UPDATE`;
  const row=await tx.newsletterDelivery.findUniqueOrThrow({where:{id},include:{subscriber:true,campaign:true}});
  if(row.status!=="UNKNOWN"||row.errorCode!=="DISPATCH_IN_PROGRESS")return row.status;
  if(row.subscriber.generation!==row.generation||(row.kind==="CAMPAIGN"?row.subscriber.status!=="CONFIRMED":row.subscriber.status!=="PENDING"||!row.subscriber.tokenExpiresAt||row.subscriber.tokenExpiresAt<=new Date())){await tx.newsletterDelivery.update({where:{id},data:{status:"CANCELLED",errorCode:"CONSENT_NOT_CURRENT"}});return "CANCELLED";}
  const message=decryptMessage(row.payload);
  if(row.campaign){if(row.campaign.sourceArticleIds.length&&await tx.article.count({where:{...publishedArticleWhere(),id:{in:row.campaign.sourceArticleIds}}})!==row.campaign.sourceArticleIds.length){await tx.newsletterDelivery.update({where:{id},data:{status:"BLOCKED",errorCode:"SOURCES_NOT_PUBLIC"}});return "BLOCKED";}if(row.campaign.status!=="APPROVED"||row.campaign.preparedMode!==emailConfiguration().mode){await tx.newsletterDelivery.update({where:{id},data:{status:"CANCELLED",errorCode:"CAMPAIGN_NOT_CURRENT"}});return "CANCELLED";}if(row.campaign.sponsorshipCampaignId){try{const ad=await campaignConditions(row.campaign.sponsorshipCampaignId,tx);if(ad.status!=="ACTIVE"||!ad.startsAt||ad.startsAt>new Date()||ad.updatedAt.toISOString()!==message.sponsorshipUpdatedAt)throw new Error();}catch{await tx.newsletterDelivery.update({where:{id},data:{status:"BLOCKED",errorCode:"SPONSOR_NOT_ELIGIBLE"}});return "BLOCKED";}}}
  if(row.mode!==emailConfiguration().mode){await tx.newsletterDelivery.update({where:{id},data:{status:"BLOCKED",errorCode:"MODE_CHANGED"}});return "BLOCKED";}
  const result=await provider.send(message,row.idempotencyKey);
  await tx.newsletterDelivery.update({where:{id},data:{status:result.status,providerMessageId:result.providerMessageId??null,errorCode:result.errorCode??null,attemptedAt:new Date(),acceptedAt:result.status==="ACCEPTED"?new Date():null}});return result.status;
 },{timeout:20000});
}
