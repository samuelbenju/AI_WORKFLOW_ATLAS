import {z} from "zod";
export const consentVersion="sponsorship-inquiry-v1";
export const consentText="I agree that AI Workflow Atlas may use my company and contact details to review and respond to this sponsorship inquiry. This does not subscribe me to marketing or reserve a placement.";
export const pipeline=["NEW","CONTACTED","NEGOTIATING","WON","LOST"] as const;
export const leadStatusLabels:Record<string,string>={NEW:"Nueva",CONTACTED:"Contactada",NEGOTIATING:"En negociación",WON:"Ganada",LOST:"Perdida",IN_REVIEW:"Revisión anterior",APPROVED:"Aprobación anterior",REJECTED:"Rechazo anterior",CLOSED:"Cierre anterior"};
export const availabilityLabels={AVAILABLE:"Solicitudes abiertas",WAITLIST:"Lista de interés",UNAVAILABLE:"No disponible"};
export const campaignStatusLabels={DRAFT:"Borrador",PENDING_APPROVAL:"Pendiente de aprobación",APPROVED:"Aprobada",ACTIVE:"Activa",COMPLETED:"Finalizada",CANCELLED:"Cancelada"};
export const commercialQuery=z.object({q:z.string().trim().max(100).default(""),page:z.coerce.number().int().min(1).max(10000).default(1),status:z.enum(pipeline).optional()});
export const httpsUrl=z.url().max(2048).refine(value=>{try {const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}},"Use an HTTPS URL without credentials.");
export const inquirySchema=z.object({
 submissionId:z.uuid(),token:z.string().min(40).max(200),packageId:z.uuid(),packageUpdatedAt:z.iso.datetime(),companyName:z.string().trim().min(2).max(200),contactName:z.string().trim().min(2).max(160),
 email:z.string().trim().toLowerCase().pipe(z.email().max(320)),websiteUrl:httpsUrl,message:z.string().trim().min(20).max(5000),consent:z.literal(true),consentVersion:z.literal(consentVersion),
 requestedStartsAt:z.iso.datetime().nullable(),websiteConfirmation:z.string().max(100).default(""),
}).strict();
export type Inquiry=z.infer<typeof inquirySchema>;
export const minorAmount=z.string().regex(/^(?:[1-9][0-9]{0,13})$/,"Indica un entero positivo en unidades mínimas.").nullable();
export const packageSchema=z.object({name:z.string().trim().min(1).max(160),description:z.string().trim().min(10).max(5000),amountMinor:minorAmount,currency:z.enum(["COP","USD","EUR"]),durationDays:z.number().int().min(1).max(366).nullable(),active:z.boolean(),acceptingInquiries:z.boolean(),availability:z.enum(["AVAILABLE","WAITLIST","UNAVAILABLE"]),expectedUpdatedAt:z.iso.datetime()}).strict().refine(data=>!data.active||(data.amountMinor!==null&&data.durationDays!==null),{message:"Configura precio y duración antes de habilitar campañas.",path:["active"]});
export const sponsorSchema=z.object({name:z.string().trim().min(2).max(200),contactEmail:z.string().trim().toLowerCase().pipe(z.email().max(320)),websiteUrl:httpsUrl.nullable(),expectedUpdatedAt:z.iso.datetime().optional()}).strict();
export const leadUpdateSchema=z.object({status:z.enum(pipeline),sponsorId:z.uuid().nullable(),expectedUpdatedAt:z.iso.datetime()}).strict();
export const proposalSchema=z.object({title:z.string().trim().min(3).max(200),text:z.string().trim().min(20).max(6000),validUntil:z.iso.datetime()}).strict();
export const campaignSchema=z.object({name:z.string().trim().min(3).max(200),sponsorId:z.uuid(),packageId:z.uuid(),orderId:z.uuid().nullable(),headline:z.string().trim().min(3).max(160),message:z.string().trim().min(10).max(500),destinationUrl:httpsUrl,startsAt:z.iso.datetime(),endsAt:z.iso.datetime(),toolId:z.uuid().nullable(),articleId:z.uuid().nullable(),expectedUpdatedAt:z.iso.datetime().optional()}).strict().refine(data=>new Date(data.endsAt)>new Date(data.startsAt),{message:"La fecha final debe ser posterior al inicio.",path:["endsAt"]});
export type PackageDto={id:string;slug:string;kind:string;name:string;description:string;amountMinor:string|null;currency:"COP"|"USD"|"EUR";durationDays:number|null;active:boolean;acceptingInquiries:boolean;availability:keyof typeof availabilityLabels;updatedAt:string};
export function formatPrice(amount:string|null,currency:string,locale="en") {
 if(amount===null)return locale==="es"?"Por cotizar":"Custom quote";
 // Amounts are capped below 10^14 minor units by validation, safely below Number.MAX_SAFE_INTEGER.
 return new Intl.NumberFormat(locale,{style:"currency",currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(amount)/100);
}
