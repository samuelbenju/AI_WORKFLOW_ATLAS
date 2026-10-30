import {test} from 'node:test';
import assert from 'node:assert/strict';
test('CI annotations expose only validated source locations/status, not private errors or arbitrary filenames',async()=>{
 // @ts-expect-error Standalone Node operator module.
 const {failedLocations}=await import('../../scripts/e2e-diagnostics.mjs');
 const spec={file:'growth.spec.ts',line:10,tests:[{status:'unexpected',results:[{status:'timedOut',error:{message:'synthetic confidential payload'}}]}]};
 assert.deepEqual(failedLocations({suites:[{suites:[{specs:[spec,{...spec,file:'../../private.env'},{...spec,line:-1}]}]}]}),[{file:'tests/e2e/growth.spec.ts',line:10,status:'timedOut'}]);
 assert.deepEqual(failedLocations({suites:[{specs:[{...spec,tests:[{status:'expected',results:[{status:'passed'}]}]}]}]}),[]);
});
