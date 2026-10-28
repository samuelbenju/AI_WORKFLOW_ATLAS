import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGa4Report,googleDimensionSchema } from '../../src/lib/google-reports';
const fixture=(label:string,values=['4','5','7','3'])=>({rows:[{dimensionValues:[{value:label}],metricValues:values.map(value=>({value}))}],rowCount:1});
test('GA4 breakdowns keep actual metrics and distinguish missing active users',()=>{
  const row=parseGa4Report(fixture('Colombia'),'countries','2026-01-01','2026-01-31').rows[0]!;
  assert.equal(row.label,'Colombia');assert.equal(row.activeUsers,3);assert.equal(row.pageViews,7);
  assert.equal(parseGa4Report(fixture('20260102',['4','5','7']),'date','2026-01-01','2026-01-31').rows[0]!.activeUsers,null);
  assert.throws(()=>parseGa4Report(fixture('20260230'),'date','2026-01-01','2026-01-31'));
});
test('GA4 page reports exclude private paths, queries and unbounded numbers',()=>{
  for(const path of ['/admin','/login','/tools?email=private@example.invalid','https://other.invalid/tools']){
    const report=parseGa4Report(fixture(path),'pages','2026-01-01','2026-01-31');
    assert.equal(report.rows.length,0);assert.equal(report.excludedPaths,1);assert.ok(!JSON.stringify(report).includes(path));
  }
  assert.equal(parseGa4Report(fixture('/categories/documents'),'landing-pages','2026-01-01','2026-01-31').rows.length,1);
  assert.throws(()=>parseGa4Report(fixture('desktop',['9999999999999999','1','1']),'devices','2026-01-01','2026-01-31'));
  assert.ok(!googleDimensionSchema.safeParse('email').success);
  assert.ok(parseGa4Report({...fixture('desktop'),rowCount:101},'devices','2026-01-01','2026-01-31').truncated);
});
