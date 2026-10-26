import {readJson} from "@/server/auth/request";
import {AccessError} from "@/server/auth/policy";
import {receiveWompiWebhook} from "@/server/payments/service";
export async function POST(request:Request){const headers={"Cache-Control":"no-store"};try{return Response.json(await receiveWompiWebhook(await readJson(request,32000),request.headers.get("x-event-checksum")),{headers});}catch(error){const status=error instanceof AccessError?error.status:503;return Response.json({error:status===400?"Invalid Sandbox event.":status===413?"Event too large.":"Sandbox event could not be processed."},{status,headers});}}
