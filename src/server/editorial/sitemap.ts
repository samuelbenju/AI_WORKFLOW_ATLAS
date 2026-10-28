import "server-only";
import {legalConfiguration,policySlugs} from "@/lib/legal";
import type { MetadataRoute } from "next";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { publishedArticleWhere } from "./public";
export async function sitemapEntries(origin:string,db:PrismaClient=getDatabase()):Promise<MetadataRoute.Sitemap> {
  const visible={status:"PUBLISHED" as const,isDemo:false,publishedAt:{lte:new Date()}};const select={slug:true,updatedAt:true};
  const [tools,cases,articles,categories]=await db.$transaction([
    db.tool.findMany({where:visible,select,take:50001,orderBy:{slug:"asc"}}),db.useCase.findMany({where:visible,select,take:50001,orderBy:{slug:"asc"}}),
    db.article.findMany({where:{...publishedArticleWhere(),noindex:false},select,take:50001,orderBy:{slug:"asc"}}),
    db.category.findMany({where:{OR:[{tools:{some:visible}},{useCases:{some:visible}}]},select:{slug:true,_count:{select:{tools:{where:visible},useCases:{where:visible}}}},take:50001,orderBy:{slug:'asc'}}),
  ],{isolationLevel:"RepeatableRead"});
  const indexableCategories=categories.filter(c=>c._count.tools+c._count.useCases>=2);
  const paths=['/','/about','/sponsor','/newsletter',...(tools.length?['/tools']:[]),...(cases.length?['/use-cases']:[]),...(articles.length?['/blog']:[]),...(categories.length?['/categories']:[])];
  const legalPaths=legalConfiguration().reviewed?policySlugs:[];
  if(tools.length+cases.length+articles.length+categories.length+paths.length+legalPaths.length>50000)throw new Error("Sitemap partitioning is required before exceeding 50,000 URLs.");
  return [ ...legalPaths.map(path=>({url:new URL(`/${path}`,origin).href})),...paths.map(path=>({url:new URL(path,origin).href})),
    ...tools.map(row=>({url:new URL(`/tools/${row.slug}`,origin).href,lastModified:row.updatedAt})),...cases.map(row=>({url:new URL(`/use-cases/${row.slug}`,origin).href,lastModified:row.updatedAt})),
    ...articles.map(row=>({url:new URL(`/blog/${row.slug}`,origin).href,lastModified:row.updatedAt})),
    ...indexableCategories.map(row=>({url:new URL(`/categories/${row.slug}`,origin).href})), ];
}
