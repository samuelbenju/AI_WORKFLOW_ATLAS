import pg from 'pg';
import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { TLSSocket } from 'node:tls';
import { catalog, completeHistory, verifyManifest } from './neon-staging';
import { stagingConfiguration, stagingIdentity, stagingTarget } from './staging-connection';
import { assertCatalogPrivileges } from './catalog-privileges';
import { databaseDiagnostic } from '../src/lib/database-diagnostics';

const catalogRole = 'atlas_staging_catalog';
const safeCodes = new Set(['BOOTSTRAP_GUARD_REJECTED','BOOTSTRAP_INDEPENDENT_CREDENTIAL_REQUIRED',
  'BOOTSTRAP_STRONG_NEW_CREDENTIAL_REQUIRED','BOOTSTRAP_EXISTING_ROLE_REJECTED',
  'BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE','BOOTSTRAP_ALREADY_LOGIN_NO_ROTATION',
  'BOOTSTRAP_OPERATOR_CANNOT_ALTER_ROLE','BOOTSTRAP_ROLE_CHANGE_REJECTED',
  'BOOTSTRAP_HISTORY_OR_SCHEMA_REJECTED','BOOTSTRAP_TLS_REJECTED','BOOTSTRAP_IDENTITY_REJECTED',
  'BOOTSTRAP_DATABASE_BUSY','BOOTSTRAP_COMMIT_NOT_CONFIRMED','STAGING_CONFIGURATION_MISSING',
  'STAGING_CONFIGURATION_INVALID','STAGING_DESTINATION_REJECTED','STAGING_TLS_REJECTED',
  'STAGING_IDENTITY_OR_PRIVILEGES_REJECTED','IMPORT_PRIVILEGES_REJECTED',
  'BOOTSTRAP_NEON_PASSWORD_INITIALIZATION_UNSUPPORTED']);
function requireThat(condition: unknown, code: string): asserts condition {
  if (!condition) throw Error(code);
}

export function bootstrapConfiguration(env: NodeJS.ProcessEnv, commit: string) {
  requireThat(env.GITHUB_REPOSITORY === 'samuelbenju/AI_WORKFLOW_ATLAS'
    && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && env.GITHUB_SHA === commit && /^[a-f0-9]{40}$/.test(commit)
    && env.CATALOG_BOOTSTRAP_ENABLED === 'true'
    && env.CATALOG_CONFIRM_TARGET === stagingTarget, 'BOOTSTRAP_GUARD_REJECTED');
  const importer = stagingConfiguration(env.CATALOG_DATABASE_URL, [catalogRole], env.NEON_STAGING_EXPECTED_HOST);
  const operator = stagingConfiguration(env.MIGRATION_DATABASE_URL, ['atlas_staging_owner'], env.NEON_STAGING_EXPECTED_HOST);
  requireThat(importer.host === operator.host && importer.client.password !== operator.client.password,
    'BOOTSTRAP_INDEPENDENT_CREDENTIAL_REQUIRED');
  return { importer, operator };
}

// Standalone PostgreSQL test helper, NOT a supported Neon provisioning method.
// Only a verifier, never the plaintext password, reaches an ALTER ROLE command.
// Callers must already have durably stored the password in their private vault
// and CATALOG_DATABASE_URL. Nothing is generated and lost inside this workflow.
export function scramVerifier(password: string, salt = randomBytes(16)) {
  requireThat(/^[A-Za-z0-9_-]{64}$/.test(password) && salt.length === 16, 'BOOTSTRAP_STRONG_NEW_CREDENTIAL_REQUIRED');
  const salted = pbkdf2Sync(password, salt, 4096, 32, 'sha256');
  const client = createHmac('sha256', salted).update('Client Key').digest();
  const stored = createHash('sha256').update(client).digest();
  const server = createHmac('sha256', salted).update('Server Key').digest();
  try { return `SCRAM-SHA-256$4096:${salt.toString('base64')}$${stored.toString('base64')}:${server.toString('base64')}`; }
  finally { salted.fill(0); client.fill(0); stored.fill(0); server.fill(0); }
}

