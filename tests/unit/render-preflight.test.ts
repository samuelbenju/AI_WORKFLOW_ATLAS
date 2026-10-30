import {test} from 'node:test';
import assert from 'node:assert/strict';
test('Render preflight only GETs expected host; sanitizes output and rejects wrong target or missing secret',async()=>{
 // @ts-expect-error JS operator module has no declaration; no new runtime dependency.
 const {renderPreflight}=await import('../../scripts/ops/render-preflight.mjs');
 const s={id:'srv-fixture',type:'web_service',repo:'https://github.com/samuelbenju/AI_WORKFLOW_ATLAS',branch:'main',autoDeploy:'no',suspended:'not_suspended',serviceDetails:{url:'https://ai-workflow-atlas.onrender.com',healthCheckPath:'/api/health',envSpecificDetails:{buildCommand:'npm ci --include=dev --ignore-scripts --no-audit --no-fund && npm run build',startCommand:'npm run start -- --port "$PORT"'}}};
 let calls=0;const transport=async(url:string,opts:RequestInit)=>{calls++;assert.equal(opts.method,'GET');assert.equal(new URL(url).host,'api.render.com');return Response.json(url.includes('/deploys')?[{deploy:{status:'live',commit:{id:'a'.repeat(40)}}}]:url.includes('?limit=100')?[{service:s}]:s);};
 const result=await renderPreflight('synthetic-private-key',transport);assert.equal(result.ready,true);assert.equal(calls,3);assert.ok(!JSON.stringify(result).includes('synthetic-private-key'));
 await assert.rejects(renderPreflight('',transport));s.branch='other';await assert.rejects(renderPreflight('fixture',transport));
});
