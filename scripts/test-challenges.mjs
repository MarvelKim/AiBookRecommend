import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { RankingStore } from '../worker.js';

class SqlStorage {
  constructor() { this.database = new DatabaseSync(':memory:'); }
  exec(query, ...bindings) {
    const statement = String(query).trim();
    if (!bindings.length && /;\s*\S/.test(statement)) { this.database.exec(statement); return []; }
    if (/^(SELECT|PRAGMA|WITH)\b/i.test(statement) || /\bRETURNING\b/i.test(statement)) return this.database.prepare(statement).all(...bindings);
    this.database.prepare(statement).run(...bindings); return [];
  }
}

class MemoryR2 {
  constructor() { this.objects = new Map(); }
  async put(key, body, options = {}) { this.objects.set(key, { bytes: new Uint8Array(body), options }); }
  async get(key) { const item = this.objects.get(key); return item ? { body: item.bytes } : null; }
  async delete(key) { this.objects.delete(key); }
}

const sql = new SqlStorage();
const store = new RankingStore({ storage: { sql }, blockConcurrencyWhile(callback) { return callback(); } });
const r2 = new MemoryR2();
const env = {
  ADMIN_SESSION_SECRET: 'challenge-test-secret',
  ADMIN_PASSWORD: 'admin-password',
  ADMIN_INITIAL_EMAIL: 'admin@gmuc.or.kr',
  ADMIN_EMAIL_VERIFICATION_VERSION: 'challenge-test-v1',
  CHALLENGE_FILES: r2,
  RANKINGS: { idFromName(name) { return name; }, get() { return store; } },
  ASSETS: { fetch() { return new Response('not found', { status: 404 }); } },
};

async function internal(path, options) { return store.fetch(new Request(`https://rankings.internal${path}`, options)); }

const anonymousPostForm = new FormData();
anonymousPostForm.set('title', '비로그인 작성 시도');
anonymousPostForm.set('body', '차단되어야 합니다.');
anonymousPostForm.set('achievement', '1');
assert.equal((await worker.fetch(new Request('https://gmuc.test/api/challenges/reading-2026/posts', { method: 'POST', body: anonymousPostForm }), env, {})).status, 401);
assert.equal((await worker.fetch(new Request('https://gmuc.test/api/challenges/posts/missing/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: '비로그인 댓글' }) }), env, {})).status, 401);
assert.equal((await worker.fetch(new Request('https://gmuc.test/api/admin/challenges/boards/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), env, {})).status, 401);

const adminLogin = await worker.fetch(new Request('https://gmuc.test/api/admin/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'admin', password: 'admin-password' }),
}), env, {});
assert.equal(adminLogin.status, 200);
const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0];
assert.equal((await worker.fetch(new Request('https://gmuc.test/api/admin/challenges/boards', { headers: { cookie: adminCookie } }), env, {})).status, 403);

const boardResponse = await internal('/admin/challenges/boards/save', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'reading-2026', name: '독서 챌린지(2026)', type: '독서', description: '테스트', startDate: '2026-01-01', endDate: '2026-12-31', target: 8, unit: '권', adminId: 'admin' }),
});
assert.equal(boardResponse.status, 201);

assert.equal((await internal('/admin/settings/access-verify', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@gmuc.or.kr', verificationVersion: 'challenge-test-v1', mode: 'initial' }),
})).status, 200);
assert.equal((await worker.fetch(new Request('https://gmuc.test/api/admin/challenges/boards', { headers: { cookie: adminCookie } }), env, {})).status, 200);

await internal('/admin/challenges/boards/save', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'archived-board', name: '보관 챌린지', type: '독서', startDate: '2026-01-01', endDate: '2026-12-31', target: 8, unit: '권' }),
});
await internal('/admin/challenges/boards/archive', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'archived-board', archived: true }),
});
await internal('/admin/challenges/boards/save', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'archived-board', name: '보관 챌린지 수정', type: '독서', startDate: '2026-01-01', endDate: '2026-12-31', target: 8, unit: '권' }),
});
const publicBoards = await (await worker.fetch(new Request('https://gmuc.test/api/challenges'), env, {})).json();
assert.equal(publicBoards.boards.some((board) => board.id === 'archived-board'), false);
const adminBoards = await (await worker.fetch(new Request('https://gmuc.test/api/admin/challenges/boards', { headers: { cookie: adminCookie } }), env, {})).json();
assert.equal(adminBoards.boards.some((board) => board.id === 'archived-board'), true);

