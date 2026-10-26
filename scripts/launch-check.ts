import {config} from 'dotenv';
import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {launchConfiguration,migrationHistoryCurrent} from '../src/lib/launch';
config({path:'.env.local',quiet:true});
async function main(){const {getDatabase}=await import('../src/server/db/client');const db=getDatabase();const gates=launchConfiguration();try{
 const rows=await db.$queryRaw<{migration_name:string;checksum:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations`;
 const dirs=(await readdir('prisma/migrations',{withFileTypes:true})).filter(d=>d.isDirectory());const files=await Promise.all(dirs.map(async d=>({name:d.name,checksum:createHash('sha256').update(await readFile(`prisma/migrations/${d.name}/migration.sql`)).digest('hex')})));const migrations=migrationHistoryCurrent(rows,files);
 gates.push({id:'migrations',passed:migrations,detail:'Historial y checksums coinciden con todos los SQL del checkout.'});
 const admins=await db.user.count({where:{active:true,role:{in:['OWNER','ADMIN']},passwordHash:{not:null}}});gates.push({id:'human_admin',passed:admins>0,detail:'Existe una cuenta activa con hash; verificar identidad y origen humano por separado.'});
 const [role]=await db.$queryRaw<{rolsuper:boolean;rolcreatedb:boolean;rolcreaterole:boolean}[]>`SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user`;
 gates.push({id:'runtime_least_privilege',passed:!!role&&!role.rolsuper&&!role.rolcreatedb&&!role.rolcreaterole,detail:'Rol runtime sin superusuario/CREATEDB/CREATEROLE; migraciones con credencial operativa separada.'});
 const [tls]=await db.$queryRaw<{ssl:boolean}[]>`SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()`;gates.push({id:'connection_encrypted',passed:!!tls?.ssl,detail:'Cifrado observado de esta conexión; verify-full también debe estar configurado.'});
 const publicContent=await db.tool.count({where:{status:'PUBLISHED',isDemo:false,publishedAt:{lte:new Date()}}});gates.push({id:'reviewed_public_content',passed:publicContent>0,detail:'Existe contenido público no-demo; calidad/fuentes requieren revisión editorial.'});
 }catch{gates.push({id:'database_checks',passed:false,detail:'No se pudo comprobar la DB; sin imprimir detalles o credenciales.'});}finally{await db.$disconnect();}
 const manual=['Autorización explícita de despliegue y dominio/HTTPS verificados','Backup privado externo/PITR y restauración ensayada en destino','Credenciales/contratos y pruebas reales Resend/Wompi Sandbox/Google según módulos activados','Procesador de producción, condiciones comerciales y autorización antes de cobros/entrega real de anuncios','Revisión jurídica/fiscal Colombia y mercados atendidos, documentación de evidencia','Worker propio actualizado/supervisado, alertas y primera tarea IA con consumo aprobado'];
 console.log(JSON.stringify({status:'BLOCKED_PENDING_RELEASE_REVIEW',configurationGates:gates,manualEvidenceRequired:manual,noDeploymentPerformed:true},null,2));process.exitCode=2;
}
main().catch(()=>{console.error('Launch check unavailable; no deployment performed or secrets logged.');process.exitCode=2;});
