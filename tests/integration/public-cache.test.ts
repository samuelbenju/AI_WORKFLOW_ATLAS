import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../../src/generated/prisma/client';
import {createDatabaseClient} from '../../src/server/db/client';
import {homeCatalog,queryTools} from '../../src/server/data/public-catalog';
import {DatabaseOperationError} from '../../src/lib/database-diagnostics';
const url=process.env.DATABASE_URL!;
if(!['127.0.0.1','localhost'].includes(new URL(url).hostname)||!/^\/atlas_run_[a-f0-9]+_test$/.test(new URL(url).pathname))throw Error('Isolated loopback database required');
const writer=createDatabaseClient(url);after(()=>writer.$disconnect());
async function observed(callback:(db:PrismaClient,pool:pg.Pool,count:()=>number)=>Promise<void>){
 const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
 const client=new PrismaClient({adapter:new PrismaPg(pool),log:[{emit:'event',level:'query'}]});let queries=0;
 client.$on('query',()=>queries++);
 const global=globalThis as unknown as {atlasDatabase?:PrismaClient},previous=global.atlasDatabase;global.atlasDatabase=client;
 try{await callback(client,pool,()=>queries);}finally{global.atlasDatabase=previous;await client.$disconnect();if(!pool.ended)await pool.end();}
}
test('warm and concurrent public reads retain live authorization while reducing actual SQL',async()=>observed(async(db,pool,count)=>{
 let start=count();await homeCatalog('published',db);const baseline=count()-start;
 start=count();await homeCatalog('published');const cold=count()-start;
 start=count();await homeCatalog('published');const warm=count()-start;
 assert.equal(warm,1);assert.ok(warm<baseline);
 start=count();await Promise.all(Array.from({length:24},()=>homeCatalog('published')));const concurrent=count()-start;
 assert.equal(concurrent,24);assert.ok(pool.totalCount<=5);
 console.log(JSON.stringify({experiment:'public-cache-sql',baseline,cold,warm,concurrent24:concurrent,poolTotal:pool.totalCount}));
}));
test('committed withdrawal without updatedAt immediately invalidates cached listings; uncommitted data stays private',async()=>observed(async()=>{
 const id=randomUUID();await writer.tool.create({data:{id,slug:'cache-'+id,name:'!Cache fixture',summary:'Isolated fixture',description:'Not a real product',websiteUrl:'https://example.invalid',status:'PUBLISHED',publishedAt:new Date(),featured:true}});
 const connection=new pg.Client({connectionString:url});await connection.connect();
 try{
  assert.ok((await homeCatalog('published')).tools.some(t=>t.id===id));
  await connection.query('BEGIN');await connection.query('UPDATE "Tool" SET status=\'DRAFT\' WHERE id=$1',[id]);
  assert.ok((await homeCatalog('published')).tools.some(t=>t.id===id));
  await connection.query('COMMIT');
  assert.ok(!(await homeCatalog('published')).tools.some(t=>t.id===id));
 }finally{await connection.query('ROLLBACK');await connection.end();await writer.tool.delete({where:{id}});}
}));
test('database unavailability cannot serve a previously cached public result',async()=>observed(async(_db,pool)=>{
 await homeCatalog('published');await pool.end();
 await assert.rejects(homeCatalog('published'),error=>error instanceof DatabaseOperationError);
}));
test('fresh client caches and free-text searches never reuse another client cache or skip actual reads',async()=>{
 await observed(async()=>{await homeCatalog('published');});
 await observed(async(_db,_pool,count)=>{
  const start=count();await homeCatalog('published');assert.ok(count()-start>1);
  const q={q:'isolated search',sort:'recent' as const,page:1};
  let before=count();await queryTools(q);const first=count()-before;
  before=count();await queryTools(q);assert.equal(count()-before,first);assert.ok(first>1);
 });
});

test('concurrent cold misses share one bounded catalog load and callers cannot mutate cached values',async()=>observed(async(db,_pool,count)=>{
 const id=randomUUID();await writer.tool.create({data:{id,slug:'cache-clone-'+id,name:'!Cache clone',summary:'Isolated',description:'Fixture only',websiteUrl:'https://example.invalid',status:'PUBLISHED',publishedAt:new Date(),featured:true}});
 try{
  const before=count();await homeCatalog('published',db);const baseline=count()-before;
  const start=count();const result=await Promise.all(Array.from({length:24},()=>homeCatalog('published')));
  const queries=count()-start;assert.ok(queries<24*baseline);assert.ok(queries<=24+baseline);
  result[0]!.tools.length=0;assert.ok((await homeCatalog('published')).tools.some(t=>t.id===id));
  console.log(JSON.stringify({experiment:'public-cache-cold-concurrent',queries,uncachedBudget:24*baseline}));
 }finally{await writer.tool.delete({where:{id}});}
}));
test('scheduled content is never shown early and becomes visible after the documented short expiry',async t=>observed(async()=>{
 const now=Date.now(),id=randomUUID();t.mock.timers.enable({apis:['Date'],now});
 try{
  await writer.tool.create({data:{id,slug:'cache-future-'+id,name:'!Cache future',summary:'Isolated',description:'Fixture only',websiteUrl:'https://example.invalid',status:'PUBLISHED',publishedAt:new Date(now+1000),featured:true}});
  assert.ok(!(await homeCatalog('published')).tools.some(item=>item.id===id));
  t.mock.timers.setTime(now+16000);
  assert.ok((await homeCatalog('published')).tools.some(item=>item.id===id));
 }finally{t.mock.timers.reset();await writer.tool.deleteMany({where:{id}});}
}));
