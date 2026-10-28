// Lab profiling only: creates its own local test DB, never accepts a site URL.
import { withTestDatabase } from './test-database.mjs';
import { spawn } from 'node:child_process';
let target;
try{target=new URL(process.env.TEST_DATABASE_URL??'');}catch{throw Error('Local test infrastructure required.');}
if (!['127.0.0.1','localhost'].includes(target.hostname) || !target.pathname.endsWith('_test')) throw Error('Local test infrastructure required.');
const label = process.argv[2];
if (!['before','after'].includes(label)) throw Error('Choose before or after.');
try{await withTestDatabase(async url => {
  await new Promise((resolve,reject) => {
    const child = spawn(process.execPath,['--conditions=react-server','--import','tsx','scripts/profile-public.ts',label],{
      stdio:'inherit',env:{...process.env,ATLAS_PROFILE_DATABASE_URL:url},
    });
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Isolated profile failed.')));
  });
});}catch{console.error('Isolated profiling failed; connection details withheld.');process.exitCode=1;}