export async function inspectCatalogRole(client: pg.Client, role = catalogRole) {
  const { rows: [row] } = await client.query(`SELECT r.rolcanlogin AS login,
    r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls OR r.rolinherit AS unsafe,
    EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) AS memberships,
    EXISTS(SELECT 1 FROM pg_class WHERE relowner=r.oid) AS owns_relations,
    has_database_privilege(r.oid,current_database(),'CONNECT') AS connect,
    has_schema_privilege(r.oid,'public','USAGE') AS usage,
    has_schema_privilege(r.oid,'public','CREATE') AS create_schema
    FROM pg_roles r WHERE r.rolname=$1`, [role]);
  requireThat(row && !row.unsafe && !row.memberships && !row.owns_relations
    && row.connect && row.usage && !row.create_schema, 'BOOTSTRAP_EXISTING_ROLE_REJECTED');
  await assertCatalogPrivileges(client, role);
  const { rows: [history] } = await client.query(`SELECT bool_and(
    has_column_privilege($1,'public._prisma_migrations',column_name,'SELECT')) AS allowed
    FROM unnest(ARRAY['migration_name','checksum','finished_at','rolled_back_at']) AS column_name`, [role]);
  requireThat(history.allowed, 'BOOTSTRAP_EXISTING_ROLE_REJECTED');
  return { login: row.login === true };
}

const loggingSettings = {
  log_statement: 'none', log_duration: 'off', log_min_duration_statement: '-1',
  log_min_duration_sample: '-1', log_transaction_sample_rate: '0',
  log_parameter_max_length: '0', log_parameter_max_length_on_error: '0',
  log_min_error_statement: 'panic', log_error_verbosity: 'terse',
  'pg_stat_statements.track': 'none', 'auto_explain.log_min_duration': '-1',
} as const;
type LoggingControl = keyof typeof loggingSettings | 'pgaudit.log' | 'pgaudit.role';
type LoggingBlocker = { control: LoggingControl; reason: 'AUDIT_ACTIVE' | 'PARAMETER_UNAVAILABLE' | 'SET_NOT_AUTHORIZED' };
export type LoggingProtectionReport = {
  auditActive: boolean;
  originalFirstBlocker: LoggingBlocker | null;
  controls: { control: keyof typeof loggingSettings; present: boolean; context: 'user' | 'superuser' | 'other' | 'unavailable';
    canSet: boolean; alreadyProtected: boolean | null }[];
};
class LogProtectionError extends Error {
  constructor(readonly blocker: LoggingBlocker) { super('BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE'); }
}

// No SET, credentials, setting values or privileged role changes. pg_settings
// comparisons happen on the server; only allowlisted names/contexts/booleans
// return to the workflow. This also works inside BEGIN READ ONLY on Neon.
export async function inspectCredentialLogging(client: pg.Client): Promise<LoggingProtectionReport> {
  const { rows: [audit] } = await client.query(`SELECT
    coalesce(nullif(current_setting('pgaudit.log',true),''),'none') <> 'none' AS log_active,
    coalesce(current_setting('pgaudit.role',true),'') <> '' AS role_active`);
  const names = Object.keys(loggingSettings) as (keyof typeof loggingSettings)[];
  const { rows } = await client.query(`SELECT r.name AS control, s.name IS NOT NULL AS present,
    s.context, s.setting=r.expected AS already_protected,
    coalesce(s.context='user' OR (s.context='superuser' AND
      has_parameter_privilege(current_user,s.name,'SET')),false) AS can_set
    FROM unnest($1::text[],$2::text[]) WITH ORDINALITY AS r(name,expected,position)
    LEFT JOIN pg_settings s ON s.name=r.name ORDER BY r.position`, [names, Object.values(loggingSettings)]);
  const controls: LoggingProtectionReport['controls'] = names.map(control => {
    const row = rows.find(row => row.control === control);
    const context = !row?.present ? 'unavailable' : row.context === 'user' || row.context === 'superuser' ? row.context : 'other';
    return { control, present: row?.present === true, context,
      canSet: row?.can_set === true,
      alreadyProtected: typeof row?.already_protected === 'boolean' ? row.already_protected : null };
  });
  let blocker: LoggingBlocker | null = audit.log_active ? { control: 'pgaudit.log', reason: 'AUDIT_ACTIVE' }
    : audit.role_active ? { control: 'pgaudit.role', reason: 'AUDIT_ACTIVE' } : null;
  for (const control of controls) {
    const optional = control.control.includes('.');
    if (!blocker && !control.present && !optional) blocker = { control: control.control, reason: 'PARAMETER_UNAVAILABLE' };
    if (!blocker && control.present && !control.canSet) blocker = { control: control.control, reason: 'SET_NOT_AUTHORIZED' };
  }
  return { auditActive: audit.log_active === true || audit.role_active === true, originalFirstBlocker: blocker, controls };
}

