import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {configuration,verifyManifest,completeHistory} from '../../scripts/neon-staging';

test('Neon operator connection pins TLS and identity despite unsafe URL overrides',()=>{
 const cfg=configuration('postgresql://atlas_staging_owner:fixture%40password@ep-fixture.us-east-1.aws.neon.tech/atlas_staging?sslmode=disable&host=evil.invalid&options=-c%20default_transaction_read_only=off');
 assert.equal(cfg.client.ssl.rejectUnauthorized,true);assert.equal(cfg.client.ssl.servername,cfg.host);assert.equal(cfg.client.database,'atlas_staging');assert.equal(cfg.client.user,'atlas_staging_owner');assert.match(cfg.client.options,/default_transaction_read_only=on/);const url=new URL(cfg.canonical);assert.deepEqual([...url.searchParams.entries()],[['sslmode','verify-full']]);
});
test('Neon rejects pooled, wrong region, wrong database, wrong owner or non-PostgreSQL endpoints',()=>{
 const base='postgresql://atlas_staging_owner:fixture@ep-fixture.us-east-1.aws.neon.tech/atlas_staging';
 for(const input of [undefined,base.replace('ep-fixture.','ep-fixture-pooler.'),base.replace('us-east-1','us-west-2'),base.replace('/atlas_staging','/postgres'),base.replace('atlas_staging_owner','another_owner'),base.replace('postgresql:','https:')])assert.throws(()=>configuration(input));
});
test('Neon reference preserves exactly 16 original migrations and a complete isolated catalog',async()=>{
 const m=await verifyManifest();assert.equal(m.migrations.length,16);assert.equal(m.structure.tables.length,55);assert.equal(m.structure.columns.length,486);assert.equal(m.structure.constraints.filter(c=>c.type==='f').length,72);assert.equal(m.structure.indexes.length,182);assert.equal(m.structure.enums.length,75);
});
test('Neon history rejects partial, edited, duplicate or unresolved attempts',async()=>{
 const m=await verifyManifest(),rows=m.migrations.map(x=>({migration_name:x.name,checksum:x.checksum,finished_at:new Date(),rolled_back_at:null}));
 assert.equal(completeHistory(rows,m),true);assert.equal(completeHistory(rows.slice(1),m),false);assert.equal(completeHistory([...rows,rows[0]!],m),false);assert.equal(completeHistory(rows.map((r,i)=>i===0?{...r,checksum:'wrong'}:r),m),false);assert.equal(completeHistory(rows.map((r,i)=>i===0?{...r,finished_at:null}:r),m),false);assert.equal(completeHistory(rows.map((r,i)=>i===0?{...r,rolled_back_at:new Date()}:r),m),false);
});

test('Neon project identity fails closed without independent binding or with another SQL role',async()=>{
 const {identity}=await import('../../scripts/neon-staging');const savedHost=process.env.NEON_STAGING_EXPECTED_HOST,savedProject=process.env.NEON_STAGING_PROJECT_ID;
 const client=(row:Record<string,unknown>)=>({query:async()=>({rows:[{database:'atlas_staging',role:'atlas_staging_owner',session_role:'atlas_staging_owner',read_only:'on',can_migrate:true,version:'17.11',version_num:170011,project:null,...row}]})}) as unknown as import('pg').Client;
 try{
 delete process.env.NEON_STAGING_EXPECTED_HOST;delete process.env.NEON_STAGING_PROJECT_ID;
 await assert.rejects(identity(client({}),'ep-fixture.us-east-1.aws.neon.tech'),/PROJECT_BINDING_NOT_VERIFIED/);
 await assert.rejects(identity(client({project:'another-project'}),'ep-fixture.us-east-1.aws.neon.tech'),/PROJECT_BINDING_NOT_VERIFIED/);
 assert.equal(await identity(client({project:'cold-shadow-53495242'}),'ep-fixture.us-east-1.aws.neon.tech'),'17.11');
 process.env.NEON_STAGING_EXPECTED_HOST='ep-fixture.us-east-1.aws.neon.tech';process.env.NEON_STAGING_PROJECT_ID='cold-shadow-53495242';assert.equal(await identity(client({}),'ep-fixture.us-east-1.aws.neon.tech'),'17.11');
 await assert.rejects(identity(client({role:'another_owner'}),'ep-fixture.us-east-1.aws.neon.tech'),/WRONG_SQL_IDENTITY/);
 }finally{if(savedHost===undefined)delete process.env.NEON_STAGING_EXPECTED_HOST;else process.env.NEON_STAGING_EXPECTED_HOST=savedHost;if(savedProject===undefined)delete process.env.NEON_STAGING_PROJECT_ID;else process.env.NEON_STAGING_PROJECT_ID=savedProject;}
});