for (const [postId, authorId, achievement] of [['p1', 'reader-a', 5], ['p2', 'reader-a', 4], ['p3', 'reader-b', 3]]) {
  const response = await internal('/challenges/posts', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ postId, boardId: 'reading-2026', authorId, title: `독서 기록 ${postId}`, body: '읽은 책을 기록합니다.', achievement, attachments: [] }),
  });
  assert.equal(response.status, 201);
}

sql.exec('UPDATE challenge_posts SET created_at=? WHERE post_id=?', Math.floor(Date.parse('2026-03-10T03:00:00Z') / 1000), 'p1');
sql.exec('UPDATE challenge_posts SET created_at=? WHERE post_id=?', Math.floor(Date.parse('2026-03-25T03:00:00Z') / 1000), 'p2');
sql.exec('UPDATE challenge_posts SET created_at=? WHERE post_id=?', Math.floor(Date.parse('2026-04-05T03:00:00Z') / 1000), 'p3');

const statsResponse = await internal('/admin/challenges/stats?boardId=reading-2026');
const stats = await statsResponse.json();
assert.equal(stats.months.length, 12);
assert.equal(stats.participants.find((user) => user.userId === 'reader-a').achieved, 9);
assert.equal(stats.participants.find((user) => user.userId === 'reader-a').rate, 113);
assert.equal(stats.participants.find((user) => user.userId === 'reader-b').rate, 38);
assert.equal(stats.participants.find((user) => user.userId === 'reader-a').months['2026-03'], 9);
assert.equal(stats.participants.find((user) => user.userId === 'reader-b').months['2026-04'], 3);

const progressResponse = await internal('/admin/challenges/posts/progress', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'p1', achievement: 8, adminId: 'admin' }),
});
assert.equal(progressResponse.status, 200);
const correctedStats = await (await internal('/admin/challenges/stats?boardId=reading-2026')).json();
assert.equal(correctedStats.participants.find((user) => user.userId === 'reader-a').achieved, 12);
assert.equal(correctedStats.participants.find((user) => user.userId === 'reader-a').rate, 150);

assert.equal((await internal('/admin/challenges/boards/save', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'paged-stats', name: '다수 참여자 집계', type: '독서', startDate: '2026-01-01', endDate: '2026-12-31', target: 8, unit: '권' }),
})).status, 201);
for (let index = 1; index <= 51; index += 1) {
  assert.equal((await internal('/challenges/posts', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ postId: `stats-${index}`, boardId: 'paged-stats', authorId: `stats-user-${String(index).padStart(2, '0')}`, title: `집계 페이지 검사 ${index}`, body: '참여자 50명 초과 페이지를 확인합니다.', achievement: 0 }),
  })).status, 201);
}
const pagedStatsFirst = await (await internal('/admin/challenges/stats?boardId=paged-stats&page=1')).json();
const pagedStatsSecond = await (await internal('/admin/challenges/stats?boardId=paged-stats&page=2')).json();
assert.equal(pagedStatsFirst.participants.length, 50);
assert.equal(pagedStatsFirst.totalPages, 2);
assert.equal(pagedStatsSecond.participants.length, pagedStatsSecond.total - 50);

const commentResponse = await internal('/challenges/comments', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'p1', authorId: 'reader-b', body: '완주를 응원합니다! 📚' }),
});
assert.equal(commentResponse.status, 201);
const detail = await (await internal('/challenges/post?postId=p1')).json();
assert.equal(detail.comments[0].body, '완주를 응원합니다! 📚');

const scriptText = '<img src=x onerror=alert(1)> 안전한 텍스트 📚';
assert.equal((await internal('/challenges/comments', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'p1', authorId: 'reader-b', body: scriptText }),
})).status, 201);
const escapedDetail = await (await internal('/challenges/post?postId=p1')).json();
assert.equal(escapedDetail.comments.some((comment) => comment.body === scriptText), true);
assert.match(readFileSync(new URL('../public/app.js', import.meta.url), 'utf8'), /escapeHtml\(comment\.body\)/);
assert.equal((await internal('/challenges/comments', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'p1', authorId: 'reader-b', body: '가'.repeat(2001) }),
})).status, 400);
assert.equal((await internal('/challenges/posts', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'too-long', boardId: 'reading-2026', authorId: 'reader-long', title: '가'.repeat(201), body: '본문', achievement: 1 }),
})).status, 400);

