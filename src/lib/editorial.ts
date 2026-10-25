import { z } from "zod";
const text = z.string().trim().min(1).max(12000);
export const editorialSlug = z.string().min(1).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const sourceSchema = z.object({
  title: z.string().trim().min(1).max(200), url: z.url().max(2048).refine(value => { try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } }, "Usa una URL HTTPS sin credenciales."),
  note: z.string().trim().min(1).max(1500), status: z.enum(["PENDING", "VERIFIED"]), checkedAt: z.iso.datetime().nullable(),
}).strict().refine(value => value.status !== "VERIFIED" || value.checkedAt !== null, { message: "Indica cuándo se comprobó la fuente.", path: ["checkedAt"] });
export const articleBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text }).strict(),
  z.object({ type: z.literal("heading"), level: z.union([z.literal(2),z.literal(3)]), text: text.max(200) }).strict(),
  z.object({ type: z.literal("list"), ordered: z.boolean(), items: z.array(text.max(2000)).min(1).max(30) }).strict(),
  z.object({ type: z.literal("code"), language: z.enum(["text","javascript","python","json","bash","sql"]), text }).strict(),
  z.object({ type: z.literal("callout"), text }).strict(),
  z.object({ type: z.literal("link"), kind: z.enum(["tools","use-cases","articles"]), id: z.uuid(), label: text.max(200) }).strict(),
]);
export const articleBodySchema = z.object({ version: z.literal(1), blocks: z.array(articleBlockSchema).min(1).max(80) }).strict();
export type ArticleBlock = z.infer<typeof articleBlockSchema>;
export type ArticleBody = z.infer<typeof articleBodySchema>;
export const coverKeys = ["workflow","writing","tools","marketing","code","data"] as const;
export const articleInputSchema = z.object({
  title: z.string().trim().min(1).max(200), slug: editorialSlug, excerpt: z.string().trim().min(1).max(500), body: articleBodySchema,
  sources: z.array(sourceSchema).max(30), categoryIds: z.array(z.uuid()).max(20), tagIds: z.array(z.uuid()).max(30), toolIds: z.array(z.uuid()).max(30), useCaseId: z.uuid().nullable(),
  status: z.enum(["DRAFT","IN_REVIEW"]), metaTitle: z.string().trim().max(200), metaDescription: z.string().trim().max(500), noindex: z.boolean(),
  coverKey: z.enum(coverKeys).nullable(), coverAlt: z.string().trim().max(250), expectedUpdatedAt: z.iso.datetime().optional(),
}).strict().refine(data => !data.coverKey || data.coverAlt.length > 0, { message: "Describe la imagen para lectores de pantalla.", path: ["coverAlt"] });
export type ArticleInput = z.infer<typeof articleInputSchema>;
export const blankArticle: ArticleInput = { title:"",slug:"",excerpt:"",body:{version:1,blocks:[{type:"paragraph",text:""}]},sources:[],categoryIds:[],tagIds:[],toolIds:[],useCaseId:null,status:"DRAFT",metaTitle:"",metaDescription:"",noindex:false,coverKey:null,coverAlt:"" };
export const articleQuerySchema = z.object({ q:z.string().trim().max(100).default(""),category:editorialSlug.optional(),page:z.coerce.number().int().min(1).max(10000).default(1) });
export type ArticleQuery = z.infer<typeof articleQuerySchema>;
export function parseArticleQuery(params: Record<string,string|string[]|undefined>) {
  return articleQuerySchema.safeParse(Object.fromEntries(["q","category","page"].map(key => [key,params[key] === "" ? undefined : params[key]]).filter(([,value]) => value !== undefined)));
}
export function articleHref(query: Partial<ArticleQuery>, page = query.page ?? 1) {
  const params = new URLSearchParams(); if(query.q) params.set("q",query.q); if(query.category) params.set("category",query.category); if(page>1) params.set("page",String(page)); return `/blog${params.size ? `?${params}` : ""}`;
}
export const articleText = (body: ArticleBody) => body.blocks.map(block => block.type === "list" ? block.items.join(" ") : block.type === "link" ? block.label : block.text).join(" ");
export const readingMinutes = (body: ArticleBody) => Math.max(1,Math.ceil(articleText(body).split(/\s+/).length/200));
export const coverPath = (key: string) => `/editorial/${key}.png`;
export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
