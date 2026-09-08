import assert from 'node:assert/strict';
import { fixture } from './gudongi-test-fixture.mjs';
import { growth, quota, seoulDay, createGudongiSchema, gudongiProfile } from '../gudongi-store.js';

for(const [xp,level,current,required,segments] of [[0,1,0,5,0],[.1,1,.1,5,1],[4.99,1,4.99,5,4],[5,2,0,10,0],[14.99,2,9.99,10,4],[15,3,0,30,0],[44.99,3,29.99,30,4],[45,4,0,50,0],[94.99,4,49.99,50,4],[95,5,50,50,5],[105,5,60,50,5],[108,5,63,50,5],[108.5,5,63.5,50,5],[195,5,150,50,5]]){
  const g=growth(xp);assert.equal(g.level,level);assert.ok(Math.abs(g.currentXp-current)<1e-10);assert.equal(g.requiredXp,required);assert.equal(g.segments,segments);
}
assert.equal(seoulDay(Date.parse('2026-09-07T14:59:59Z')),'2026-09-07');assert.equal(seoulDay(Date.parse('2026-09-07T15:00:00Z')),'2026-09-08');
const f=fixture(),cookie=await f.login(),otherCookie=await f.login('other-reader');await f.board();
assert.equal((await f.api('/api/account/gudongi')).status,401);
assert.equal((await f.api('/api/account/appearance',{appearanceId:'hearts'},cookie)).status,403);
assert.equal((await f.api('/api/account/appearance',{appearanceId:'baby'},cookie,'https://evil.test')).status,403);
const profile=async()=> (await (await f.api('/api/account/gudongi',null,cookie)).json()).gudongi;
assert.equal((await profile()).level,1);
assert.equal((await profile()).appearanceCatalog.length,9);
assert.deepEqual((await profile()).appearanceCatalog.filter(a=>a.unlocked).map(a=>a.id),['baby']);
assert.equal((await profile()).appearanceCatalog.find(a=>a.id==='hearts').kind,'bonus');
assert.equal((await profile()).appearanceCatalog.find(a=>a.id==='suit').kind,'basic');

const makePost=(requestId,amount)=>{const form=new FormData();form.set('requestId',requestId);form.set('title','테스트 도서 기록');form.set('body','함께 읽고 성장합니다.');form.set('achievement',String(amount));return form;};
const first=await f.api('/api/challenges/test-board/posts',makePost('challenge-request-1',.5),cookie),firstData=await first.json();assert.equal(first.status,201);assert.equal(firstData.earnedXp,1.5);assert.equal(firstData.gudongi.totalXp,1.5);
const duplicates=await Promise.all(Array.from({length:6},()=>f.api('/api/challenges/test-board/posts',makePost('challenge-request-1',.5),cookie)));
for(const response of duplicates){assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);}assert.equal((await profile()).totalXp,1.5);assert.equal(f.sql.exec('SELECT COUNT(*) n FROM challenge_posts')[0].n,1);
assert.equal((await f.api('/api/challenges/test-board/posts',makePost('challenge-request-1',50),cookie)).status,409);
await f.internal('/admin/challenges/posts/progress',{postId:firstData.postId,achievement:40,adminId:'admin'});assert.equal((await profile()).totalXp,120);assert.equal((await profile()).level,5);assert.equal((await profile()).appearanceId,'suit');assert.equal((await profile()).appearance.image,'suit.png');assert.equal((await profile()).currentXp,75);assert.equal((await profile()).requiredXp,50);
assert.equal((await profile()).appearanceCatalog.every(a=>a.unlocked),true);
for(const appearanceId of ['baby','student','default','reading','casual','jumping','suit','safety-helmet','hearts']){
 assert.equal((await f.api('/api/account/appearance',{appearanceId},cookie)).status,200);
 assert.equal((await profile()).appearanceId,appearanceId);
}

assert.equal((await f.api('/api/account/appearance',{appearanceId:'reading',userId:'other-reader',totalXp:99999,level:5},cookie)).status,200);assert.equal((await profile()).appearanceId,'reading');
assert.equal((await (await f.api('/api/account/gudongi',null,otherCookie)).json()).gudongi.totalXp,0);
await f.internal('/admin/challenges/posts/progress',{postId:firstData.postId,achievement:2,adminId:'admin'});assert.equal((await profile()).level,2);assert.equal((await profile()).appearanceId,'student');
await f.api('/api/account/seen',{level:999},cookie);assert.equal((await profile()).lastSeenLevel,2);
await f.internal('/admin/challenges/posts/delete',{postId:firstData.postId,adminId:'admin'});assert.equal((await profile()).totalXp,0);assert.equal((await profile()).appearanceId,'baby');assert.ok(f.sql.exec('SELECT * FROM gudongi_audit').length>=4);

