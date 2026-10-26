import "server-only";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import type {PrismaClient,Prisma} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {authorizeActor} from "@/server/admin/content";
import {AccessError} from "@/server/auth/policy";
import {createOrderSchema,orderQuery,sha256,type ProviderTransaction} from "@/lib/payments/protocol";
import type {PaymentProvider} from "./provider";
import {WompiSandboxProvider,wompiConfiguration,paymentOrigin} from "./wompi";
type Db=PrismaClient|Prisma.TransactionClient;
async function history(db:Db,orderId:string,action:string,details:Prisma.InputJsonValue={},actorId?:string){await db.paymentOrderHistory.create({data:{orderId,action,details,actorId}});}
async function lockOrder(tx:Db,id:string){await tx.$queryRaw`SELECT "id" FROM "PaymentOrder" WHERE "id"=${id}::uuid FOR UPDATE`;}
function sandbox(provider:PaymentProvider){if(provider.environment!=="SANDBOX"||provider.name!=="WOMPI")throw new AccessError(503,"Solo Wompi Sandbox está habilitado.");}
export async function createPaymentOrder(userId:string,input:unknown,db:PrismaClient=getDatabase()){
 const data=createOrderSchema.parse(input);
 return db.$transaction(async tx=>{await authorizeActor(userId,"payments",tx);await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.requestId}))`;
 const existing=await tx.paymentOrder.findUnique({where:{creationKey:data.requestId}});if(existing){if(existing.sponsorId!==data.sponsorId||existing.packageId!==data.packageId||existing.leadId!==data.leadId||existing.priceVersion?.toISOString()!==data.packageUpdatedAt)throw new AccessError(409,"La petición ya fue usada con otros datos.");return {id:existing.id,reference:existing.reference};}
 const product=await tx.sponsorshipPackage.findUniqueOrThrow({where:{id:data.packageId}});
 if(product.updatedAt.toISOString()!==data.packageUpdatedAt)throw new AccessError(409,"El precio o paquete cambió. Recarga antes de crear la orden.");
 if(!product.active||product.availability!=="AVAILABLE"||product.amountMinor===null||product.amountMinor<=0n||product.amountMinor>BigInt(Number.MAX_SAFE_INTEGER))throw new AccessError(422,"El paquete debe estar disponible, habilitado y tener un precio válido.");
 if(product.currency!=="COP")throw new AccessError(422,"Wompi Colombia cobra en COP. Configura un precio comercial en COP; no se realizan conversiones automáticas.");
 if(!await tx.sponsor.findUnique({where:{id:data.sponsorId}}))throw new AccessError(422,"No existe el patrocinador.");
 if(data.leadId&&!await tx.commercialLead.findFirst({where:{id:data.leadId,sponsorId:data.sponsorId,packageId:data.packageId}}))throw new AccessError(422,"La solicitud debe corresponder al patrocinador y paquete.");
 const row=await tx.paymentOrder.create({data:{creationKey:data.requestId,priceVersion:product.updatedAt,reference:`ATLAS-SBX-${randomUUID().replaceAll("-","").toUpperCase()}`,sponsorId:data.sponsorId,packageId:data.packageId,leadId:data.leadId,amountMinor:product.amountMinor,currency:"COP",commercialAmountMinor:product.amountMinor,commercialCurrency:product.currency,environment:"SANDBOX",expiresAt:new Date(Date.now()+86400000)}});
 await history(tx,row.id,"order_created",{packageName:product.name,commercialAmountMinor:product.amountMinor.toString(),commercialCurrency:product.currency,chargeAmountMinor:row.amountMinor.toString(),chargeCurrency:row.currency,environment:"SANDBOX"},userId);await tx.auditLog.create({data:{actorId:userId,action:"payments.order_created",entityType:"PaymentOrder",entityId:row.id}});return {id:row.id,reference:row.reference};});
}
export async function prepareCheckout(userId:string,id:string,db:PrismaClient=getDatabase(),provider:PaymentProvider=new WompiSandboxProvider()){
 z.uuid().parse(id);sandbox(provider);
 return db.$transaction(async tx=>{await authorizeActor(userId,"payments",tx);await lockOrder(tx,id);const order=await tx.paymentOrder.findUniqueOrThrow({where:{id}});
 if(order.environment!=="SANDBOX"||order.currency!=="COP"||order.status!=="PENDING"||!order.creationKey||!order.expiresAt||order.expiresAt<=new Date())throw new AccessError(409,"La orden no admite un checkout Sandbox.");
 let attempt=await tx.paymentAttempt.findFirst({where:{orderId:id,status:{in:["PREPARED","PENDING","REVIEW","EXPIRED"]}},orderBy:{createdAt:"desc"}});
 if(attempt&&attempt.expiresAt<=new Date())throw new AccessError(409,"El intento requiere conciliación antes de reintentar. No se creará otro checkout a ciegas.");
 if(!attempt)attempt=await tx.paymentAttempt.create({data:{reference:`ATLAS-TEST-${randomUUID().replaceAll("-","")}`,provider:provider.name,orderId:id,amountMinor:order.amountMinor,currency:"COP",environment:"SANDBOX",expiresAt:new Date(Math.min(order.expiresAt.getTime(),Date.now()+3600000))}});
 const result=provider.checkout({reference:attempt.reference,amountMinor:attempt.amountMinor,currency:"COP",expiresAt:attempt.expiresAt,returnUrl:new URL("/payments/return",paymentOrigin()).toString()});
 await history(tx,id,"checkout_prepared",{attemptId:attempt.id,reference:attempt.reference,environment:"SANDBOX"},userId);return {attemptId:attempt.id,url:result.url,expiresAt:result.expiresAt.toISOString(),environment:"SANDBOX"};});
}
async function recordEvent(db:PrismaClient,eventId:string,digest:string,source:string,transaction:ProviderTransaction){return db.paymentEvent.upsert({where:{provider_environment_providerEventId:{provider:"WOMPI",environment:"SANDBOX",providerEventId:eventId}},update:{},create:{provider:"WOMPI",environment:"SANDBOX",providerEventId:eventId,eventType:"transaction.updated",payloadDigest:digest,source,verifiedAt:new Date(),summary:{transactionId:transaction.id,reportedStatus:transaction.status}}});}
async function applyObservation(eventId:string,observation:ProviderTransaction,db:PrismaClient,actorId?:string){
 return db.$transaction(async tx=>{
  const attempt=await tx.paymentAttempt.findUnique({where:{reference:observation.reference}});
  if(attempt)await lockOrder(tx,attempt.orderId);
  await tx.$queryRaw`SELECT "id" FROM "PaymentEvent" WHERE "id"=${eventId}::uuid FOR UPDATE`;const event=await tx.paymentEvent.findUniqueOrThrow({where:{id:eventId}});if(["PROCESSED","CONFLICT","IGNORED"].includes(event.processingStatus))return {received:true,duplicate:true};
  const stop=async(code:string,status="CONFLICT")=>{await tx.paymentEvent.update({where:{id:eventId},data:{processingStatus:status,errorCode:code,processedAt:new Date()}});return {received:true,reviewRequired:status==="CONFLICT"};};
  if(!attempt)return stop("UNKNOWN_REFERENCE","IGNORED");
  const order=await tx.paymentOrder.findUniqueOrThrow({where:{id:attempt.orderId}});
  if(attempt.provider!=="WOMPI"||attempt.environment!=="SANDBOX"||order.environment!=="SANDBOX"||order.currency!=="COP"||observation.currency!=="COP"||order.amountMinor!==BigInt(observation.amount_in_cents))return stop("ORDER_AMOUNT_OR_ENVIRONMENT_MISMATCH");
  const key={provider:"WOMPI",environment:"SANDBOX" as const,providerTransactionId:observation.id};const previous=await tx.paymentTransaction.findUnique({where:{provider_environment_providerTransactionId:key}});
  if(previous&&previous.orderId!==order.id)return stop("TRANSACTION_BOUND_TO_OTHER_ORDER");
  if(previous&&previous.status!=="PENDING"&&previous.status!==observation.status&&!(previous.status==="APPROVED"&&observation.status==="VOIDED"))return stop("NON_MONOTONIC_TRANSACTION_STATE");
  const otherApproval=observation.status==="APPROVED"?await tx.paymentTransaction.findFirst({where:{orderId:order.id,status:"APPROVED",providerTransactionId:{not:observation.id}}}):null;
  const transaction=await tx.paymentTransaction.upsert({where:{provider_environment_providerTransactionId:key},create:{...key,orderId:order.id,attemptId:attempt.id,amountMinor:order.amountMinor,currency:order.currency,status:observation.status,confirmedAt:observation.status==="APPROVED"?new Date():null},update:{status:observation.status,confirmedAt:observation.status==="APPROVED"?(previous?.confirmedAt??new Date()):previous?.confirmedAt??null}});
  await tx.paymentAttempt.update({where:{id:attempt.id},data:{status:otherApproval?"REVIEW":observation.status}});
  const closed=["CANCELLED","EXPIRED"].includes(order.status)||!!order.expiresAt&&order.expiresAt<=new Date();
  if(observation.status==="APPROVED")await tx.paymentOrder.update({where:{id:order.id},data:{status:"PAID",paidAt:order.paidAt??new Date(),fulfillmentStatus:otherApproval||closed||order.fulfillmentStatus==="ON_HOLD"?"ON_HOLD":"SANDBOX_ONLY"}});
  if(observation.status==="VOIDED"&&order.status==="PAID")await tx.paymentOrder.update({where:{id:order.id},data:{status:"CANCELLED",fulfillmentStatus:"ON_HOLD"}});
  await tx.paymentEvent.update({where:{id:eventId},data:{transactionId:transaction.id,processingStatus:otherApproval?"CONFLICT":"PROCESSED",errorCode:otherApproval?"MULTIPLE_APPROVALS":closed&&observation.status==="APPROVED"?"LATE_PAYMENT_REVIEW":null,processedAt:new Date(),summary:{transactionId:observation.id,status:observation.status,reference:observation.reference,amountMinor:String(observation.amount_in_cents),currency:observation.currency}}});
  await history(tx,order.id,"payment_observed",{eventId,transactionId:transaction.id,status:observation.status,source:event.source,environment:"SANDBOX",reviewRequired:!!otherApproval||closed},actorId);
  return {received:true,reviewRequired:!!otherApproval||closed};
 });
}
export async function receiveWompiWebhook(input:unknown,header:string|null,db:PrismaClient=getDatabase(),provider:PaymentProvider=new WompiSandboxProvider()){
 sandbox(provider);let verified:ReturnType<PaymentProvider["verifyEvent"]>;try{verified=provider.verifyEvent(input,header);}catch(error){if(error instanceof AccessError)throw error;throw new AccessError(400,"Evento Sandbox o firma no válidos.");}
 const event=await recordEvent(db,`event:${verified.eventId}`,verified.digest,"WEBHOOK",verified.transaction);
 if(["PROCESSED","CONFLICT","IGNORED"].includes(event.processingStatus))return {received:true,duplicate:true};
 let observation:ProviderTransaction;
 try{observation=await provider.lookup(verified.transaction.id);}catch{await db.paymentEvent.updateMany({where:{id:event.id,processingStatus:{in:["RECEIVED","RETRYABLE"]}},data:{processingStatus:"RETRYABLE",errorCode:"PROVIDER_LOOKUP_FAILED"}});throw new AccessError(503,"No se pudo verificar el evento con Wompi Sandbox. Se admite reintento del mismo evento.");}
 if(observation.id!==verified.transaction.id||observation.amount_in_cents!==verified.transaction.amount_in_cents){await db.paymentEvent.update({where:{id:event.id},data:{processingStatus:"CONFLICT",errorCode:"SIGNED_TRANSACTION_MISMATCH",processedAt:new Date()}});return {received:true,reviewRequired:true};}
 return applyObservation(event.id,observation,db);
}
export async function reconcilePayment(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase(),provider:PaymentProvider=new WompiSandboxProvider()){
 z.uuid().parse(id);sandbox(provider);await authorizeActor(userId,"payments",db);const {transactionId}=z.object({transactionId:z.string().min(1).max(150).regex(/^[A-Za-z0-9_-]+$/)}).strict().parse(input);const order=await db.paymentOrder.findUniqueOrThrow({where:{id}});if(order.environment!=="SANDBOX"||!order.creationKey)throw new AccessError(422,"Solo se concilian órdenes Sandbox creadas por este módulo.");
 let observed:ProviderTransaction;try{observed=await provider.lookup(transactionId);}catch{await history(db,id,"reconciliation_failed",{errorCode:"PROVIDER_LOOKUP_FAILED"},userId);throw new AccessError(503,"Wompi Sandbox no respondió. No se cambió el estado del pago.");}
 if(!await db.paymentAttempt.findFirst({where:{orderId:id,reference:observed.reference}}))throw new AccessError(422,"La transacción no corresponde a un intento de esta orden.");
 const digest=sha256(JSON.stringify(observed)),event=await recordEvent(db,`reconcile:${digest}`,digest,"RECONCILIATION",observed);return applyObservation(event.id,observed,db,userId);
}
export async function cancelPaymentOrder(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()){
 z.uuid().parse(id);z.object({confirmation:z.literal("CANCELAR")}).strict().parse(input);return db.$transaction(async tx=>{await authorizeActor(userId,"payments",tx);await lockOrder(tx,id);const row=await tx.paymentOrder.findUniqueOrThrow({where:{id}});if(row.environment!=="SANDBOX"||row.status!=="PENDING"||!row.creationKey)throw new AccessError(409,"Solo se cancelan órdenes Sandbox pendientes.");await tx.paymentOrder.update({where:{id},data:{status:"CANCELLED",fulfillmentStatus:"ON_HOLD"}});await history(tx,id,"order_cancelled",{},userId);return {cancelled:true};});
}
export async function paymentsOverview(userId:string,input:unknown,db:PrismaClient=getDatabase()){
 await authorizeActor(userId,"payments",db);const query=orderQuery.parse(input);const where:Prisma.PaymentOrderWhereInput={...(query.status?{status:query.status}:{}),OR:[{reference:{contains:query.q,mode:"insensitive"}},{sponsor:{name:{contains:query.q,mode:"insensitive"}}}]};
 const [orders,total,sponsors,packages,events]=await db.$transaction([
 db.paymentOrder.findMany({where,include:{sponsor:{select:{name:true}},package:{select:{name:true}},attempts:{orderBy:{createdAt:"desc"},take:20},history:{orderBy:{createdAt:"desc"},take:30},transactions:{include:{events:{orderBy:{receivedAt:"desc"},take:20}},take:30,orderBy:{createdAt:"desc"}}},orderBy:[{createdAt:"desc"},{id:"asc"}],take:12,skip:(query.page-1)*12}),db.paymentOrder.count({where}),db.sponsor.findMany({select:{id:true,name:true},take:500,orderBy:{name:"asc"}}),db.sponsorshipPackage.findMany({orderBy:{name:"asc"}}),db.paymentEvent.findMany({where:{provider:"WOMPI",environment:"SANDBOX"},orderBy:{receivedAt:"desc"},take:50})
 ]);return {orders,total,sponsors,packages,events,ready:wompiConfiguration().ready};
}
