import { withTestDatabase } from './test-database.mjs';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import pg from 'pg';
const key = randomBytes(8).toString('hex');
const roles = [`atlas_catalog_${key}`, `atlas_reader_${key}`];
const passwords = roles.map(() => randomBytes(24).toString('hex'));
const tables = ['Tool','Category','Tag','UseCase','Article','_CategoryToTool','_TagToTool','_CategoryToUseCase','_TagToUseCase','_ToolToUseCase','_ArticleToCategory','_ArticleToTag','_ArticleToTool'];
async function main() {
  const admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL }); let made = 0;
  // Use the existing isolated DB guard before creating any test roles.
  await withTestDatabase(async url => {
    await admin.connect();
    const owner = new pg.Client({ connectionString: url }); await owner.connect();
    try {
      for (let i = 0; i < roles.length; i++) {
        await admin.query(`CREATE ROLE "${roles[i]}" LOGIN PASSWORD '${passwords[i]}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`); made++;
        await owner.query(`GRANT CONNECT ON DATABASE "${new URL(url).pathname.slice(1)}" TO "${roles[i]}"`);
        await owner.query(`GRANT USAGE ON SCHEMA public TO "${roles[i]}"`);
      }
      for (const table of tables) await owner.query(`GRANT SELECT, INSERT ON TABLE public."${table}" TO "${roles[0]}"`);
      await owner.query(`GRANT INSERT, SELECT (id) ON TABLE public."AuditLog" TO "${roles[0]}"`);
      await owner.query(`GRANT SELECT (migration_name,checksum,finished_at,rolled_back_at) ON TABLE public._prisma_migrations TO "${roles[0]}"`);
      await owner.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${roles[1]}"`);
      await owner.query(`ALTER ROLE "${roles[1]}" IN DATABASE "${new URL(url).pathname.slice(1)}" SET default_transaction_read_only=on`);
      const urls = roles.map((role, i) => { const value = new URL(url); value.username = role; value.password = passwords[i]; return value.toString(); });
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['--conditions=react-server','--import','tsx','--test','--test-concurrency=1','tests/integration/catalog-import.test.ts'], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url, ATLAS_CATALOG_IMPORT_TEST_URL: urls[0], ATLAS_CATALOG_PUBLIC_TEST_URL: urls[1], CATALOG_DEMO_MODE: 'false', AGENTS_ENABLED: 'false', AGENTS_MONTHLY_BUDGET_USD_MICROS: '0', WOMPI_SANDBOX_ENABLED: 'false', NEWSLETTER_MODE: 'disabled', ANALYTICS_ENABLED: 'false', GA4_MODE: 'disabled', SEO_INDEXING_ENABLED: 'false', LEGAL_REVIEW_CONFIRMED: 'false', OPS_EXPECT_WORKER: 'false' } });
        child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(Error('Isolated catalog checks failed')));
      });
    } finally {
      await owner.end();
      // Roles are dropped after their own temporary database is removed below.
    }
  }).finally(async () => {
    for (const role of roles.slice(0, made)) await admin.query(`DROP ROLE "${role}"`);
    if (made) await admin.end();
  });
}
main().catch(() => { console.error('Catalog tests failed; private connection values withheld.'); process.exitCode = 1; });
