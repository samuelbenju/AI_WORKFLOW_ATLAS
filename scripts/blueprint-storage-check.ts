// Operator-only READ probe. Does not authenticate an Atlas account, upload,
// publish, rotate credentials or mutate the bucket/database/Render configuration.
import {config} from 'dotenv';
import {parseArgs} from 'node:util';
import {checkBlueprintPackage} from '../src/server/blueprints/package-check';
import {NeonObjectStorage,neonStorageConfiguration} from '../src/server/blueprints/neon-storage';
config({path:['.env.local','.env'],quiet:true});
async function main(){
 console.log(JSON.stringify({stage:'blueprint.storage.configuration',backendNeon:process.env.BLUEPRINT_STORAGE_BACKEND==='neon',endpointPresent:!!process.env.BLUEPRINT_OBJECT_ENDPOINT,expectedRegion:process.env.BLUEPRINT_OBJECT_REGION==='us-east-1',expectedBucket:process.env.BLUEPRINT_OBJECT_BUCKET==='atlas-blueprints',accessKeyPresent:!!process.env.BLUEPRINT_OBJECT_ACCESS_KEY_ID,secretKeyPresent:!!process.env.BLUEPRINT_OBJECT_SECRET_ACCESS_KEY}));
 const {values}=parseArgs({options:{directory:{type:'string'}},strict:true});
 if(!values.directory||process.env.BLUEPRINT_STORAGE_BACKEND!=='neon')throw Error();
 const cfg=neonStorageConfiguration(process.env);
 if(cfg.bucket!=='atlas-blueprints'||cfg.region!=='us-east-1'||!new URL(cfg.endpoint).hostname.startsWith('br-young-queen-b7w8sxqs.storage.'))throw Error();
 const checked=await checkBlueprintPackage(values.directory),file=checked.files.find(f=>f.native);
 if(!file)throw Error();
 const descriptor={id:file.id,filename:file.filename,size:file.size,sha256:file.sha256,platform:'n8n' as const,format:'json' as const};
 const storage=new NeonObjectStorage(process.env,undefined,8000,event=>console.log(JSON.stringify(event)));
 const headExists=await storage.exists(descriptor),result=await storage.inspect(descriptor);
 console.log(JSON.stringify({stage:'blueprint.storage.readcheck',targetConfigurationVerified:true,packageValidated:true,headExists,getExists:result.exists,integrity:result.integrity,readOperationsOnly:true,uploaded:false,published:false,runtimeLocationVerified:false,credentialScopeVerified:false}));
}
main().catch(()=>{console.error(JSON.stringify({stage:'blueprint.storage.readcheck',codes:['STORAGE_READCHECK_UNAVAILABLE'],uploaded:false,published:false}));process.exitCode=1;});
