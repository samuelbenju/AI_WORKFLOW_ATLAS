import "server-only";
import {randomBytes} from "node:crypto";
import {inquirySchema,type PackageDto} from "@/lib/commercial";
import {getDatabase} from "@/server/db/client";
import type {PrismaClient} from "@/generated/prisma/client";
import {AccessError} from "@/server/auth/policy";
import {commercialDigest,verifyInquiryForm} from "./config";
export async function publicPackages(db:PrismaClient=getDatabase()):Promise<PackageDto[]> {
 const rows=await db.sponsorshipPackage.findMany({select:{id:true,slug:true,kind:true,name:true,description:true,amountMinor:true,currency:true,durationDays:true,active:true,acceptingInquiries:true,availability:true,updatedAt:true},orderBy:{createdAt:"asc"}});
 return rows.map(row=>({...row,amountMinor:row.amountMinor?.toString()??null,updatedAt:row.updatedAt.toISOString()}));
}
async function consumeLimit(key:string,maximum:number,seconds:number,db:PrismaClient) {
 const rows=await db.$queryRaw<{attempts:number}[]>`INSERT INTO "CommercialRateLimit" ("keyHash","attempts","windowStarted") VALUES (${commercialDigest(key)},1,CURRENT_TIMESTAMP)
 ON CONFLICT ("keyHash") DO UPDATE SET "attempts"=CASE WHEN "CommercialRateLimit"."windowStarted"<CURRENT_TIMESTAMP-make_interval(secs=>${seconds}) THEN 1 ELSE "CommercialRateLimit"."attempts"+1 END,
 "windowStarted"=CASE WHEN "CommercialRateLimit"."windowStarted"<CURRENT_TIMESTAMP-make_interval(secs=>${seconds}) THEN CURRENT_TIMESTAMP ELSE "CommercialRateLimit"."windowStarted" END RETURNING "attempts"`;
 if(!rows[0]||rows[0].attempts>maximum)throw new AccessError(429,"Too many inquiries. Please wait before trying again.");
}
export async function submitInquiry(input:unknown,db:PrismaClient=getDatabase()) {
 const data=inquirySchema.parse(input);verifyInquiryForm(data.submissionId,data.token);
 if(data.websiteConfirmation)throw new AccessError(422,"The inquiry could not be accepted.");
 const payload={packageId:data.packageId,companyName:data.companyName,contactName:data.contactName,email:data.email,websiteUrl:data.websiteUrl,message:data.message,consentVersion:data.consentVersion,requestedStartsAt:data.requestedStartsAt};
 const digest=commercialDigest(JSON.stringify({...payload,packageUpdatedAt:data.packageUpdatedAt}));
 const existing=await db.commercialLead.findUnique({where:{submissionId:data.submissionId},select:{reference:true,payloadDigest:true}});
 if(existing){if(existing.payloadDigest!==digest)throw new AccessError(409,"This submitted form changed. Refresh to start a new inquiry.");return {reference:existing.reference!,received:true};}
 await consumeLimit("inquiry:global",60,60,db);
 await db.commercialRateLimit.deleteMany({where:{windowStarted:{lt:new Date(Date.now()-86400000)}}});await consumeLimit(`inquiry:email:${data.email}`,3,900,db);
 for(let attempt=0;attempt<2;attempt++)try {
  return await db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`inquiry:${digest}`}))`;
   const duplicate=await tx.commercialLead.findFirst({where:{payloadDigest:digest,createdAt:{gte:new Date(Date.now()-86400000)}},select:{reference:true}});
   if(duplicate?.reference)return {reference:duplicate.reference,received:true};
   const product=await tx.sponsorshipPackage.findUnique({where:{id:data.packageId}});
   if(!product||!product.acceptingInquiries||product.availability==="UNAVAILABLE")throw new AccessError(409,"This package is not accepting inquiries. Choose another option.");
   if(product.updatedAt.toISOString()!==data.packageUpdatedAt)throw new AccessError(409,"Package details changed. Refresh to review the current terms.");
   const reference=`ATLAS-${randomBytes(10).toString("hex").toUpperCase()}`;
   const lead=await tx.commercialLead.create({data:{...payload,requestedStartsAt:data.requestedStartsAt?new Date(data.requestedStartsAt):null,submissionId:data.submissionId,payloadDigest:digest,reference,consentAt:new Date(),quotedAmountMinor:product.amountMinor,quotedCurrency:product.currency,quotedDurationDays:product.durationDays,quotedPackageName:product.name}});
   await tx.auditLog.create({data:{action:"commercial.inquiry_received",entityType:"CommercialLead",entityId:lead.id,metadata:{packageId:product.id,consentVersion:data.consentVersion}}});
   return {reference,received:true};
  },{isolationLevel:"Serializable",timeout:10000});
 }catch(error){const code=(error as {code?:string}).code;if(code!=="P2034"&&code!=="P2002")throw error;const saved=await db.commercialLead.findFirst({where:{payloadDigest:digest,createdAt:{gte:new Date(Date.now()-86400000)}},select:{reference:true}});if(saved?.reference)return {reference:saved.reference,received:true};if(attempt===1)throw new AccessError(409,"The request changed while saving. Please try again.");}
 throw new AccessError(500,"The inquiry could not be saved.");
}
