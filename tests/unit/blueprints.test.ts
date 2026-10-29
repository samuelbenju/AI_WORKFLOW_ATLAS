import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blueprintManifestSchema, blueprintKey, releaseSchema } from '../../src/lib/blueprints';

const manifest = { schemaVersion: 1, id: 'fixture', version: '1.0.0', useCaseSlug: 'existing-guide', title: 'Isolated fixture', description: 'Not a published workflow.',
  attribution: { credit: 'Isolated test fixture', license: 'Test only', sources: ['https://example.org/docs'] },
  files: [{ id: 'export', filename: 'fixture.json', format: 'json', platform: 'generic', size: 3, sha256: 'a'.repeat(64) }] };
test('blueprint manifests reject arbitrary paths, formats, filenames, duplicate IDs and unbounded releases', () => {
  assert.ok(blueprintManifestSchema.safeParse(manifest).success);
  for (const change of [{ path: '../../.env' }, { filename: '../private.json' }, { filename: 'header\r\n.json' }, { format: 'zip' }, { size: 1048577 }, { sha256: 'wrong' }]) {
    assert.equal(blueprintManifestSchema.safeParse({ ...manifest, files: [{ ...manifest.files[0], ...change }] }).success, false);
  }
  assert.equal(blueprintManifestSchema.safeParse({ ...manifest, files: [manifest.files[0], manifest.files[0]] }).success, false);
  assert.equal(blueprintManifestSchema.safeParse({ ...manifest, attribution: { ...manifest.attribution, sources: ['https://user:pass@example.org/'] } }).success, false);
  for (const version of ['latest', '1.0', '../1.0.0', '01.0.0', '1.0.0?secret']) assert.equal(blueprintKey.safeParse({ blueprint: 'fixture', version }).success, false);
});
test('a publication state requires a sealed review and publication attestations', () => {
  const draft = { manifest, revision: 1, status: 'DRAFT', sealed: false, verification: null, publication: null };
  assert.ok(releaseSchema.safeParse(draft).success);
  for (const status of ['VERIFIED', 'PUBLISHED']) assert.equal(releaseSchema.safeParse({ ...draft, status }).success, false);
});
