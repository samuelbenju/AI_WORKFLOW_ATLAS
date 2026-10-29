import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDatabaseClient } from '../../src/server/db/client';
import { changeBlueprint, readRelease } from '../../src/server/blueprints/service';
import { contentDigest } from '../../src/server/blueprints/storage';
import type { BlueprintManifest } from '../../src/lib/blueprints';
import { withAppServer } from '../e2e/test-server';

test('blueprint UI on isolated PostgreSQL, local private files and real production Next HTTP/browser', async t => {
  const url = process.env.TEST_DATABASE_URL!, target = new URL(url);
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname) && /^\/atlas_run_[a-f0-9]+_test$/.test(target.pathname));
  const db = createDatabaseClient(url), root = await mkdtemp(path.join(tmpdir(), 'atlas-blueprint-ui-'));
  const oldRoot = process.env.BLUEPRINT_STORAGE_ROOT, oldBackend = process.env.BLUEPRINT_STORAGE_BACKEND;
  process.env.BLUEPRINT_STORAGE_ROOT = root; process.env.BLUEPRINT_STORAGE_BACKEND = 'local';
  const bytes = Buffer.from('{"fixture":"UI test only, not a usable automation","nodes":[],"connections":{}}');
  const notes = Buffer.from('# Fixture notes\nThis is not a real automation.');
  const files = [{ id: 'export', filename: 'fixture.json', platform: 'n8n' as const, format: 'json' as const, size: bytes.length, sha256: contentDigest(bytes) },
    { id: 'notes', filename: 'notes.md', platform: 'generic' as const, format: 'markdown' as const, size: notes.length, sha256: contentDigest(notes) }];
  try {
    await mkdir(path.join(root, 'objects'), { mode: 0o700 });
    for (const [i, file] of files.entries()) await writeFile(path.join(root, 'objects', file.sha256 + (file.format === 'json' ? '.json' : '.md')), i === 0 ? bytes : notes, { mode: 0o600 });
    const owner = await db.user.create({ data: { email: 'isolated-owner@blueprint-ui.invalid', active: true, role: 'OWNER' } });
    const slug = 'isolated-blueprint-guide';
    const instructions = [{ step: 1, text: 'Inspect non-sensitive fixture input.' }, { step: 2, text: 'Keep a human review gate.' }];
    for (const guideSlug of [slug, 'guide-without-blueprints']) await db.useCase.create({ data: { slug: guideSlug, title: guideSlug === slug ? 'Isolated blueprint guide fixture' : 'Guide without blueprints',
      problem: 'Isolated UI fixture, not an actual automation.', solution: 'Understand the fixture safely.', limitations: 'Never a production workflow.', instructions, references: [], status: 'PUBLISHED', publishedAt: new Date() } });
    const manifest: BlueprintManifest = { schemaVersion: 1, id: 'ui-fixture', version: '1.0.0', useCaseSlug: slug, title: 'Isolated downloadable fixture',
      description: 'This download exists only in an isolated test database.', attribution: { credit: 'Test fixture only', license: 'Test only', sources: ['https://example.org/docs'] }, files,
      presentation: { architecture: { kind: 'conceptual', steps: [{ title: 'Inspect fixture' }, { title: 'Human approval', description: 'No external services or execution.' }] },
        requirements: { prerequisites: ['Use isolated non-sensitive data'], accounts: ['Your own platform account if importing'], credentialSetup: ['Configure directly in the platform; never in Atlas'],
          limitations: ['Static fixture only'], externalCosts: ['Check actual provider terms before use'], compatibility: { description: 'Only fixture structure checked, no platform version guaranteed', source: 'https://example.org/docs' } },
        setupInstructions: ['Inspect the downloaded JSON locally.', 'Configure credentials directly in your own platform.'] } };
    const evidence = { summary: 'Fixture inspection, not an execution of a real workflow.', method: 'static-review', formatChecked: true, secretsReviewed: true, licenseReviewed: true };
    async function register(m: BlueprintManifest, status: 'DRAFT' | 'VERIFIED' | 'PUBLISHED') {
      await changeBlueprint(owner.id, m.id, m.version, { action: 'save', expectedRevision: 0, manifest: m }, db);
      if (status !== 'DRAFT') await changeBlueprint(owner.id, m.id, m.version, { action: 'verify', expectedRevision: 1, evidence }, db);
      if (status === 'PUBLISHED') await changeBlueprint(owner.id, m.id, m.version, { action: 'publish', expectedRevision: 2, confirmation: 'PUBLISH' }, db);
    }
    await register(manifest, 'PUBLISHED');
    await register({ ...manifest, version: '8.0.0', title: 'Private verified fixture' }, 'VERIFIED');
    await register({ ...manifest, version: '9.0.0', title: 'Private draft fixture' }, 'DRAFT');
    await assert.rejects(changeBlueprint(owner.id, manifest.id, manifest.version, { action: 'save', expectedRevision: 3,
      manifest: { ...manifest, presentation: { setupInstructions: ['Cannot rewrite a sealed release.'] } } }, db), { status: 409 });
    const environment = { DATABASE_URL: url, BLUEPRINT_STORAGE_ROOT: root, BLUEPRINT_STORAGE_BACKEND: 'local', CATALOG_DEMO_MODE: 'false',
      SITE_URL: 'https://atlas.example', ANALYTICS_ENABLED: 'false', GA4_MODE: 'disabled', ADSENSE_ENABLED: 'false', SEO_INDEXING_ENABLED: 'false',
      NEWSLETTER_MODE: 'disabled', LEGAL_REVIEW_CONFIRMED: 'false', PUBLIC_CONTACT_EMAIL: '', AGENTS_ENABLED: 'false', WOMPI_SANDBOX_ENABLED: 'false' };
    await withAppServer(environment, async origin => {
      const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
      try {
        const context = await browser.newContext({ acceptDownloads: true }), page = await context.newPage();
        let requests = 0, downloads = 0; const pageErrors: string[] = [];
        page.on('download', () => { downloads++; });
        page.on('pageerror', e => pageErrors.push(e.message));
        page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/blueprints/')) requests++; });
        await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
        const guide = `${origin}/use-cases/${slug}`, endpoint = `${origin}/api/blueprints/${manifest.id}/1.0.0/export`;
        const button = () => page.getByRole('button', { name: 'Download Blueprint (.json) — fixture.json', exact: true });
        await t.test('existing guides and SEO survive; only published release metadata is exposed, with no file fetch or tracking', async () => {
          assert.equal((await page.goto(`${origin}/use-cases/guide-without-blueprints`))?.status(), 200);
          await expect(page.getByRole('heading', { name: 'Guide without blueprints', exact: true })).toBeVisible();
          await expect(page.locator('#blueprints')).toHaveCount(0);
          await page.goto(guide); await expect(button()).toBeVisible();
          await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://atlas.example/use-cases/${slug}`);
          await expect(page.getByRole('heading', { level: 1 })).toHaveText('Isolated blueprint guide fixture');
          await expect(page.locator('#blueprints')).toContainText('Static review');
          assert.equal(requests, 0); assert.equal(await page.getByRole('button', { name: /Download Blueprint/ }).count(), 2);
          const html = await page.content();
          for (const secret of [root, owner.id, 'Private verified fixture', 'Private draft fixture', 's3_secret_access_key']) assert.ok(!html.includes(secret));
          assert.equal(await page.locator('script[src*="googlesyndication"],ins.adsbygoogle').count(), 0);
          assert.equal(await page.locator('#blueprints a[href^="mailto:"],#blueprints a[href="/newsletter"]').count(), 0);
          assert.equal((await fetch(`${origin}/api/admin/blueprints/${manifest.id}/1.0.0`)).status, 401);
          for (const version of ['8.0.0', '9.0.0']) assert.equal((await fetch(endpoint.replace('1.0.0', version))).status, 404);
        });
        await t.test('real browser download has exact bytes and honest follow-up, without consent or subscription', async () => {
          await page.goto(guide); await expect(button()).toBeVisible();
          const [download] = await Promise.all([page.waitForEvent('download'), button().click()]);
          assert.equal(download.suggestedFilename(), 'fixture.json'); assert.deepEqual(await readFile((await download.path())!), bytes);
          await expect(page.locator('#blueprints')).toContainText('Your download has started.');
          await expect(page.getByRole('link', { name: 'View setup instructions' })).toBeVisible();
          const [markdown] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Blueprint (.md) — notes.md', exact: true }).click()]);
          assert.equal(markdown.suggestedFilename(), 'notes.md'); assert.deepEqual(await readFile((await markdown.path())!), notes);
          assert.equal(await db.analyticsEvent.count(), 0); assert.equal(await db.analyticsSession.count(), 0); assert.equal(await db.newsletterSubscriber.count(), 0);
        });
        await t.test('404, 429, 503, unexpected, network and corrupt-body errors do not initiate pretend downloads', async () => {
          for (const [status, text] of [[404, 'no longer available'], [429, 'Too many download requests'], [503, 'temporarily unavailable'], [500, 'could not start']] as const) {
            await page.goto(guide); await expect(button()).toBeVisible();
            await page.route(endpoint, route => route.fulfill({ status, contentType: 'application/json', body: '{"error":"test fixture"}' }));
            await button().click(); await expect(page.locator('.blueprint-download-status').first()).toContainText(text);
            if (status === 404) await expect(page.getByRole('button', { name: /Download unavailable/ })).toBeDisabled();
            else await expect(button()).toBeEnabled();
            await page.unroute(endpoint);
          }
          await page.goto(guide); await expect(button()).toBeVisible();
          await page.route(endpoint, route => route.abort()); await button().click();
          await expect(page.locator('.blueprint-download-status').first()).toContainText('could not start'); await page.unroute(endpoint);
          await page.goto(guide); await expect(button()).toBeVisible();
          await page.route(endpoint, route => route.fulfill({ status: 200, headers: { 'Content-Disposition': 'attachment; filename="fixture.json"', 'Content-Length': String(bytes.length) }, body: Buffer.alloc(bytes.length, 32) }));
          await button().click(); await expect(page.locator('.blueprint-download-status').first()).toContainText('could not start'); await page.unroute(endpoint);
          assert.equal(downloads, 2);
        });
        await t.test('multiple versions/files require explicit choice; long conceptual diagrams are escaped, responsive and accessible', async () => {
          const long = { ...manifest, version: '1.1.0', presentation: { ...manifest.presentation, architecture: { kind: 'conceptual' as const,
            steps: Array.from({ length: 20 }, (_, i) => ({ title: `Fixture step ${i + 1} with a descriptive label`, description: `<img src=x onerror=alert(1)> This text is escaped, never executed. ${'Long editorial explanation. '.repeat(8)}` })) } } };
          await register(long, 'PUBLISHED');
          await page.goto(guide); await expect(page.getByLabel('Published blueprint and version')).toBeVisible();
          await expect(page.getByRole('button', { name: /Download Blueprint/ })).toHaveCount(0);
          assert.equal(await page.locator('#blueprint-release option').count(), 3); // placeholder + two public releases
          await page.getByLabel('Published blueprint and version').selectOption(`${manifest.id}@1.1.0`);
          await page.getByLabel('Published blueprint and version').focus(); await page.keyboard.press('Tab');
          await expect(page.getByRole('button', { name: 'View this version' })).toBeFocused(); await page.keyboard.press('Enter');
          await expect(button()).toBeVisible(); assert.ok(page.url().includes('blueprintRelease='));
          await expect(page.locator('.blueprint-flow > li')).toHaveCount(20); assert.equal(await page.locator('#blueprints img').count(), 0);
          const diagramToggle = page.locator('.blueprint-architecture summary');
          await diagramToggle.focus(); await page.keyboard.press('Enter');
          await expect(page.getByRole('list', { name: 'Conceptual workflow steps' })).toBeVisible();
          const accessible = await page.locator('#blueprints').ariaSnapshot();
          assert.match(accessible, /Conceptual workflow steps/); assert.match(accessible, /Published blueprint and version/);
          for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            const audit = await new AxeBuilder({ page }).include('#blueprints').analyze();
            assert.deepEqual(audit.violations.map(v => v.id), []);
            await page.screenshot({ path: `/tmp/atlas-blueprint-${width}.png`, fullPage: true });
            await page.locator('.blueprint-download-box').screenshot({ path: `/tmp/atlas-blueprint-box-${width}.png` });
          }
          await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
          const xml = await (await fetch(`${origin}/sitemap.xml`)).text(); assert.ok(!xml.includes('/api/blueprints') && !xml.includes('blueprintRelease='));
          assert.deepEqual(pageErrors, []);
        });
        await t.test('legacy manifests render fallback instructions; implementation contact requires real public configuration', async () => {
          const legacy = { ...manifest, version: '0.9.0' }; delete legacy.presentation;
          await register(legacy, 'PUBLISHED');
          await page.goto(`${guide}?blueprintRelease=${manifest.id}%400.9.0`); await expect(button()).toBeVisible();
          await expect(page.locator('#blueprints')).toContainText('Release-specific requirements and compatibility have not been documented');
          await expect(page.getByRole('list', { name: 'Conceptual workflow steps' })).toContainText('Inspect non-sensitive fixture input');
          await withAppServer({ ...environment, LEGAL_REVIEW_CONFIRMED: 'true', PUBLIC_OPERATOR_NAME: 'Isolated operator fixture, not a real business',
            PUBLIC_OPERATOR_ADDRESS: 'Isolated test address', PUBLIC_CONTACT_EMAIL: 'fixture@contact.invalid', LEGAL_EFFECTIVE_DATE: '2026-01-01' }, async contactOrigin => {
            const html = await (await fetch(`${contactOrigin}/use-cases/${slug}?blueprintRelease=${manifest.id}%400.9.0`)).text();
            assert.ok(html.includes('mailto:fixture%40contact.invalid?subject=Workflow%20implementation%20inquiry'));
            assert.ok(!html.includes('/api/crm/inquiries'));
          });
        });
        await t.test('stale registry rows do not hide an authorized release beyond the first discovery page', async () => {
          const paginationSlug = 'isolated-pagination-fixture';
          await db.useCase.create({ data: { slug: paginationSlug, title: 'Pagination fixture guide', problem: 'Isolated test', limitations: 'Fixture only',
            instructions, references: [], status: 'PUBLISHED', publishedAt: new Date() } });
          for (let i = 0; i < 20; i++) await register({ ...manifest, id: 'pagination-fixture', useCaseSlug: paginationSlug, version: `1.0.${i}`, title: 'Stale private-to-current-revision fixture' }, 'PUBLISHED');
          await db.useCase.update({ where: { slug: paginationSlug }, data: { title: 'Updated pagination fixture guide' } });
          await register({ ...manifest, id: 'pagination-fixture', useCaseSlug: paginationSlug, version: '2.0.0', title: 'Current pagination fixture' }, 'PUBLISHED');
          await page.goto(`${origin}/use-cases/${paginationSlug}`);
          await expect(page.getByRole('link', { name: 'More published versions →' })).toBeVisible();
          await expect(page.locator('#blueprints')).not.toContainText('Stale private-to-current-revision fixture');
          await page.getByRole('link', { name: 'More published versions →' }).click();
          await page.getByLabel('Published blueprint and version').selectOption('pagination-fixture@2.0.0');
          await page.getByRole('button', { name: 'View this version' }).click(); await expect(button()).toBeVisible();
          await expect(page.locator('#blueprint-release-title')).toHaveText('Current pagination fixture');
        });
        await t.test('missing objects suppress download controls; a stale UI cannot bypass withdrawal or guide visibility', async () => {
          const selected = `${guide}?blueprintRelease=${manifest.id}%401.0.0`;
          const object = path.join(root, 'objects', files[0]!.sha256 + '.json');
          await rm(object); await page.goto(selected);
          await expect(page.locator('#blueprints')).toContainText('This file is not currently available');
          await expect(button()).toHaveCount(0);
          assert.equal((await fetch(endpoint)).status, 503);
          await writeFile(object, Buffer.alloc(bytes.length + 1), { mode: 0o600 }); await page.goto(selected);
          await expect(page.locator('#blueprints')).toContainText('The download service is temporarily unavailable'); await expect(button()).toHaveCount(0);
          await writeFile(object, bytes, { mode: 0o600 }); await page.goto(selected); await expect(button()).toBeVisible();
          await changeBlueprint(owner.id, manifest.id, '1.0.0', { action: 'withdraw', expectedRevision: 3, confirmation: 'WITHDRAW' }, db);
          await button().click(); await expect(page.locator('.blueprint-download-status').first()).toContainText('no longer available');
          await page.goto(selected); await expect(button()).toHaveCount(0); await expect(page.locator('#blueprints')).toContainText('not available for this guide');
          assert.equal((await readRelease(manifest.id, '1.0.0', db))?.status, 'DRAFT');
          await db.useCase.update({ where: { slug }, data: { status: 'DRAFT' } });
          assert.equal((await fetch(guide)).status, 404); assert.equal((await fetch(endpoint.replace('1.0.0', '1.1.0'))).status, 404);
        });
        await context.close();
      } finally { await browser.close(); }
    });
  } finally {
    await db.$disconnect(); await rm(root, { recursive: true, force: true });
    if (oldRoot === undefined) delete process.env.BLUEPRINT_STORAGE_ROOT; else process.env.BLUEPRINT_STORAGE_ROOT = oldRoot;
    if (oldBackend === undefined) delete process.env.BLUEPRINT_STORAGE_BACKEND; else process.env.BLUEPRINT_STORAGE_BACKEND = oldBackend;
  }
});
