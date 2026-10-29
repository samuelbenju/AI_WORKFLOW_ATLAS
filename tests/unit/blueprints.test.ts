import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blueprintManifestSchema, blueprintKey, releaseSchema, blueprintPresentationSchema } from '../../src/lib/blueprints';
import { blueprintSize, downloadFailure } from '../../src/lib/blueprint-display';

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

test('optional presentation preserves legacy sealed bytes and bounds conceptual diagrams and requirements', () => {
  assert.equal(JSON.stringify(blueprintManifestSchema.parse(manifest)), JSON.stringify(manifest));
  const presentation = { architecture: { kind: 'conceptual', steps: [{ title: 'Review input' }, { title: 'Human approval' }] },
    requirements: { prerequisites: ['Use a test environment'], accounts: [], credentialSetup: [], limitations: ['Static review only'], externalCosts: [] }, setupInstructions: ['Inspect the file before import.'] };
  assert.ok(blueprintManifestSchema.safeParse({ ...manifest, presentation }).success);
  assert.equal(blueprintPresentationSchema.safeParse({ ...presentation, architecture: { kind: 'executed', steps: presentation.architecture.steps } }).success, false);
  assert.equal(blueprintPresentationSchema.safeParse({ architecture: { kind: 'conceptual', steps: Array.from({ length: 21 }, () => ({ title: 'Fixture' })) } }).success, false);
  assert.equal(blueprintPresentationSchema.safeParse({ requirements: { ...presentation.requirements, compatibility: { description: 'Unsubstantiated version' } } }).success, false);
  assert.equal(blueprintPresentationSchema.safeParse({ architecture: { kind: 'conceptual', steps: [{ title: 'a'.repeat(121) }, { title: 'Step 2' }] } }).success, false);
});
test('download display uses precise units and actionable public errors without private provider details', () => {
  assert.equal(blueprintSize(200), '200 B'); assert.equal(blueprintSize(1024), '1.0 KiB'); assert.equal(blueprintSize(1048576), '1.0 MiB');
  assert.match(downloadFailure(404), /no longer available/); assert.match(downloadFailure(429), /Too many/);
  assert.match(downloadFailure(503), /temporarily unavailable/); assert.match(downloadFailure(500), /could not start/);
});
