import pg from 'pg';
import type {TLSSocket} from 'node:tls';
import {readFile,readdir,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

export const target={project:'cold-shadow-53495242',database:'atlas_staging',role:'atlas_staging_owner'};
type Manifest={files:Record<string,string>;migrations:{name:string;checksum:string}[];structure:Awaited<ReturnType<typeof catalog>>};
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
function demand(condition:unknown,code:string):asserts condition {if(!condition)throw Error(code);}
export function configuration(value:string|undefined){
 demand(value,'MISSING_SECRET');const url=new URL(value),host=url.hostname.toLowerCase();
 demand(['postgres:','postgresql:'].includes(url.protocol)&&host.endsWith('.us-east-1.aws.neon.tech')&&!host.includes('-pooler')&&(!url.port||url.port==='5432')&&!url.hash,'WRONG_ENDPOINT');
 demand(decodeURIComponent(url.pathname.slice(1))===target.database&&decodeURIComponent(url.username)===target.role&&!!url.password,'WRONG_DATABASE_OR_ROLE');
 url.search='';url.searchParams.set('sslmode','verify-full');
 return {canonical:url.toString(),host,client:{host,port:5432,database:target.database,user:target.role,password:decodeURIComponent(url.password),ssl:{rejectUnauthorized:true,servername:host,minVersion:'TLSv1.2' as const},options:'-c default_transaction_read_only=on -c statement_timeout=10000 -c lock_timeout=2000 -c search_path=public,pg_catalog',connectionTimeoutMillis:10000,query_timeout:15000}};
}
export async function catalog(client:pg.Client){
 const tables=(await client.query(`SELECT c.relname AS name,c.relkind AS kind FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f','c') ORDER BY c.relname COLLATE "C"`)).rows;
 const columns=(await client.query(`SELECT c.relname AS table_name,a.attnum AS position,a.attname AS name,pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname COLLATE "C",a.attnum`)).rows;
 const constraints=(await client.query(`SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,k.convalidated AS validated,pg_catalog.pg_get_constraintdef(k.oid,true) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname COLLATE "C",k.conname COLLATE "C"`)).rows;
 const indexes=(await client.query(`SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_catalog.pg_indexes WHERE schemaname='public' ORDER BY tablename COLLATE "C",indexname COLLATE "C"`)).rows;
 const enums=(await client.query(`SELECT t.typname AS name,e.enumlabel AS label FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace JOIN pg_catalog.pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' ORDER BY t.typname COLLATE "C",e.enumsortorder`)).rows;
 return {tables,columns,constraints,indexes,enums};
}
export async function verifyManifest(){
 const manifest=JSON.parse(await readFile('scripts/neon-staging-manifest.json','utf8')) as Manifest;
 const dirs=(await readdir('prisma/migrations',{withFileTypes:true})).filter(d=>d.isDirectory()).map(d=>d.name).sort();
 demand(dirs.length===16&&JSON.stringify(dirs)===JSON.stringify(manifest.migrations.map(m=>m.name)),'MIGRATION_LIST_CHANGED');
 for(const [path,hash] of Object.entries(manifest.files))demand(sha(await readFile(path))===hash,'BASELINE_FILE_CHANGED');
 return manifest;
}
function structureMatches(actual:Awaited<ReturnType<typeof catalog>>,manifest:Manifest){return JSON.stringify(actual)===JSON.stringify(manifest.structure);}
function quote(name:string){return '"'+name.replaceAll('"','""')+'"';}
async function noBusinessRows(client:pg.Client,structure:Awaited<ReturnType<typeof catalog>>){
 for(const table of structure.tables){if(table.name==='_prisma_migrations')continue;demand(table.kind==='r'||table.kind==='p','UNEXPECTED_RELATION');const result=await client.query(`SELECT EXISTS (SELECT 1 FROM public.${quote(table.name)} LIMIT 1) AS present`);demand(!result.rows[0].present,'EXISTING_BUSINESS_DATA');}
}
async function history(client:pg.Client,structure:Awaited<ReturnType<typeof catalog>>){
 if(!structure.tables.some(t=>t.name==='_prisma_migrations'))return [];
 return (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name')).rows;
}
export function completeHistory(rows:pg.QueryResultRow[],manifest:Manifest){return rows.length===16&&manifest.migrations.every(m=>rows.filter(r=>r.migration_name===m.name&&r.checksum===m.checksum&&r.finished_at&&!r.rolled_back_at).length===1);}
export async function identity(client:pg.Client,host:string){
 const {rows:[row]}=await client.query(`SELECT current_database() AS database,current_user AS role,session_user AS session_role,current_setting('server_version') AS version,current_setting('server_version_num')::int AS version_num,current_setting('transaction_read_only') AS read_only,current_setting('neon.project_id',true) AS project,has_schema_privilege(current_user,'public','USAGE') AND has_schema_privilege(current_user,'public','CREATE') AS can_migrate`);
 demand(row.database===target.database&&row.role===target.role&&row.session_role===target.role&&row.can_migrate,'WRONG_SQL_IDENTITY');
 demand(row.read_only==='on'&&row.version_num>=170000&&row.version_num<180000,'WRONG_SERVER_OR_MODE');
 const version=String(row.version).match(/^17\.\d+/)?.[0];demand(version,'WRONG_VERSION');
 // PostgreSQL does not universally expose a Neon project ID. In that case,
 // require an independently configured endpoint from the project's console.
 const bound=row.project?row.project===target.project:!!process.env.NEON_STAGING_EXPECTED_HOST&&process.env.NEON_STAGING_EXPECTED_HOST===host&&process.env.NEON_STAGING_PROJECT_ID===target.project;
 demand(bound,'PROJECT_BINDING_NOT_VERIFIED');return version;
}
export async function emptyOrComplete(client:pg.Client,manifest:Manifest){
 const structure=await catalog(client),rows=await history(client,structure);
 const {rows:[routines]}=await client.query(`SELECT count(*)::int AS count FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')`);
 const {rows:[customTypes]}=await client.query(`SELECT count(*)::int AS count FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('d','r','m') AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype='e')`);
 demand(routines.count===0&&customTypes.count===0,'UNEXPECTED_PUBLIC_OBJECTS');
 if(structure.tables.length===0&&structure.enums.length===0)return {state:'EMPTY' as const,structure};
 demand(completeHistory(rows,manifest),'DIVERGENT_OR_PARTIAL_HISTORY');demand(structureMatches(structure,manifest),'STRUCTURE_DIFFERS');await noBusinessRows(client,structure);return {state:'COMPLETE' as const,structure};
}
function runPrisma(action:'deploy'|'status',canonical:string){
 const env={...process.env,MIGRATION_DATABASE_URL:canonical,PGOPTIONS:'-c statement_timeout=30000 -c lock_timeout=5000'};delete (env as NodeJS.ProcessEnv).DATABASE_URL;delete (env as NodeJS.ProcessEnv).TEST_DATABASE_URL;
 const child=spawnSync('npm',['run',`db:${action}`],{env,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
 // Captured stderr/stdout can contain provider diagnostics. Never relay them.
 demand(child.status===0,action==='deploy'?'PRISMA_DEPLOY_FAILED':'PRISMA_STATUS_FAILED');
}
async function main(){
 let stage='configuration',client:pg.Client|undefined;
 try{
 const action=process.argv[2];demand(['inspect','apply','verify'].includes(action??''),'WRONG_ACTION');
 demand(process.env.GITHUB_REPOSITORY==='samuelbenju/AI_WORKFLOW_ATLAS'&&process.env.GITHUB_REF==='refs/heads/main','WRONG_REPOSITORY_OR_REF');
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();demand(commit===process.env.GITHUB_SHA,'CHECKOUT_SHA_DIFFERS');
 const cfg=configuration(process.env.MIGRATION_DATABASE_URL),manifest=await verifyManifest();
 client=new pg.Client(cfg.client);client.on('error',()=>{console.error('PostgreSQL connection interrupted; private details withheld.');process.exitCode=1;});
 stage='verified TLS connection';await client.connect();const socket=(client as unknown as {connection:{stream:TLSSocket}}).connection.stream;
 demand(socket.encrypted&&socket.authorized&&['TLSv1.2','TLSv1.3'].includes(socket.getProtocol?.()??''),'UNVERIFIED_TLS');
 stage='destination and project binding';const version=await identity(client,cfg.host);
 stage='read-only catalog and history';const before=await emptyOrComplete(client,manifest);
 let applied=false;
 if(action==='apply'){
 demand(process.env.NEON_STAGING_CONFIRMATION===`${target.project}/${target.database}`,'CONFIRMATION_MISMATCH');
 if(before.state==='EMPTY'){
 // Recheck immediately before the first DDL; no seeds, reset or cleanup.
 stage='final empty database check';demand((await emptyOrComplete(client,manifest)).state==='EMPTY','DESTINATION_CHANGED');
 stage='existing Prisma db:deploy';runPrisma('deploy',cfg.canonical);applied=true;
 }
 stage='Prisma db:status';runPrisma('status',cfg.canonical);
 }
 stage='postflight catalog';const after=action==='inspect'?before:await emptyOrComplete(client,manifest);
 if(action!=='inspect')demand(after.state==='COMPLETE','INCOMPLETE_SCHEMA');
 const report={commit,project:target.project,projectBindingVerified:true,database:target.database,authorizedRoleVerified:true,postgresql:version,tlsVerified:true,direct:true,readOnlyInspection:true,state:after.state,appliedThisRun:applied?16:0,verifiedMigrations:after.state==='COMPLETE'?16:0,publicTables:after.structure.tables.length,foreignKeys:after.structure.constraints.filter(c=>c.type==='f').length,indexes:after.structure.indexes.length,constraints:after.structure.constraints.length,enumValues:after.structure.enums.length,dbStatus:action==='apply'?'PASS':'NOT_RUN'};
 console.log(JSON.stringify(report,null,2));if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Neon staging ${action}\n\n\`\`\`json\n${JSON.stringify(report,null,2)}\n\`\`\`\n`);
 }catch(error){
 const known=new Set(['MISSING_SECRET','WRONG_ENDPOINT','WRONG_DATABASE_OR_ROLE','MIGRATION_LIST_CHANGED','BASELINE_FILE_CHANGED','WRONG_SQL_IDENTITY','WRONG_SERVER_OR_MODE','WRONG_VERSION','PROJECT_BINDING_NOT_VERIFIED','UNEXPECTED_RELATION','EXISTING_BUSINESS_DATA','UNEXPECTED_PUBLIC_OBJECTS','DIVERGENT_OR_PARTIAL_HISTORY','STRUCTURE_DIFFERS','CONFIRMATION_MISMATCH','DESTINATION_CHANGED','PRISMA_DEPLOY_FAILED','PRISMA_STATUS_FAILED','INCOMPLETE_SCHEMA','WRONG_REPOSITORY_OR_REF','CHECKOUT_SHA_DIFFERS','UNVERIFIED_TLS','WRONG_ACTION']);
 const code=error instanceof Error&&known.has(error.message)?error.message:'PRIVATE_DETAILS_WITHHELD';console.error(`Neon staging stopped at ${stage}: ${code}. No reset or cleanup attempted.`);
 if(client&&stage==='existing Prisma db:deploy'){
 try{const failed=await client.query('SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL');const manifest=JSON.parse(await readFile('scripts/neon-staging-manifest.json','utf8')) as Manifest;console.error('Known unfinished migrations:',failed.rows.map(r=>r.migration_name).filter(n=>manifest.migrations.some(m=>m.name===n)).join(', ')||'none recorded');}catch{console.error('Migration failure details unavailable; private diagnostics withheld.');}
 }
 process.exitCode=1;
 }finally{if(client)await client.end().catch(()=>{process.exitCode=1;});}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('scripts/neon-staging.ts'))void main();
