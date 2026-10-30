import {test} from 'node:test';
import assert from 'node:assert/strict';
import {growthFunnel} from '../../src/lib/growth-funnel';
test('funnel never invents organic attribution, download counts, rates or revenue from browser events',()=>{
 const rows=growthFunnel({trackingEnabled:false,events:{PAGE_VIEW:30,TOOL_VIEW:4},confirmedSubscriptions:2,leads:1,confirmedOrders:0});
 assert.equal(rows[0]?.count,null);assert.equal(rows[1]?.count,30);assert.equal(rows[3]?.count,null);assert.equal(rows[4]?.count,2);assert.equal(rows[6]?.count,null);
 assert.match(rows[1]!.status,/históricos/);
 assert.ok(!JSON.stringify(rows).includes('conversionRate'));
 assert.throws(()=>growthFunnel({trackingEnabled:true,events:{PAGE_VIEW:-1},confirmedSubscriptions:0,leads:0,confirmedOrders:0}));
 assert.ok(growthFunnel({trackingEnabled:false,events:{},confirmedSubscriptions:0,leads:0,confirmedOrders:0}).every(r=>r.count===null));
});
