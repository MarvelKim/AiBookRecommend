import assert from 'node:assert/strict';
import { fixture } from './gudongi-test-fixture.mjs';

const f=fixture(),cookie=await f.login('flow-reader');
const originalFetch=globalThis.fetch;
let empty=false;
globalThis.fetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url||input);
  if(url.hostname==='www.googleapis.com')return Response.json({items:empty?[]:Array.from({length:60},(_,i)=>({id:String(i),volumeInfo:{title:`행정 기획 보고서 실무 ${i}`,description:'공공기관 행정 기획 보고서 실무 문제 해결',publishedDate:'2026-01-01',industryIdentifiers:[{type:'ISBN_13',identifier:`978000000000${i}`}],authors:['테스트 저자']}}))});
  return new Response('',{status:503});
};
try{
  const profile={jobs:['행정·기획'],purposes:['보고서·기획'],level:'실무',freshness:'무관',practical:'무관'};
  const result=await f.api('/api/recommend',{...profile,requestId:'flow-request-1'},cookie),data=await result.json();
  assert.equal(result.status,200);assert.equal(data.books?.length,60,JSON.stringify(data));assert.equal(data.earnedXp,0);assert.equal(data.quota.used,0);assert.equal(data.quota.xp,0);assert.equal(data.gudongi.totalXp,0);
  const repeated=await(await f.api('/api/recommend',{...profile,requestId:'flow-request-1'},cookie)).json();assert.equal(repeated.replayed,true);assert.equal(repeated.books.length,60);assert.equal(repeated.quota.used,0);assert.equal(repeated.gudongi.totalXp,0);
  const second=await(await f.api('/api/recommend',{...profile,requestId:'flow-request-2'},cookie)).json();assert.equal(second.books.length,60);assert.equal(second.quota.used,0);assert.equal(second.quota.xp,0);assert.equal(second.gudongi.totalXp,0);
  empty=true;
  const noBooks=await(await f.api('/api/recommend',{...profile,requestId:'flow-request-empty'},cookie)).json();assert.equal(noBooks.books.length,0);assert.equal(noBooks.earnedXp,0);assert.equal(noBooks.quota.used,0);
  empty=false;
  for(let i=3;i<=8;i++){const next=await(await f.api('/api/recommend',{...profile,requestId:`flow-request-${i}`},cookie)).json();assert.equal(next.books.length,60);assert.equal(next.quota.used,0);assert.equal(next.quota.xp,0);assert.equal(next.earnedXp,0);}
  // Preserve old recommendation records and XP without letting them consume the new shelf quota.
  const oldCookie=await f.login('old-reader'),day=(await(await f.api('/api/account/gudongi',null,oldCookie)).json()).gudongi.quota.day;
  const oldResult={books:Array.from({length:30},(_,i)=>({title:`old ${i}`,isbn:`old-${i}`})),earnedXp:1};
  f.sql.exec('INSERT INTO gudongi_deliveries VALUES(?,?,?,?,?,?,?)','old-reader','old-request','old-fingerprint',day,30,JSON.stringify(oldResult),1);
  f.sql.exec("INSERT INTO gudongi_xp VALUES('recommendation','old-session','old-reader',1,?,1)",day);
  const original=f.sql.exec("SELECT * FROM gudongi_deliveries WHERE user_id='old-reader'");
  const corrected=(await(await f.api('/api/account/gudongi',null,oldCookie)).json()).gudongi;
  assert.equal(corrected.quota.used,0);assert.equal(corrected.quota.remaining,30);assert.equal(corrected.quota.xp,1);assert.equal(corrected.totalXp,1);
  const resumed=await(await f.api('/api/recommend',{...profile,requestId:'old-reader-new-request'},oldCookie)).json();
  assert.equal(resumed.books.length,60);assert.equal(resumed.quota.used,0);assert.equal(resumed.gudongi.totalXp,1);
  assert.deepEqual(f.sql.exec("SELECT * FROM gudongi_deliveries WHERE user_id='old-reader' AND request_id='old-request'"),original);
  console.log('Recommendation API -> unlimited results without shelf quota or EXP: passed');
}finally{globalThis.fetch=originalFetch;}
