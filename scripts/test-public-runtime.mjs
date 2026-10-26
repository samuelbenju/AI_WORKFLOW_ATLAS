import {withTestDatabase} from './test-database.mjs';
import pg from 'pg';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
const root=new URL(process.env.TEST_DATABASE_URL??'');
if(!root.pathname.endsWith('_test'))throw Error('Use a dedicated test database, never staging');
const role=`atlas_runtime_${randomBytes(8).toString('hex')}`,password=randomBytes(24).toString('hex');
const admin=new pg.Client({connectionString:root.toString()});let created=false;
async function main(){
 await admin.connect();
 try{
  await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);created=true;
  await withTestDatabase(async url=>{
   const owner=new pg.Client({connectionString:url});await owner.connect();
   try{
    const name=new URL(url).pathname.slice(1);
    await owner.query(`GRANT CONNECT ON DATABASE "${name}" TO "${role}"`);
    await owner.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    const tables=(await owner.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'`)).rows;
    for(const table of tables)await owner.query(`GRANT SELECT ON TABLE public."${table.tablename.replaceAll('"','""')}" TO "${role}"`);
    await owner.query(`ALTER ROLE "${role}" IN DATABASE "${name}" SET default_transaction_read_only=on`);
   }finally{await owner.end();}
   const runtime=new URL(url);runtime.username=role;runtime.password=password;
   await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--conditions=react-server','--import','tsx','--test','--test-concurrency=1','tests/integration/runtime-catalog.test.ts'],{stdio:'inherit',env:{...process.env,DATABASE_URL:runtime.toString(),ATLAS_RUNTIME_TEST_OWNER_URL:url,ATLAS_RUNTIME_TEST_ROLE:role,ATLAS_RUNTIME_TEST_PASSWORD:password,CATALOG_DEMO_MODE:'false',AGENTS_ENABLED:'false',AGENTS_MONTHLY_BUDGET_USD_MICROS:'0',WOMPI_SANDBOX_ENABLED:'false',NEWSLETTER_MODE:'disabled',ANALYTICS_ENABLED:'false',SEO_INDEXING_ENABLED:'false',LEGAL_REVIEW_CONFIRMED:'false'}});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Runtime catalog regression failed')));
   });
  });
 }finally{
  if(created)await admin.query(`DROP ROLE "${role}"`);
  await admin.end();
 }
}
main().catch(()=>{console.error('Isolated runtime tests failed; private connection values withheld.');process.exitCode=1;});
