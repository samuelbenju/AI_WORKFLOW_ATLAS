import "server-only";
import type { MetadataRoute } from "next";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { publishedArticleWhere } from "./public";
export async function sitemapEntries(origin:string,db:PrismaClient=getDatabase()):Promise<MetadataRoute.Sitemap> {
  const visible={status:"PUBLISHED" as const,isDemo:false,publishedAt:{lte:new Date()}};const select={slug:true,updatedAt:true};
  const [tools,cases,articles]=await db.$transaction([
    db.tool.findMany({where:visible,select,take:50001,orderBy:{slug:"asc"}}),db.useCase.findMany({where:visible,select,take:50001,orderBy:{slug:"asc"}}),
    db.article.findMany({where:{...publishedArticleWhere(),noindex:false},select,take:50001,orderBy:{slug:"asc"}}),
  ],{isolationLevel:"RepeatableRead"});
  if(tools.length+cases.length+articles.length+6>50000)throw new Error("Sitemap partitioning is required before exceeding 50,000 URLs.");
  return [ ...["/","/tools","/use-cases","/blog","/sponsor","/newsletter"].map(path=>({url:new URL(path,origin).href})),
    ...tools.map(row=>({url:new URL(`/tools/${row.slug}`,origin).href,lastModified:row.updatedAt})),...cases.map(row=>({url:new URL(`/use-cases/${row.slug}`,origin).href,lastModified:row.updatedAt})),
    ...articles.map(row=>({url:new URL(`/blog/${row.slug}`,origin).href,lastModified:row.updatedAt})), ];
}
