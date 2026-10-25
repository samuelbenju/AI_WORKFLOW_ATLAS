import "server-only";
import {randomBytes,randomUUID} from "node:crypto";
import {z} from "zod";
import type {PrismaClient,Prisma} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {AccessError} from "@/server/auth/policy";
import {signupSchema} from "@/lib/newsletter";
import {sign,tokenHash,verifyNewsletterForm,unsubscribeToken,parseUnsubscribeToken,newsletterOrigin,encryptMessage,emailConfiguration} from "./config";
import {confirmationEmail} from "./templates";
import {dispatchDelivery} from "./delivery";
export type NewsletterDb=PrismaClient|Prisma.TransactionClient;
export async function lockSubscriber(tx:NewsletterDb,id:string){await tx.$queryRaw`SELECT "id" FROM "NewsletterSubscriber" WHERE "id"=${id}::uuid FOR UPDATE`;}
async function rateLimit(key:string,maximum:number,db:PrismaClient){const digest=sign(`rate:${key}`);const rows=await db.$queryRaw<{attempts:number}[]>`INSERT INTO "NewsletterRateLimit" ("keyHash","attempts","windowStarted") VALUES (${digest},1,CURRENT_TIMESTAMP) ON CONFLICT ("keyHash") DO UPDATE SET "attempts"=CASE WHEN "NewsletterRateLimit"."windowStarted"<CURRENT_TIMESTAMP-INTERVAL '1 hour' THEN 1 ELSE "NewsletterRateLimit"."attempts"+1 END,"windowStarted"=CASE WHEN "NewsletterRateLimit"."windowStarted"<CURRENT_TIMESTAMP-INTERVAL '1 hour' THEN CURRENT_TIMESTAMP ELSE "NewsletterRateLimit"."windowStarted" END RETURNING "attempts"`;if(!rows[0]||rows[0].attempts>maximum)throw new AccessError(429,"Too many requests. Please try again later.");}
export async function subscribe(input:unknown,db:PrismaClient=getDatabase()){
 const data=signupSchema.parse(input);verifyNewsletterForm(data.source,data.nonce,data.formToken);
 await rateLimit("signup:global",100,db);await rateLimit(`signup:${data.email}`,3,db);
 const deliveryId=await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sign(`subscriber:${data.email}`)}))`;
  let row=await tx.newsletterSubscriber.findUnique({where:{email:data.email}});
  if(row){await lockSubscriber(tx,row.id);row=await tx.newsletterSubscriber.findUniqueOrThrow({where:{id:row.id}});if(row.status==="CONFIRMED")return null;const latest=await tx.newsletterDelivery.findFirst({where:{subscriberId:row.id,kind:"CONFIRMATION"},orderBy:{createdAt:"desc"}});if(latest&&latest.createdAt.getTime()>Date.now()-300000)return null;}
  const token=randomBytes(32).toString("hex"),now=new Date(),generation=(row?.generation??0)+1;
  const fields={status:"PENDING" as const,consentAt:now,consentVersion:data.consentVersion,consentSource:data.source,confirmedAt:null,unsubscribedAt:null,tokenHash:tokenHash(token),tokenExpiresAt:new Date(Date.now()+86400000),generation};
  row=row?await tx.newsletterSubscriber.update({where:{id:row.id},data:fields}):await tx.newsletterSubscriber.create({data:{email:data.email,...fields}});
  await tx.newsletterDelivery.updateMany({where:{subscriberId:row.id,status:{in:["QUEUED","BLOCKED"]}},data:{status:"CANCELLED",errorCode:"CONSENT_SUPERSEDED"}});
  await tx.newsletterConsent.create({data:{subscriberId:row.id,generation,action:"SUBSCRIBE",version:data.consentVersion,source:data.source}});
  const config=emailConfiguration(),id=randomUUID(),origin=new URL(newsletterOrigin());
  const confirmation=new URL("/newsletter/confirm",origin);confirmation.hash=new URLSearchParams({token}).toString();
  const cancellation=new URL("/newsletter/unsubscribe",origin);cancellation.hash=new URLSearchParams({token:unsubscribeToken(row.id,generation)}).toString();
  const message=confirmationEmail(row.email,config.from,confirmation.toString(),cancellation.toString());
  await tx.newsletterDelivery.create({data:{id,subscriberId:row.id,generation,kind:"CONFIRMATION",mode:config.mode,idempotencyKey:`atlas-confirm-${id}`,payload:encryptMessage(message)}});return id;
 });
 if(deliveryId)await dispatchDelivery(deliveryId,db);
 // Identical response for new, pending, active and suppressed addresses.
 return {received:true,message:emailConfiguration().mode==="capture"?"Local test capture recorded; no email was sent. Confirmation is still required.":emailConfiguration().ready?"If confirmation is needed, check your inbox. Your subscription starts only after confirmation.":"Your request was recorded. Email delivery is not configured; no email was sent. Confirmation is required before newsletters can be sent."};
}
export async function confirmSubscription(token:string,db:PrismaClient=getDatabase()){
 z.string().regex(/^[a-f0-9]{64}$/).parse(token);const hash=tokenHash(token);
 return db.$transaction(async tx=>{const candidate=await tx.newsletterSubscriber.findUnique({where:{tokenHash:hash}});if(!candidate)throw new AccessError(400,"This confirmation link is invalid or has already been used.");await lockSubscriber(tx,candidate.id);const row=await tx.newsletterSubscriber.findUniqueOrThrow({where:{id:candidate.id}});
 if(row.status!=="PENDING"||row.tokenHash!==hash||!row.tokenExpiresAt||row.tokenExpiresAt<=new Date())throw new AccessError(400,"This confirmation link is invalid or expired.");
 await tx.newsletterSubscriber.update({where:{id:row.id},data:{status:"CONFIRMED",confirmedAt:new Date(),tokenHash:null,tokenExpiresAt:null}});await tx.newsletterConsent.create({data:{subscriberId:row.id,generation:row.generation,action:"CONFIRM",version:row.consentVersion,source:"email-confirmation"}});return {confirmed:true};});
}
export async function unsubscribe(token:string,db:PrismaClient=getDatabase()){
 const {id,generation}=parseUnsubscribeToken(token);
 return db.$transaction(async tx=>{await lockSubscriber(tx,id);const row=await tx.newsletterSubscriber.findUnique({where:{id}});if(!row||row.generation!==generation)throw new AccessError(400,"This unsubscribe link is no longer valid.");
 if(row.status!=="UNSUBSCRIBED"){await tx.newsletterSubscriber.update({where:{id},data:{status:"UNSUBSCRIBED",unsubscribedAt:new Date(),tokenHash:null,tokenExpiresAt:null}});await tx.newsletterConsent.create({data:{subscriberId:id,generation,action:"UNSUBSCRIBE",version:row.consentVersion,source:"secure-unsubscribe-link"}});await tx.newsletterDelivery.updateMany({where:{subscriberId:id,status:{in:["QUEUED","BLOCKED"]}},data:{status:"CANCELLED",errorCode:"UNSUBSCRIBED"}});}
 return {unsubscribed:true};});
}
