import "server-only";
import { z } from "zod";
import type { Prisma,PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { authorizeActor } from "@/server/admin/content";
import { AccessError,can } from "@/server/auth/policy";
import { articleInputSchema,articleBodySchema,sourceSchema,blankArticle,type ArticleInput } from "@/lib/editorial";
import { resolvePublicArticleLinks } from "./public";
type Db=PrismaClient|Prisma.TransactionClient;
export async function editorialOptions(userId:string,db:PrismaClient=getDatabase()) {
  await authorizeActor(userId,"write",db);
  const [categories,tags,tools,cases,articles]=await db.$transaction([
    db.category.findMany({select:{id:true,name:true},orderBy:{name:"asc"},take:1000}),db.tag.findMany({select:{id:true,name:true},orderBy:{name:"asc"},take:1000}),
    db.tool.findMany({select:{id:true,name:true},orderBy:{name:"asc"},take:1000}),db.useCase.findMany({select:{id:true,title:true},orderBy:{title:"asc"},take:1000}),
    db.article.findMany({select:{id:true,title:true},orderBy:{title:"asc"},take:1000}),
  ]);return {categories,tags,tools,cases:cases.map(row=>({id:row.id,name:row.title})),articles:articles.map(row=>({id:row.id,name:row.title}))};
}
export async function adminArticles(userId:string,query:{q:string;page:number;status?:"DRAFT"|"IN_REVIEW"|"PUBLISHED"|"ARCHIVED"},db:PrismaClient=getDatabase()) {
  await authorizeActor(userId,"panel",db);
  const where:Prisma.ArticleWhereInput={...(query.status?{status:query.status}:{}),OR:[{title:{contains:query.q,mode:"insensitive"}},{slug:{contains:query.q,mode:"insensitive"}}]};
  const [rows,total]=await db.$transaction([db.article.findMany({where,select:{id:true,title:true,slug:true,status:true,isDemo:true,reviewedAt:true,updatedAt:true},take:12,skip:(query.page-1)*12,orderBy:[{updatedAt:"desc"},{id:"asc"}]}),db.article.count({where})],{isolationLevel:"RepeatableRead"});return {rows,total};
}
export async function adminArticle(userId:string,id:string,db:PrismaClient=getDatabase()) {
  await authorizeActor(userId,"panel",db);z.uuid().parse(id);
  const row=await db.article.findUnique({where:{id},include:{categories:{select:{id:true}},tags:{select:{id:true}},tools:{select:{id:true}},revisions:{select:{id:true,createdAt:true,status:true},orderBy:{createdAt:"desc"},take:10}}});
  if(!row)return null;
  const body=articleBodySchema.safeParse(row.body);
  const legacyBody=articleBodySchema.safeParse({version:1,blocks:(row.body as {blocks?:unknown})?.blocks});const sources=z.array(sourceSchema).safeParse(row.sources);
  const data:ArticleInput={...blankArticle,title:row.title,slug:row.slug,excerpt:row.excerpt,body:body.success?body.data:legacyBody.success?legacyBody.data:{version:1,blocks:[{type:"paragraph",text:row.excerpt}]},sources:sources.success?sources.data:[],
    categoryIds:row.categories.map(item=>item.id),tagIds:row.tags.map(item=>item.id),toolIds:row.tools.map(item=>item.id),useCaseId:row.useCaseId,status:row.status==="IN_REVIEW"?"IN_REVIEW":"DRAFT",metaTitle:row.metaTitle??"",metaDescription:row.metaDescription??"",noindex:row.noindex,
    coverKey:articleInputSchema.shape.coverKey.parse(row.coverKey),coverAlt:row.coverAlt??"",expectedUpdatedAt:row.updatedAt.toISOString()};
  return {id:row.id,data,status:row.status,isDemo:row.isDemo,reviewedAt:row.reviewedAt?.toISOString()??null,publishedAt:row.publishedAt?.toISOString()??null,legacy:!body.success,revisions:row.revisions.map(revision=>({...revision,createdAt:revision.createdAt.toISOString()}))};
}
function unchanged(actual:Date,expected:string|undefined) {if(!expected || actual.toISOString()!==expected)throw new AccessError(409,"Este artículo cambió. Recarga antes de continuar para no sobrescribir otra edición.");}
async function checkLinks(data:ArticleInput,tx:Db) {
  for(const block of data.body.blocks)if(block.type==="link") {
    const found=block.kind==="tools"?await tx.tool.count({where:{id:block.id}}):block.kind==="use-cases"?await tx.useCase.count({where:{id:block.id}}):await tx.article.count({where:{id:block.id}});
    if(!found)throw new AccessError(422,"Uno de los enlaces internos apunta a un registro inexistente.");
  }
}
const ids=(values:string[])=>[...new Set(values)].map(id=>({id}));
export async function saveArticle(userId:string,input:unknown,id?:string,db:PrismaClient=getDatabase()) {
  const data=articleInputSchema.parse(input);if(id)z.uuid().parse(id);
  return db.$transaction(async tx=>{
    const actor=await authorizeActor(userId,"write",tx);const previous=id?await tx.article.findUnique({where:{id}}):null;
    if(id&&!previous)throw new AccessError(404,"El artículo ya no existe.");
    if(previous) {unchanged(previous.updatedAt,data.expectedUpdatedAt);if(actor.role==="EDITOR"&&!["DRAFT","IN_REVIEW"].includes(previous.status))throw new AccessError(403,"Solo un administrador puede editar un artículo publicado o archivado.");}
    await checkLinks(data,tx);
    if(previous&&!articleBodySchema.safeParse(previous.body).success) {
      const relations=await tx.article.findUniqueOrThrow({where:{id:previous.id},select:{categories:{select:{id:true}},tags:{select:{id:true}},tools:{select:{id:true}}}});
      const snapshot=JSON.parse(JSON.stringify({kind:"legacy-article-snapshot",record:previous,relations})) as Prisma.InputJsonValue;
      await tx.contentDraft.create({data:{articleId:previous.id,kind:"ARTICLE",title:previous.title,body:snapshot,status:previous.status,authorId:actor.id}});
    }
    const {categoryIds,tagIds,toolIds,expectedUpdatedAt:_expected,...fields}=data;void _expected;
    const attributes={...fields,...(previous?{updatedAt:new Date(Math.max(Date.now(),previous.updatedAt.getTime()+1))}:{}),metaTitle:fields.metaTitle||null,metaDescription:fields.metaDescription||null,coverAlt:fields.coverAlt||null,publishedAt:null,reviewedAt:null,reviewedById:null};
    const relations=id?{categories:{set:ids(categoryIds)},tags:{set:ids(tagIds)},tools:{set:ids(toolIds)}}:{categories:{connect:ids(categoryIds)},tags:{connect:ids(tagIds)},tools:{connect:ids(toolIds)}};
    const saved=id?await tx.article.update({where:{id},data:{...attributes,...relations}}):await tx.article.create({data:{...attributes,...relations,authorId:actor.id}});
    await tx.contentDraft.create({data:{articleId:saved.id,kind:"ARTICLE",title:saved.title,body:data as unknown as Prisma.InputJsonValue,status:saved.status,authorId:actor.id}});
    await tx.auditLog.create({data:{actorId:actor.id,entityType:"Article",entityId:saved.id,action:previous?.status==="PUBLISHED"?"article.edited_and_unpublished":id?"article.updated":"article.created"}});
    return {id:saved.id,updatedAt:saved.updatedAt.toISOString()};
  },{isolationLevel:"Serializable",timeout:15000});
}
export async function transitionArticle(userId:string,id:string,input:unknown,db:PrismaClient=getDatabase()) {
  z.uuid().parse(id);const data=z.object({action:z.enum(["review","publish","unpublish"]),expectedUpdatedAt:z.iso.datetime(),confirmation:z.boolean().optional()}).strict().parse(input);
  return db.$transaction(async tx=>{
    const actor=await authorizeActor(userId,"publish",tx);const article=await tx.article.findUnique({where:{id}});if(!article)throw new AccessError(404,"El artículo ya no existe.");unchanged(article.updatedAt,data.expectedUpdatedAt);
    const change:Prisma.ArticleUpdateInput={updatedAt:new Date(Math.max(Date.now(),article.updatedAt.getTime()+1))};
    if(data.action==="unpublish") {change.status="DRAFT";change.publishedAt=null;change.reviewedAt=null;change.reviewedBy={disconnect:true};}
    else {
      const body=articleBodySchema.safeParse(article.body);const sources=z.array(sourceSchema).safeParse(article.sources);
      if(article.isDemo||!body.success||!sources.success||!sources.data.length||sources.data.some(source=>source.status!=="VERIFIED"||!source.checkedAt||new Date(source.checkedAt)>new Date()))throw new AccessError(422,"Comprueba el contenido y todas sus fuentes antes de revisar o publicar. Los ejemplos no se publican.");
      if(!await tx.category.count({where:{articles:{some:{id}}}}))throw new AccessError(422,"Selecciona al menos una categoría.");
      if(!article.metaTitle||!article.metaDescription)throw new AccessError(422,"Completa el título y la descripción SEO.");
      const targets=await resolvePublicArticleLinks(body.data,tx);
      if(body.data.blocks.some(block=>block.type==="link"&&!targets[block.id]))throw new AccessError(422,"Los enlaces internos deben apuntar a contenido publicado y disponible.");
      if(article.status!=="IN_REVIEW")throw new AccessError(409,"Envía primero el artículo a revisión.");
      if(data.action==="review") {if(data.confirmation!==true)throw new AccessError(422,"Confirma que verificaste las afirmaciones y las fuentes.");change.reviewedAt=new Date();change.reviewedBy={connect:{id:actor.id}};}
      else {if(!article.reviewedAt)throw new AccessError(409,"El artículo requiere aprobación editorial antes de publicarse.");change.status="PUBLISHED";change.publishedAt=new Date();}
    }
    const saved=await tx.article.update({where:{id},data:change});
    await tx.auditLog.create({data:{actorId:actor.id,entityType:"Article",entityId:id,action:`article.${data.action}`}});
    return {id,status:saved.status,updatedAt:saved.updatedAt.toISOString()};
  },{isolationLevel:"Serializable",timeout:15000});
}
export async function articleCanPublish(userId:string,db:PrismaClient=getDatabase()) {const actor=await authorizeActor(userId,"panel",db);return can(actor.role,"publish");}
