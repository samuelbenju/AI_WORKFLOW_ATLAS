import {createHash,timingSafeEqual} from "node:crypto";
import {z} from "zod";
export const paymentStates=["PENDING","APPROVED","DECLINED","VOIDED","ERROR"] as const;
export const transactionSchema=z.object({id:z.string().min(1).max(150).regex(/^[A-Za-z0-9_-]+$/),reference:z.string().min(1).max(100),amount_in_cents:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),currency:z.literal("COP"),status:z.enum(paymentStates)});
export type ProviderTransaction=z.infer<typeof transactionSchema>;
export const sha256=(text:string)=>createHash("sha256").update(text).digest("hex");
export function checkoutIntegrity(reference:string,amount:string,currency:"COP",expiration:string,secret:string){return sha256(`${reference}${amount}${currency}${expiration}${secret}`);}
export function verifyWompiEvent(input:unknown,secret:string,header:string|null,now=Date.now()){
 const schema=z.object({event:z.literal("transaction.updated"),environment:z.literal("test"),data:z.record(z.string(),z.unknown()),timestamp:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),signature:z.object({properties:z.array(z.string().max(120)).min(3).max(12),checksum:z.string().regex(/^[a-fA-F0-9]{64}$/)})});
 const event=schema.parse(input);if(event.timestamp*1000>now+300000)throw new Error("EVENT_FROM_FUTURE");
 for(const required of ["transaction.id","transaction.status","transaction.amount_in_cents"])if(!event.signature.properties.includes(required))throw new Error("SIGNATURE_MISSING_FIELDS");
 if(new Set(event.signature.properties).size!==event.signature.properties.length)throw new Error("SIGNATURE_DUPLICATE_FIELDS");
 const values=event.signature.properties.map(path=>{const keys=path.split(".");if(keys.length>4||keys.some(key=>!key||["__proto__","prototype","constructor"].includes(key)))throw new Error("SIGNATURE_PATH_INVALID");let value:unknown=event.data;for(const key of keys){if(!value||typeof value!=="object"||!Object.hasOwn(value,key))throw new Error("SIGNATURE_PATH_MISSING");value=(value as Record<string,unknown>)[key];}if(!["string","number","boolean"].includes(typeof value)||String(value).length>500)throw new Error("SIGNATURE_VALUE_INVALID");return String(value);}).join("");
 const computed=sha256(`${values}${event.timestamp}${secret}`),body=event.signature.checksum.toLowerCase();
 if(!timingSafeEqual(Buffer.from(computed,"hex"),Buffer.from(body,"hex"))||(header!==null&&header.toLowerCase()!==body))throw new Error("SIGNATURE_INVALID");
 const transaction=transactionSchema.parse(event.data.transaction);
 return {transaction,eventId:sha256(`test:${event.timestamp}:${body}`),digest:sha256(JSON.stringify(input)),timestamp:event.timestamp};
}
export const createOrderSchema=z.object({sponsorId:z.uuid(),packageId:z.uuid(),packageUpdatedAt:z.iso.datetime(),requestId:z.uuid(),leadId:z.uuid().nullable().default(null)}).strict();
export const orderQuery=z.object({q:z.string().trim().max(100).default(""),status:z.enum(["PENDING","PAID","CANCELLED","EXPIRED"]).optional(),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict();
