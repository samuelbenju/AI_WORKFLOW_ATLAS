import { adminListQuery } from "@/lib/admin-content";
import { adminArticles,saveArticle } from "@/server/editorial/admin";
import { adminApi,privateJson,readJson,requireRequestActor } from "@/server/auth/request";
export async function GET(request:Request) {return adminApi(async()=>{const {actor}=await requireRequestActor(request);const query=adminListQuery.parse(Object.fromEntries(new URL(request.url).searchParams));return privateJson(await adminArticles(actor.id,query));});}
export async function POST(request:Request) {return adminApi(async()=>{const {actor}=await requireRequestActor(request,"write");return privateJson(await saveArticle(actor.id,await readJson(request,256000)),201);});}