for (let index = 1; index <= 11; index += 1) {
  assert.equal((await internal('/challenges/posts', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ postId: `page-${index}`, boardId: 'reading-2026', authorId: `page-user-${index}`, title: `페이지 검사 ${index}`, body: '페이지당 열 개를 확인합니다.', achievement: 0 }),
  })).status, 201);
}
const firstPage = await (await internal('/challenges/posts?boardId=reading-2026&page=1')).json();
assert.equal(firstPage.posts.length, 10);
assert.equal(firstPage.totalPages, 2);
const searchedPosts = await (await internal('/challenges/posts?boardId=reading-2026&page=1&query=page-user-11')).json();
assert.equal(searchedPosts.total, 1);

const loginResponse = await worker.fetch(new Request('https://gmuc.test/api/account/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'upload-user', password: 'test-password' }),
}), env, {});
assert.equal(loginResponse.status, 200);
const cookie = loginResponse.headers.get('set-cookie').split(';')[0];
const form = new FormData();
form.set('title', '첨부 이미지가 있는 기록');
form.set('body', '안전한 PNG 첨부를 시험합니다.');
form.set('achievement', '1');
form.append('files', new File([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0])], 'proof.png', { type: 'image/png' }));
const uploadResponse = await worker.fetch(new Request('https://gmuc.test/api/challenges/reading-2026/posts', { method: 'POST', headers: { cookie }, body: form }), env, {});
assert.equal(uploadResponse.status, 201);
const uploadResult = await uploadResponse.json();
assert.equal(r2.objects.size, 1);
const uploadedDetail = await (await internal(`/challenges/post?postId=${uploadResult.postId}`)).json();
assert.equal(uploadedDetail.post.authorId, 'upload-user');
assert.equal(uploadedDetail.attachments.length, 1);

const attachmentResponse = await worker.fetch(new Request(`https://gmuc.test/api/challenges/attachments/${uploadedDetail.attachments[0].id}`), env, {});
assert.equal(attachmentResponse.status, 200);
assert.equal(attachmentResponse.headers.get('content-type'), 'image/png');

const invalidForm = new FormData();invalidForm.set('title', '잘못된 파일');invalidForm.set('body', '실행 파일 차단');invalidForm.set('achievement', '1');invalidForm.append('files', new File(['MZ executable'], 'bad.exe', { type: 'application/octet-stream' }));
const invalidUpload = await worker.fetch(new Request('https://gmuc.test/api/challenges/reading-2026/posts', { method: 'POST', headers: { cookie }, body: invalidForm }), env, {});
assert.equal(invalidUpload.status, 415);

const tenFileLogin = await worker.fetch(new Request('https://gmuc.test/api/account/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'ten-file-user', password: 'test-password' }),
}), env, {});
const tenFileCookie = tenFileLogin.headers.get('set-cookie').split(';')[0];
const tenFileForm = new FormData();tenFileForm.set('title', '첨부파일 열 개');tenFileForm.set('body', '허용 개수 경계값');tenFileForm.set('achievement', '1');
for (let index = 1; index <= 10; index += 1) tenFileForm.append('files', new File([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,index])], `proof-${index}.png`, { type: 'image/png' }));
assert.equal((await worker.fetch(new Request('https://gmuc.test/api/challenges/reading-2026/posts', { method: 'POST', headers: { cookie: tenFileCookie }, body: tenFileForm }), env, {})).status, 201);
assert.equal(r2.objects.size, 11);

const elevenFileForm = new FormData();elevenFileForm.set('title', '첨부파일 열한 개');elevenFileForm.set('body', '허용 개수 초과');elevenFileForm.set('achievement', '1');
for (let index = 1; index <= 11; index += 1) elevenFileForm.append('files', new File([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,index])], `too-many-${index}.png`, { type: 'image/png' }));
assert.equal((await worker.fetch(new Request('https://gmuc.test/api/challenges/reading-2026/posts', { method: 'POST', headers: { cookie: tenFileCookie }, body: elevenFileForm }), env, {})).status, 400);
assert.equal(r2.objects.size, 11);

