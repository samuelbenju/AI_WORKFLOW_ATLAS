import {test} from 'node:test';
import assert from 'node:assert/strict';
import {implementationInquiry} from '../../src/lib/implementation-contact';
test('implementation enquiries encode minimum scope and reject injected addresses',()=>{
 assert.equal(implementationInquiry(null),null);assert.equal(implementationInquiry('team@example.invalid\r\nBcc:other@example.invalid'),null);
 const url=new URL(implementationInquiry('team@example.invalid')!);assert.equal(url.protocol,'mailto:');assert.ok(!url.search.includes('+'));assert.ok(url.search.includes('Custom%20automation%20enquiry'));
 for(const value of ['Company or project:','Country:','Process to automate:','Current tools:','Main need:','Do not include passwords'])assert.ok(url.searchParams.get('body')!.includes(value));
 assert.equal(url.searchParams.get('subject'),'Custom automation enquiry');
});
