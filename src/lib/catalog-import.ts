import { z } from 'zod';
import { toolSchema, useCaseSchema, categorySchema, taxonomySchema } from './admin-content';
import { articleBodySchema, sourceSchema } from './editorial';

export const normalizeSlug = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const nameIdentity = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function officialUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
    || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(url.hostname)
    || /(^|\.)(localhost|local|internal|invalid|test)$/.test(url.hostname) || url.hostname.includes('..')) throw Error('INVALID_OFFICIAL_URL');
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  if (url.hostname === 'github.com') {
    if (!/^\/[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(url.pathname)) throw Error('INVALID_REPOSITORY_URL');
    url.pathname = url.pathname.toLowerCase();
  }
  return url.href;
}
// A shared distribution host is not a vendor identity. Only a complete,
// reviewed GitHub repository path can be used as that explicit exception.
export function domainIdentity(value: string) {
  const url = new URL(officialUrl(value));
  return url.hostname === 'github.com' ? `${url.hostname}${url.pathname}` : url.hostname;
}
const slug = z.string().min(1).max(100).transform(normalizeSlug).pipe(z.string().min(1).max(100));
const refs = z.array(slug).min(1).max(20).refine(values => new Set(values).size === values.length);
const safeUrl = z.string().max(2048).transform((value, ctx) => { try { return officialUrl(value); } catch { ctx.addIssue({ code: 'custom', message: 'INVALID_OFFICIAL_URL' }); return z.NEVER; } });
const source = z.object({ url: z.url().max(2048), sha256: z.string().regex(/^[a-f0-9]{64}$/), checkedAt: z.iso.datetime() }).strict();
const review = z.object({ status: z.literal('VERIFIED_PRIMARY_SOURCE'), reviewedAt: z.iso.datetime(), handsOnTested: z.literal(false), note: z.string().min(30).max(1200), sources: z.array(source).min(1).max(8) }).strict();
const publication = { status: z.enum(['DRAFT', 'PUBLISHED']), isDemo: z.literal(false), featured: z.boolean(), featuredReason: z.string().max(300), review };
const tool = z.object({ name: z.string().min(1).max(160), slug, summary: z.string().min(30).max(500), description: z.string().min(150).max(30000), websiteUrl: safeUrl, categories: refs, tags: refs, ...publication }).strict();
const useCase = z.object({ title: z.string().min(1).max(200), slug, problem: z.string().min(40).max(10000), solution: z.string().min(40).max(10000), limitations: z.string().min(60).max(10000),
  instructions: z.array(z.object({ step: z.number().int().positive(), text: z.string().min(30).max(2000) }).strict()).min(4).max(15),
  references: z.array(z.object({ url: z.url(), note: z.string().min(1).max(500) }).strict()).min(1).max(20), difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']), categories: refs, tags: refs, tools: refs, ...publication }).strict();
const article = z.object({ title: z.string().min(1).max(200), slug, excerpt: z.string().min(30).max(500), body: articleBodySchema, sources: z.array(sourceSchema).min(1).max(20), categories: refs, tags: refs, tools: refs,
  status: z.literal('DRAFT'), isDemo: z.literal(false), noindex: z.literal(true), metaTitle: z.string().min(1).max(200), metaDescription: z.string().min(30).max(500) }).strict();
export const librarySchema = z.object({ version: z.literal(1), id: slug, categories: z.array(categorySchema).min(1).max(100), tags: z.array(taxonomySchema).min(1).max(200), tools: z.array(tool).min(1).max(1000), useCases: z.array(useCase).max(200), articles: z.array(article).max(20) }).strict();
export type CatalogLibrary = z.infer<typeof librarySchema>;
type Evidence = { sourceUrl?: string; sha256?: string; checkedAt?: string; websiteUrl?: string; result: string; archived?: boolean };
function demand(condition: unknown, code: string): asserts condition { if (!condition) throw Error(code); }
export function validateLibrary(value: unknown, evidence: Evidence[], now = new Date()): CatalogLibrary {
  const library = librarySchema.parse(value);
  const categories = new Set(library.categories.map(item => item.slug)), tags = new Set(library.tags.map(item => item.slug)), tools = new Map(library.tools.map(item => [item.slug, item]));
  for (const rows of [library.categories, library.tags, library.tools, library.useCases, library.articles]) {
    demand(new Set(rows.map(item => item.slug)).size === rows.length, 'DUPLICATE_SLUG');
  }
  demand(new Set(library.tools.map(item => nameIdentity(item.name))).size === library.tools.length, 'DUPLICATE_NAME');
  demand(new Set(library.tools.map(item => domainIdentity(item.websiteUrl))).size === library.tools.length, 'DUPLICATE_DOMAIN');
  demand(library.tools.filter(item => item.featured).length <= 6 && library.useCases.filter(item => item.featured).length <= 3, 'EXCESSIVE_FEATURED');
  const checkSource = (item: z.infer<typeof source>) => {
    const age = now.getTime() - Date.parse(item.checkedAt);
    demand(age >= 0 && age <= 90 * 86400000, 'STALE_OR_FUTURE_SOURCE');
    const found = evidence.find(row => row.sourceUrl === item.url && row.sha256 === item.sha256 && row.checkedAt === item.checkedAt && row.result === 'SOURCE_RETRIEVED' && !row.archived);
    demand(found, 'SOURCE_NOT_VERIFIED'); return found;
  };
  for (const item of [...library.tools, ...library.useCases]) {
    demand(item.categories.every(key => categories.has(key)) && item.tags.every(key => tags.has(key)), 'UNKNOWN_TAXONOMY');
    demand(!item.featured || item.featuredReason.length >= 30, 'FEATURED_REASON_REQUIRED');
    const reviewedAt = Date.parse(item.review.reviewedAt);
    demand(reviewedAt <= now.getTime() && reviewedAt >= Math.max(...item.review.sources.map(s => Date.parse(s.checkedAt))), 'INVALID_REVIEW_DATE');
    item.review.sources.forEach(checkSource);
    if ('websiteUrl' in item) {
      demand(item.review.sources.some(s => { const found = checkSource(s); return found.websiteUrl && officialUrl(found.websiteUrl) === item.websiteUrl; }), 'WRONG_PRODUCT_SOURCE');
      toolSchema.parse({ name: item.name, slug: item.slug, summary: item.summary, description: item.description, websiteUrl: item.websiteUrl, status: item.status, isDemo: false, featured: item.featured, categoryIds: [], tagIds: [] });
    } else {
      demand(item.tools.every(key => tools.get(key)?.status === 'PUBLISHED' || item.status === 'DRAFT' && tools.has(key)), 'UNKNOWN_OR_UNPUBLISHED_TOOL');
      demand(item.instructions.every((step, index) => step.step === index + 1), 'INVALID_STEP_SEQUENCE');
      const permittedReferences = new Set(item.review.sources.map(s => s.url));
      demand(item.references.every(ref => permittedReferences.has(ref.url)), 'UNVERIFIED_REFERENCE');
      useCaseSchema.parse({ name: item.title, slug: item.slug, problem: item.problem, solution: item.solution, limitations: item.limitations, instructions: item.instructions, references: item.references, difficulty: item.difficulty, status: item.status, isDemo: false, featured: item.featured, categoryIds: [], tagIds: [], toolIds: [] });
    }
  }
  for (const item of library.articles) {
    demand(item.categories.every(key => categories.has(key)) && item.tags.every(key => tags.has(key)) && item.tools.every(key => tools.has(key)), 'UNKNOWN_ARTICLE_RELATION');
    for (const s of item.sources) {
      demand(s.status === 'VERIFIED' && s.checkedAt && evidence.some(e => e.sourceUrl === s.url && e.checkedAt === s.checkedAt && e.result === 'SOURCE_RETRIEVED' && !e.archived), 'UNVERIFIED_ARTICLE_SOURCE');
    }
  }
  return library;
}