const adminDeletePost = await worker.fetch(new Request('https://gmuc.test/api/admin/challenges/posts/delete', {
  method: 'POST', headers: { 'content-type': 'application/json', cookie: adminCookie }, body: JSON.stringify({ postId: uploadResult.postId }),
}), env, {});
assert.equal(adminDeletePost.status, 200);
assert.equal(r2.objects.size, 10);

const deleteTenFileAccount = await worker.fetch(new Request('https://gmuc.test/api/account/delete', {
  method: 'POST', headers: { 'content-type': 'application/json', cookie: tenFileCookie }, body: JSON.stringify({ password: 'test-password' }),
}), env, {});
assert.equal(deleteTenFileAccount.status, 200);
assert.equal(r2.objects.size, 0);

const deleteAccountResponse = await worker.fetch(new Request('https://gmuc.test/api/account/delete', {
  method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ password: 'test-password' }),
}), env, {});
assert.equal(deleteAccountResponse.status, 200);
assert.equal(r2.objects.size, 0);
assert.equal(sql.exec('SELECT post_id FROM challenge_posts WHERE author_id=?', 'upload-user').length, 0);

const endedBoardResponse = await internal('/admin/challenges/boards/save', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'ended', name: '종료 챌린지', type: '독서', startDate: '2020-01-01', endDate: '2020-12-31', target: 8, unit: '권' }),
});
assert.equal(endedBoardResponse.status, 201);
const endedPostResponse = await internal('/challenges/posts', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'ended-post', boardId: 'ended', authorId: 'reader-a', title: '종료 후 작성', body: '작성 불가', achievement: 1 }),
});
assert.equal(endedPostResponse.status, 409);

const now = Math.floor(Date.now() / 1000);
sql.exec('INSERT INTO challenge_posts(post_id,board_id,author_id,title,body,achievement,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', 'ended-existing', 'ended', 'reader-a', '종료 전 작성된 글', '기존 글은 열람할 수 있습니다.', 1, now, now);
assert.equal((await internal('/challenges/comments', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'ended-existing', authorId: 'reader-b', body: '종료 후 댓글' }),
})).status, 409);

assert.equal((await internal('/admin/challenges/boards/save', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'scheduled', name: '예정 챌린지', type: '필사', startDate: '2099-01-01', endDate: '2099-12-31', target: 8, unit: '회' }),
})).status, 201);
assert.equal((await internal('/challenges/posts', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'scheduled-post', boardId: 'scheduled', authorId: 'reader-a', title: '시작 전 작성', body: '작성 불가', achievement: 1 }),
})).status, 409);

assert.equal((await internal('/admin/challenges/boards/save', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'cross-year', name: '연도 전환 챌린지', type: '독서', startDate: '2026-12-01', endDate: '2027-02-28', target: 0, unit: '권' }),
})).status, 201);
sql.exec('INSERT INTO challenge_posts(post_id,board_id,author_id,title,body,achievement,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', 'zero-target-post', 'cross-year', 'reader-zero', '목표 0 검사', '달성률은 계산하지 않습니다.', 2, Math.floor(Date.parse('2026-12-15T03:00:00Z') / 1000), now);
const crossYearStats = await (await internal('/admin/challenges/stats?boardId=cross-year')).json();
assert.deepEqual(crossYearStats.months, ['2026-12', '2027-01', '2027-02']);
assert.equal(crossYearStats.participants[0].rate, null);

const deletePagePost = await internal('/admin/challenges/posts/delete', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId: 'page-1', adminId: 'admin' }),
});
assert.equal(deletePagePost.status, 200);
const afterDeletePage = await (await internal('/challenges/posts?boardId=reading-2026&page=1&query=page-user-1')).json();
assert.equal(afterDeletePage.total, 2);
assert.equal(afterDeletePage.posts.some((post) => post.id === 'page-1'), false);

console.log('챌린지 게시판·월별 통계·첨부 저장소 테스트 통과');
