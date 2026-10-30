import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseGscReport} from '../../src/lib/gsc-report';
test('GSC import rejects impossible dates, out-of-period rows, duplicates and impossible counts',()=>{
 const row={keys:['2026-10-01'],clicks:2,impressions:10,ctr:0.2,position:5};
 assert.equal(parseGscReport({rows:[row]},'2026-10-01','2026-10-30')[0]?.date,'2026-10-01');
 for(const rows of [[{...row,keys:['2026-02-30']}],[{...row,keys:['2026-11-01']}],[row,row],[{...row,clicks:11}],[{...row,clicks:0.5}]])assert.throws(()=>parseGscReport({rows},'2026-10-01','2026-10-30'));
 assert.deepEqual(parseGscReport({},'2026-10-01','2026-10-30'),[]);
});
