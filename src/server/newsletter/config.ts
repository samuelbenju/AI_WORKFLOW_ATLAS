import "server-only";
import {createHmac,createHash,randomBytes,randomUUID,timingSafeEqual,createCipheriv,createDecipheriv} from "node:crypto";
import {adminConfiguration} from "@/server/auth/config";
import {AccessError} from "@/server/auth/policy";
import type {EmailMessage} from "@/lib/newsletter";
export function newsletterKey(){const key=process.env.NEWSLETTER_SECRET;if(!key||!/^[a-f0-9]{64}$/.test(key))throw new AccessError(503,"Newsletter configuration is unavailable.");return Buffer.from(key,"hex");}
export const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export const sign=(value:string)=>createHmac("sha256",newsletterKey()).update(value).digest("hex");
function equal(a:string,b:string){return /^[a-f0-9]{64}$/.test(a)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));}
export function newsletterOrigin(){return adminConfiguration(process.env.NEWSLETTER_ORIGIN??process.env.SITE_URL).origin;}
export function checkNewsletterOrigin(request:Request){if(request.headers.get("origin")!==newsletterOrigin()||request.headers.get("sec-fetch-site")==="cross-site")throw new AccessError(403,"This request origin is not allowed.");}
export function issueNewsletterForm(source:string){const nonce=randomUUID(),stamp=String(Date.now());return {nonce,formToken:`${stamp}.${sign(`signup:${source}:${nonce}:${stamp}`)}`};}
export function verifyNewsletterForm(source:string,nonce:string,token:string,now=Date.now()){const [stamp,mac,...extra]=token.split(".");if(extra.length||!/^\d{13}$/.test(stamp??"")||!mac||now-Number(stamp)>3600000||Number(stamp)>now+30000||!equal(mac,sign(`signup:${source}:${nonce}:${stamp}`)))throw new AccessError(403,"The form expired. Refresh the page and try again.");}
export function unsubscribeToken(id:string,generation:number){return `${id}.${generation}.${sign(`unsubscribe:${id}:${generation}`)}`;}
export function parseUnsubscribeToken(token:string){const [id,generation,mac,...rest]=token.split(".");if(rest.length||!id||!/^[a-f0-9-]{36}$/.test(id)||!/^\d{1,9}$/.test(generation??"")||!mac||!equal(mac,sign(`unsubscribe:${id}:${generation}`)))throw new AccessError(400,"This unsubscribe link is not valid.");return {id,generation:Number(generation)};}
export function encryptMessage(message:EmailMessage){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",newsletterKey(),iv);const encrypted=Buffer.concat([cipher.update(JSON.stringify(message),"utf8"),cipher.final()]);return [iv,cipher.getAuthTag(),encrypted].map(part=>part.toString("base64url")).join(".");}
export function decryptMessage(payload:string):EmailMessage{const [iv,tag,encrypted]=payload.split(".").map(part=>Buffer.from(part,"base64url"));if(!iv||iv.length!==12||!tag||tag.length!==16||!encrypted)throw new Error("Invalid encrypted email payload.");const decipher=createDecipheriv("aes-256-gcm",newsletterKey(),iv);decipher.setAuthTag(tag);return JSON.parse(Buffer.concat([decipher.update(encrypted),decipher.final()]).toString("utf8"));}
export function emailConfiguration(){
 const requested=process.env.NEWSLETTER_MODE??"disabled";const from=process.env.RESEND_FROM??"";
 const capture=requested==="capture"&&process.env.ATLAS_NEWSLETTER_TEST_CAPTURE==="true"&&!!process.env.DATABASE_URL&&new URL(process.env.DATABASE_URL).pathname.endsWith("_test");
 const mode=capture?"capture":requested==="resend"?"resend":"disabled";
 const senderValid=!/[\r\n]/.test(from)&&/^[^\r\n<>]+\s<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$|^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from);
 return {mode,from,ready:mode==="capture"||(mode==="resend"&&!!process.env.RESEND_API_KEY&&senderValid),reason:mode==="capture"?"Isolated local capture; no email sent.":mode==="resend"&&process.env.RESEND_API_KEY&&senderValid?"Resend configured; provider acceptance is recorded separately from delivery.":"Email delivery is not configured. No email is sent."} as const;
}
