import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDatabaseClient } from '../../src/server/db/client';
import { validateLibrary } from '../../src/lib/catalog-import';
import { planImport, applyImport, CatalogImportFailure } from '../../src/server/catalog-import/service';
import { assertCatalogPrivileges } from '../../scripts/catalog-privileges';
import { homeCatalog, queryTools, queryWorkflows, getCatalogFacets } from '../../src/server/data/public-catalog';
import { readPublicArticle } from '../../src/server/editorial/public';
import { withAppServer } from '../e2e/test-server';
import { verifyManifest, completeHistory, catalog } from '../../scripts/neon-staging';
const ownerUrl = process.env.DATABASE_URL!;
const name = new URL(ownerUrl).pathname.slice(1);
assert.match(name, /^atlas_run_[a-f0-9]+_test$/);
const owner = createDatabaseClient(ownerUrl), importer = createDatabaseClient(process.env.ATLAS_CATALOG_IMPORT_TEST_URL!);
const library = validateLibrary(JSON.parse(readFileSync('data/catalog/library.json', 'utf8')), JSON.parse(readFileSync('data/catalog/research.json', 'utf8')).findings);
const query = { q: '', sort: 'name' as const, page: 1 };
before(async () => { await owner.$connect(); await importer.$connect(); });
after(async () => { await importer.$disconnect(); await owner.$disconnect(); });

