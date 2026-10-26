import 'server-only';
import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { CatalogLibrary } from '@/lib/catalog-import';
import { domainIdentity, nameIdentity } from '@/lib/catalog-import';
import { databaseDiagnostic } from '@/lib/database-diagnostics';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export type ImportAction = { kind: 'tool' | 'use-case' | 'article'; slug: string; action: 'CREATE' | 'SKIP_EXISTING' | 'REJECT_CONFLICT' };
export type ImportPlan = { version: 1; manifestHash: string; fingerprint: string; actions: ImportAction[]; created: number; skipped: number; rejected: number; updated: 0 };
export class CatalogImportFailure extends Error {
  constructor(readonly created: number, readonly codes: string[]) { super('IMPORT_BATCH_FAILED'); }
}

async function assertDatabase(db: PrismaClient, expected: string) {
  const [row] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  if (!row || row.name !== expected) throw Error('WRONG_IMPORT_DATABASE');
}
export async function planImport(db: PrismaClient, library: CatalogLibrary, expectedDatabase: string): Promise<ImportPlan> {
  await assertDatabase(db, expectedDatabase);
  return db.$transaction(async tx => {
    // No business/identity tables are read, and no writes occur in a dry run.
    const tools = await tx.tool.findMany({ select: { id: true, slug: true, name: true, websiteUrl: true, status: true, isDemo: true, publishedAt: true, updatedAt: true }, orderBy: { id: 'asc' } });
    const workflows = await tx.useCase.findMany({ select: { id: true, slug: true, title: true, isDemo: true, status: true, publishedAt: true, updatedAt: true }, orderBy: { id: 'asc' } });
    const articles = await tx.article.findMany({ select: { id: true, slug: true, title: true, updatedAt: true }, orderBy: { id: 'asc' } });
    const categories = await tx.category.findMany({ orderBy: { id: 'asc' } }), tags = await tx.tag.findMany({ orderBy: { id: 'asc' } });
    const actions: ImportAction[] = [];
    for (const item of library.tools) {
      const matches = tools.filter(row => row.slug === item.slug || nameIdentity(row.name) === nameIdentity(item.name) || (() => { try { return domainIdentity(row.websiteUrl) === domainIdentity(item.websiteUrl); } catch { return false; } })());
      const exact = matches.length === 1 && matches[0]!.slug === item.slug && nameIdentity(matches[0]!.name) === nameIdentity(item.name) && !matches[0]!.isDemo && domainIdentity(matches[0]!.websiteUrl) === domainIdentity(item.websiteUrl) && (item.status !== 'PUBLISHED' || matches[0]!.status === 'PUBLISHED' && matches[0]!.publishedAt && matches[0]!.publishedAt <= new Date());
      actions.push({ kind: 'tool', slug: item.slug, action: matches.length ? exact ? 'SKIP_EXISTING' : 'REJECT_CONFLICT' : 'CREATE' });
    }
    for (const item of library.useCases) {
      const matches = workflows.filter(row => row.slug === item.slug || nameIdentity(row.title) === nameIdentity(item.title));
      const exact = matches.length === 1 && matches[0]!.slug === item.slug && !matches[0]!.isDemo && nameIdentity(matches[0]!.title) === nameIdentity(item.title) && (item.status !== 'PUBLISHED' || matches[0]!.status === 'PUBLISHED' && matches[0]!.publishedAt && matches[0]!.publishedAt <= new Date());
      const badTool = item.tools.some(slug => actions.some(a => a.kind === 'tool' && a.slug === slug && a.action === 'REJECT_CONFLICT'));
      actions.push({ kind: 'use-case', slug: item.slug, action: badTool ? 'REJECT_CONFLICT' : matches.length ? exact ? 'SKIP_EXISTING' : 'REJECT_CONFLICT' : 'CREATE' });
    }
    for (const item of library.articles) {
      const matches = articles.filter(row => row.slug === item.slug || nameIdentity(row.title) === nameIdentity(item.title));
      const badTool = item.tools.some(slug => actions.some(a => a.kind === 'tool' && a.slug === slug && a.action === 'REJECT_CONFLICT'));
      const exact = matches.length === 1 && matches[0]!.slug === item.slug && nameIdentity(matches[0]!.title) === nameIdentity(item.title);
      actions.push({ kind: 'article', slug: item.slug, action: badTool ? 'REJECT_CONFLICT' : matches.length ? exact ? 'SKIP_EXISTING' : 'REJECT_CONFLICT' : 'CREATE' });
    }
    return { version: 1, manifestHash: hash(library), fingerprint: hash({ tools, workflows, articles, categories, tags }), actions, created: actions.filter(a => a.action === 'CREATE').length, skipped: actions.filter(a => a.action === 'SKIP_EXISTING').length, rejected: actions.filter(a => a.action === 'REJECT_CONFLICT').length, updated: 0 };
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 });
}
async function taxonomy(tx: Prisma.TransactionClient, library: CatalogLibrary, categories: string[], tags: string[]) {
  const ids = { categories: [] as { id: string }[], tags: [] as { id: string }[] };
  for (const slug of categories) {
    const data = library.categories.find(row => row.slug === slug)!;
    const row = await tx.category.findUnique({ where: { slug }, select: { id: true } }) ?? await tx.category.create({ data, select: { id: true } });
    ids.categories.push(row);
  }
  for (const slug of tags) {
    const data = library.tags.find(row => row.slug === slug)!;
    const row = await tx.tag.findUnique({ where: { slug }, select: { id: true } }) ?? await tx.tag.create({ data, select: { id: true } });
    ids.tags.push(row);
  }
  return { categories: { connect: ids.categories }, tags: { connect: ids.tags } };
}
export async function applyImport(db: PrismaClient, library: CatalogLibrary, expectedDatabase: string, approved: ImportPlan, batchSize = 5) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) throw Error('INVALID_BATCH_SIZE');
  const current = await planImport(db, library, expectedDatabase);
  if (current.rejected || hash(current) !== hash(approved)) throw Error('IMPORT_PLAN_CHANGED_OR_REJECTED');
  let created = 0;
  const pending = current.actions.filter(a => a.action === 'CREATE');
  // Atomic batches; interruptions preserve completed batches. A fresh dry run
  // skips those rows. Never overwrite a manually edited or archived record.
  try {
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    await db.$transaction(async tx => {
      for (const action of pending.slice(offset, offset + batchSize)) {
        let record: { id: string };
        if (action.kind === 'tool') {
          const item = library.tools.find(t => t.slug === action.slug)!;
          const relations = await taxonomy(tx, library, item.categories, item.tags);
          record = await tx.tool.create({ data: { name: item.name, slug: item.slug, summary: item.summary, description: item.description, websiteUrl: item.websiteUrl, status: item.status, isDemo: false, featured: item.featured, publishedAt: item.status === 'PUBLISHED' ? new Date() : null, ...relations }, select: { id: true } });
        } else if (action.kind === 'use-case') {
          const item = library.useCases.find(t => t.slug === action.slug)!;
          const relations = await taxonomy(tx, library, item.categories, item.tags);
          const tools = await tx.tool.findMany({ where: { slug: { in: item.tools }, isDemo: false, ...(item.status === 'PUBLISHED' ? { status: 'PUBLISHED', publishedAt: { lte: new Date() } } : {}) }, select: { id: true } });
          if (tools.length !== item.tools.length) throw Error('RELATED_TOOL_UNAVAILABLE');
          record = await tx.useCase.create({ data: { title: item.title, slug: item.slug, problem: item.problem, solution: item.solution, limitations: item.limitations, difficulty: item.difficulty, instructions: item.instructions, references: item.references, status: item.status, isDemo: false, featured: item.featured, publishedAt: item.status === 'PUBLISHED' ? new Date() : null, ...relations, tools: { connect: tools } }, select: { id: true } });
        } else {
          const item = library.articles.find(t => t.slug === action.slug)!;
          const relations = await taxonomy(tx, library, item.categories, item.tags);
          const tools = await tx.tool.findMany({ where: { slug: { in: item.tools }, isDemo: false }, select: { id: true } });
          if (tools.length !== item.tools.length) throw Error('RELATED_TOOL_UNAVAILABLE');
          record = await tx.article.create({ data: { title: item.title, slug: item.slug, excerpt: item.excerpt, body: item.body, sources: item.sources, status: 'DRAFT', isDemo: false, noindex: true, metaTitle: item.metaTitle, metaDescription: item.metaDescription, ...relations, tools: { connect: tools } }, select: { id: true } });
        }
        // Existing audit model stores version/hash/provenance, never credentials.
        await tx.auditLog.create({ data: { action: 'catalog.import.created', entityType: action.kind, entityId: record.id, metadata: { library: library.id, manifestHash: current.manifestHash, slug: action.slug, source: 'manual-catalog-import' } }, select: { id: true } });
      }
    }, { isolationLevel: 'Serializable', timeout: 20000 });
    created += pending.slice(offset, offset + batchSize).length;
  }
  const after = await planImport(db, library, expectedDatabase);
  if (after.created || after.rejected) throw Error('IMPORT_POSTFLIGHT_FAILED');
  return { created, skipped: current.skipped, updated: 0, rejected: 0, publishedTools: await db.tool.count({ where: { status: 'PUBLISHED', isDemo: false, publishedAt: { lte: new Date() } } }), publishedUseCases: await db.useCase.count({ where: { status: 'PUBLISHED', isDemo: false, publishedAt: { lte: new Date() } } }), categories: await db.category.count(), tags: await db.tag.count(), articleDraftsInManifest: library.articles.length };
  } catch (error) { throw new CatalogImportFailure(created, databaseDiagnostic(error, 'database.unknown').codes); }
}
