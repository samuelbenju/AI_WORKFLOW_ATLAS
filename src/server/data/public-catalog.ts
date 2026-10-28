import "server-only";
import { publishedArticleWhere,articleCardSelect } from "@/server/editorial/public";
import { cache } from "react";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
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
async function readCatalog<T>(stage:DatabaseStage,operation:(db:PrismaClient)=>Promise<T>,db?:PrismaClient):Promise<T> {
  return databaseOperation(stage,()=>operation(db??getDatabase()),"The catalog is temporarily unavailable. Please try again shortly.");
}

export async function getCatalogFacets(kind: "tools" | "use-cases", mode = catalogMode(), db?: PrismaClient) {
  return readCatalog(kind === "tools" ? "catalog.facets.tools" : "catalog.facets.use-cases",async (db) => {
    const content = visibility(mode);
    const where = kind === "tools" ? { tools: { some: content } } : { useCases: { some: content } };
    const counts = { tools: { where: content }, useCases: { where: content } };
    const [categories, tags] = await db.$transaction([
      db.category.findMany({ where, select: { slug: true, name: true, _count: { select: counts } }, orderBy: { name: "asc" } }),
      db.tag.findMany({ where, select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    return { categories: categories.map(({ _count, ...category }) => ({ ...category, count: kind === "tools" ? _count.tools : _count.useCases })), tags };
  },db);
}

export async function queryTools(query: CatalogQuery, mode = catalogMode(), db?: PrismaClient) {
  return readCatalog("catalog.tools",async (db) => {
    const where: Prisma.ToolWhereInput = { ...visibility(mode),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { summary: { contains: query.q, mode: "insensitive" } }] } : {}),
      ...(query.category ? { categories: { some: { slug: query.category } } } : {}),
      ...(query.tag ? { tags: { some: { slug: query.tag } } } : {}),
    };
    const orderBy: Prisma.ToolOrderByWithRelationInput[] = query.sort === "recent" ? [{ createdAt: "desc" }, { id: "asc" }] : [{ name: query.sort === "name" ? "asc" : "desc" }, { id: "asc" }];
    const [items, total] = await db.$transaction([
      db.tool.findMany({ where, select: toolCardSelect, orderBy, take: CATALOG_PAGE_SIZE, skip: (query.page - 1) * CATALOG_PAGE_SIZE }), db.tool.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return { items, total, pageCount: Math.ceil(total / CATALOG_PAGE_SIZE) };
  },db);
}

export async function queryWorkflows(query: CatalogQuery, mode = catalogMode(), db?: PrismaClient) {
  return readCatalog("catalog.use-cases",async (db) => {
    const where: Prisma.UseCaseWhereInput = { ...visibility(mode),
      ...(query.q ? { OR: [{ title: { contains: query.q, mode: "insensitive" } }, { problem: { contains: query.q, mode: "insensitive" } }, { solution: { contains: query.q, mode: "insensitive" } }] } : {}),
      ...(query.category ? { categories: { some: { slug: query.category } } } : {}),
      ...(query.tag ? { tags: { some: { slug: query.tag } } } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
    };
    const orderBy: Prisma.UseCaseOrderByWithRelationInput[] = query.sort === "recent" ? [{ createdAt: "desc" }, { id: "asc" }] : [{ title: query.sort === "name" ? "asc" : "desc" }, { id: "asc" }];
    const [items, total] = await db.$transaction([
      db.useCase.findMany({ where, select: workflowCardSelect, orderBy, take: CATALOG_PAGE_SIZE, skip: (query.page - 1) * CATALOG_PAGE_SIZE }), db.useCase.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return { items, total, pageCount: Math.ceil(total / CATALOG_PAGE_SIZE) };
  },db);
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
  });
});
export const workflowBySlug = cache(async (slug: string) => {
  if (!validSlug(slug)) return null;
  return readCatalog("catalog.use-case",(db) => db.useCase.findFirst({ where: { slug, ...visibility(catalogMode()) },
    select: { ...workflowSelect, tools: { where: visibility(catalogMode()), select: toolCardSelect, orderBy: { name: "asc" } },
      articles:{where:publishedArticleWhere(),select:articleCardSelect,take:3,orderBy:{publishedAt:'desc'}} } }));
});

const categoryVisibility=(mode:CatalogMode)=>({OR:[{tools:{some:visibility(mode)}},{useCases:{some:visibility(mode)}}]});
export async function catalogCategories(mode=catalogMode(),db?:PrismaClient){
  return readCatalog('catalog.facets.tools',client=>client.category.findMany({where:categoryVisibility(mode),
    select:{slug:true,name:true,description:true,updatedAt:true,_count:{select:{tools:{where:visibility(mode)},useCases:{where:visibility(mode)}}}},
    orderBy:{name:'asc'}}),db);
}
export const categoryBySlug=cache(async(slug:string)=>{
  if(!validSlug(slug))return null;
  const mode=catalogMode();
  return readCatalog('catalog.facets.tools',db=>db.category.findFirst({where:{slug,...categoryVisibility(mode)},
    select:{slug:true,name:true,description:true,updatedAt:true,
      _count:{select:{tools:{where:visibility(mode)},useCases:{where:visibility(mode)}}},
      tools:{where:visibility(mode),select:toolCardSelect,orderBy:{name:'asc'},take:6},
      useCases:{where:visibility(mode),select:workflowCardSelect,orderBy:{title:'asc'},take:6}}}));
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
  },db);
}