test('restricted importer can inspect 16 migrations but cannot create users, update content or read private contacts', async () => {
  const connection = new pg.Client({ connectionString: process.env.ATLAS_CATALOG_IMPORT_TEST_URL }); await connection.connect();
  try {
    await assertCatalogPrivileges(connection);
    const manifest = await verifyManifest();
    assert.ok(completeHistory((await connection.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations')).rows, manifest));
    assert.deepEqual(await catalog(connection), manifest.structure);
    for (const sql of ['SELECT email FROM "User"', 'SELECT email FROM "NewsletterSubscriber"', 'UPDATE "Tool" SET name=name', 'DELETE FROM "Tool"', 'INSERT INTO "User" (email) VALUES (\'fixture@example.invalid\')', 'CREATE TABLE public.forbidden (id int)']) await assert.rejects(connection.query(sql), { code: '42501' });
  } finally { await connection.end(); }
});
test('column-level grants cannot bypass the least-privilege import guard', async () => {
  const role = new URL(process.env.ATLAS_CATALOG_IMPORT_TEST_URL!).username;
  assert.match(role, /^atlas_catalog_[a-f0-9]+$/);
  const connection = new pg.Client({ connectionString: process.env.ATLAS_CATALOG_IMPORT_TEST_URL }); await connection.connect();
  try {
    // Deliberately forbidden grants ONLY on this runner's disposable DB/role.
    // Revoke each addition even when the negative assertion fails.
    for (const privilege of ['SELECT (email) ON public."User"', 'INSERT (email) ON public."User"', 'UPDATE (summary) ON public."Tool"', 'REFERENCES (email) ON public."User"', 'SELECT (metadata) ON public."AuditLog"', 'SELECT (logs) ON public._prisma_migrations']) {
      await owner.$executeRawUnsafe(`GRANT ${privilege} TO "${role}"`);
      try { await assert.rejects(assertCatalogPrivileges(connection), /IMPORT_PRIVILEGES_REJECTED/); }
      finally { await owner.$executeRawUnsafe(`REVOKE ${privilege} FROM "${role}"`); }
    }
    await assertCatalogPrivileges(connection);
  } finally { await connection.end(); }
});
test('lost write permission rolls back its entire batch and reports only committed count and safe codes', async () => {
  const role = new URL(process.env.ATLAS_CATALOG_IMPORT_TEST_URL!).username;
  assert.match(role, /^atlas_catalog_[a-f0-9]+$/);
  const plan = await planImport(importer, library, name);
  await owner.$executeRawUnsafe(`REVOKE INSERT ON public."Tag" FROM "${role}"`);
  try {
    await assert.rejects(applyImport(importer, library, name, plan), (error: unknown) => {
      assert.ok(error instanceof CatalogImportFailure); assert.equal(error.created, 0); assert.equal(error.cause, undefined);
      assert.ok(error.codes.includes('42501')); assert.ok(!error.message.includes(ownerUrl)); return true;
    });
    assert.equal(await owner.tool.count(), 0); assert.equal(await owner.category.count(), 0); assert.equal(await owner.auditLog.count(), 0);
  } finally { await owner.$executeRawUnsafe(`GRANT INSERT ON public."Tag" TO "${role}"`); }
});
test('dry-run performs zero inserts and rejects a different actual database name', async () => {
  const plan = await planImport(importer, library, name);
  assert.equal(plan.created, 101); assert.equal(plan.rejected, 0);
  assert.equal(await owner.tool.count(), 0); assert.equal(await owner.auditLog.count(), 0);
  await assert.rejects(planImport(importer, library, 'atlas_staging'), /WRONG_IMPORT_DATABASE/);
  await assert.rejects(applyImport(importer, library, name, { ...plan, fingerprint: 'different' }), /IMPORT_PLAN/);
});
test('small atomic batches create real published content, CMS drafts, taxonomy, relations and provenance', async () => {
  const result = await applyImport(importer, library, name, await planImport(importer, library, name), 5);
  assert.equal(result.created, 101); assert.equal(result.publishedTools, 65); assert.equal(result.publishedUseCases, 30);
  assert.equal(result.categories, 20); assert.equal(result.tags, 24);
  assert.equal(await owner.tool.count({ where: { isDemo: true } }), 0);
  assert.equal(await owner.article.count({ where: { status: 'DRAFT', noindex: true, reviewedAt: null, publishedAt: null } }), 6);
  const row = await owner.useCase.findFirstOrThrow({ include: { tools: true, categories: true, tags: true } });
  assert.ok(row.tools.length && row.categories.length && row.tags.length); assert.ok(row.publishedAt && row.publishedAt <= new Date());
  assert.equal(await owner.auditLog.count({ where: { action: 'catalog.import.created' } }), 101);
  assert.equal(await owner.user.count(), 0); assert.equal(await owner.paymentOrder.count(), 0); assert.equal(await owner.agentExecution.count(), 0);
});
test('reimport is idempotent, preserves manual text, rejects stale plans and never republishes archived content', async () => {
  const before = await planImport(importer, library, name);
  await owner.tool.update({ where: { slug: 'ollama' }, data: { summary: 'Manually reviewed local runtime listing, preserved by the importer.' } });
  await assert.rejects(applyImport(importer, library, name, before), /IMPORT_PLAN/);
  const after = await applyImport(importer, library, name, await planImport(importer, library, name));
  assert.equal(after.created, 0); assert.equal(after.skipped, 101);
  assert.match((await owner.tool.findUniqueOrThrow({ where: { slug: 'ollama' } })).summary, /^Manually/);
  await owner.tool.update({ where: { slug: 'ollama' }, data: { status: 'ARCHIVED' } });
  const archived = await planImport(importer, library, name); assert.ok(archived.rejected >= 2);
  await assert.rejects(applyImport(importer, library, name, archived), /IMPORT_PLAN/);
  assert.equal((await owner.tool.findUniqueOrThrow({ where: { slug: 'ollama' } })).status, 'ARCHIVED');
  await owner.tool.update({ where: { slug: 'ollama' }, data: { status: 'PUBLISHED' } });
});
test('existing database duplicate identities are conflicts and cannot be overwritten', async () => {
  const duplicate = await owner.tool.create({ data: { slug: 'conflicting-repository', name: 'Different label', summary: 'Isolated test only', description: 'Test fixture', websiteUrl: 'https://github.com/ollama/ollama' } });
  const plan = await planImport(importer, library, name); assert.ok(plan.actions.some(a => a.slug === 'ollama' && a.action === 'REJECT_CONFLICT'));
  await owner.tool.delete({ where: { id: duplicate.id } });
});
test('published library supports real search, filters, paging, facets and home selection', async () => {
  const results = await queryTools(query, 'published', owner); assert.equal(results.total, 65); assert.equal(results.items.length, 6); assert.equal(results.pageCount, 11);
  const next = await queryTools({ ...query, page: 2 }, 'published', owner); assert.ok(next.items.every(item => !results.items.some(first => first.id === item.id)));
  assert.equal((await queryTools({ ...query, q: 'Whisper' }, 'published', owner)).total, 3);
  const filtered = await queryTools({ ...query, category: 'transcription', tag: 'human-review' }, 'published', owner); assert.equal(filtered.total, 3);
  assert.equal((await queryWorkflows(query, 'published', owner)).total, 30);
  const facets = await getCatalogFacets('tools', 'published', owner); assert.equal(facets.categories.length, 20);
  const home = await homeCatalog('published', owner); assert.equal(home.tools.length, 3); assert.equal(home.workflows.length, 3); assert.equal(home.articles.length, 0);
});
test('production server serves all imported slugs, desktop/mobile discovery and protected administration', async () => {
  await withAppServer({ DATABASE_URL: process.env.ATLAS_CATALOG_PUBLIC_TEST_URL!, CATALOG_DEMO_MODE: 'false', SEO_INDEXING_ENABLED: 'false', ANALYTICS_ENABLED: 'false' }, async origin => {
    for (const path of ['/', '/tools', '/use-cases']) assert.equal((await fetch(origin + path)).status, 200, path);
    for (const item of [...library.tools.map(t => ({ path: `/tools/${t.slug}`, title: t.name })), ...library.useCases.map(t => ({ path: `/use-cases/${t.slug}`, title: t.title }))]) {
      const response = await fetch(origin + item.path); assert.equal(response.status, 200, item.path);
      const escaped = item.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
      assert.ok((await response.text()).includes(`<h1>${escaped}</h1>`), item.path);
    }
    for (const article of library.articles) {
      assert.equal(await readPublicArticle(article.slug, owner), null);
      // The existing proxy must identify unpublished slugs before streaming.
      const response = await fetch(`${origin}/blog/${article.slug}`);
      assert.equal(response.status,404);
      assert.ok(!(await response.text()).includes(article.excerpt));
    }
    assert.equal((await fetch(origin + '/api/admin/content/tools')).status, 401);
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: true });
    try {
      for (const width of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        for (const path of ['/admin', '/admin/tools', '/admin/categories', '/admin/use-cases', '/admin/articles']) {
          await page.goto(origin + path); await page.waitForURL(/\/login/);
        }
        await page.goto(origin + '/tools'); await page.getByLabel('Search tools', { exact: true }).fill('Whisper');
        await page.getByRole('button', { name: 'Apply filters' }).click(); await page.waitForURL(/q=Whisper/);
        await page.getByRole('link', { name: 'Whisper', exact: true }).waitFor();
        assert.equal(await page.getByTestId('tool-card').count(), 3);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        assert.equal((await new AxeBuilder({ page }).analyze()).violations.length, 0);
        await page.getByRole('link', { name: 'Whisper', exact: true }).click();
        await page.getByRole('heading', { name: 'Whisper', exact: true }).waitFor();
        assert.match(await page.getByRole('link', { name: /Official website/ }).getAttribute('href') ?? '', /github.com\/openai\/whisper/i);
        await context.close();
      }
    } finally { await browser.close(); }
  });
});
test('draft workflows may reference draft tools and neither record becomes publicly visible', async () => {
  // Only this runner's disposable database; the CLI cannot bypass staging guards.
  const sourceTool = library.tools.find(t => t.slug === 'ollama')!;
  const sourceCase = library.useCases.find(t => t.tools.length === 1 && t.tools[0] === 'ollama')!;
  await owner.useCase.delete({ where: { slug: sourceCase.slug } });
  await owner.tool.delete({ where: { slug: sourceTool.slug } });
  const draft = validateLibrary({ ...library, tools: [{ ...sourceTool, status: 'DRAFT' }], useCases: [{ ...sourceCase, status: 'DRAFT' }], articles: [] }, JSON.parse(readFileSync('data/catalog/research.json', 'utf8')).findings);
  const result = await applyImport(importer, draft, name, await planImport(importer, draft, name));
  assert.equal(result.created, 2);
  const tool = await owner.tool.findUniqueOrThrow({ where: { slug: 'ollama' } });
  const workflow = await owner.useCase.findUniqueOrThrow({ where: { slug: sourceCase.slug }, include: { tools: true } });
  assert.equal(tool.status, 'DRAFT'); assert.equal(tool.publishedAt, null);
  assert.equal(workflow.status, 'DRAFT'); assert.equal(workflow.publishedAt, null); assert.equal(workflow.tools[0]?.id, tool.id);
  assert.equal((await queryTools({ ...query, q: 'Ollama' }, 'published', owner)).total, 0);
});
