import {test,after,before} from 'node:test';
import {strict as assert} from 'node:assert';
import {randomUUID} from 'node:crypto';
import {createConnection,type Socket} from 'node:net';
import {once} from 'node:events';
import pg from 'pg';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../../src/generated/prisma/client';
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

test('published fixture content and relationships survive concurrent read-only catalog batches',async()=>{
 const writer=createDatabaseClient(ownerUrl);
 const ids={category:randomUUID(),tag:randomUUID(),tool:randomUUID(),workflow:randomUUID()};
 const suffix=randomUUID(),publishedAt=new Date(Date.now()-1000);
 try{
  await writer.category.create({data:{id:ids.category,slug:`runtime-${suffix}`,name:'Isolated runtime category'}});
  await writer.tag.create({data:{id:ids.tag,slug:`runtime-${suffix}`,name:'Isolated runtime tag'}});
  await writer.tool.create({data:{id:ids.tool,slug:`runtime-${suffix}`,name:'Isolated published tool',summary:'Runtime fixture, not a real tool.',description:'Temporary database fixture.',websiteUrl:'https://example.invalid',status:'PUBLISHED',publishedAt,featured:true,categories:{connect:{id:ids.category}},tags:{connect:{id:ids.tag}}}});
  await writer.useCase.create({data:{id:ids.workflow,slug:`runtime-${suffix}`,title:'Isolated published workflow',problem:'Runtime fixture.',solution:'Test fixture only.',instructions:[],references:[],limitations:'Not a real automation.',status:'PUBLISHED',publishedAt,featured:true,tools:{connect:{id:ids.tool}},categories:{connect:{id:ids.category}},tags:{connect:{id:ids.tag}}}});
  for(const sort of ['recent','name','name-desc'] as const)for(const page of [1,2,999])for(const q of ['','fixture',"%' OR TRUE --"]){
   const filters={q,sort,page,category:`runtime-${suffix}`,tag:`runtime-${suffix}`};
   const tools=await queryTools(filters,'published',db),workflows=await queryWorkflows({...filters,difficulty:'BEGINNER'},'published',db);
   const expected=q!=="%' OR TRUE --";
   // Search uses public card fields for tools and title/problem/solution for guides.
   assert.equal(tools.total,expected?1:0);assert.equal(workflows.total,q=== "%' OR TRUE --"?0:1);
   assert.equal(tools.items.length,page===1&&expected?1:0);assert.equal(workflows.items.length,page===1&&q!=="%' OR TRUE --"?1:0);
   if(workflows.items.length){assert.equal(workflows.items[0]?.categories[0]?.slug,filters.category);assert.equal(workflows.items[0]?.tags[0]?.slug,filters.tag);}
  }
  const home=await homeCatalog('published',db);
  assert.equal(home.tools[0]?.id,ids.tool);assert.equal(home.workflows[0]?.id,ids.workflow);
  assert.equal(home.tools[0]?.categories[0]?.slug,`runtime-${suffix}`);assert.equal(home.tools[0]?.tags[0]?.slug,`runtime-${suffix}`);
  const results=await Promise.all(Array.from({length:8},async()=>{
   const [tools,workflows,facets]=await Promise.all([queryTools(query,'published',db),queryWorkflows(query,'published',db),getCatalogFacets('tools','published',db)]);
   assert.equal(tools.total,1);assert.equal(workflows.total,1);assert.equal(facets.categories[0]?.count,1);return true;
  }));assert.equal(results.length,8);
 }finally{
  await writer.useCase.deleteMany({where:{id:ids.workflow}});await writer.tool.deleteMany({where:{id:ids.tool}});
  await writer.category.deleteMany({where:{id:ids.category}});await writer.tag.deleteMany({where:{id:ids.tag}});await writer.$disconnect();
 }
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

test('real batch pool exhaustion is distinguished from an execution expiry and recovers after release',async()=>{
 const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
 const constrained=new PrismaClient({adapter:new PrismaPg(pool),log:[]});
 const held:pg.PoolClient[]=[];
 try{
  try{
   for(let index=0;index<5;index++)held.push(await pool.connect());
   await assert.rejects(homeCatalog('published',constrained),(error:unknown)=>{
    assert.ok(error instanceof DatabaseOperationError);
    assert.deepEqual(error.diagnostic,{stage:'catalog.home',codes:['P2028','TRANSACTION_START_TIMEOUT']});
    assert.equal(error.cause,undefined);return true;
   });
  }finally{held.forEach(client=>client.release());}
  assert.equal((await homeCatalog('published',constrained)).tools.length,0);
 }finally{await constrained.$disconnect();await pool.end();}
});

test('real catalog SQL blocked past the default batch deadline is diagnosed as execution expiry',async()=>{
 await owner.query('BEGIN');await owner.query('LOCK TABLE "Tool" IN ACCESS EXCLUSIVE MODE');
 let unlockError:unknown;
 const release=setTimeout(()=>{void owner.query('ROLLBACK').catch(error=>{unlockError=error;});},6000);
 try{
  await assert.rejects(homeCatalog('published',db),(error:unknown)=>{
   assert.ok(error instanceof DatabaseOperationError);
   assert.deepEqual(error.diagnostic,{stage:'catalog.home',codes:['P2028','TRANSACTION_EXECUTION_TIMEOUT']});
   assert.equal(error.cause,undefined);return true;
  });
 }finally{clearTimeout(release);await owner.query('ROLLBACK');}
 if(unlockError)throw unlockError;
 assert.equal((await homeCatalog('published',db)).tools.length,0);
});

test('an interrupted owned catalog connection throws safely and a later request reconnects',async()=>{
 if(!['127.0.0.1','localhost','[::1]'].includes(new URL(ownerUrl).hostname))throw Error('Connection interruption tests require loopback PostgreSQL');
 const application=`runtime-interrupt-${randomUUID()}`;
 const pool=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,application_name:application});
 const interrupted=new PrismaClient({adapter:new PrismaPg(pool),log:[]});
 let pending:Promise<{error?:unknown;unexpectedSuccess?:boolean}>|undefined;
 try{
  await owner.query('BEGIN');await owner.query('LOCK TABLE "Tool" IN ACCESS EXCLUSIVE MODE');
  pending=homeCatalog('published',interrupted).then(()=>({unexpectedSuccess:true}),error=>({error}));
  let pid:number|undefined;
  for(let attempt=0;attempt<100;attempt++){
   await owner.query('SELECT pg_stat_clear_snapshot()');
   const rows=(await owner.query("SELECT pid FROM pg_stat_activity WHERE application_name=$1 AND datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()",[application])).rows;
   assert.ok(rows.length<=1);if(rows.length===1){pid=rows[0].pid;break;}
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  assert.ok(pid&&Number.isInteger(pid));
  assert.equal((await owner.query('SELECT pg_terminate_backend($1) AS terminated',[pid])).rows[0]?.terminated,true);
  const outcome=await pending;assert.ok(outcome.error instanceof DatabaseOperationError);assert.equal(outcome.unexpectedSuccess,undefined);
  assert.equal(outcome.error.diagnostic.stage,'catalog.home');assert.equal(outcome.error.cause,undefined);
  const diagnostic=JSON.stringify(outcome.error.diagnostic);assert.ok(!diagnostic.includes(url)&&!diagnostic.includes(application));
  await owner.query('ROLLBACK');assert.equal((await homeCatalog('published',interrupted)).tools.length,0);
 }finally{await owner.query('ROLLBACK');if(pending)await pending;await interrupted.$disconnect();await pool.end();}
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
   try{const page=await browser.newPage();for(const route of ['/tools','/use-cases?q=presentation']){const response=await page.goto(origin+route);await page.getByRole('heading',{name:'The atlas is temporarily unavailable.',exact:true}).waitFor();assert.ok(response&&[200,500,503].includes(response.status()));console.log(JSON.stringify({experiment:'catalog-functional-rejection',http:response.status(),catalogUsable:false}));assert.equal(await page.getByText(route.startsWith('/tools')?'No tools match just yet.':'No workflows match just yet.',{exact:true}).count(),0);}}finally{await browser.close();}
  }finally{await owner.query(`GRANT SELECT ON TABLE public."_CategoryToTool" TO "${role}"`);}
 });
});

