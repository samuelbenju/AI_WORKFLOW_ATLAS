import {ZodError,z} from "zod";
import {readJson} from "@/server/auth/request";
import {AccessError} from "@/server/auth/policy";
import {checkNewsletterOrigin} from "@/server/newsletter/config";
import {subscribe,confirmSubscription,unsubscribe} from "@/server/newsletter/subscribers";
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
 try{checkNewsletterOrigin(request);const {action}=await params;const input=await readJson(request,5000);if(action==="subscribe")return Response.json(await subscribe(input),{status:201,headers});const {token}=z.object({token:z.string().max(200)}).strict().parse(input);if(action==="confirm")return Response.json(await confirmSubscription(token),{headers});if(action==="unsubscribe")return Response.json(await unsubscribe(token),{headers});return Response.json({error:"Unknown operation."},{status:404,headers});}
 catch(error){const status=error instanceof AccessError?error.status:error instanceof ZodError?422:503;return Response.json({error:error instanceof AccessError&&![400,413,415].includes(error.status)?error.message:error instanceof ZodError?"Check your email, the form and required consent.":"We could not complete the request. Refresh the page and try again."},{status,headers});}
}
