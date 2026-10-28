import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexableQuery } from '../../src/lib/seo-policy';
test('only directory pagination can create an indexable page variant',()=>{
  for(const path of ['/tools','/use-cases','/blog'])assert.ok(indexableQuery(path,new URLSearchParams('page=2')));
  for(const path of ['/','/about','/categories','/categories/documents','/tools/whisper'])assert.ok(!indexableQuery(path,new URLSearchParams('page=2')));
});
test('ambiguous, unbounded and filtered URLs are excluded from indexing',()=>{
  for(const query of ['page=0','page=-1','page=10001','page=','page=1&page=2','page=1.5','page=two','q=Whisper','category=documents','sort=name','page=2&tag=local-models'])assert.ok(!indexableQuery('/tools',new URLSearchParams(query)));
  assert.ok(indexableQuery('/tools',new URLSearchParams()));
});
