import {z} from "zod";
import {createHash} from "node:crypto";
const amount=z.string().regex(/^\d{1,12}$/).transform(BigInt);
export const agentConfigSchema=z.object({name:z.string().trim().min(1).max(160),prompt:z.string().trim().min(20).max(4000),model:z.string().min(1).max(100),enabled:z.boolean(),allowedTools:z.array(z.literal("catalog_summary")).length(1),monthlyBudgetUsdMicros:amount,inputRateMicrosPerMillion:amount,outputRateMicrosPerMillion:amount,maxOutputTokens:z.number().int().min(64).max(2048),maxConcurrency:z.number().int().min(1).max(4),expectedUpdatedAt:z.iso.datetime()}).strict().refine(c=>!c.enabled||(c.monthlyBudgetUsdMicros>0n&&c.inputRateMicrosPerMillion>0n&&c.outputRateMicrosPerMillion>0n),"Configura límites y tarifas antes de habilitar.");
export const taskSchema=z.object({agentId:z.uuid(),idempotencyKey:z.string().regex(/^[A-Za-z0-9:_-]{8,160}$/),tokenBudget:z.number().int().min(4096).max(20000),budgetUsdMicros:amount,maxAttempts:z.number().int().min(1).max(3)}).strict();
export const analysisSchema=z.object({summary:z.string().min(1).max(4000),observations:z.array(z.string().min(1).max(600)).max(8)}).strict();
export const secretLike=(text:string)=>/sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]+|-----BEGIN .*PRIVATE KEY|Bearer\s+\S{12,}/.test(text);
export const analysisJsonSchema={type:"object",properties:{summary:{type:"string"},observations:{type:"array",items:{type:"string"}}},required:["summary","observations"],additionalProperties:false};
export function configHash(agent:{prompt:string;promptVersion:number;model:string|null;enabled:boolean;allowedTools:string[];monthlyBudgetUsdMicros:bigint;inputRateMicrosPerMillion:bigint;outputRateMicrosPerMillion:bigint;maxOutputTokens:number;maxConcurrency:number}){return createHash("sha256").update(JSON.stringify({...agent,id:undefined,createdAt:undefined,updatedAt:undefined,lastRunAt:undefined},(_k,v)=>typeof v==="bigint"?v.toString():v)).digest("hex");}
export const ceilCost=(input:number,output:number,inRate:bigint,outRate:bigint)=>(BigInt(input)*inRate+BigInt(output)*outRate+999999n)/1000000n;
export function allowedModels(){return (process.env.AGENT_ALLOWED_MODELS??"gpt-4.1-mini").split(",").map(s=>s.trim()).filter(s=>/^[A-Za-z0-9._-]{1,100}$/.test(s));}
export const safeJson=(value:unknown)=>JSON.parse(JSON.stringify(value,(_k,v)=>typeof v==="bigint"?v.toString():v));