test('HTTP liveness remains healthy while a disconnected database fails protected readiness',async()=>{
 const token='isolated-database-down-monitor-token-'.repeat(2);
 await withAppServer({DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/unavailable_test',OPS_MONITOR_TOKEN:token,AGENTS_ENABLED:'false',ANALYTICS_ENABLED:'false'},async origin=>{
  const live=await fetch(origin+'/api/health');assert.equal(live.status,200);assert.deepEqual(await live.json(),{status:'ok'});
  assert.equal((await fetch(origin+'/api/internal/readiness?catalog=1')).status,401);
  const response=await fetch(origin+'/api/internal/readiness?catalog=1',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});
  assert.equal(response.status,503);const body=await response.json();assert.equal(body.ok,false);assert.equal(body.diagnostic.stage,'readiness.connection');
  assert.ok(!JSON.stringify(body).includes('postgresql:')&&!JSON.stringify(body).includes(token));
 });
});

test('a stalled readiness alert query respects the HTTP deadline without exposing details',async()=>{
 const token='isolated-readiness-deadline-monitor-token-'.repeat(2);
 await withAppServer({DATABASE_URL:url,OPS_MONITOR_TOKEN:token,OPS_EXPECT_WORKER:'false',AGENTS_ENABLED:'false',ANALYTICS_ENABLED:'false'},async origin=>{
  await owner.query('BEGIN');await owner.query('LOCK TABLE "AgentWorkerHeartbeat" IN ACCESS EXCLUSIVE MODE');
  try{
   assert.equal((await fetch(origin+'/api/health')).status,200);
   const response=await fetch(origin+'/api/internal/readiness',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});
   assert.equal(response.status,503);const body=await response.json();
   assert.deepEqual(body.diagnostic,{stage:'readiness.timeout',codes:['READINESS_TIMEOUT']});
   assert.equal(body.ok,false);assert.ok(!JSON.stringify(body).includes(token));
  }finally{await owner.query('ROLLBACK');}
 });
});