// The PostgreSQL-only credential helper below is covered by isolated tests. It
// is NOT a supported Neon initializer: Neon documents plaintext SQL passwords,
// whereas this helper sends SCRAM. Never weaken the logging gate to enable it.
export function rejectUnsupportedNeonInitialization(report: LoggingProtectionReport): never {
  if (report.originalFirstBlocker) throw new LogProtectionError(report.originalFirstBlocker);
  throw Error('BOOTSTRAP_NEON_PASSWORD_INITIALIZATION_UNSUPPORTED');
}

// Local PostgreSQL helper: session-local only, no global audit changes. Inspect
// authorization before attempting SET so denial identifies the exact control.
export async function protectCredentialStatement(client: pg.Client) {
  const report = await inspectCredentialLogging(client);
  if (report.originalFirstBlocker) throw new LogProtectionError(report.originalFirstBlocker);
  try {
    for (const [name, value] of Object.entries(loggingSettings)) {
      if (!report.controls.find(control => control.control === name)?.present) continue;
      const { rows: [setting] } = await client.query('SELECT set_config($1,$2,true) AS value', [name, value]);
      requireThat(setting.value === value, 'BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE');
    }
  } catch { throw Error('BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE'); }
}

// Transaction required; callers rollback on any failure. The verifier is sent
// through a bound parameter, not an interpolated client SQL statement. The fixed
// DO catches utility errors without exposing a dynamic SQL context. No function,
// table, persistent GUC, new role, grant or membership is created.
export async function initializeNoLoginRole(client: pg.Client, password: string, role = catalogRole) {
  const host = (client as unknown as { host?: string }).host;
  requireThat(['127.0.0.1','localhost','::1'].includes(host?.toLowerCase() ?? ''), 'BOOTSTRAP_NEON_PASSWORD_INITIALIZATION_UNSUPPORTED');
  requireThat((await inspectCatalogRole(client, role)).login === false, 'BOOTSTRAP_ALREADY_LOGIN_NO_ROTATION');
  const { rows: [operator] } = await client.query(`SELECT r.rolsuper OR (r.rolcreaterole AND EXISTS(
    SELECT 1 FROM pg_auth_members m JOIN pg_roles t ON t.oid=m.roleid
    WHERE m.member=r.oid AND t.rolname=$1 AND m.admin_option)) AS allowed
    FROM pg_roles r WHERE r.rolname=current_user`, [role]);
  requireThat(operator?.allowed, 'BOOTSTRAP_OPERATOR_CANNOT_ALTER_ROLE');
  // Fail closed if the administrative connection cannot suppress sensitive
  // statement/parameter/error logging for this transaction. No privilege grant.
  await protectCredentialStatement(client);
  const verifier = scramVerifier(password);
  await client.query(`SELECT set_config('atlas.catalog_bootstrap_role',$1,true),
    set_config('atlas.catalog_bootstrap_verifier',$2,true)`, [role, verifier]);
  await client.query(`DO $bootstrap$
    BEGIN
      PERFORM set_config('atlas.catalog_bootstrap_result','rejected',true);
      BEGIN
        IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_setting('atlas.catalog_bootstrap_role') AND NOT rolcanlogin) THEN
          EXECUTE format('ALTER ROLE %I PASSWORD %L LOGIN', current_setting('atlas.catalog_bootstrap_role'),
            current_setting('atlas.catalog_bootstrap_verifier'));
          PERFORM set_config('atlas.catalog_bootstrap_result','initialized',true);
        END IF;
      EXCEPTION WHEN OTHERS OR query_canceled OR assert_failure THEN
        PERFORM set_config('atlas.catalog_bootstrap_result','rejected',true);
      END;
      PERFORM set_config('atlas.catalog_bootstrap_verifier','',true);
    END $bootstrap$`);
  const { rows: [result] } = await client.query(`SELECT current_setting('atlas.catalog_bootstrap_result') AS status`);
  requireThat(result.status === 'initialized', 'BOOTSTRAP_ROLE_CHANGE_REJECTED');
  await inspectCatalogRole(client, role);
}

async function verifyHistory(client: pg.Client) {
  const manifest = await verifyManifest();
  const history = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name')).rows;
  requireThat(completeHistory(history, manifest)
    && JSON.stringify(await catalog(client)) === JSON.stringify(manifest.structure), 'BOOTSTRAP_HISTORY_OR_SCHEMA_REJECTED');
}

