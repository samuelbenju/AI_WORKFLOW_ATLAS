import {z} from "zod";
import {newsletterSources} from "@/lib/newsletter";
import {issueNewsletterForm} from "@/server/newsletter/config";
export async function GET(request:Request){const source=z.enum(newsletterSources).safeParse(new URL(request.url).searchParams.get("source"));const headers={"Cache-Control":"no-store"};if(!source.success)return Response.json({error:"Unknown signup source."},{status:422,headers});try{return Response.json(issueNewsletterForm(source.data),{headers});}catch{return Response.json({error:"Newsletter signup is temporarily unavailable."},{status:503,headers});}}
