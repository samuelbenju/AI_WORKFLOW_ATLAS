import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { GetBucketAclCommand, GetBucketPolicyCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { LocalPrivateStorage } from '../../src/server/blueprints/local-storage';
import { NeonObjectStorage, neonStorageConfiguration, type ObjectTransport } from '../../src/server/blueprints/neon-storage';
import { blueprintStorage, contentDigest, validateBlueprintBytes } from '../../src/server/blueprints/storage';
import { blueprintAvailability } from '../../src/server/blueprints/availability';

const bytes = Buffer.from('{"fixture":"Storage test only, not an automation"}');
const file = { id: 'fixture', filename: 'fixture.json', format: 'json' as const, platform: 'generic' as const, size: bytes.length, sha256: contentDigest(bytes) };
const env = { BLUEPRINT_OBJECT_ENDPOINT: 'https://br-fixture.storage.c-1.us-east-1.aws.neon.tech', BLUEPRINT_OBJECT_REGION: 'us-east-1',
  BLUEPRINT_OBJECT_BUCKET: 'isolated-fixture', BLUEPRINT_OBJECT_ACCESS_KEY_ID: 'fixture-not-real', BLUEPRINT_OBJECT_SECRET_ACCESS_KEY: 'fixture-not-real' };

test('local private provider: atomic no-replace uploads, restart, traversal, missing and corrupt objects', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'atlas-storage-'));
  try {
    const provider = new LocalPrivateStorage({ BLUEPRINT_STORAGE_ROOT: root });
    assert.equal(await provider.exists(file), false);
    assert.deepEqual(await provider.inspect(file), { exists: false, integrity: 'missing' });
    const outcomes = await Promise.all([provider.put(file, bytes), provider.put(file, bytes)]);
    assert.ok(outcomes.includes('created')); assert.ok(outcomes.includes('existing'));
    const restarted = new LocalPrivateStorage({ BLUEPRINT_STORAGE_ROOT: root });
    assert.deepEqual(Buffer.from(await restarted.read(file)), bytes);
    assert.deepEqual(await restarted.inspect(file), { exists: true, integrity: 'verified' });
    assert.equal(await restarted.exists(file), true);
    assert.deepEqual(await blueprintAvailability([{ ...file, href: '/api/blueprints/fixture/1.0.0/export' } as typeof file], restarted), { fixture: 'available' });
    await assert.rejects(provider.read({ ...file, sha256: '../../.env' }));
    const target = path.join(root, 'objects', file.sha256 + '.json');
    const corrupt = Buffer.from(bytes); corrupt[0] = 0;
    await writeFile(target, corrupt);
    await assert.rejects(provider.read(file)); await assert.rejects(provider.put(file, bytes));
    assert.deepEqual(await readFile(target), corrupt); // No repair/overwrite of an existing corrupt object.
    await rm(target); await symlink('/etc/passwd', target);
    await assert.rejects(provider.put(file, bytes)); await assert.rejects(provider.exists(file));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Neon adapter configuration rejects arbitrary endpoints, missing secrets and implicit production fallback', () => {
  assert.equal(neonStorageConfiguration(env).region, 'us-east-1');
  for (const patch of [{ BLUEPRINT_OBJECT_ENDPOINT: 'http://127.0.0.1/' }, { BLUEPRINT_OBJECT_ENDPOINT: 'https://evil.neon.tech/' },
    { BLUEPRINT_OBJECT_ENDPOINT: env.BLUEPRINT_OBJECT_ENDPOINT + '/path' }, { BLUEPRINT_OBJECT_ENDPOINT: env.BLUEPRINT_OBJECT_ENDPOINT + '?token=value' },
    { BLUEPRINT_OBJECT_REGION: 'eu-west-1' }, { BLUEPRINT_OBJECT_BUCKET: '../private' }, { BLUEPRINT_OBJECT_SECRET_ACCESS_KEY: '' }]) {
    assert.throws(() => neonStorageConfiguration({ ...env, ...patch }));
  }
  assert.throws(() => blueprintStorage({ NODE_ENV: 'production' }));
  assert.throws(() => blueprintStorage({ ...env, BLUEPRINT_STORAGE_BACKEND: 'neon', BLUEPRINT_OBJECT_BUCKET: '' }));
  assert.equal(blueprintStorage({ ...env, BLUEPRINT_STORAGE_BACKEND: 'neon' }).operationalInfo().backend, 'neon');
});

