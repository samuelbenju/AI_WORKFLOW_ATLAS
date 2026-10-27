// Only isolated loopback PostgreSQL; no Neon credentials are accepted here.
import { withTestDatabase } from './test-database.mjs';
import { spawn } from 'node:child_process';
const target = new URL(process.env.TEST_DATABASE_URL ?? '');
if (!['127.0.0.1','localhost'].includes(target.hostname) || !target.pathname.endsWith('_test')) {
  throw Error('Bootstrap integration requires an isolated local test database.');
}
await withTestDatabase(async url => {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tests/integration/catalog-bootstrap.ts'], {
      env: { ...process.env, ATLAS_BOOTSTRAP_TEST_URL: url }, stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(Error('Isolated bootstrap checks failed.')));
  });
});
