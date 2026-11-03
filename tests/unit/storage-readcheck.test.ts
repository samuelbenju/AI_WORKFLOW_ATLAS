import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('operator readcheck rejects a different branch before reading the package or sending any S3 request',()=>{
 const fixture='fixture-value-not-a-real-secret';
 const result=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','scripts/blueprint-storage-check.ts','--directory','/unavailable-private-package'],{encoding:'utf8',env:{...process.env,BLUEPRINT_STORAGE_BACKEND:'neon',BLUEPRINT_OBJECT_ENDPOINT:'https://br-wrong.storage.c-1.us-east-1.aws.neon.tech',BLUEPRINT_OBJECT_REGION:'us-east-1',BLUEPRINT_OBJECT_BUCKET:'atlas-blueprints',BLUEPRINT_OBJECT_ACCESS_KEY_ID:fixture,BLUEPRINT_OBJECT_SECRET_ACCESS_KEY:fixture},timeout:15000});
 assert.equal(result.status,1);const output=result.stdout+result.stderr;
 assert.ok(output.includes('STORAGE_READCHECK_UNAVAILABLE'));
 assert.ok(!output.includes(fixture)&&!output.includes('br-wrong')&&!output.includes('/unavailable-private-package'));
 assert.ok(!output.includes('blueprint.storage.acl'));
});
