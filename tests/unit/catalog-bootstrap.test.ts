import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { bootstrapConfiguration, scramVerifier, inspectCredentialLogging,
  protectCredentialStatement, initializeNoLoginRole, rejectUnsupportedNeonInitialization } from '../../scripts/catalog-bootstrap';

const commit = 'a'.repeat(40);
function fixture(): NodeJS.ProcessEnv {
  // Non-routable example fixtures, never a real Neon endpoint or credential.
  const host = 'ep-fixture.us-east-1.aws.neon.tech';
  return { NODE_ENV: 'test', GITHUB_REPOSITORY: 'samuelbenju/AI_WORKFLOW_ATLAS', GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_SHA: commit, CATALOG_BOOTSTRAP_ENABLED: 'true',
    CATALOG_CONFIRM_TARGET: 'cold-shadow-53495242/atlas_staging', NEON_STAGING_EXPECTED_HOST: host,
    MIGRATION_DATABASE_URL: `postgresql://atlas_staging_owner:${randomBytes(48).toString('base64url')}@${host}/atlas_staging`,
    CATALOG_DATABASE_URL: `postgresql://atlas_staging_catalog:${randomBytes(48).toString('base64url')}@${host}/atlas_staging` };
}
test('bootstrap accepts only the official manual main checkout with private configuration', () => {
  const cfg = bootstrapConfiguration(fixture(), commit);
  assert.ok(cfg.importer.client.ssl.rejectUnauthorized && cfg.operator.client.ssl.rejectUnauthorized);
  assert.ok(cfg.importer.client.user !== cfg.operator.client.user);
});
test('bootstrap refuses other repos, refs, events, SHA, target and the disabled gate', () => {
  for (const [name, value] of Object.entries({ GITHUB_REPOSITORY: 'other/repo', GITHUB_REF: 'refs/heads/other',
    GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: 'b'.repeat(40), CATALOG_CONFIRM_TARGET: 'other/atlas_staging',
    CATALOG_BOOTSTRAP_ENABLED: 'false' })) {
    assert.throws(() => bootstrapConfiguration({ ...fixture(), [name]: value }, commit), /^Error: BOOTSTRAP_GUARD_REJECTED$/);
  }
});
test('bootstrap refuses missing private secret or expected hostname before any connection', () => {
  for (const name of ['CATALOG_DATABASE_URL', 'MIGRATION_DATABASE_URL', 'NEON_STAGING_EXPECTED_HOST']) {
    assert.throws(() => bootstrapConfiguration({ ...fixture(), [name]: '' }, commit), /^Error: STAGING_CONFIGURATION_MISSING$/);
  }
});
test('bootstrap refuses poolers, runtime credentials and reused operator passwords', () => {
  const env = fixture();
  const connection = new URL(env.CATALOG_DATABASE_URL!);
  connection.hostname = connection.hostname.replace('.us-east', '-pooler.us-east');
  assert.throws(() => bootstrapConfiguration({ ...env, CATALOG_DATABASE_URL: connection.toString() }, commit), /STAGING_DESTINATION_REJECTED/);
  connection.hostname = env.NEON_STAGING_EXPECTED_HOST!;
  connection.username = 'atlas_staging_app';
  assert.throws(() => bootstrapConfiguration({ ...env, CATALOG_DATABASE_URL: connection.toString() }, commit), /STAGING_DESTINATION_REJECTED/);
  connection.username = 'atlas_staging_catalog';
  connection.password = new URL(env.MIGRATION_DATABASE_URL!).password;
  assert.throws(() => bootstrapConfiguration({ ...env, CATALOG_DATABASE_URL: connection.toString() }, commit), /BOOTSTRAP_INDEPENDENT_CREDENTIAL_REQUIRED/);
});
test('SCRAM preparation requires the privately stored 48-byte base64url credential', () => {
  const password = randomBytes(48).toString('base64url');
  const first = scramVerifier(password), second = scramVerifier(password);
  assert.ok(first.startsWith('SCRAM-SHA-256$4096:') && first !== second && !first.includes(password));
  assert.throws(() => scramVerifier('short'), /^Error: BOOTSTRAP_STRONG_NEW_CREDENTIAL_REQUIRED$/);
});

test('read-only logging inspection identifies forbidden SET even when the current value is already protective', async () => {
  const statements: string[] = [];
  const client = { query: async (sql: string, params?: string[][]) => {
    statements.push(sql);
    if (!params) return { rows: [{ log_active: false, role_active: false }] };
    return { rows: params[0]!.map(control => ({ control, present: !control.includes('.'),
      context: 'superuser', already_protected: true, can_set: false })) };
  } } as unknown as pg.Client;
  const report = await inspectCredentialLogging(client);
  assert.deepEqual(report.originalFirstBlocker, { control: 'log_statement', reason: 'SET_NOT_AUTHORIZED' });
  assert.ok(report.controls[0]?.alreadyProtected && !report.controls[0]?.canSet);
  await assert.rejects(protectCredentialStatement(client), /^Error: BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE$/);
  assert.ok(statements.every(sql => sql.trimStart().startsWith('SELECT') && !sql.includes('set_config')));
});

test('logging diagnostics expose no unrecognized names, setting values or server context', async () => {
  const marker = randomBytes(24).toString('hex');
  const client = { query: async (sql: string, params?: string[][]) => !params
    ? { rows: [{ log_active: false, role_active: false, unexpected: marker }] }
    : { rows: params[0]!.map(control => ({ control, present: true, context: marker,
      already_protected: false, can_set: false, setting: marker })) },
  } as unknown as pg.Client;
  const report = await inspectCredentialLogging(client);
  assert.ok(!JSON.stringify(report).includes(marker));
  assert.ok(report.controls.every(control => control.context === 'other'));
});

test('even privileged, protective settings do not authorize an undocumented Neon password protocol', async () => {
  const client = { query: async (sql: string, params?: string[][]) => !params
    ? { rows: [{ log_active: false, role_active: false }] }
    : { rows: params[0]!.map(control => ({ control, present: true, context: 'superuser',
      already_protected: true, can_set: true })) },
  } as unknown as pg.Client;
  const report = await inspectCredentialLogging(client);
  assert.ok(report.originalFirstBlocker === null);
  assert.throws(() => rejectUnsupportedNeonInitialization(report), /^Error: BOOTSTRAP_NEON_PASSWORD_INITIALIZATION_UNSUPPORTED$/);
});

test('the local-only SCRAM helper refuses Neon before connecting or binding any credential', async () => {
  const client = new pg.Client({ host: 'ep-fixture.us-east-1.aws.neon.tech' });
  let queried = false;
  client.query = (async () => { queried = true; throw Error('Unexpected query'); }) as typeof client.query;
  await assert.rejects(initializeNoLoginRole(client, randomBytes(48).toString('base64url')),
    /^Error: BOOTSTRAP_NEON_PASSWORD_INITIALIZATION_UNSUPPORTED$/);
  assert.ok(!queried);
});
