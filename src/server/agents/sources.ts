import "server-only";
import {lookup} from "node:dns/promises";
import {isIP} from "node:net";
import {createHash} from "node:crypto";
import {z} from "zod";
import type {PrismaClient} from "@/generated/prisma/client";
import {getDatabase} from "@/server/db/client";
import {authorizeActor} from "@/server/admin/content";
import {AccessError} from "@/server/auth/policy";
import {engineLock} from "./admin";
import {secretLike} from "@/lib/agents";
export function allowedSourceUrl(value:string){const url=new URL(value);const hosts=(process.env.AGENT_RESEARCH_HOSTS??"raw.githubusercontent.com").split(",").map(x=>x.trim().toLowerCase());if(url.protocol!=="https:"||url.username||url.password||url.port&&url.port!=="443"||url.hash||url.search||isIP(url.hostname)||!hosts.includes(url.hostname.toLowerCase()))throw new AccessError(422,"La fuente debe ser HTTPS, sin credenciales/query y de un host permitido por el operador.");return url;}
export function publicAddress(ip:string){if(isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return !!a&&a!==10&&a!==127&&a<224&&!(a===169&&b===254)&&!(a===172&&b!>=16&&b!<=31)&&!(a===192&&b===168)&&!(a===100&&b!>=64&&b!<=127)&&!(a===192&&b===0)&&!(a===198&&(b===18||b===19));}return isIP(ip)===6&&/^[23][0-9a-f]{3}:/i.test(ip);}
export async function collectSource(userId:string,input:unknown,db:PrismaClient=getDatabase(),transport:typeof fetch=fetch,resolver=lookup){
 await authorizeActor(userId,"agents",db);const data=z.object({url:z.url().max(2048),title:z.string().trim().min(3).max(200)}).strict().parse(input);const url=allowedSourceUrl(data.url);const addresses=await resolver(url.hostname,{all:true});if(!addresses.length||addresses.some(x=>!publicAddress(x.address)))throw new AccessError(422,"Destino de fuente no permitido.");
 const test=transport!==fetch;if(test&&(!process.env.DATABASE_URL||!new URL(process.env.DATABASE_URL).pathname.endsWith("_test")))throw new AccessError(403,"Transporte de prueba solo en DB aislada.");
 let response:Response;try{response=await transport(url.toString(),{redirect:"error",signal:AbortSignal.timeout(10000),cache:"no-store",headers:{Accept:"text/plain, text/markdown"}});}catch{throw new AccessError(503,"No se pudo recuperar la fuente; no se registró como comprobada.");}if(!response.ok||!/^(text\/(plain|markdown)|application\/json)(;|$)/i.test(response.headers.get('content-type')??""))throw new AccessError(422,"La fuente debe responder con texto/Markdown o JSON verificable.");
 const reader=response.body?.getReader();if(!reader)throw new AccessError(422,"Fuente vacía.");const chunks:Uint8Array[]=[];let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>128000){await reader.cancel();throw new AccessError(422,"Fuente demasiado grande (128 KB máximo).");}chunks.push(part.value);}const raw=Buffer.concat(chunks);const content=raw.toString('utf8');if(!content.trim()||secretLike(content)||secretLike(data.title))throw new AccessError(422,"Contenido vacío o con posible secreto.");const digest=createHash('sha256').update(raw).digest('hex');
 return db.$transaction(async tx=>{await authorizeActor(userId,"agents",tx);await engineLock(tx);const source=await tx.agentSource.upsert({where:{url:url.toString()},update:{title:data.title,content,digest,fetchedAt:new Date(),provenance:test?"TEST_FIXTURE":"FETCHED"},create:{url:url.toString(),title:data.title,content,digest,fetchedAt:new Date(),provenance:test?"TEST_FIXTURE":"FETCHED"}});await tx.auditLog.create({data:{actorId:userId,action:"agents.source_collected",entityType:"AgentSource",entityId:source.id}});return {id:source.id,digest,provenance:source.provenance};});
}
