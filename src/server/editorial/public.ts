import "server-only";
import { cache } from "react";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { articleBodySchema, editorialSlug, articleQuerySchema, sourceSchema, type ArticleQuery } from "@/lib/editorial";
import { z } from "zod";
export const publishedArticleWhere = (): Prisma.ArticleWhereInput => ({ status:"PUBLISHED",isDemo:false,publishedAt:{lte:new Date()},reviewedAt:{not:null},body:{path:["version"],equals:1} });
const taxonomy = {select:{slug:true,name:true}} as const;
export const articleCardSelect = {id:true,slug:true,title:true,excerpt:true,publishedAt:true,updatedAt:true,coverKey:true,coverAlt:true,categories:taxonomy} satisfies Prisma.ArticleSelect;
export type ArticleCard = Prisma.ArticleGetPayload<{select:typeof articleCardSelect}>;
async function read<T>(operation:()=>Promise<T>) { try {return await operation();} catch {throw new Error("The editorial library is temporarily unavailable. Please try again shortly.");} }
export async function listPublicArticles(input: ArticleQuery,db:PrismaClient=getDatabase()) {
  const query=articleQuerySchema.parse(input);
  const where:Prisma.ArticleWhereInput={...publishedArticleWhere(),...(query.q ? {OR:[{title:{contains:query.q,mode:"insensitive"}},{excerpt:{contains:query.q,mode:"insensitive"}}]}:{}),...(query.category ? {categories:{some:{slug:query.category}}}:{} )};
  return read(async()=>{ const [items,total,categories]=await db.$transaction([
    db.article.findMany({where,select:articleCardSelect,take:6,skip:(query.page-1)*6,orderBy:[{publishedAt:"desc"},{id:"asc"}]}),db.article.count({where}),
    db.category.findMany({where:{articles:{some:publishedArticleWhere()}},select:{slug:true,name:true},orderBy:{name:"asc"}}),
  ],{isolationLevel:"RepeatableRead"});return {items,total,categories,pageCount:Math.ceil(total/6)}; });
}
const cachedArticleListing=cache((key:string)=>listPublicArticles(articleQuerySchema.parse(JSON.parse(key))));
export const articlesPageData=(query:ArticleQuery)=>cachedArticleListing(JSON.stringify(query));
export async function readPublicArticle(slug:string,db:PrismaClient=getDatabase()) {
  if(!editorialSlug.safeParse(slug).success)return null;
  return read(async()=>{
    const row=await db.article.findFirst({where:{slug,...publishedArticleWhere()},select:{...articleCardSelect,body:true,sources:true,metaTitle:true,metaDescription:true,noindex:true,author:{select:{name:true}},
      tools:{where:{status:"PUBLISHED",isDemo:false,publishedAt:{lte:new Date()}},select:{id:true,slug:true,name:true}},
      useCase:{select:{slug:true,title:true,status:true,isDemo:true,publishedAt:true}}}});
    if(!row)return null;
    const body=articleBodySchema.safeParse(row.body);const sources=z.array(sourceSchema).safeParse(row.sources);
    if(!body.success || !sources.success)throw new Error("Unsupported editorial content.");
    const {useCase,...data}=row;
    const related=await db.article.findMany({where:{...publishedArticleWhere(),id:{not:row.id},categories:{some:{slug:{in:row.categories.map(category=>category.slug)}}}},select:articleCardSelect,take:3,orderBy:[{publishedAt:"desc"},{id:"asc"}]});
    const targets=await resolvePublicArticleLinks(body.data,db);
    return {...data,body:body.data,sources:sources.data.filter(source=>source.status==="VERIFIED"),related,targets,
      useCase:useCase && useCase.status==="PUBLISHED" && !useCase.isDemo && useCase.publishedAt && useCase.publishedAt<=new Date() ? {slug:useCase.slug,title:useCase.title}:null};
  });
}
export const publicArticleBySlug=cache((slug:string)=>readPublicArticle(slug));
export async function resolvePublicArticleLinks(body:z.infer<typeof articleBodySchema>,db:PrismaClient|Prisma.TransactionClient=getDatabase()) {
  const links=body.blocks.filter(block=>block.type==="link");
  if(!links.length)return {};
  const ids=(kind:string)=>links.filter(link=>link.kind===kind).map(link=>link.id);
  const visible={status:"PUBLISHED" as const,isDemo:false,publishedAt:{lte:new Date()}};
  const tools=await db.tool.findMany({where:{...visible,id:{in:ids("tools")}},select:{id:true,slug:true}});
  const cases=await db.useCase.findMany({where:{...visible,id:{in:ids("use-cases")}},select:{id:true,slug:true}});
  const articles=await db.article.findMany({where:{...publishedArticleWhere(),id:{in:ids("articles")}},select:{id:true,slug:true}});
  return Object.fromEntries([...tools.map(row=>[row.id,`/tools/${row.slug}`]),...cases.map(row=>[row.id,`/use-cases/${row.slug}`]),...articles.map(row=>[row.id,`/blog/${row.slug}`])]);
}
