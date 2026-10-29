import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm,symlink,chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkBlueprintPackage } from '../../src/server/blueprints/package-check';
import { contentDigest } from '../../src/server/blueprints/validation';

test('operator package check validates a minimal synthetic export, exact inventory and hashes without certifying n8n runtime',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'atlas-package-'));
  try{
    const bytes=Buffer.from(JSON.stringify({name:'Synthetic test only',active:false,nodes:[{id:'fixture',name:'Fixture',type:'n8n-nodes-base.noOp',typeVersion:1,parameters:{},position:[0,0]}],connections:{}}));
    const file={id:'fixture',filename:'fixture.json',format:'json',platform:'n8n',size:bytes.length,sha256:contentDigest(bytes)};
    const manifest={schemaVersion:1,id:'fixture',version:'1.0.0',useCaseSlug:'fixture-guide',title:'Synthetic test only',description:'Not a product workflow.',
      attribution:{credit:'Synthetic fixture',license:'Test only',sources:['https://example.org/docs']},files:[file]};
    await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest),{mode:0o600});await writeFile(path.join(dir,'fixture.json'),bytes,{mode:0o600});
    const result=await checkBlueprintPackage(dir);assert.equal(result.files[0]?.native?.nodes,1);assert.equal(result.runtimeImportVerified,false);assert.equal(result.publication,'NOT_AUTHORIZED');
    await writeFile(path.join(dir,'unexpected.env'),'synthetic file, no secret',{mode:0o600});await assert.rejects(checkBlueprintPackage(dir));await rm(path.join(dir,'unexpected.env'));
    await writeFile(path.join(dir,'fixture.json'),Buffer.alloc(bytes.length));await assert.rejects(checkBlueprintPackage(dir));await writeFile(path.join(dir,'fixture.json'),bytes);
    await chmod(path.join(dir,'fixture.json'),0o644);await assert.rejects(checkBlueprintPackage(dir));await chmod(path.join(dir,'fixture.json'),0o600);
    await rm(path.join(dir,'fixture.json'));await assert.rejects(checkBlueprintPackage(dir));
    await symlink('/etc/passwd',path.join(dir,'fixture.json'));await assert.rejects(checkBlueprintPackage(dir));
    await assert.rejects(checkBlueprintPackage('relative/path'));await assert.rejects(checkBlueprintPackage(path.join(process.cwd(),'public')));
  }finally{await rm(dir,{recursive:true,force:true});}
});
