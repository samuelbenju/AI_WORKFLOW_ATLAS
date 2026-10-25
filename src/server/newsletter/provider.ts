import "server-only";
import type {EmailMessage} from "@/lib/newsletter";
import {emailConfiguration} from "./config";
export type EmailResult={status:"BLOCKED"|"CAPTURED"|"ACCEPTED"|"FAILED"|"UNKNOWN";providerMessageId?:string;errorCode?:string};
export interface EmailService {send(message:EmailMessage,idempotencyKey:string):Promise<EmailResult>}
// Native fetch keeps the provider replaceable without coupling domain logic to an SDK.
export class ResendEmailService implements EmailService {
 constructor(private transport:typeof fetch=fetch){}
 async send(message:EmailMessage,idempotencyKey:string):Promise<EmailResult>{
  const config=emailConfiguration();if(!config.ready)return {status:"BLOCKED",errorCode:"PROVIDER_NOT_CONFIGURED"};
  if(config.mode==="capture")return {status:"CAPTURED"};
  if(message.from!==config.from)return {status:"BLOCKED",errorCode:"SENDER_CHANGED_REPREPARE"};
  try{const response=await this.transport("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":idempotencyKey},body:JSON.stringify({from:message.from,to:[message.to],subject:message.subject,html:message.html,text:message.text,...(message.unsubscribeUrl?{headers:{"List-Unsubscribe":`<${message.unsubscribeUrl}>`}}:{})}),signal:AbortSignal.timeout(10000),redirect:"error"});
   if(!response.ok)return {status:response.status>=500||response.status===429?"UNKNOWN":"FAILED",errorCode:`RESEND_HTTP_${response.status}`};
   const data=await response.json() as {id?:unknown};if(typeof data.id!=="string"||!data.id.length||data.id.length>200)return {status:"UNKNOWN",errorCode:"PROVIDER_RESPONSE_INVALID"};return {status:"ACCEPTED",providerMessageId:data.id};
  }catch{return {status:"UNKNOWN",errorCode:"PROVIDER_TRANSPORT_UNCERTAIN"};}
 }
}
