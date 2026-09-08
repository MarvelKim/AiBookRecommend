import assert from 'node:assert/strict';
import { fixture } from './gudongi-test-fixture.mjs';

const f=fixture(),cookie=await f.login('flow-reader');
const originalFetch=globalThis.fetch;
let empty=false;
globalThis.fetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url||input);
  if(url.hostname==='www.googleapis.com')return Response.json({items:empty?[]:Array.from({length:6},(_,i)=>({id:String(i),volumeInfo:{title:`행정 기획 보고서 실무 ${i}`,description:'공공기관 행정 기획 보고서 실무 문제 해결',publishedDate:'2026-01-01',industryIdentifiers:[{type:'ISBN_13',identifier:`978000000000${i}`}],authors:['테스트 저자']}}))});
  return new Response('',{status:503});
};
try{
  const profile={jobs:['행정·기획'],purposes:['보고서·기획'],level:'실무',freshness:'무관',practical:'무관'};
  const result=await f.api('/api/recommend',{...profile,requestId:'flow-request-1'},cookie),data=await result.json();
  assert.equal(result.status,200);assert.equal(data.books?.length,6,JSON.stringify(data));assert.equal(data.earnedXp,1);assert.equal(data.quota.used,6);assert.equal(data.quota.xp,1);assert.equal(data.gudongi.totalXp,1);
  const repeated=await(await f.api('/api/recommend',{...profile,requestId:'flow-request-1'},cookie)).json();assert.equal(repeated.replayed,true);assert.equal(repeated.quota.used,6);assert.equal(repeated.gudongi.totalXp,1);
  empty=true;
  const noBooks=await(await f.api('/api/recommend',{...profile,requestId:'flow-request-empty'},cookie)).json();assert.equal(noBooks.books.length,0);assert.equal(noBooks.earnedXp,0);assert.equal(noBooks.quota.used,6);
  console.log('Recommendation API -> persisted XP and quota: passed');
}finally{globalThis.fetch=originalFetch;}