test('an owned isolated server stops within a bounded grace period despite an incomplete HTTP request',async()=>{
 let socket:Socket|undefined,safety:ReturnType<typeof setTimeout>|undefined,callbackFinishedAt=0;
 try{
  await withAppServer({DATABASE_URL:url,AGENTS_ENABLED:'false',ANALYTICS_ENABLED:'false'},async origin=>{
   socket=createConnection({host:'127.0.0.1',port:Number(new URL(origin).port)});socket.on('error',()=>{});await once(socket,'connect');
   socket.write('GET /api/health HTTP/1.1\r\nHost: localhost\r\n');
   assert.equal((await fetch(origin+'/api/health')).status,200);
   callbackFinishedAt=performance.now();safety=setTimeout(()=>socket?.destroy(),7000);
  });
  assert.ok(performance.now()-callbackFinishedAt<4000,'Owned test server cleanup must not consume the E2E test deadline');
 }finally{clearTimeout(safety);socket?.destroy();}
});

test('independent facets tolerate a real pool wait above Prisma start deadline without opening a batch transaction',async()=>{
 const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
 const constrained=new PrismaClient({adapter:new PrismaPg(pool),log:[{emit:'event',level:'query'}]});let queries=0,transactionCommand=false;constrained.$on('query',event=>{queries++;transactionCommand ||= /^(BEGIN|COMMIT|ROLLBACK)/i.test(event.query);});const held:pg.PoolClient[]=[];
 const release=()=>{for(const client of held.splice(0))client.release();};let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  for(let i=0;i<5;i++)held.push(await pool.connect());
  timer=setTimeout(release,2600);const start=performance.now();
  const facets=await getCatalogFacets('tools','published',constrained);
  assert.deepEqual(facets,{categories:[],tags:[]});assert.ok(performance.now()-start>=2000);assert.equal(transactionCommand,false);console.log(JSON.stringify({experiment:'facets-pool-wait',ms:Math.round(performance.now()-start),queries,transactionCommand}));
 }finally{if(timer)clearTimeout(timer);release();await constrained.$disconnect();await pool.end();}
});

test('a real exhausted pg pool reaches its existing 5s queue deadline with a safe specific diagnostic',async()=>{
 const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
 const constrained=new PrismaClient({adapter:new PrismaPg(pool),log:[]});const held:pg.PoolClient[]=[];
 try{
  for(let i=0;i<5;i++)held.push(await pool.connect());
  await assert.rejects(getCatalogFacets('tools','published',constrained),(error:unknown)=>{
    assert.ok(error instanceof DatabaseOperationError);assert.deepEqual(error.diagnostic.codes,['PG_POOL_QUEUE_TIMEOUT']);return true;
  });
 }finally{for(const client of held)client.release();await constrained.$disconnect();await pool.end();}
});

test('directory reads survive 2.6s pool acquisition without a Prisma transaction',async()=>{
 for(const load of [queryTools,queryWorkflows]){
  const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
  const client=new PrismaClient({adapter:new PrismaPg(pool),log:[{emit:'event',level:'query'}]});let statements=0;client.$on('query',()=>statements++);
  const held:pg.PoolClient[]=[];let timer:ReturnType<typeof setTimeout>|undefined;
  try{for(let i=0;i<5;i++)held.push(await pool.connect());timer=setTimeout(()=>{for(const c of held.splice(0))c.release();},2600);
   const start=performance.now();await load({...query,q:'presentation'},'published',client);assert.equal(statements,1);
   console.log(JSON.stringify({experiment:'directory-acquisition',ms:Math.round(performance.now()-start),statements}));
  }finally{if(timer)clearTimeout(timer);for(const c of held)c.release();await client.$disconnect();await pool.end();}
 }
});

