import { withTestDatabase } from './test-database.mjs';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import path from 'node:path';
try {
  const { values } = parseArgs({ options: { 'private-package': { type: 'string' } }, strict: true });
  if (values['private-package'] && !path.isAbsolute(values['private-package'])) throw Error();
  const target = new URL(process.env.TEST_DATABASE_URL ?? '');
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.endsWith('_test')) throw Error();
  const batches = [['tests/integration/blueprint-package.test.ts', 'tests/integration/blueprint-storage.test.ts', 'tests/integration/blueprints.test.ts'], ['tests/integration/blueprint-ui.test.ts']];
  if (values['private-package']) batches.push(['tests/integration/blueprint-private-package.test.ts']);
  for (const files of batches) {
  await withTestDatabase(url => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--conditions=react-server', '--import', 'tsx', '--test', ...files], {
      stdio: 'inherit', env: { ...process.env, DATABASE_URL: url, TEST_DATABASE_URL: url, ADSENSE_ENABLED: 'false', GA4_MODE: 'disabled', ANALYTICS_ENABLED: 'false',
        ATLAS_PRIVATE_PACKAGE_DIRECTORY: values['private-package'] ?? '' },
    });
    child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(Error()));
  }));
  }
} catch { console.error('Isolated blueprint tests failed; private configuration withheld.'); process.exitCode = 1; }
