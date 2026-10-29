import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { blueprintManifestSchema } from '../../src/lib/blueprints';
import { createDatabaseClient } from '../../src/server/db/client';
import { checkBlueprintPackage } from '../../src/server/blueprints/package-check';
import { changeBlueprint, publicBlueprintsForGuide, readRelease } from '../../src/server/blueprints/service';
import { uploadBlueprintFile } from '../../src/server/blueprints/upload';
import { contentDigest } from '../../src/server/blueprints/storage';
import { withAppServer } from '../e2e/test-server';

// Opt-in only. Product bytes never become a public fixture or CI artifact.
test('PRIVATE OPERATOR PACKAGE: real files, isolated SQL, existing upload/UI/download and local process restart',
  { skip: !process.env.ATLAS_PRIVATE_PACKAGE_DIRECTORY }, async t => {
  const directory = process.env.ATLAS_PRIVATE_PACKAGE_DIRECTORY!;
  const target = new URL(process.env.TEST_DATABASE_URL!);
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname) && /^\/atlas_run_[a-f0-9]+_test$/.test(target.pathname));
  const checked = await checkBlueprintPackage(directory);
  const manifest = blueprintManifestSchema.parse(JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')));
  assert.equal(checked.blueprint, manifest.id);
  const first = manifest.files[0]; assert.ok(first);
  const db = createDatabaseClient(target.toString()), root = await mkdtemp(path.join(tmpdir(), 'atlas-private-package-'));
  const previous = { root: process.env.BLUEPRINT_STORAGE_ROOT, backend: process.env.BLUEPRINT_STORAGE_BACKEND };
  process.env.BLUEPRINT_STORAGE_ROOT = root; process.env.BLUEPRINT_STORAGE_BACKEND = 'local';
  const environment = { DATABASE_URL: target.toString(), BLUEPRINT_STORAGE_ROOT: root, BLUEPRINT_STORAGE_BACKEND: 'local',
    SITE_URL: 'https://atlas.example', CATALOG_DEMO_MODE: 'false', ADSENSE_ENABLED: 'false', GA4_MODE: 'disabled', ANALYTICS_ENABLED: 'false',
    SEO_INDEXING_ENABLED: 'false', LEGAL_REVIEW_CONFIRMED: 'false', PUBLIC_LAUNCH_CONFIRMED: 'false', PUBLIC_CONTACT_EMAIL: '',
    NEWSLETTER_MODE: 'disabled', AGENTS_ENABLED: 'false', AGENTS_MONTHLY_BUDGET_USD_MICROS: '0', WOMPI_SANDBOX_ENABLED: 'false', OPS_EXPECT_WORKER: 'false' };
  const key = { blueprint: manifest.id, version: manifest.version };
  const endpoint = (fileId: string) => `/api/blueprints/${manifest.id}/${manifest.version}/${fileId}`;
  try {
    const owner = await db.user.create({ data: { email: 'operator-package-test@atlas.invalid', role: 'OWNER', active: true } });
    const viewer = await db.user.create({ data: { email: 'viewer-package-test@atlas.invalid', role: 'VIEWER', active: true } });
    await db.useCase.create({ data: { slug: manifest.useCaseSlug, title: 'Private package in isolated QA only',
      problem: 'Temporary fixture, not an editorial publication.', solution: 'Verify operator-supplied bytes in the existing engine.',
      instructions: [{ step: 1, text: 'Use synthetic information and private operator credentials only.' }], limitations: 'Not real provider validation.',
      references: [], status: 'PUBLISHED', publishedAt: new Date() } });
    const action = (input: unknown, actor = owner.id) => changeBlueprint(actor, manifest.id, manifest.version, input, db);
    await t.test('all files upload privately, idempotently and with audit; missing bytes cannot be verified', async () => {
      await action({ action: 'save', expectedRevision: 0, manifest });
      await assert.rejects(uploadBlueprintFile(viewer.id, key, first.id, path.join(directory, first.filename), db), { status: 403 });
      await assert.rejects(action({ action: 'verify', expectedRevision: 1, evidence: {
        summary: 'Isolated QA attestation only, not human editorial approval.', method: 'static-review', formatChecked: true, secretsReviewed: true, licenseReviewed: true } }));
      for (const file of manifest.files) {
        assert.equal((await uploadBlueprintFile(owner.id, key, file.id, path.join(directory, file.filename), db)).outcome, 'created');
        assert.equal((await uploadBlueprintFile(owner.id, key, file.id, path.join(directory, file.filename), db)).outcome, 'existing');
      }
      assert.equal(await db.auditLog.count({ where: { action: 'blueprint.object.store' } }), 2 * manifest.files.length);
      assert.equal((await readRelease(key.blueprint, key.version, db))?.status, 'DRAFT');
      assert.equal((await publicBlueprintsForGuide(manifest.useCaseSlug, undefined, db)).items.length, 0);
      await withAppServer(environment, async origin => {
        assert.equal((await fetch(origin + endpoint(first.id))).status, 404);
      });
      // Explicitly synthetic approval exists only in the random local _test DB.
      await action({ action: 'verify', expectedRevision: 1, evidence: { summary: 'Isolated QA attestation only, not a legal/editorial approval or live provider test.',
        method: 'isolated-execution', formatChecked: true, secretsReviewed: true, licenseReviewed: true } });
      await withAppServer(environment, async origin => { assert.equal((await fetch(origin + endpoint(first.id))).status, 404); });
      await assert.rejects(action({ action: 'publish', expectedRevision: 2, confirmation: 'PUBLISH' }, viewer.id), { status: 403 });
      await action({ action: 'publish', expectedRevision: 2, confirmation: 'PUBLISH' });
    });
    await t.test('every HTTP file has exact bytes, digest, attachment and noindex; browser download works without signup', async () => {
      await withAppServer(environment, async origin => {
        for (const file of manifest.files) {
          const start = performance.now(), response = await fetch(origin + endpoint(file.id));
          assert.equal(response.status, 200); assert.match(response.headers.get('cache-control')!, /no-store/);
          assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
          assert.equal(response.headers.get('content-length'), String(file.size));
          assert.equal(response.headers.get('content-disposition'), `attachment; filename="${file.filename}"`);
          assert.equal(response.headers.get('content-digest'), `sha-256=:${Buffer.from(file.sha256, 'hex').toString('base64')}:`);
          assert.equal(contentDigest(new Uint8Array(await response.arrayBuffer())), file.sha256);
          console.log(JSON.stringify({ scope: 'ISOLATED_LOCAL_HTTP_NOT_NEON', file: file.id, bytes: file.size, durationMs: Math.round(performance.now() - start) }));
        }
        const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
        try {
          const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
          const page = await context.newPage();
          let fileRequests = 0;
          page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/blueprints/')) fileRequests++; });
          await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
          assert.equal((await page.goto(`${origin}/use-cases/${manifest.useCaseSlug}`))?.status(), 200);
          const button = page.getByRole('button', { name: `Download Blueprint (.${first.format === 'json' ? 'json' : 'md'}) — ${first.filename}`, exact: true });
          await expect(button).toBeVisible(); assert.equal(fileRequests, 0);
          assert.equal((await new AxeBuilder({ page }).analyze()).violations.length, 0);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          assert.ok(!(await page.content()).includes(directory));
          await button.focus(); const downloadEvent = page.waitForEvent('download'); await page.keyboard.press('Enter');
          const download = await downloadEvent;
          assert.equal(contentDigest(await readFile((await download.path())!)), first.sha256);
          await expect(page.locator('#blueprints')).toContainText('Your download has started.');
          assert.equal(fileRequests, 1);
          await page.setViewportSize({ width: 1440, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          assert.equal((await fetch(`${origin}/api/admin/blueprints/${manifest.id}/${manifest.version}`)).status, 401);
        } finally { await browser.close(); }
      });
    });
    await t.test('new Next process reads original bytes; corruption fails closed and withdrawal denies retained objects', async () => {
      await withAppServer(environment, async origin => {
        const file = first, route = origin + endpoint(file.id);
        const response = await fetch(route); assert.equal(response.status, 200);
        const bytes = new Uint8Array(await response.arrayBuffer()); assert.equal(contentDigest(bytes), file.sha256);
        const location = path.join(root, 'objects', `${file.sha256}.${file.format === 'json' ? 'json' : 'md'}`);
        await writeFile(location, new Uint8Array(file.size)); assert.equal((await fetch(route)).status, 503);
        await writeFile(location, bytes); assert.equal((await fetch(route)).status, 200);
        await action({ action: 'withdraw', expectedRevision: 3, confirmation: 'WITHDRAW' });
        assert.equal((await fetch(route)).status, 404); assert.equal(contentDigest(await readFile(location)), file.sha256);
        assert.equal((await publicBlueprintsForGuide(manifest.useCaseSlug, undefined, db)).items.length, 0);
      });
      assert.equal(await db.analyticsEvent.count(), 0); assert.equal(await db.analyticsSession.count(), 0);
      assert.equal(await db.newsletterSubscriber.count(), 0);
    });
  } finally {
    await db.$disconnect(); await rm(root, { recursive: true, force: true });
    if (previous.root === undefined) delete process.env.BLUEPRINT_STORAGE_ROOT; else process.env.BLUEPRINT_STORAGE_ROOT = previous.root;
    if (previous.backend === undefined) delete process.env.BLUEPRINT_STORAGE_BACKEND; else process.env.BLUEPRINT_STORAGE_BACKEND = previous.backend;
  }
});
