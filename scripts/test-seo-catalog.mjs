import { withTestDatabase } from './test-database.mjs';
import { spawn } from 'node:child_process';
let target;
try{target=new URL(process.env.TEST_DATABASE_URL??'');}catch{throw Error('Local isolated PostgreSQL configuration required.');}
if(!['127.0.0.1','localhost'].includes(target.hostname)||!target.pathname.endsWith('_test'))throw Error('Local isolated PostgreSQL required.');
try{await withTestDatabase(async url=>{
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--conditions=react-server','--import','tsx','--test','--test-concurrency=1','tests/integration/seo-catalog.test.ts'],{
      stdio:['ignore','pipe','pipe'],env:{...process.env,DATABASE_URL:url,ADSENSE_ENABLED:'false',ATLAS_ISOLATED_E2E:'true'},
    });
    let diagnostics='';
    for(const [stream,output] of [[child.stdout,process.stdout],[child.stderr,process.stderr]])stream.on('data',chunk=>{
      output.write(chunk);diagnostics=(diagnostics+chunk.toString()).slice(-262144);
    });
    child.once('error',reject);child.once('close',code=>{
      if(code===0)return resolve();
      // Public CI annotations contain only a fixed file and numeric location.
      // No messages, expected/actual values, URLs, cookies or environment data.
      if(process.env.GITHUB_ACTIONS==='true'){
        const lines=[...new Set([...diagnostics.matchAll(/tests\/integration\/seo-catalog\.test\.ts:(\d+):\d+/g)].map(m=>m[1]))];
        for(const line of lines.slice(0,6))process.stdout.write(`::warning file=tests/integration/seo-catalog.test.ts,line=${line}::SEO regression failed near test source line ${line}. Inspect the authenticated job log for details.\n`);
      }
      reject(Error('Isolated SEO regression failed.'));
    });
  });
});}catch{console.error('Isolated SEO validation failed; connection details withheld.');process.exitCode=1;}