const delivery=(id,count=1,userId='reader')=>f.internal('/gudongi/recommendation/deliver',{userId,requestId:id,fingerprint:'same-profile',profile:{jobs:['행정·기획']},result:{books:Array.from({length:count},(_,i)=>({title:`도서 ${i}`,isbn:`isbn-${i}`}))}});
const empty=await (await delivery('empty-result',0)).json();assert.equal(empty.earnedXp,0);assert.equal(empty.quota.used,0);
for(let i=0;i<5;i++){const data=await (await delivery(`one-book-${i}`)).json();assert.equal(data.earnedXp,i<4?1:0);}
assert.equal((await profile()).totalXp,4);assert.equal((await profile()).quota.used,5);
const repeated=await Promise.all(Array.from({length:8},()=>delivery('same-request',8)));assert.equal((await profile()).quota.used,13);assert.equal(repeated.filter(r=>r.status===200).length,8);assert.equal(f.sql.exec('SELECT COUNT(*) n FROM gudongi_deliveries')[0].n,6);
const raced=await Promise.all([delivery('race-request-1',14),delivery('race-request-2',14)]),racedData=await Promise.all(raced.map(r=>r.json()));assert.deepEqual(racedData.map(r=>r.books.length).sort((a,b)=>a-b),[3,14]);assert.equal((await profile()).quota.used,30);
assert.equal((await delivery('over-limit',1)).status,429);assert.equal((await delivery('same-request',8)).status,200);assert.equal((await profile()).totalXp,4);
assert.equal((await f.internal('/gudongi/recommendation/check',{userId:'reader',requestId:'same-request',fingerprint:'tampered'})).status,409);
assert.equal((await f.api('/api/account/recommendations/log',{bookCount:10000,totalXp:9999},cookie)).status,410);
const nextMidnight=Date.parse((await profile()).quota.resetAt);assert.equal(quota(f.sql,'reader',nextMidnight).used,0);assert.equal(quota(f.sql,'reader',nextMidnight).xp,0);

// Roll back the whole new recommendation when a later ledger write fails.
const originalExec=f.sql.exec;f.sql.exec=function(query,...args){if(query.startsWith('INSERT INTO gudongi_deliveries'))throw new Error('injected write failure');return originalExec(query,...args);};
await assert.rejects(()=>delivery('failing-transaction',1,'other-reader'),/injected/);f.sql.exec=originalExec;
assert.equal(f.sql.exec("SELECT COUNT(*) n FROM recommendation_sessions WHERE user_id='other-reader'")[0].n,0);assert.equal(gudongiProfile(f.sql,'other-reader').totalXp,0);

for(const [body,status] of [[{currentPassword:'wrong-password',newPassword:'new-password',confirmPassword:'new-password'},403],[{currentPassword:'test-password',newPassword:'short',confirmPassword:'short'},400],[{currentPassword:'test-password',newPassword:'test-password',confirmPassword:'test-password'},400],[{currentPassword:'test-password',newPassword:'new-password',confirmPassword:'mismatch'},400]])assert.equal((await f.api('/api/account/password',body,cookie)).status,status);
assert.equal((await f.api('/api/account/password',{currentPassword:'test-password',newPassword:'new-password',confirmPassword:'new-password'},cookie)).status,200);
assert.equal((await f.api('/api/account/login',{id:'reader',password:'test-password'})).status,401);await f.login('reader','new-password');
for(const avatar of ['data:image/svg+xml;base64,PHN2Zz4=','data:image/jpeg;base64,aaaa',null])assert.equal((await f.api('/api/account/avatar',{avatar},cookie)).status,400);
assert.equal((await f.api('/api/account/avatar',{avatar:''},cookie)).status,200);

// Fresh legacy fixture: backfill adds only new ledger rows, leaves all original rows exact.
const legacy=fixture();await legacy.login('legacy-reader');await legacy.board();
legacy.sql.exec("DELETE FROM gudongi_migrations WHERE version='v1'"); // Memory-only simulated pre-migration state.
for(let i=0;i<7;i++)legacy.sql.exec('INSERT INTO recommendation_sessions(user_id,book_count,profile_json,created_at) VALUES(?,?,?,?)','legacy-reader',i===6?0:6,'{}',Date.parse('2026-09-06T15:00:00Z')/1000+i);
legacy.sql.exec('INSERT INTO challenge_posts VALUES(?,?,?,?,?,?,?,?)','legacy-post','test-board','legacy-reader','과거 기록','그대로 보존',2.25,1,1);
const snapshot=()=>Object.fromEntries(['accounts','recommendation_sessions','challenge_posts','favorites','user_registry'].map(t=>[t,legacy.sql.exec(`SELECT * FROM ${t}`)]));
const before=snapshot();legacy.storage.transactionSync(()=>createGudongiSchema(legacy.sql));legacy.storage.transactionSync(()=>createGudongiSchema(legacy.sql));assert.deepEqual(snapshot(),before);assert.equal(gudongiProfile(legacy.sql,'legacy-reader').totalXp,10.75);assert.equal(quota(legacy.sql,'legacy-reader').used,0);

// Attachment failure cannot leave a post or XP; retried uploads don't leave orphan objects.
const attachmentForm=makePost('attachments-request',1);attachmentForm.append('files',new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0])],{type:'image/png'}),'sample.png');
const attached=await f.api('/api/challenges/test-board/posts',attachmentForm,cookie);assert.equal(attached.status,201);const attachedData=await attached.json();
const retryForm=makePost('attachments-request',1);retryForm.append('files',new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0])],{type:'image/png'}),'sample.png');assert.equal((await f.api('/api/challenges/test-board/posts',retryForm,cookie)).status,200);assert.equal(f.objects.size,1);
await f.internal('/admin/challenges/boards/delete',{id:'test-board',adminId:'admin'});assert.equal((await profile()).totalXp,4);assert.equal(f.sql.exec('SELECT COUNT(*) n FROM challenge_posts WHERE post_id=?',attachedData.postId)[0].n,0);
assert.equal((await f.api('/api/account/delete',{password:'new-password'},cookie)).status,200);
for(const table of ['gudongi_profiles','gudongi_xp','gudongi_deliveries','gudongi_audit'])assert.equal(f.sql.exec(`SELECT COUNT(*) n FROM ${table} WHERE user_id=?`,'reader')[0].n,0);
console.log('구동이: 레벨·소수 EXP·중복·동시 추천 한도·원자성·소급 보존·인증·계정 설정 회귀 테스트 통과');
