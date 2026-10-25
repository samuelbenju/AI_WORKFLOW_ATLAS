import {issueInquiryForm} from "@/server/commercial/config";
export async function GET() {try{return Response.json(issueInquiryForm(),{headers:{"Cache-Control":"private, no-store"}});}catch{return Response.json({error:"The inquiry form is temporarily unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});}}
