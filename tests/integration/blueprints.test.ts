import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, link, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createDatabaseClient } from '../../src/server/db/client';
import { initializeOwner, authenticate, csrfForToken } from '../../src/server/auth/service';
import { changeBlueprint, readRelease, publicBlueprintDescriptor, publicBlueprintsForGuide } from '../../src/server/blueprints/service';
import { blueprintDownload } from '../../src/server/blueprints/download';
import { contentDigest, readBlueprintFile, validateBlueprintBytes } from '../../src/server/blueprints/storage';
import { prepareDownloadMeasurement } from '../../src/server/blueprints/measurement';
import { cookieNames, setConsent } from '../../src/server/growth/tracking';
import { consentVersion } from '../../src/lib/growth';
import { withAppServer } from '../e2e/test-server';
import type { BlueprintManifest } from '../../src/lib/blueprints';
import type { PrismaClient } from '../../src/generated/prisma/client';

test('blueprint lifecycle, private storage and production HTTP on isolated PostgreSQL', async t => {
  const url = process.env.TEST_DATABASE_URL!, target = new URL(url);
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname) && /^\/atlas_run_[a-f0-9]+_test$/.test(target.pathname));
  const db = createDatabaseClient(url), store = await mkdtemp(path.join(tmpdir(), 'atlas-blueprints-'));
  const priorRoot = process.env.BLUEPRINT_STORAGE_ROOT;
  process.env.BLUEPRINT_STORAGE_ROOT = store;
  try {
    await mkdir(path.join(store, 'objects'), { mode: 0o700 });
    const password = randomBytes(24).toString('hex');
    const owner = await initializeOwner('fixture@blueprint.invalid', password, db);
    const editor = await db.user.create({ data: { email: 'editor@blueprint.invalid', active: true, role: 'EDITOR' } });
    const viewer = await db.user.create({ data: { email: 'viewer@blueprint.invalid', active: true, role: 'VIEWER' } });
    const slug = 'design-a-workflow-with-a-human-approval-gate';
    const guide = await db.useCase.create({ data: { slug, title: 'Isolated guide fixture', problem: 'Fixture', instructions: [], limitations: 'Not a real workflow.', references: [], status: 'PUBLISHED', publishedAt: new Date() } });
    const bytes = Buffer.from(JSON.stringify({ fixture: 'Isolated integrity fixture, not an automation.', nodes: [], connections: {} }));
    const file = { id: 'export', filename: 'fixture.json', format: 'json' as const, platform: 'n8n' as const, size: bytes.length, sha256: contentDigest(bytes) };
    const notes = Buffer.from('# Isolated fixture\nSeparate editorial attribution, not a real workflow.');
    const noteFile = { id: 'notes', filename: 'notes.md', format: 'markdown' as const, platform: 'generic' as const, size: notes.length, sha256: contentDigest(notes) };
    await writeFile(path.join(store, 'objects', noteFile.sha256 + '.md'), notes, { mode: 0o600 });
    const manifest: BlueprintManifest = { schemaVersion: 1, id: 'isolated-fixture', version: '1.0.0', useCaseSlug: slug, title: 'Isolated fixture', description: 'Generated only in temporary tests.', attribution: { credit: 'Isolated fixture', license: 'Test only', sources: ['https://example.org/docs'] }, files: [file, noteFile] };
    const objectPath = path.join(store, 'objects', file.sha256 + '.json');
    await writeFile(objectPath, bytes, { mode: 0o600 });
    const evidence = { summary: 'Static fixture inspection only; not a workflow execution.', method: 'static-review', formatChecked: true, secretsReviewed: true, licenseReviewed: true };
    const action = (userId: string, input: unknown, version = '1.0.0') => changeBlueprint(userId, manifest.id, version, input, db);
    const params = { blueprint: manifest.id, version: '1.0.0', file: 'export' };
    const request = new Request('http://localhost:3000/api/blueprints/isolated-fixture/1.0.0/export');

    await t.test('only editors/admins draft and verify; publication requires an administrator and explicit confirmation', async () => {
      await assert.rejects(action(viewer.id, { action: 'save', expectedRevision: 0, manifest }), { status: 403 });
      const draft = await action(editor.id, { action: 'save', expectedRevision: 0, manifest }); assert.equal(draft.status, 'DRAFT');
      assert.equal((await publicBlueprintsForGuide(slug, undefined, db)).items.length, 0);
      assert.equal((await blueprintDownload(request, params, db)).status, 404);
      await assert.rejects(action(owner.id, { action: 'publish', expectedRevision: 1, confirmation: 'PUBLISH' }), { status: 409 });
      const verified = await action(editor.id, { action: 'verify', expectedRevision: 1, evidence }); assert.equal(verified.status, 'VERIFIED');
      assert.equal((await blueprintDownload(request, params, db)).status, 404);
      await assert.rejects(action(editor.id, { action: 'publish', expectedRevision: 2, confirmation: 'PUBLISH' }), { status: 403 });
      await assert.rejects(action(owner.id, { action: 'publish', expectedRevision: 2 }));
      assert.equal((await action(owner.id, { action: 'publish', expectedRevision: 2, confirmation: 'PUBLISH' })).status, 'PUBLISHED');
      assert.equal(await db.auditLog.count({ where: { entityType: 'BlueprintRelease' } }), 3);
    });
    await t.test('authorized downloads preserve exact bytes, native format and separate attribution', async () => {
      const response = await blueprintDownload(request, params, db); assert.equal(response.status, 200);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
      assert.match(response.headers.get('content-disposition')!, /^attachment; filename="fixture.json"$/);
      assert.match(response.headers.get('cache-control')!, /no-store/); assert.match(response.headers.get('content-digest')!, /^sha-256=:/);
      const markdown = await blueprintDownload(request, { ...params, file: 'notes' }, db);
      assert.deepEqual(Buffer.from(await markdown.arrayBuffer()), notes); assert.match(markdown.headers.get('content-type')!, /text\/markdown/);
      const metadata = await publicBlueprintDescriptor(manifest.id, '1.0.0', db);
      assert.ok(metadata?.attribution); assert.ok(!JSON.stringify(metadata).includes(store) && !JSON.stringify(metadata).includes(owner.id));
      const byGuide = await publicBlueprintsForGuide(slug, undefined, db);
      assert.equal(byGuide.items.length, 1); assert.equal(byGuide.items[0]?.id, manifest.id); assert.equal(byGuide.next, null);
      assert.equal((await publicBlueprintsForGuide('absent-guide', undefined, db)).items.length, 0);
      // Real service transitions on disposable fixtures, never production data.
      for (let i = 1; i <= 21; i++) {
        const version = `9.0.${i}`;
        await action(owner.id, { action: 'save', expectedRevision: 0, manifest: { ...manifest, version } }, version);
        await action(owner.id, { action: 'verify', expectedRevision: 1, evidence }, version);
        await action(owner.id, { action: 'publish', expectedRevision: 2, confirmation: 'PUBLISH' }, version);
      }
      const page = await publicBlueprintsForGuide(slug, undefined, db); assert.equal(page.items.length, 20); assert.ok(page.next);
      const last = await publicBlueprintsForGuide(slug, page.next, db); assert.equal(last.items.length, 2); assert.equal(last.next, null);
      assert.equal(new Set([...page.items, ...last.items].map(item => item.version)).size, 22);
      await db.siteSetting.deleteMany({ where: { key: { startsWith: `blueprint.release.${manifest.id}@9.` } } });
      assert.equal((await blueprintDownload(request, { ...params, file: '../private' }, db)).status, 404);
      assert.equal((await blueprintDownload(new Request(request.url + '?path=.env'), params, db)).status, 404);
      assert.equal((await blueprintDownload(new Request(request.url, { headers: { Range: 'bytes=0-1' } }), params, db)).status, 416);
    });
    await t.test('guide visibility and edits invalidate a release without changing the guide from this service', async () => {
      for (const data of [{ status: 'DRAFT' as const }, { status: 'PUBLISHED' as const, isDemo: true }, { isDemo: false, publishedAt: new Date(Date.now() + 86400000) }]) {
        await db.useCase.update({ where: { id: guide.id }, data }); assert.equal((await blueprintDownload(request, params, db)).status, 404);
        assert.equal((await publicBlueprintsForGuide(slug, undefined, db)).items.length, 0);
      }
      await db.useCase.update({ where: { id: guide.id }, data: { status: 'PUBLISHED', isDemo: false, publishedAt: new Date(), updatedAt: guide.updatedAt } });
      assert.equal((await blueprintDownload(request, params, db)).status, 200);
      await db.useCase.update({ where: { id: guide.id }, data: { title: 'Changed fixture' } });
      assert.equal((await blueprintDownload(request, params, db)).status, 404);
      await db.useCase.update({ where: { id: guide.id }, data: { updatedAt: guide.updatedAt } });
    });
    await t.test('integrity, credentials, native shape, permissions, symbolic and hard links fail closed', async () => {
      for (const body of ['{"password":"actual-secret-value"}', '{"token":"fixture-not-real"}', '{"headers":[{"name":"X-Api-Key","value":"fixture-not-real"}]}', '{"url":"https://u:p@example.org"}', '{"credentials":{"reference":"private"}}']) {
        const bad = Buffer.from(body); assert.throws(() => validateBlueprintBytes(bad, { ...file, platform: 'generic', size: bad.length, sha256: contentDigest(bad) }));
      }
      const escaped = Buffer.from(String.raw`{"url":"https:\u002f\u002fuser:fixture-not-real@example.org"}`);
      assert.throws(() => validateBlueprintBytes(escaped, { ...file, platform: 'generic', size: escaped.length, sha256: contentDigest(escaped) }));
      const native = Buffer.from('{"nodes":[]}');
      assert.throws(() => validateBlueprintBytes(native, { ...file, size: native.length, sha256: contentDigest(native) }));
      const html = Buffer.from('<SCRIPT>alert(1)</SCRIPT>');
      assert.throws(() => validateBlueprintBytes(html, { ...noteFile, size: html.length, sha256: contentDigest(html) }));
      await writeFile(objectPath, Buffer.alloc(bytes.length, 32));
      assert.equal((await blueprintDownload(request, params, db)).status, 503);
      await rm(objectPath); const other = path.join(store, 'private.json'); await writeFile(other, bytes, { mode: 0o600 });
      await symlink(other, objectPath); await assert.rejects(readBlueprintFile(file)); await rm(objectPath);
      await link(other, objectPath); await assert.rejects(readBlueprintFile(file)); await rm(objectPath);
      await writeFile(objectPath, bytes, { mode: 0o600 }); await chmod(objectPath, 0o644); await assert.rejects(readBlueprintFile(file)); await chmod(objectPath, 0o600);
      process.env.BLUEPRINT_STORAGE_ROOT = path.join(process.cwd(), 'public'); await assert.rejects(readBlueprintFile(file)); process.env.BLUEPRINT_STORAGE_ROOT = store;
    });
    await t.test('revisions serialize writers, verified versions are immutable and withdrawal immediately denies access', async () => {
      await assert.rejects(action(owner.id, { action: 'save', expectedRevision: 3, manifest }), { status: 409 });
      const outcomes = await Promise.allSettled([action(owner.id, { action: 'withdraw', expectedRevision: 3, confirmation: 'WITHDRAW' }), action(owner.id, { action: 'withdraw', expectedRevision: 3, confirmation: 'WITHDRAW' })]);
      assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
      assert.equal((await blueprintDownload(request, params, db)).status, 404);
      await assert.rejects(action(owner.id, { action: 'save', expectedRevision: 4, manifest }), { status: 409 });
      await action(owner.id, { action: 'verify', expectedRevision: 4, evidence }); await action(owner.id, { action: 'publish', expectedRevision: 5, confirmation: 'PUBLISH' });
      await action(owner.id, { action: 'save', expectedRevision: 0, manifest: { ...manifest, version: '2.0.0' } }, '2.0.0');
      assert.equal((await readRelease(manifest.id, '2.0.0', db))?.status, 'DRAFT');
      assert.deepEqual((await publicBlueprintsForGuide(slug, undefined, db)).items.map(item => item.version), ['1.0.0']);
    });
    await t.test('measurement requires enabled consent, live session and same-origin guide; no download SQL writes', async () => {
      process.env.ANALYTICS_ORIGIN = 'http://localhost:3000'; process.env.ANALYTICS_ENABLED = 'true';
      const accepted = await setConsent(new Request('http://localhost:3000'), true, db);
      assert.ok('token' in accepted); const cookie = `${cookieNames.consent}=${consentVersion}:yes; ${cookieNames.session}=${accepted.token}`;
      const consented = new Request(request.url, { headers: { cookie, referer: `http://localhost:3000/use-cases/${slug}` } });
      const descriptor = { ...params, useCaseSlug: slug };
      const first = await prepareDownloadMeasurement(consented, descriptor, db);
      assert.ok(first); assert.equal(first.deduplicationKey, (await prepareDownloadMeasurement(consented, descriptor, db))?.deduplicationKey);
      assert.ok(!JSON.stringify(first).includes(accepted.token));
      for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }, { referer: 'https://external.invalid/' }, { 'sec-fetch-site': 'cross-site' }]) {
        const h = new Headers(consented.headers); for (const [k, v] of Object.entries(headers)) h.set(k, v);
        assert.equal(await prepareDownloadMeasurement(new Request(request.url, { headers: h }), descriptor, db), null);
      }
      let observations = 0;
      assert.equal((await blueprintDownload(consented, params, db, async () => { observations++; })).status, 200); assert.equal(observations, 1);
      const before = await db.analyticsEvent.count(); await blueprintDownload(consented, params, db); await blueprintDownload(consented, params, db);
      assert.equal(await db.analyticsEvent.count(), before);
      await db.analyticsSession.updateMany({ data: { startedAt: new Date(Date.now() - 3600000), consentAt: new Date(Date.now() - 3600000), lastSeenAt: new Date(Date.now() - 3600000), expiresAt: new Date(Date.now() - 1000) } });
      assert.equal(await prepareDownloadMeasurement(consented, descriptor, db), null);
      process.env.ANALYTICS_ENABLED = 'false'; assert.equal(await prepareDownloadMeasurement(consented, descriptor, db), null);
    });
    await t.test('bounded admission rejects excess concurrent reads and releases capacity afterwards', async () => {
      let unblock!: () => void;
      const gate = new Promise<void>(resolve => { unblock = resolve; });
      const blocked = { siteSetting: { findUnique: async () => { await gate; return null; } } } as unknown as PrismaClient;
      const pending = Array.from({ length: 8 }, () => blueprintDownload(request, params, blocked));
      assert.equal((await blueprintDownload(request, params, blocked)).status, 429);
      unblock(); assert.ok((await Promise.all(pending)).every(response => response.status === 404));
      assert.equal((await blueprintDownload(request, params, blocked)).status, 404);
    });
    await t.test('real HTTP enforces anonymous access, CSRF, roles, attachment and absence of static/private URLs', async () => {
      const session = await authenticate('fixture@blueprint.invalid', password, undefined, db);
      await withAppServer({ DATABASE_URL: url, BLUEPRINT_STORAGE_ROOT: store, CATALOG_DEMO_MODE: 'false', ANALYTICS_ENABLED: 'false', GA4_MODE: 'disabled', ADSENSE_ENABLED: 'false' }, async origin => {
        const endpoint = `${origin}/api/blueprints/${manifest.id}/1.0.0/export`;
        const response = await fetch(endpoint); assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
        assert.equal((await fetch(endpoint, { method: 'HEAD' })).status, 405);
        const admin = `${origin}/api/admin/blueprints/${manifest.id}/1.0.0`;
        assert.equal((await fetch(admin)).status, 401);
        const auth = { cookie: `atlas_session=${session.token}` };
        assert.equal((await fetch(admin, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
        const privateHeaders = { ...auth, origin, 'x-csrf-token': csrfForToken(session.token), 'Content-Type': 'application/json' };
        const encoded = Buffer.from(String.raw`{"url":"https:\u002f\u002fuser:fixture-not-real@example.org"}`);
        const unsafeFile = { ...file, platform: 'generic' as const, size: encoded.length, sha256: contentDigest(encoded) };
        await writeFile(path.join(store, 'objects', unsafeFile.sha256 + '.json'), encoded, { mode: 0o600 });
        const unsafeAdmin = admin.replace('/1.0.0', '/3.0.0');
        assert.equal((await fetch(unsafeAdmin, { method: 'POST', headers: privateHeaders, body: JSON.stringify({ action: 'save', expectedRevision: 0, manifest: { ...manifest, version: '3.0.0', files: [unsafeFile] } }) })).status, 200);
        assert.equal((await fetch(unsafeAdmin, { method: 'POST', headers: privateHeaders, body: JSON.stringify({ action: 'verify', expectedRevision: 1, evidence }) })).status, 500);
        assert.equal((await readRelease(manifest.id, '3.0.0', db))?.status, 'DRAFT');
        assert.equal((await fetch(endpoint.replace('/1.0.0', '/3.0.0'))).status, 404);
        const result = await fetch(admin, { method: 'POST', headers: { ...auth, origin, 'x-csrf-token': csrfForToken(session.token), 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'withdraw', expectedRevision: 6, confirmation: 'WITHDRAW' }) });
        assert.equal(result.status, 200); assert.equal((await fetch(endpoint)).status, 404);
        for (const url of [`/.private/blueprints/objects/${file.sha256}.json`, `/objects/${file.sha256}.json`, `/api/blueprints/${manifest.id}/2.0.0/export`]) assert.equal((await fetch(origin + url)).status, 404);
      });
    });
  } finally {
    await db.$disconnect(); await rm(store, { recursive: true, force: true });
    if (priorRoot === undefined) delete process.env.BLUEPRINT_STORAGE_ROOT; else process.env.BLUEPRINT_STORAGE_ROOT = priorRoot;
  }
});
