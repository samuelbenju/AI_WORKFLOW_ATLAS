import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLibrary, normalizeSlug, officialUrl, domainIdentity } from '../../src/lib/catalog-import';
import { stagingConfiguration } from '../../scripts/staging-connection';
const input = JSON.parse(readFileSync('data/catalog/library.json', 'utf8'));
const evidence = JSON.parse(readFileSync('data/catalog/research.json', 'utf8')).findings;
const now = new Date(Date.parse(input.tools[0].review.reviewedAt) + 1000);
const clone = () => structuredClone(input);

test('reviewed library uses existing field limits, referenced taxonomy and primary evidence', () => {
  const library = validateLibrary(input, evidence, now);
  assert.equal(library.tools.length, 65); assert.equal(library.useCases.length, 30); assert.equal(library.articles.length, 6);
  assert.ok(library.articles.every(a => a.status === 'DRAFT' && a.noindex));
  assert.ok(library.tools.every(t => !t.isDemo && t.review.handsOnTested === false));
});
test('normalization and shared repository host identity do not collapse different products', () => {
  assert.equal(normalizeSlug('  Résumé_Viewer  '), 'resume-viewer');
  assert.equal(officialUrl('https://www.GITHUB.com/OpenAI/Whisper/'), 'https://github.com/openai/whisper');
  assert.notEqual(domainIdentity('https://github.com/openai/whisper'), domainIdentity('https://github.com/openai/codex'));
  assert.equal(domainIdentity('https://example.com/product-a'), domainIdentity('https://example.com/product-b'));
});
test('URLs cannot contain credentials, tracking, insecure protocols, local addresses or incomplete repository paths', () => {
  for (const url of ['http://example.com', 'https://user:secret@example.com', 'https://example.com?q=x', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://github.com/openai', 'https://github.com/openai/whisper/issues', 'javascript:alert(1)']) assert.throws(() => officialUrl(url));
});
test('duplicates by slug, normalized name or official distribution identity are rejected', () => {
  for (const change of ['slug', 'name', 'websiteUrl']) {
    const value = clone(); value.tools[1][change] = value.tools[0][change];
    assert.throws(() => validateLibrary(value, evidence, now), /DUPLICATE/);
  }
});
test('unverified, stale, future and wrong-product sources cannot authorize publication', () => {
  for (const mutate of [
    (v: typeof input) => { v.tools[0].review.sources[0].sha256 = '0'.repeat(64); },
    (v: typeof input) => { v.tools[0].websiteUrl = 'https://github.com/example/different'; },
    (v: typeof input) => { v.tools[0].review.reviewedAt = new Date(now.getTime() + 1000).toISOString(); },
  ]) { const value = clone(); mutate(value); assert.throws(() => validateLibrary(value, evidence, now)); }
  assert.throws(() => validateLibrary(input, evidence, new Date(now.getTime() + 91 * 86400000)), /STALE/);
  assert.throws(() => validateLibrary(input, evidence.map((e: object) => ({ ...e, archived: true })), now), /SOURCE_NOT_VERIFIED/);
});
test('incomplete entries, unknown relations, demos and fabricated columns are rejected', () => {
  for (const mutate of [
    (v: typeof input) => { v.tools[0].summary = ''; },
    (v: typeof input) => { v.tools[0].isDemo = true; },
    (v: typeof input) => { v.tools[0].apiKey = 'NOT_A_REAL_SECRET'; },
    (v: typeof input) => { v.tools[0].categories = ['missing']; },
    (v: typeof input) => { v.useCases[0].tools = ['missing']; },
    (v: typeof input) => { v.useCases[0].instructions[0].step = 2; },
    (v: typeof input) => { v.useCases[0].references[0].url = 'https://example.com'; },
    (v: typeof input) => { v.articles[0].status = 'PUBLISHED'; },
  ]) { const value = clone(); mutate(value); assert.throws(() => validateLibrary(value, evidence, now)); }
});
test('staging URL guard rejects other databases, poolers, owners, mismatched hosts and missing private bindings', () => {
  const host = 'ep-fixture.us-east-1.aws.neon.tech';
  const url = `postgresql://atlas_staging_catalog:NOT_A_REAL_PASSWORD@${host}/atlas_staging?sslmode=disable`;
  const config = stagingConfiguration(url, ['atlas_staging_catalog'], host);
  assert.equal(config.client.ssl.rejectUnauthorized, true); assert.equal(config.client.ssl.servername, host);
  assert.ok(config.canonical.endsWith('sslmode=verify-full')); assert.equal(config.client.database, 'atlas_staging');
  for (const value of [undefined, url.replace('atlas_staging?', 'other?'), url.replace('atlas_staging_catalog:', 'atlas_staging_owner:'), url.replace('ep-fixture.', 'ep-fixture-pooler.'), url.replace(host, 'example.com')]) assert.throws(() => stagingConfiguration(value, ['atlas_staging_catalog'], host));
  assert.throws(() => stagingConfiguration(url, ['atlas_staging_catalog'], undefined));
  assert.throws(() => stagingConfiguration(url, ['atlas_staging_catalog'], 'ep-other.us-east-1.aws.neon.tech'));
});
