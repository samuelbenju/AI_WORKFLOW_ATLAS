import {trackingContext} from "@/server/growth/tracking";
import {ZodError} from "zod";
import {readJson} from "@/server/auth/request";
import {AccessError} from "@/server/auth/policy";
import {checkCommercialOrigin} from "@/server/commercial/config";
import {submitInquiry} from "@/server/commercial/intake";
export async function POST(request:Request) {
 const headers={"Cache-Control":"private, no-store"};
 try{checkCommercialOrigin(request);const result=await submitInquiry(await readJson(request,16000),undefined,trackingContext(request));return Response.json(result,{status:201,headers});}
 catch(error){if(error instanceof AccessError)return Response.json({error:({400:"The request is not valid JSON.",413:"The inquiry is too large.",415:"JSON content is required."} as Record<number,string>)[error.status]??error.message},{status:error.status,headers});if(error instanceof ZodError)return Response.json({error:"Check your details, HTTPS website and required consent."},{status:422,headers});return Response.json({error:"We couldn’t save your inquiry. Please try again."},{status:503,headers});}
}
