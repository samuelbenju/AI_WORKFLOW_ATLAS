import "server-only";
import { cachedPublicRead } from "./public-read-cache";
import { publishedArticleWhere,articleCardSelect } from "@/server/editorial/public";
import { cache } from "react";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { databaseOperation } from "@/server/db/diagnostics";
import type { DatabaseStage } from "@/lib/database-diagnostics";
import { getDatabase } from "@/server/db/client";
import { CATALOG_PAGE_SIZE, catalogQuerySchema, type CatalogQuery } from "@/lib/catalog-query";

export type CatalogMode = "published" | "demo";
export function catalogMode(): CatalogMode {
  return process.env.CATALOG_DEMO_MODE === "true" ? "demo" : "published";
}

function visibility(mode: CatalogMode) {
  return mode === "demo"
    ? { isDemo: true, status: "DRAFT" as const }
    : { isDemo: false, status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
}

const taxonomy = { select: { slug: true, name: true } } as const;
const toolSelect = { id: true, slug: true, name: true, summary: true, description: true, websiteUrl: true, isDemo: true, featured: true,
  categories: taxonomy, tags: taxonomy } satisfies Prisma.ToolSelect;
const workflowSelect = { id: true, slug: true, title: true, problem: true, solution: true, difficulty: true, limitations: true,
  instructions: true, references: true, isDemo: true, featured: true, categories: taxonomy, tags: taxonomy } satisfies Prisma.UseCaseSelect;
const toolCardSelect = { id:true,slug:true,name:true,summary:true,isDemo:true,featured:true,categories:taxonomy,tags:taxonomy } satisfies Prisma.ToolSelect;
const workflowCardSelect = { id:true,slug:true,title:true,problem:true,difficulty:true,isDemo:true,featured:true,categories:taxonomy,tags:taxonomy } satisfies Prisma.UseCaseSelect;
export type PublicTool = Prisma.ToolGetPayload<{ select: typeof toolSelect }>;
export type PublicWorkflow = Prisma.UseCaseGetPayload<{ select: typeof workflowSelect }>;
export type PublicToolCard = Prisma.ToolGetPayload<{ select: typeof toolCardSelect }>;
export type PublicWorkflowCard = Prisma.UseCaseGetPayload<{ select: typeof workflowCardSelect }>;
export type Facets = Awaited<ReturnType<typeof getCatalogFacets>>;

// Fail visibly and generically; never turn database errors into empty/static data.
async function readCatalog<T>(stage:DatabaseStage,operation:(db:PrismaClient)=>Promise<T>,db?:PrismaClient,key?:string):Promise<T> {
  // Explicit clients (readiness/operators/tests) always execute the real queries.
  return databaseOperation(stage,()=>{const client=db??getDatabase();return !db&&key?cachedPublicRead(client,key,()=>operation(client)):operation(client);},"The catalog is temporarily unavailable. Please try again shortly.");
}

export async function getCatalogFacets(kind: "tools" | "use-cases", mode = catalogMode(), db?: PrismaClient) {
  return readCatalog(kind === "tools" ? "catalog.facets.tools" : "catalog.facets.use-cases",async (db) => {
    const content = visibility(mode);
    const where = kind === "tools" ? { tools: { some: content } } : { useCases: { some: content } };
    const counts = { tools: { where: content }, useCases: { where: content } };
    // Independent READ COMMITTED facets do not need a transaction. Sequential
    // reads reuse the available connection without Prisma's 2s start deadline.
    // They also have no Prisma transaction execution-expiry policy; neither
    // this path nor the old batch guarantees cancellation of blocked SQL.
    const categories = await db.category.findMany({ where, select: { slug: true, name: true, _count: { select: counts } }, orderBy: { name: "asc" } });
    const tags = await db.tag.findMany({ where, select: { slug: true, name: true }, orderBy: { name: "asc" } });
    return { categories: categories.map(({ _count, ...category }) => ({ ...category, count: kind === "tools" ? _count.tools : _count.useCases })), tags };
  },db,mode==='published'?JSON.stringify(['facets',kind,mode]):undefined);
}

// One PostgreSQL statement supplies rows, taxonomy and total from one snapshot.
// All identifiers below come exclusively from this closed server-side mapping.
async function directoryPage<T>(db:PrismaClient,kind:'Tool'|'UseCase',query:CatalogQuery,mode:CatalogMode){
  const table=Prisma.raw('"'+kind+'"'),categoryJoin=Prisma.raw('"_CategoryTo'+kind+'"'),tagJoin=Prisma.raw('"_TagTo'+kind+'"');
  const name=Prisma.raw(kind==='Tool'?'t."name"':'t."title"');
  const order=query.sort==='recent'?Prisma.sql`t."createdAt" DESC,t.id ASC`:Prisma.sql`${name} ${Prisma.raw(query.sort==='name'?'ASC':'DESC')},t.id ASC`;
  const filters=[mode==='demo'?Prisma.sql`t."isDemo"=true AND t.status::text='DRAFT'`:Prisma.sql`t."isDemo"=false AND t.status::text='PUBLISHED' AND t."publishedAt"<=${new Date()}`];
  if(query.q){const pattern='%'+query.q+'%';filters.push(kind==='Tool'?Prisma.sql`(t.name ILIKE ${pattern} OR t.summary ILIKE ${pattern})`:Prisma.sql`(t.title ILIKE ${pattern} OR t.problem ILIKE ${pattern} OR t.solution ILIKE ${pattern})`);}
  if(query.category)filters.push(Prisma.sql`EXISTS(SELECT 1 FROM ${categoryJoin} j JOIN "Category" c ON c.id=j."A" WHERE j."B"=t.id AND c.slug=${query.category})`);
  if(query.tag)filters.push(Prisma.sql`EXISTS(SELECT 1 FROM ${tagJoin} j JOIN "Tag" c ON c.id=j."A" WHERE j."B"=t.id AND c.slug=${query.tag})`);
  if(kind==='UseCase'&&query.difficulty)filters.push(Prisma.sql`t.difficulty::text=${query.difficulty}`);
  const columns=Prisma.raw(kind==='Tool'?'t.name,t.summary':'t.title,t.problem,t.difficulty');
  const fields=kind==='Tool'?Prisma.sql`jsonb_build_object('name',t.name,'summary',t.summary)`:Prisma.sql`jsonb_build_object('title',t.title,'problem',t.problem,'difficulty',t.difficulty)`;
  const [result]=await db.$queryRaw<{items:T[];total:number}[]>(Prisma.sql`
    WITH filtered AS (SELECT t.id,t.slug,t."isDemo",t.featured,t."createdAt",${columns} FROM ${table} t WHERE ${Prisma.join(filters,' AND ')}),
    paged AS (SELECT t.*,row_number() OVER(ORDER BY ${order}) AS position FROM filtered t ORDER BY ${order} LIMIT ${CATALOG_PAGE_SIZE} OFFSET ${(query.page-1)*CATALOG_PAGE_SIZE})
    SELECT (SELECT count(*)::int FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'slug',t.slug,'isDemo',t."isDemo",'featured',t.featured,
        'categories',COALESCE((SELECT jsonb_agg(jsonb_build_object('slug',c.slug,'name',c.name) ORDER BY c.id) FROM ${categoryJoin} j JOIN "Category" c ON c.id=j."A" WHERE j."B"=t.id),'[]'::jsonb),
        'tags',COALESCE((SELECT jsonb_agg(jsonb_build_object('slug',c.slug,'name',c.name) ORDER BY c.id) FROM ${tagJoin} j JOIN "Tag" c ON c.id=j."A" WHERE j."B"=t.id),'[]'::jsonb)) || ${fields} ORDER BY t.position) FROM paged t),'[]'::jsonb) AS items`);
  if(!result)throw Error('CATALOG_RESULT_MISSING');
  return {...result,pageCount:Math.ceil(result.total/CATALOG_PAGE_SIZE)};
}

export async function queryTools(query: CatalogQuery, mode = catalogMode(), db?: PrismaClient) {
  return readCatalog("catalog.tools",async (db) => {
    return directoryPage<PublicToolCard>(db,'Tool',query,mode);
  },db,mode==='published'&&!query.q?JSON.stringify(['tools',mode,query]):undefined);
}

export async function queryWorkflows(query: CatalogQuery, mode = catalogMode(), db?: PrismaClient) {
  return readCatalog("catalog.use-cases",async (db) => {
    return directoryPage<PublicWorkflowCard>(db,'UseCase',query,mode);
  },db,mode==='published'&&!query.q?JSON.stringify(['workflows',mode,query]):undefined);
}

// Primitive keys let metadata and the page share one listing read per request.
// React cache does not persist content across requests or hide database errors.
const cachedTools = cache((key:string)=>queryTools(catalogQuerySchema.parse(JSON.parse(key))));
const cachedWorkflows = cache((key:string)=>queryWorkflows(catalogQuerySchema.parse(JSON.parse(key))));
export const toolsPageData = (query:CatalogQuery)=>cachedTools(JSON.stringify(query));
export const workflowsPageData = (query:CatalogQuery)=>cachedWorkflows(JSON.stringify(query));

const validSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 150;
// Minimal existence check before Next streams a loading boundary. No private
// fields, relationships or replacement content are returned to Proxy.
export async function catalogEntryExists(kind: "tools" | "use-cases" | "blog" | "categories", slug: string, db?: PrismaClient) {
  if (!validSlug(slug)) return false;
  const stage = kind === "tools" ? "catalog.tool" : kind === "use-cases" ? "catalog.use-case" : "catalog.home";
  return readCatalog(stage, async client => {
    const select = { id: true } as const;
    const entry = kind === "tools" ? await client.tool.findFirst({ where: { slug, ...visibility(catalogMode()) }, select })
      : kind === "use-cases" ? await client.useCase.findFirst({ where: { slug, ...visibility(catalogMode()) }, select })
      : kind === "categories" ? await client.category.findFirst({where:{slug,OR:[{tools:{some:visibility(catalogMode())}},{useCases:{some:visibility(catalogMode())}}]},select})
      : await client.article.findFirst({ where: { slug, ...publishedArticleWhere() }, select });
    return entry !== null;
  }, db);
}
export const toolBySlug = cache(async (slug: string) => {
  if (!validSlug(slug)) return null;
  return readCatalog("catalog.tool",async (db) => {
    const tool=await db.tool.findFirst({ where: { slug, ...visibility(catalogMode()) },
      select: { ...toolSelect,updatedAt:true,useCases: { where: visibility(catalogMode()), select: workflowCardSelect, orderBy: { title: "asc" }, take: 6 },
        articles:{where:publishedArticleWhere(),select:articleCardSelect,take:3,orderBy:{publishedAt:'desc'}} } });
    if(!tool)return null;
    const related=await db.tool.findMany({where:{...visibility(catalogMode()),id:{not:tool.id},OR:[
      {categories:{some:{slug:{in:tool.categories.map(c=>c.slug)}}}},{tags:{some:{slug:{in:tool.tags.map(t=>t.slug)}}}}]},
      select:toolCardSelect,orderBy:[{name:'asc'},{id:'asc'}],take:3});
    return {...tool,related};
  },undefined,catalogMode()==='published'?JSON.stringify(['tool',slug]):undefined);
});
export const workflowBySlug = cache(async (slug: string) => {
  if (!validSlug(slug)) return null;
  return readCatalog("catalog.use-case",(db) => db.useCase.findFirst({ where: { slug, ...visibility(catalogMode()) },
    select: { ...workflowSelect, tools: { where: visibility(catalogMode()), select: toolCardSelect, orderBy: { name: "asc" } },
      articles:{where:publishedArticleWhere(),select:articleCardSelect,take:3,orderBy:{publishedAt:'desc'}} } }),undefined,catalogMode()==='published'?JSON.stringify(['workflow',slug]):undefined);
});

const categoryVisibility=(mode:CatalogMode)=>({OR:[{tools:{some:visibility(mode)}},{useCases:{some:visibility(mode)}}]});
export async function catalogCategories(mode=catalogMode(),db?:PrismaClient){
  return readCatalog('catalog.facets.tools',client=>client.category.findMany({where:categoryVisibility(mode),
    select:{slug:true,name:true,description:true,updatedAt:true,_count:{select:{tools:{where:visibility(mode)},useCases:{where:visibility(mode)}}}},
    orderBy:{name:'asc'}}),db,mode==='published'?'categories':undefined);
}
export const categoryBySlug=cache(async(slug:string)=>{
  if(!validSlug(slug))return null;
  const mode=catalogMode();
  return readCatalog('catalog.facets.tools',db=>db.category.findFirst({where:{slug,...categoryVisibility(mode)},
    select:{slug:true,name:true,description:true,updatedAt:true,
      _count:{select:{tools:{where:visibility(mode)},useCases:{where:visibility(mode)}}},
      tools:{where:visibility(mode),select:toolCardSelect,orderBy:{name:'asc'},take:6},
      useCases:{where:visibility(mode),select:workflowCardSelect,orderBy:{title:'asc'},take:6}}}),undefined,mode==='published'?JSON.stringify(['category',slug]):undefined);
});

export async function homeCatalog(mode = catalogMode(), db?: PrismaClient) {
  return readCatalog("catalog.home",async (db) => {
    const [tools, workflows, articles, categories] = await db.$transaction([
      db.tool.findMany({ where: { ...visibility(mode), featured: true }, select: toolCardSelect, orderBy: [{ name: "asc" }, { id: "asc" }], take: 3 }),
      db.useCase.findMany({ where: { ...visibility(mode), featured: true }, select: workflowCardSelect, orderBy: [{ title: "asc" }, { id: "asc" }], take: 3 }),
      db.article.findMany({ where: publishedArticleWhere(), select: { slug: true, title: true, excerpt: true, isDemo: true,
        useCase: { select: { slug: true, status: true, isDemo: true, publishedAt: true } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 2 }),
      db.category.findMany({ where: { OR: [{ tools: { some: visibility(mode) } }, { useCases: { some: visibility(mode) } }] }, select: { slug: true, name: true }, orderBy: { name: "asc" }, take: 12 }),
    ], { isolationLevel: "RepeatableRead" });
    return { tools, workflows, articles: articles.map(({ useCase, ...article }) => ({ ...article,
      workflowSlug: useCase && (mode === "demo" ? useCase.isDemo && useCase.status === "DRAFT" : !useCase.isDemo && useCase.status === "PUBLISHED" && useCase.publishedAt && useCase.publishedAt <= new Date()) ? useCase.slug : null })), categories };
  },db,mode==='published'?'home':undefined);
}
