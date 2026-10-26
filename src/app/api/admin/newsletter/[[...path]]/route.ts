import {adminApi,privateJson,readJson,requireRequestActor} from "@/server/auth/request";
import {newsletterOverview,saveNewsletter,proposeNewsletter,prepareNewsletter,sendNewsletterBatch,cancelNewsletter,copyNewsletter,localEmailPreview} from "@/server/newsletter/admin";
type Context={params:Promise<{path?:string[]}>};
export async function GET(request:Request,{params}:Context){return adminApi(async()=>{const {actor}=await requireRequestActor(request,"newsletter"),path=(await params).path??[];
 if(!path.length)return privateJson(await newsletterOverview(actor.id,Object.fromEntries(new URL(request.url).searchParams)));
 if(path.length===2&&path[0]==="preview")return privateJson(await localEmailPreview(actor.id,path[1]!));return privateJson({error:"No existe la ruta."},404);});}
export async function POST(request:Request,{params}:Context){return adminApi(async()=>{const {actor}=await requireRequestActor(request,"newsletter"),path=(await params).path??[],body=await readJson(request);
 if(path.length===1&&path[0]==="campaigns")return privateJson(await saveNewsletter(actor.id,body),201);
 if(path.length===1&&path[0]==="propose")return privateJson(await proposeNewsletter(actor.id,body),201);
 if(path.length===3&&path[0]==="campaigns"){const id=path[1]!,action=path[2];if(action==="copy")return privateJson(await copyNewsletter(actor.id,id));if(action==="prepare")return privateJson(await prepareNewsletter(actor.id,id,body));if(action==="send")return privateJson(await sendNewsletterBatch(actor.id,id,body));if(action==="cancel")return privateJson(await cancelNewsletter(actor.id,id,body));}
 return privateJson({error:"No existe la ruta."},404);});}
export async function PUT(request:Request,{params}:Context){return adminApi(async()=>{const {actor}=await requireRequestActor(request,"newsletter"),path=(await params).path??[];if(path.length!==2||path[0]!=="campaigns")return privateJson({error:"No existe la ruta."},404);return privateJson(await saveNewsletter(actor.id,await readJson(request),path[1]!));});}

export const maxDuration=60;
