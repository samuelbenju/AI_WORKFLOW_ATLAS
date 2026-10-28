import pg from 'pg';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { initializeNoLoginRole, inspectCatalogRole, protectCredentialStatement, inspectCredentialLogging } from '../../scripts/catalog-bootstrap';

// The wrapper creates/removes this database, never a deployed database.
const value = process.env.ATLAS_BOOTSTRAP_TEST_URL;
const target = new URL(value ?? '');
if (!['127.0.0.1','localhost'].includes(target.hostname) || !/^\/atlas_run_[a-f0-9]+_test$/.test(target.pathname)) {
  throw Error('Requires the existing isolated test wrapper.');
}
const role = `atlas_catalog_bootstrap_${randomBytes(8).toString('hex')}`;
const operator = `atlas_catalog_operator_${randomBytes(8).toString('hex')}`;
const password = randomBytes(48).toString('base64url');
const client = new pg.Client({ connectionString: value });
const allowed = ['Tool','Category','Tag','UseCase','Article','_CategoryToTool','_TagToTool','_CategoryToUseCase','_TagToUseCase','_ToolToUseCase','_ArticleToCategory','_ArticleToTag','_ArticleToTool'];
let created = false, operatorCreated = false;
async function connectAsCatalog() {
  const url = new URL(value!); url.username = role; url.password = password;
  const probe = new pg.Client({ connectionString: url.toString() });
  await probe.connect(); return probe;
}
async function main() {
  await client.connect();
  try {
    await client.query(`CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`); created = true;
    await client.query(`GRANT CONNECT ON DATABASE "${target.pathname.slice(1)}" TO "${role}"`);
    await client.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    for (const table of allowed) await client.query(`GRANT SELECT,INSERT ON public."${table}" TO "${role}"`);
    await client.query(`GRANT INSERT,SELECT(id) ON public."AuditLog" TO "${role}"`);
    await client.query(`GRANT SELECT(migration_name,checksum,finished_at,rolled_back_at) ON public._prisma_migrations TO "${role}"`);
    assert.ok(!(await inspectCatalogRole(client, role)).login);
    // Reproduce a managed operator: CREATEROLE + ADMIN OPTION, no superuser or
    // parameter ACL. It can administer the target without being able to SET
    // log_statement, even though that setting already has its safe default.
    await client.query(`CREATE ROLE "${operator}" NOLOGIN NOSUPERUSER CREATEROLE NOCREATEDB NOINHERIT`); operatorCreated = true;
    await client.query(`GRANT "${role}" TO "${operator}" WITH ADMIN OPTION`);
    await client.query('BEGIN READ ONLY');
    await client.query(`SET LOCAL ROLE "${operator}"`);
    const logging = await inspectCredentialLogging(client);
    assert.ok(logging.originalFirstBlocker?.control === 'log_statement');
    assert.ok(logging.originalFirstBlocker?.reason === 'SET_NOT_AUTHORIZED');
    assert.ok(logging.controls[0]?.alreadyProtected && !logging.controls[0]?.canSet);
    await assert.rejects(initializeNoLoginRole(client, password, role), error =>
      error instanceof Error && error.message === 'BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE'
      && Reflect.get(error, 'blocker')?.control === 'log_statement');
    // The original, non-sensitive SET itself fails with PostgreSQL SQLSTATE
    // 42501. No credential has been computed or sent on this path.
    await assert.rejects(client.query("SELECT set_config('log_statement','none',true)"), error =>
      error instanceof Error && Reflect.get(error, 'code') === '42501');
    await client.query('ROLLBACK');
    const untouched = (await client.query('SELECT NOT rolcanlogin AND rolpassword IS NULL AS untouched FROM pg_authid WHERE rolname=$1', [role])).rows[0];
    assert.ok(untouched?.untouched);
    console.log('PASS: CREATEROLE/ADMIN is not SET authorization; read-only diagnosis identifies log_statement, with no credential mutation.');
    // Existing data, tables and history must remain unchanged throughout.
    const before = (await client.query(`SELECT (SELECT count(*) FROM "Tool") AS tools,
      (SELECT count(*) FROM "User") AS users,(SELECT count(*) FROM _prisma_migrations) AS migrations`)).rows;
    await client.query('BEGIN');
    await client.query("SELECT set_config('pgaudit.log','read',true)");
    await assert.rejects(protectCredentialStatement(client), /^Error: BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE$/);
    await client.query('ROLLBACK');
    console.log('PASS: active audit configuration is refused rather than disabled.');
    await client.query('BEGIN');
    await initializeNoLoginRole(client, password, role);
    await client.query('ROLLBACK');
    assert.ok(!(await inspectCatalogRole(client, role)).login);
    console.log('PASS: operator inspection and rollback preserve the existing NOLOGIN role.');

    await client.query('BEGIN');
    await initializeNoLoginRole(client, password, role);
    await client.query('COMMIT');
    const probe = await connectAsCatalog();
    try {
      assert.ok((await inspectCatalogRole(probe, role)).login);
      console.log('PASS: real PostgreSQL SCRAM authentication and minimum effective privileges.');
      await probe.query('BEGIN');
      await assert.rejects(protectCredentialStatement(probe), /^Error: BOOTSTRAP_LOG_PROTECTION_UNAVAILABLE$/);
      await probe.query('ROLLBACK');
      console.log('PASS: insufficient logging privileges stop before any credential binding.');
      await client.query(`ALTER ROLE "${role}" NOLOGIN`);
      await probe.query('BEGIN');
      await assert.rejects(initializeNoLoginRole(probe, password, role), /^Error: BOOTSTRAP_OPERATOR_CANNOT_ALTER_ROLE$/);
      await probe.query('ROLLBACK');
      await client.query(`ALTER ROLE "${role}" LOGIN`);
      console.log('PASS: an unprivileged operator cannot initialize a NOLOGIN role.');
    } finally { await probe.end(); }

    await client.query('BEGIN');
    await assert.rejects(initializeNoLoginRole(client, randomBytes(48).toString('base64url'), role), /^Error: BOOTSTRAP_ALREADY_LOGIN_NO_ROTATION$/);
    await client.query('ROLLBACK');
    const unchanged = await connectAsCatalog(); await unchanged.end();
    console.log('PASS: existing LOGIN/password is never rotated.');
    const after = (await client.query(`SELECT (SELECT count(*) FROM "Tool") AS tools,
      (SELECT count(*) FROM "User") AS users,(SELECT count(*) FROM _prisma_migrations) AS migrations`)).rows;
    assert.ok(JSON.stringify(before) === JSON.stringify(after));
    console.log('PASS: zero table writes or migration changes; no access to Neon.');
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    if (created) { await client.query(`DROP OWNED BY "${role}"`); await client.query(`DROP ROLE "${role}"`); }
    if (operatorCreated) await client.query(`DROP ROLE "${operator}"`);
    await client.end();
  }
}
main().catch(() => { console.error('Isolated bootstrap regression failed; private values withheld.'); process.exitCode = 1; });
