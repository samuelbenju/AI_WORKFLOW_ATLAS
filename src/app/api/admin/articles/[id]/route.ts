import { adminArticle,saveArticle,transitionArticle } from "@/server/editorial/admin";
import { AccessError } from "@/server/auth/policy";
import { adminApi,privateJson,readJson,requireRequestActor } from "@/server/auth/request";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context) {return adminApi(async()=>{const {actor}=await requireRequestActor(request);const result=await adminArticle(actor.id,(await context.params).id);if(!result)throw new AccessError(404,"El artículo no existe.");return privateJson(result);});}
export async function PUT(request:Request,context:Context) {return adminApi(async()=>{const {actor}=await requireRequestActor(request,"write");return privateJson(await saveArticle(actor.id,await readJson(request,256000),(await context.params).id));});}
export async function PATCH(request:Request,context:Context) {return adminApi(async()=>{const {actor}=await requireRequestActor(request,"publish");return privateJson(await transitionArticle(actor.id,(await context.params).id,await readJson(request,4096)));});}
