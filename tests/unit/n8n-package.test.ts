import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectN8nPackageExport } from '../../src/lib/n8n-package';
// Minimal synthetic graph; this is not the private product workflow.
const node={id:'fixture-id',name:'Fixture only',type:'n8n-nodes-base.noOp',typeVersion:1,position:[0,0],parameters:{}};
const fixture={name:'Synthetic structural test only',active:false,nodes:[node],connections:{},pinData:{}};
test('n8n package inspection is structural, never a fabricated runtime certification',()=>{
  const report=inspectN8nPackageExport(fixture);assert.equal(report.nodes,1);assert.equal(report.runtimeImportVerified,false);
  assert.equal(report.active,false);
});
test('private identifiers, credentials, active exports, pinned data and broken graphs are rejected',()=>{
  for(const value of[{...fixture,active:true},{...fixture,id:'instance-private-id'},{...fixture,pinData:{fixture:{secret:'must-not-export'}}},
    {...fixture,nodes:[{...node,credentials:{httpHeaderAuth:{id:'private-credential'}}}]},
    {...fixture,nodes:[node,node]}, {...fixture,connections:{Missing:{main:[[]]}}},
    {...fixture,connections:{[node.name]:{main:[[{node:'Missing',type:'main',index:0}]]}}},
    {...fixture,nodes:[{...node,type:'unknown-community-package.node'}]},
    {...fixture,nodes:[{...node,type:'n8n-nodes-base.webhook',parameters:{authentication:'none'}}]},
  ])assert.throws(()=>inspectN8nPackageExport(value));
});
