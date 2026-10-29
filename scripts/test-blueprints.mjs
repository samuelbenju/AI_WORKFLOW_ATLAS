import { withTestDatabase } from './test-database.mjs';
import { spawn } from 'node:child_process';
try {
  const target = new URL(process.env.TEST_DATABASE_URL ?? '');
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.endsWith('_test')) throw Error();
  await withTestDatabase(url => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--conditions=react-server', '--import', 'tsx', '--test', 'tests/integration/blueprint-storage.test.ts', 'tests/integration/blueprints.test.ts'], {
      stdio: 'inherit', env: { ...process.env, DATABASE_URL: url, TEST_DATABASE_URL: url, ADSENSE_ENABLED: 'false', GA4_MODE: 'disabled', ANALYTICS_ENABLED: 'false' },
    });
    child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(Error()));
  }));
} catch { console.error('Isolated blueprint tests failed; private configuration withheld.'); process.exitCode = 1; }
