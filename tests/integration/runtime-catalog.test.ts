import {test,after,before} from 'node:test';
import {strict as assert} from 'node:assert';
import pg from 'pg';
import {chromium} from '@playwright/test';
import {createDatabaseClient} from '../../src/server/db/client';
import {homeCatalog,queryTools,queryWorkflows,getCatalogFacets} from '../../src/server/data/public-catalog';
import {databaseDiagnostic,DatabaseOperationError} from '../../src/lib/database-diagnostics';
import {readiness} from '../../src/server/ops/readiness';
import {withAppServer} from '../e2e/test-server';

const url=process.env.DATABASE_URL!,ownerUrl=process.env.ATLAS_RUNTIME_TEST_OWNER_URL!,role=process.env.ATLAS_RUNTIME_TEST_ROLE!;
if(!url||!ownerUrl||!new URL(url).pathname.endsWith('_test')||!/^atlas_runtime_[a-f0-9]{16}$/.test(role))throw Error('Use the isolated runtime runner');
const db=createDatabaseClient(url),owner=new pg.Client({connectionString:ownerUrl});before(()=>owner.connect());after(async()=>{await db.$disconnect();await owner.end();});
const query={q:'',sort:'recent' as const,page:1};

test('empty public queries work with a read-only runtime role and no access to migration history',async()=>{
 const access=await db.$queryRaw<{read_only:string;schema_write:boolean;history_read:boolean}[]>`SELECT current_setting('transaction_read_only') AS read_only,has_schema_privilege(current_user,'public','CREATE') AS schema_write,has_table_privilege(current_user,'public._prisma_migrations','SELECT') AS history_read`;
 assert.equal(access[0]?.read_only,'on');assert.equal(access[0]?.schema_write,false);assert.equal(access[0]?.history_read,false);
 assert.deepEqual(await homeCatalog('published',db),{tools:[],workflows:[],articles:[],categories:[]});
 for(const result of [await queryTools(query,'published',db),await queryWorkflows(query,'published',db)]){assert.equal(result.total,0);assert.deepEqual(result.items,[]);assert.equal(result.pageCount,0);}
 for(const kind of ['tools','use-cases'] as const)assert.deepEqual(await getCatalogFacets(kind,'published',db),{categories:[],tags:[]});
 assert.equal((await readiness(db,{catalog:true})).catalogVerified,true);
});

test('missing connection configuration is diagnosed inside the catalog boundary',async()=>{
 const previous=process.env.DATABASE_URL,original=console.error,logs:unknown[]=[];
 console.error=(value:unknown)=>{logs.push(value);};process.env.DATABASE_URL='private-invalid-connection-value';
 try{await assert.rejects(homeCatalog('published'),(error:unknown)=>{assert.ok(error instanceof DatabaseOperationError);assert.equal(error.diagnostic.stage,'database.configure');assert.deepEqual(error.diagnostic.codes,['DATABASE_URL_INVALID']);assert.match(error.message,/catalog is temporarily unavailable/);return true;});assert.ok(logs.length>0);assert.ok(!JSON.stringify(logs).includes('private-invalid-connection-value'));}
 finally{console.error=original;if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;}
});

test('missing implicit join permission still throws and logs only stage plus allowlisted codes',async()=>{
 const logs:unknown[][]=[],original=console.error;console.error=(...args:unknown[])=>{logs.push(args);};
 try{
  await owner.query(`REVOKE SELECT ON TABLE public."_CategoryToTool" FROM "${role}"`);
  await assert.rejects(homeCatalog('published',db),(error:unknown)=>{
   assert.ok(error instanceof DatabaseOperationError);assert.match(error.message,/catalog is temporarily unavailable/);assert.equal(error.cause,undefined);
   const d=databaseDiagnostic(error,'database.unknown');assert.equal(d.stage,'catalog.home');assert.ok(d.codes.includes('42501'));return true;
  });
  assert.ok(logs.length>0);
  for(const entry of logs){if(/^\(node:\d+\) DeprecationWarning: Calling client\.query\(\)/.test(String(entry[0])))continue;assert.equal(entry.length,1);const diagnostic=JSON.parse(String(entry[0]));assert.deepEqual(Object.keys(diagnostic).sort(),['codes','stage']);}
  const output=JSON.stringify(logs);for(const value of [url,ownerUrl,role,process.env.ATLAS_RUNTIME_TEST_PASSWORD!,'_CategoryToTool'])assert.ok(!output.includes(value));
 }finally{console.error=original;await owner.query(`GRANT SELECT ON TABLE public."_CategoryToTool" TO "${role}"`);}
 assert.equal((await homeCatalog('published',db)).tools.length,0);
});

test('production HTTP serves normal empty pages and keeps detailed readiness private',async()=>{
 const token='runtime-fixture-monitor-token-'.repeat(3);
 await withAppServer({DATABASE_URL:url,CATALOG_DEMO_MODE:'false',OPS_MONITOR_TOKEN:token,OPS_EXPECT_WORKER:'false',NEWSLETTER_MODE:'disabled',ANALYTICS_ENABLED:'false',AGENTS_ENABLED:'false'},async origin=>{
  for(const [path,text] of [['/','The toolkit is taking shape.'],['/tools','No tools match just yet.'],['/use-cases','No workflows match just yet.']]){
   const response=await fetch(origin+path),body=await response.text();assert.equal(response.status,200);assert.ok(body.includes(text!));assert.ok(!body.includes('The atlas is temporarily unavailable.'));
  }
  assert.equal((await fetch(origin+'/api/internal/readiness?catalog=1')).status,401);
  let response=await fetch(origin+'/api/internal/readiness?catalog=1',{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,200);assert.equal((await response.json()).catalogVerified,true);
  await owner.query(`REVOKE SELECT ON TABLE public."_CategoryToTool" FROM "${role}"`);
  try{
   response=await fetch(origin+'/api/internal/readiness?catalog=1',{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,503);const result=await response.json();assert.equal(result.diagnostic.stage,'catalog.home');assert.ok(result.diagnostic.codes.includes('42501'));
   const body=JSON.stringify(result);assert.ok(!body.includes(role)&&!body.includes('_CategoryToTool')&&!body.includes(url));
   const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
   try{const page=await browser.newPage();await page.goto(origin+'/tools');await page.getByRole('heading',{name:'The atlas is temporarily unavailable.',exact:true}).waitFor();assert.equal(await page.getByText('No tools match just yet.',{exact:true}).count(),0);}finally{await browser.close();}
  }finally{await owner.query(`GRANT SELECT ON TABLE public."_CategoryToTool" TO "${role}"`);}
 });
});
