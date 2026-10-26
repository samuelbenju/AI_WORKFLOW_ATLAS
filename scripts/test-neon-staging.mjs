// Run with plain Node 24: registering tsx before the WASM helper breaks native WASM loading.
import {withTestDatabase} from './test-database.mjs';
import {catalog,emptyOrComplete,verifyManifest} from './neon-staging.ts';
import pg from 'pg';
import assert from 'node:assert/strict';
const url=new URL(process.env.TEST_DATABASE_URL??'');
if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='55432'||!url.pathname.endsWith('_test'))throw Error('Requires existing isolated local test infrastructure, never Neon staging');
await withTestDatabase(async isolated=>{
 const client=new pg.Client({connectionString:isolated});await client.connect();
 try{
 const manifest=await verifyManifest();assert.equal((await emptyOrComplete(client,manifest)).state,'COMPLETE');
 await client.query('BEGIN');try{await client.query(`INSERT INTO "SiteSetting" (key,value,"updatedAt") VALUES ('__isolated_neon_guard_fixture__','{}'::jsonb,CURRENT_TIMESTAMP)`);await assert.rejects(emptyOrComplete(client,manifest),/EXISTING_BUSINESS_DATA/);}finally{await client.query('ROLLBACK');}
 await client.query('BEGIN');try{await client.query(`ALTER TABLE "SiteSetting" ADD COLUMN "__isolated_guard_fixture__" TEXT`);await assert.rejects(emptyOrComplete(client,manifest),/STRUCTURE_DIFFERS/);}finally{await client.query('ROLLBACK');}
 await client.query('BEGIN');try{await client.query(`CREATE DOMAIN __isolated_neon_guard_domain__ AS TEXT`);await assert.rejects(emptyOrComplete(client,manifest),/UNEXPECTED_PUBLIC_OBJECTS/);}finally{await client.query('ROLLBACK');}
 assert.equal((await emptyOrComplete(client,manifest)).state,'COMPLETE');assert.deepEqual(await catalog(client),manifest.structure);
 console.log('Neon guard integration: complete empty schema accepted; existing data, structural drift and unexpected domains rejected; test transactions rolled back. Local ephemeral database only, zero Neon access.');
 }finally{await client.end();}
});
