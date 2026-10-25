import {z} from "zod";
export const newsletterConsentVersion="newsletter-2026-10-v1";
export const newsletterConsentText="I agree to receive AI Workflow Atlas emails, including clearly labeled sponsorships. I can unsubscribe at any time.";
export const newsletterSources=["home","blog","article","newsletter"] as const;
export const signupSchema=z.object({email:z.email().max(320).transform(value=>value.trim().toLowerCase()),consent:z.literal(true),consentVersion:z.literal(newsletterConsentVersion),source:z.enum(newsletterSources),nonce:z.uuid(),formToken:z.string().max(100),website:z.literal("")}).strict();
export const newsletterBodySchema=z.object({version:z.literal(1),paragraphs:z.array(z.string().trim().min(1).max(2000)).min(1).max(20)}).strict();
export const newsletterDraftSchema=z.object({subject:z.string().trim().min(3).max(200),preheader:z.string().trim().max(250).default(""),body:newsletterBodySchema,sourceArticleIds:z.array(z.uuid()).max(12).default([]),sponsorshipCampaignId:z.uuid().nullable().default(null),expectedUpdatedAt:z.iso.datetime().optional()}).strict();
export const subscriberQuery=z.object({q:z.string().trim().max(100).default(""),status:z.enum(["PENDING","CONFIRMED","UNSUBSCRIBED"]).optional(),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict();
export type NewsletterBody=z.infer<typeof newsletterBodySchema>;
export type EmailMessage={to:string;from:string;subject:string;html:string;text:string;unsubscribeUrl?:string;sponsorshipUpdatedAt?:string};
export const deliveryLabels:Record<string,string>={QUEUED:"Preparado",BLOCKED:"Bloqueado · sin envío",CAPTURED:"Captura local · sin envío",ACCEPTED:"Aceptado por Resend",FAILED:"Rechazado por proveedor",UNKNOWN:"Resultado incierto · revisar proveedor",CANCELLED:"Cancelado"};
export function escapeEmail(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));}
