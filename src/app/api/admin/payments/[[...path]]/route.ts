import {z} from "zod";
import {adminApi,privateJson,requireRequestActor,readJson} from "@/server/auth/request";
import {paymentsOverview,createPaymentOrder,prepareCheckout,reconcilePayment,cancelPaymentOrder} from "@/server/payments/service";
type Context={params:Promise<{path?:string[]}>};
const serialize=(value:unknown)=>JSON.parse(JSON.stringify(value,(_key,item)=>typeof item==="bigint"?item.toString():item));
export async function GET(request:Request,{params}:Context){return adminApi(async()=>{const {actor}=await requireRequestActor(request,"payments");if((await params).path?.length)return privateJson({error:"Ruta inexistente."},404);return privateJson(serialize(await paymentsOverview(actor.id,Object.fromEntries(new URL(request.url).searchParams))));});}
export async function POST(request:Request,{params}:Context){return adminApi(async()=>{const {actor}=await requireRequestActor(request,"payments"),path=(await params).path??[];
 const input=await readJson(request,5000);if(path.length===1&&path[0]==="orders")return privateJson(await createPaymentOrder(actor.id,input),201);
 if(path.length===3&&path[0]==="orders"){const id=path[1]!;if(path[2]==="checkout"){z.object({}).strict().parse(input);return privateJson(await prepareCheckout(actor.id,id));}if(path[2]==="reconcile")return privateJson(await reconcilePayment(actor.id,id,input));if(path[2]==="cancel")return privateJson(await cancelPaymentOrder(actor.id,id,input));}
 return privateJson({error:"Ruta inexistente."},404);});}