function mockStorage() {
  const objects = new Map<string, Uint8Array>(); const calls: string[] = [];
  let isPublic = false, policy: string | undefined, broken = false, incorrectLength = false;
  const transport: ObjectTransport = async (command, signal) => {
    assert.equal(signal.aborted, false); calls.push(command.constructor.name);
    if (broken) throw Error('Fixture network failure, no real provider contacted');
    if (command instanceof GetBucketAclCommand) return { Owner: { ID: 'fixture-owner' }, Grants: [
      { Grantee: isPublic ? { Type: 'Group', ID: '*' } : { Type: 'CanonicalUser', ID: 'fixture-owner' }, Permission: 'FULL_CONTROL' }] };
    if (command instanceof GetBucketPolicyCommand) {
      if (!policy) throw Object.assign(Error(), { name: 'NoSuchBucketPolicy', $metadata: { httpStatusCode: 404 } });
      return { Policy: policy };
    }
    const key = command.input.Key!;
    assert.match(key, /^objects\/sha256\/[a-f0-9]{64}$/);
    if (command instanceof PutObjectCommand) {
      assert.equal(command.input.IfNoneMatch, '*'); assert.equal(command.input.CacheControl, 'private, no-store');
      if (objects.has(key)) throw Object.assign(Error(), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
      objects.set(key, new Uint8Array(command.input.Body as Uint8Array)); return {};
    }
    const stored = objects.get(key);
    if (!stored) throw Object.assign(Error(), { name: command instanceof HeadObjectCommand ? 'NotFound' : 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
    return { ContentLength: stored.length + Number(incorrectLength),
      ...(command instanceof GetObjectCommand ? { Body: (async function* () { yield stored; })() } : {}) };
  };
  return { objects, calls, transport, public: () => { isPublic = true; }, policy: (value: string) => { policy = value; },
    break: () => { broken = true; }, wrongLength: () => { incorrectLength = true; } };
}

test('SIMULATED S3: private uploads/readback, content addressing, missing, idempotency and new provider instance', async () => {
  const mock = mockStorage(), provider = new NeonObjectStorage(env, mock.transport);
  assert.equal(await provider.exists(file), false); assert.equal((await provider.inspect(file)).integrity, 'missing');
  assert.equal(await provider.put(file, bytes), 'created'); assert.equal(await provider.put(file, bytes), 'existing');
  const restarted = new NeonObjectStorage(env, mock.transport);
  assert.deepEqual(Buffer.from(await restarted.read(file)), bytes);
  assert.equal(await restarted.exists(file), true);
  assert.deepEqual(await restarted.inspect(file), { exists: true, integrity: 'verified' });
  assert.equal(mock.calls.filter(c => c === 'PutObjectCommand').length, 1);
  mock.objects.set(`objects/sha256/${file.sha256}`, new Uint8Array(file.size));
  await assert.rejects(provider.read(file)); await assert.rejects(provider.put(file, bytes));
  assert.equal(mock.calls.filter(c => c === 'PutObjectCommand').length, 1);
});

test('SIMULATED S3: public ACL/policy, denied access, network failure and length mismatch fail closed', async () => {
  for (const mutate of [(m: ReturnType<typeof mockStorage>) => m.public(), (m: ReturnType<typeof mockStorage>) => m.policy('{"Statement":[{"Effect":"Allow","Principal":"*"}]}'),
    (m: ReturnType<typeof mockStorage>) => m.break(), (m: ReturnType<typeof mockStorage>) => m.wrongLength()]) {
    const mock = mockStorage(); mock.objects.set(`objects/sha256/${file.sha256}`, bytes); mutate(mock);
    const provider = new NeonObjectStorage(env, mock.transport);
    await assert.rejects(provider.read(file)); await assert.rejects(provider.exists(file)); await assert.rejects(provider.put(file, bytes));
    assert.equal(mock.calls.filter(c => c === 'PutObjectCommand').length, 0);
  }
});

test('SIMULATED S3: hard timeout, no retries and no fallback', async () => {
  let calls = 0, signal: AbortSignal | undefined;
  const provider = new NeonObjectStorage(env, async (_, s) => { calls++; signal = s; return new Promise(() => {}); }, 15);
  await assert.rejects(provider.read(file)); assert.equal(calls, 1); assert.equal(signal?.aborted, true);
});

test('SIMULATED S3: ambiguous or unreadable bucket policy never authorizes reads or writes', async () => {
  for (const policyResult of [{}, { Policy: '' }, { Policy: 'null' }, { Policy: '{bad' },
    Object.assign(Error(), { name: 'NoSuchBucketPolicy', $metadata: { httpStatusCode: 403 } }),
    Object.assign(Error(), { name: 'NoSuchBucketPolicy' }),
    Object.assign(Error(), { name: 'NotImplemented', $metadata: { httpStatusCode: 501 } })]) {
    const mock = mockStorage(); mock.objects.set(`objects/sha256/${file.sha256}`, bytes);
    const provider = new NeonObjectStorage(env, async (command, signal) => {
      if (!(command instanceof GetBucketPolicyCommand)) return mock.transport(command, signal);
      if (policyResult instanceof Error) throw policyResult;
      return policyResult;
    });
    await assert.rejects(provider.read(file)); await assert.rejects(provider.exists(file)); await assert.rejects(provider.put(file, bytes));
    assert.equal(mock.calls.filter(c => ['GetObjectCommand', 'PutObjectCommand', 'HeadObjectCommand'].includes(c)).length, 0);
  }
});

test('SIMULATED S3: missing-object error names without matching HTTP status do not permit upload', async () => {
  for (const status of [undefined, 403, 500]) {
    const mock = mockStorage();
    const provider = new NeonObjectStorage(env, async (command, signal) => {
      if (command instanceof HeadObjectCommand || command instanceof GetObjectCommand)
        throw Object.assign(Error(), { name: command instanceof HeadObjectCommand ? 'NotFound' : 'NoSuchKey', $metadata: { httpStatusCode: status } });
      return mock.transport(command, signal);
    });
    await assert.rejects(provider.exists(file)); await assert.rejects(provider.put(file, bytes));
    assert.equal(mock.calls.filter(c => c === 'PutObjectCommand').length, 0);
  }
});

test('SIMULATED S3: a stalled object body is destroyed on timeout, not only when iteration completes', async () => {
  const mock = mockStorage(), body = new Readable({ read() { /* Deliberately never finishes. */ } });
  const provider = new NeonObjectStorage(env, async (command, signal) => command instanceof GetObjectCommand
    ? { ContentLength: file.size, Body: body } : mock.transport(command, signal), 20);
  try { await assert.rejects(provider.read(file)); assert.equal(body.destroyed, true); }
  finally { body.destroy(); }
});

test('SIMULATED S3: conditional-write conflict requires HTTP 412 and exact readback; no second PUT', async () => {
  for (const [status, corrupt, succeeds] of [[412, false, true], [412, true, false], [403, false, false]] as const) {
    const mock = mockStorage(); let puts = 0;
    const provider = new NeonObjectStorage(env, async (command, signal) => {
      if (!(command instanceof PutObjectCommand)) return mock.transport(command, signal);
      puts++; mock.objects.set(`objects/sha256/${file.sha256}`, corrupt ? new Uint8Array(file.size) : bytes);
      throw Object.assign(Error(), { name: 'PreconditionFailed', $metadata: { httpStatusCode: status } });
    });
    if (succeeds) assert.equal(await provider.put(file, bytes), 'existing');
    else await assert.rejects(provider.put(file, bytes));
    assert.equal(puts, 1);
  }
});

test('storage credential patterns are rejected before writing (synthetic strings only)', () => {
  for (const value of [{ AWS_SECRET_ACCESS_KEY: 'fixture-only-not-real' }, { key: 'nsk_live_fixture_only_not_real' },
    { url: 'https://fixture:fixture@invalid.example/' }]) {
    const unsafe = Buffer.from(JSON.stringify(value));
    assert.throws(() => validateBlueprintBytes(unsafe, { ...file, size: unsafe.length, sha256: contentDigest(unsafe) }));
  }
});

test('page availability uses only metadata and preserves missing/unavailable errors, bounded at four concurrent checks', async () => {
  let concurrent = 0, peak = 0;
  const provider = new LocalPrivateStorage();
  provider.read = async () => { throw Error('Opening a guide must not read file bytes'); };
  provider.exists = async f => { concurrent++; peak = Math.max(peak, concurrent); await new Promise(r => setTimeout(r, 2)); concurrent--;
    if (f.id === 'missing') return false; if (f.id === 'broken') throw Error(); return true; };
  const files = ['available', 'missing', 'broken', 'four', 'five'].map(id => ({ ...file, id }));
  assert.deepEqual(await blueprintAvailability(files, provider), { available: 'available', missing: 'missing', broken: 'unavailable', four: 'available', five: 'available' });
  assert.equal(peak, 4);
});
