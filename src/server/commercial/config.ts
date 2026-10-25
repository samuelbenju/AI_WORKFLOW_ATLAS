import "server-only";
import {createHmac,randomUUID,timingSafeEqual} from "node:crypto";
import {adminConfiguration} from "@/server/auth/config";
import {AccessError} from "@/server/auth/policy";
export function commercialSecret() {const key=process.env.SPONSOR_FORM_SECRET;if(!key||!/^[a-f0-9]{64}$/.test(key))throw new Error("Commercial signing configuration is unavailable.");return key;}
export const commercialDigest=(value:string)=>createHmac("sha256",Buffer.from(commercialSecret(),"hex")).update(value).digest("hex");
export function issueInquiryForm(now=Date.now()) {const submissionId=randomUUID();const stamp=String(now);return {submissionId,token:`${stamp}.${commercialDigest(`form:${submissionId}:${stamp}`)}`};}
export function verifyInquiryForm(submissionId:string,token:string,now=Date.now()) {
 const [stamp,mac]=token.split(".");if(!stamp||!/^\d{13}$/.test(stamp)||!mac||!/^[a-f0-9]{64}$/.test(mac)||token.split(".").length!==2||now-Number(stamp)>3600000||Number(stamp)>now+30000)throw new AccessError(403,"This form expired. Refresh the page and try again.");
 if(!timingSafeEqual(Buffer.from(mac,"hex"),Buffer.from(commercialDigest(`form:${submissionId}:${stamp}`),"hex")))throw new AccessError(403,"The form could not be verified. Refresh and try again.");
}
export function checkCommercialOrigin(request:Request) {const origin=adminConfiguration(process.env.SPONSOR_ORIGIN??process.env.SITE_URL).origin;if(request.headers.get("origin")!==origin||request.headers.get("sec-fetch-site")==="cross-site")throw new AccessError(403,"This request origin is not allowed.");}
