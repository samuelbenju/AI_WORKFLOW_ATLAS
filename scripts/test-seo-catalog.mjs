import { withTestDatabase } from './test-database.mjs';
import { spawn } from 'node:child_process';
let target;
try{target=new URL(process.env.TEST_DATABASE_URL??'');}catch{throw Error('Local isolated PostgreSQL configuration required.');}
if(!['127.0.0.1','localhost'].includes(target.hostname)||!target.pathname.endsWith('_test'))throw Error('Local isolated PostgreSQL required.');
try{await withTestDatabase(async url=>{
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--conditions=react-server','--import','tsx','--test','--test-concurrency=1','tests/integration/seo-catalog.test.ts'],{
      stdio:'inherit',env:{...process.env,DATABASE_URL:url,ADSENSE_ENABLED:'false',ATLAS_ISOLATED_E2E:'true'},
    });
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Isolated SEO regression failed.')));
  });
});}catch{console.error('Isolated SEO validation failed; connection details withheld.');process.exitCode=1;}
