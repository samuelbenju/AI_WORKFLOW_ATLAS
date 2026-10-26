import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { validateLibrary } from '../src/lib/catalog-import';
import { applyImport, planImport, CatalogImportFailure, type ImportPlan } from '../src/server/catalog-import/service';
import { catalog, completeHistory, verifyManifest } from './neon-staging';
import { stagingConfiguration, stagingIdentity, stagingTarget } from './staging-connection';
import { assertCatalogPrivileges } from './catalog-privileges';
import { databaseDiagnostic } from '../src/lib/database-diagnostics';

const guardCodes = new Set(['IMPORT_ACTION_REJECTED','IMPORT_WORKFLOW_OR_TARGET_REJECTED','STAGING_CONFIGURATION_MISSING','STAGING_CONFIGURATION_INVALID','STAGING_DESTINATION_REJECTED','STAGING_TLS_REJECTED','STAGING_IDENTITY_OR_PRIVILEGES_REJECTED','IMPORT_MIGRATION_HISTORY_OR_SCHEMA_REJECTED','IMPORT_PRIVILEGES_REJECTED','IMPORT_ALREADY_RUNNING','IMPORT_DRY_RUN_REJECTED','IMPORT_PLAN_CHANGED_OR_REJECTED','WRONG_IMPORT_DATABASE','STALE_OR_FUTURE_SOURCE','SOURCE_NOT_VERIFIED','WRONG_PRODUCT_SOURCE','UNKNOWN_TAXONOMY','UNVERIFIED_REFERENCE']);

async function main() {
  let stage = 'manifest', connection: pg.Client | undefined, db: PrismaClient | undefined;
  try {
    const action = process.argv[2];
    if (!['validate', 'dry-run', 'apply'].includes(action ?? '')) throw Error('IMPORT_ACTION_REJECTED');
    const raw = await readFile('data/catalog/library.json', 'utf8');
    const evidence = JSON.parse(await readFile('data/catalog/research.json', 'utf8'));
    const library = validateLibrary(JSON.parse(raw), evidence.findings);
    if (action === 'validate') { console.log(JSON.stringify({ valid: true, tools: library.tools.length, useCases: library.useCases.length, articleDrafts: library.articles.length, categories: library.categories.length, tags: library.tags.length })); return; }
    stage = 'workflow guards';
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (process.env.GITHUB_REPOSITORY !== 'samuelbenju/AI_WORKFLOW_ATLAS' || process.env.GITHUB_REF !== 'refs/heads/main' || process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
      || commit !== process.env.GITHUB_SHA || process.env.CATALOG_CONFIRM_TARGET !== stagingTarget) throw Error('IMPORT_WORKFLOW_OR_TARGET_REJECTED');
    const cfg = stagingConfiguration(process.env.CATALOG_DATABASE_URL, ['atlas_staging_catalog'], process.env.NEON_STAGING_EXPECTED_HOST);
    stage = 'TLS and restricted identity';
    connection = new pg.Client(cfg.client); connection.on('error', () => { console.error(JSON.stringify({ stage: 'catalog.import.connection', codes: ['CONNECTION_INTERRUPTED'] })); process.exitCode = 1; });
    await connection.connect(); await stagingIdentity(connection, cfg.role);
    await connection.query('SET default_transaction_read_only=on');
    stage = 'migration history and schema';
    const manifest = await verifyManifest();
    const history = (await connection.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name')).rows;
    if (!completeHistory(history, manifest) || JSON.stringify(await catalog(connection)) !== JSON.stringify(manifest.structure)) throw Error('IMPORT_MIGRATION_HISTORY_OR_SCHEMA_REJECTED');
    // Import role has INSERT/SELECT only on the catalog. Never owner/migrator.
    await assertCatalogPrivileges(connection);
    // One session lock, same connection retained to release it on disconnect.
    const { rows: [lock] } = await connection.query('SELECT pg_try_advisory_lock(48183725) AS acquired');
    if (!lock.acquired) throw Error('IMPORT_ALREADY_RUNNING');
    db = new PrismaClient({ adapter: new PrismaPg({ ...cfg.client, max: 1, ...(action === 'dry-run' ? { options: cfg.client.options + ' -c default_transaction_read_only=on' } : {}) }, {
      onPoolError: error => { console.error(JSON.stringify(databaseDiagnostic(error, 'database.pool'))); process.exitCode = 1; },
      onConnectionError: error => { console.error(JSON.stringify(databaseDiagnostic(error, 'database.connection'))); process.exitCode = 1; },
    }), log: [] });
    stage = 'read-only import plan';
    const plan = await planImport(db, library, 'atlas_staging');
    const fileHash = createHash('sha256').update(raw).digest('hex');
    const report: { version: number; mode: string; commit: string; createdAt: string; fileHash: string; target: string; plan: ImportPlan; result?: Awaited<ReturnType<typeof applyImport>> } = { version: 1, mode: action!, commit, createdAt: new Date().toISOString(), fileHash, target: stagingTarget, plan };
    if (plan.rejected) process.exitCode = 1;
    if (action === 'apply' && !plan.rejected) {
      stage = 'approved dry-run verification';
      const approved = JSON.parse(await readFile('.cache/catalog-approved/plan.json', 'utf8')) as typeof report;
      const age = Date.now() - Date.parse(approved.createdAt);
      if (approved.version !== 1 || approved.mode !== 'dry-run' || approved.commit !== commit || approved.fileHash !== fileHash || approved.target !== stagingTarget || !Number.isFinite(age) || age < 0 || age > 86400000) throw Error('IMPORT_DRY_RUN_REJECTED');
      stage = 'atomic catalog batches';
      report.result = await applyImport(db, library, 'atlas_staging', approved.plan, 5);
    }
    await mkdir('.cache/catalog-report', { recursive: true });
    await writeFile('.cache/catalog-report/plan.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    const safe = { mode: action, commit, manifest: library.id, proposed: { created: plan.created, skipped: plan.skipped, updated: 0, rejected: plan.rejected }, ...(plan.rejected ? { conflicts: plan.actions.filter(a => a.action === 'REJECT_CONFLICT').map(a => ({ kind: a.kind, slug: a.slug })) } : {}), ...(report.result ? { result: report.result } : {}) };
    console.log(JSON.stringify(safe, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Catalog ${action}\n\n\`\`\`json\n${JSON.stringify(safe, null, 2)}\n\`\`\`\n`);
  } catch (error) {
    // Stage is fixed by code; diagnostic codes are allowlisted. No SQL, raw
    // message, stack, connection values or database content is logged.
    const codes = error instanceof CatalogImportFailure ? error.codes : error instanceof Error && guardCodes.has(error.message) ? [error.message] : databaseDiagnostic(error, 'database.unknown').codes;
    console.error(JSON.stringify({ stage: `catalog.import.${stage}`, codes, ...(error instanceof CatalogImportFailure ? { committedBeforeFailure: error.created } : {}) })); process.exitCode = 1;
  } finally {
    await db?.$disconnect().catch(() => { process.exitCode = 1; });
    await connection?.end().catch(() => { process.exitCode = 1; });
  }
}
void main();
