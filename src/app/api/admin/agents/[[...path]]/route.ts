import {z} from "zod";
import {adminApi,requireRequestActor,privateJson,readJson} from "@/server/auth/request";
import {registerAnalyst,saveAgent,createAgentTask,taskAction,saveSchedule,toggleSchedule,agentsOverview} from "@/server/agents/admin";
import {runOne} from "@/server/agents/engine";
import {safeJson} from "@/lib/agents";
type Context={params:Promise<{path?:string[]}>};
export async function GET(request:Request,{params}:Context){return adminApi(async()=>{const {actor}=await requireRequestActor(request,"agents");if((await params).path?.length)return privateJson({error:"No existe la ruta."},404);return privateJson(safeJson(await agentsOverview(actor.id)));});}
export async function POST(request:Request,{params}:Context){return adminApi(async()=>{const {actor}=await requireRequestActor(request,"agents"),path=(await params).path??[],data=await readJson(request,16000);
 if(path.length===1){if(path[0]==="register"){z.object({}).strict().parse(data);return privateJson(await registerAnalyst(actor.id),201);}if(path[0]==="tasks"||path[0]==="events")return privateJson(await createAgentTask(actor.id,data,undefined,path[0]==="events"?"EVENT":"MANUAL"),201);if(path[0]==="schedules")return privateJson(await saveSchedule(actor.id,data),201);if(path[0]==="run"){z.object({confirmation:z.literal(true)}).strict().parse(data);return privateJson(await runOne());}}
 if(path.length===2&&path[0]==="tasks")return privateJson(await taskAction(actor.id,path[1]!,data));if(path.length===2&&path[0]==="schedules")return privateJson(await toggleSchedule(actor.id,path[1]!,data));return privateJson({error:"No existe la ruta."},404);});}
export async function PUT(request:Request,{params}:Context){return adminApi(async()=>{const {actor}=await requireRequestActor(request,"agents"),path=(await params).path??[];if(path.length!==1)return privateJson({error:"No existe la ruta."},404);return privateJson(await saveAgent(actor.id,path[0]!,await readJson(request,12000)));});}