async function main() {
  let stage = 'configuration', client: pg.Client | undefined, committed = false;
  let logging: LoggingProtectionReport | undefined;
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    console.log(JSON.stringify({ stage: 'catalog.bootstrap.configuration presence',
      catalogSecretPresent: !!process.env.CATALOG_DATABASE_URL,
      operatorSecretPresent: !!process.env.MIGRATION_DATABASE_URL,
      expectedHostPresent: !!process.env.NEON_STAGING_EXPECTED_HOST }));
    const cfg = bootstrapConfiguration(process.env, commit);
    client = new pg.Client(cfg.operator.client);
    client.on('error', () => { /* Provider errors may contain private details. */ });
    stage = 'operator TLS and identity';
    await client.connect();
    const socket = (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
    requireThat(socket.encrypted && socket.authorized && ['TLSv1.2','TLSv1.3'].includes(socket.getProtocol() ?? ''), 'BOOTSTRAP_TLS_REJECTED');
    const { rows: [identity] } = await client.query(`SELECT current_database() AS database,current_user AS role,
      session_user AS session_role,current_setting('server_version_num')::int AS version,
      current_setting('neon.project_id',true) AS project`);
    requireThat(identity.database === 'atlas_staging' && identity.role === cfg.operator.role
      && identity.session_role === cfg.operator.role && identity.version >= 170000 && identity.version < 180000
      && (!identity.project || identity.project === 'cold-shadow-53495242'), 'BOOTSTRAP_IDENTITY_REJECTED');
    await client.query('BEGIN READ ONLY');
    const { rows: [lock] } = await client.query('SELECT pg_try_advisory_xact_lock(48183725) AS acquired');
    requireThat(lock.acquired, 'BOOTSTRAP_DATABASE_BUSY');
    stage = 'existing history and minimum privileges';
    await verifyHistory(client);
    const state = await inspectCatalogRole(client);
    if (!state.login) {
      stage = 'credential safety inspection';
      logging = await inspectCredentialLogging(client);
      // The existing remote workflow never binds plaintext or SCRAM to SQL.
      // Stop until the provider supplies a supported, private initialization
      // procedure; CREATEROLE is not permission to change managed logging.
      rejectUnsupportedNeonInitialization(logging);
    }
    // A previously initialized LOGIN role can still be verified, never rotated.
    const completion = await client.query('COMMIT');
    requireThat(completion.command === 'COMMIT', 'BOOTSTRAP_COMMIT_NOT_CONFIRMED');
    committed = true;
    stage = 'catalog TLS connection and effective privileges';
    const probe = new pg.Client(cfg.importer.client);
    probe.on('error', () => { /* Never log raw provider errors. */ });
    try {
      await probe.connect();
      await stagingIdentity(probe, catalogRole);
      await probe.query('SET default_transaction_read_only=on');
      await verifyHistory(probe);
      await assertCatalogPrivileges(probe);
    } finally { await probe.end(); }
    const report = { commit, status: 'ALREADY_CONFIGURED_NO_CHANGE',
      credentialConfigured: true, tlsVerified: true, minimumPrivilegesVerified: true, migrationsVerified: 16,
      migrationsApplied: 0, tableWrites: 0, roleCreated: false, credentialRotated: false, credentialWritesAttempted: 0,
      next: 'Disable NEON_CATALOG_BOOTSTRAP_ENABLED; then run the existing catalog dry-run.' };
    console.log(JSON.stringify(report));
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Catalog credential bootstrap\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
  } catch (error) {
    const codes = error instanceof Error && safeCodes.has(error.message) ? [error.message] : databaseDiagnostic(error, 'database.unknown').codes;
    const failure = { stage: `catalog.bootstrap.${stage}`, codes,
      credentialCommitted: false, credentialWritesAttempted: 0,
      ...(logging ? { initializationSupported: false, logging,
        next: 'Provider-supported private initialization required. Do not change the configured secrets, logging privileges or existing role.' } : {}) };
    console.error(JSON.stringify(failure));
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `## Neon bootstrap stopped (read-only)\n\n\`\`\`json\n${JSON.stringify(failure, null, 2)}\n\`\`\`\n`).catch(() => {});
    process.exitCode = 1;
  } finally {
    if (client) {
      if (!committed) await client.query('ROLLBACK').catch(() => {});
      await client.end().catch(() => { process.exitCode = 1; });
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/catalog-bootstrap.ts')) void main();