test('directory strategy comparison and bounded concurrent search reads on a five-connection pool',async()=>{
 const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
 const client=new PrismaClient({adapter:new PrismaPg(pool),log:[{emit:'event',level:'query'}]});let statements=0;client.$on('query',()=>statements++);
 try{
  const alternatives={batch:()=>client.$transaction([client.useCase.findMany({take:6}),client.useCase.count()],{isolationLevel:'RepeatableRead'}),sequential:async()=>{await client.useCase.findMany({take:6});await client.useCase.count();},parallel:()=>Promise.all([client.useCase.findMany({take:6}),client.useCase.count()]),single:()=>queryWorkflows({...query,q:'presentation'},'published',client)};
  for(const [strategy,load] of Object.entries(alternatives)){
   const start=performance.now(),before=statements;await load();console.log(JSON.stringify({experiment:'directory-strategy',strategy,ms:Math.round(performance.now()-start),statements:statements-before}));
  }
  for(const concurrency of [1,5,10,20]){
   let peakUsed=0,peakPending=0;const sample=()=>{peakUsed=Math.max(peakUsed,pool.totalCount-pool.idleCount);peakPending=Math.max(peakPending,pool.waitingCount);};
   const timer=setInterval(sample,1),start=performance.now(),before=statements;
   try{await Promise.all(Array.from({length:concurrency},async(_,i)=>{const load=i%2?queryTools:queryWorkflows;const result=await load({...query,q:'presentation',category:'absent',tag:'absent',difficulty:'BEGINNER',page:2},'published',client);assert.deepEqual(result,{items:[],total:0,pageCount:0});sample();}));}
   finally{clearInterval(timer);}
   assert.equal(statements-before,concurrency);assert.ok(peakUsed<=5);
   console.log(JSON.stringify({experiment:'directory-concurrency',concurrency,ms:Math.round(performance.now()-start),statements:statements-before,peakUsed,peakPending,errors:0}));
  }
 }finally{await client.$disconnect();await pool.end();}
});

test('an interrupted directory statement fails safely and reconnects without a retry',async()=>{
 if(!['127.0.0.1','localhost','[::1]'].includes(new URL(ownerUrl).hostname))throw Error('Connection interruption tests require loopback PostgreSQL');
 const application=`runtime-interrupt-${randomUUID()}`;
 const pool=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,application_name:application});
 const interrupted=new PrismaClient({adapter:new PrismaPg(pool),log:[]});
 let pending:Promise<{error?:unknown;unexpectedSuccess?:boolean}>|undefined;
 try{
  await owner.query('BEGIN');await owner.query('LOCK TABLE "Tool" IN ACCESS EXCLUSIVE MODE');
  pending=queryTools({...query,q:'presentation'},'published',interrupted).then(()=>({unexpectedSuccess:true}),error=>({error}));
  let pid:number|undefined;
  for(let attempt=0;attempt<100;attempt++){
   await owner.query('SELECT pg_stat_clear_snapshot()');
   const rows=(await owner.query("SELECT pid FROM pg_stat_activity WHERE application_name=$1 AND datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()",[application])).rows;
   assert.ok(rows.length<=1);if(rows.length===1){pid=rows[0].pid;break;}
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  assert.ok(pid&&Number.isInteger(pid));
  assert.equal((await owner.query('SELECT pg_terminate_backend($1) AS terminated',[pid])).rows[0]?.terminated,true);
  const outcome=await pending;assert.ok(outcome.error instanceof DatabaseOperationError);assert.equal(outcome.unexpectedSuccess,undefined);
  assert.equal(outcome.error.diagnostic.stage,'catalog.tools');assert.equal(outcome.error.cause,undefined);
  const diagnostic=JSON.stringify(outcome.error.diagnostic);assert.ok(!diagnostic.includes(url)&&!diagnostic.includes(application));
  await owner.query('ROLLBACK');assert.equal((await queryTools({...query,q:'presentation'},'published',interrupted)).items.length,0);
 }finally{await owner.query('ROLLBACK');if(pending)await pending;await interrupted.$disconnect();await pool.end();}
});
