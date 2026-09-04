import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker, { RankingStore } from '../worker.js';

class SqlStorage {
  constructor() {
    this.database = new DatabaseSync(':memory:');
  }

  exec(query, ...bindings) {
    const statement = String(query).trim();
    if (!bindings.length && /;\s*\S/.test(statement)) {
      this.database.exec(statement);
      return [];
    }
    if (/^(SELECT|PRAGMA|WITH)\b/i.test(statement) || /\bRETURNING\b/i.test(statement)) {
      return this.database.prepare(statement).all(...bindings);
    }
    this.database.prepare(statement).run(...bindings);
    return [];
  }
}

const sql = new SqlStorage();
const store = new RankingStore({
  storage: { sql },
  blockConcurrencyWhile(callback) {
    return callback();
  },
});

const now = Math.floor(Date.now() / 1000);

const initialEmailResponse = await store.fetch(new Request('https://rankings.internal/admin/settings/access-verify', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'current@gmuc.or.kr', verificationVersion: 'v1', mode: 'initial' }),
}));
assert.equal(initialEmailResponse.status, 200);

const changedEmailResponse = await store.fetch(new Request('https://rankings.internal/admin/settings/access-verify', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'successor@gmuc.or.kr', verificationVersion: 'v1', mode: 'change' }),
}));
assert.equal(changedEmailResponse.status, 200);

const changedSettingsResponse = await store.fetch(new Request('https://rankings.internal/admin/settings'));
const changedSettings = await changedSettingsResponse.json();
assert.equal(changedSettings.email, 'successor@gmuc.or.kr');
assert.equal(changedSettings.sessionEpoch, 1);

sql.exec(
  "INSERT INTO accounts(user_id,display_name,email,password_hash,password_salt,created_at,last_login_at) VALUES(?,?,?,?,?,?,?)",
  'server-user',
  'server-user',
  '',
  'hash',
  'salt',
  now - 100,
  now - 50,
);
sql.exec(
  "INSERT INTO favorites(user_id,book_key,title,authors,publisher,published_date,isbn,thumbnail,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
  'account:legacy-user',
  'legacy-book',
  '과거 도서',
  '[]',
  '출판사',
  '2025',
  '9780000000001',
  '',
  now - 200,
);
sql.exec(
  "INSERT INTO favorites(user_id,book_key,title,authors,publisher,published_date,isbn,thumbnail,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
  'account:server-user',
  'server-book',
  '서버 도서',
  '[]',
  '출판사',
  '2026',
  '9780000000002',
  '',
  now - 20,
);
sql.exec(
  "INSERT INTO favorites(user_id,book_key,title,authors,publisher,published_date,isbn,thumbnail,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
  'account:odd id!@#',
  'server-book',
  '같은 종류의 도서',
  '[]',
  '출판사',
  '2026',
  '9780000000002',
  '',
  now - 15,
);
sql.exec(
  "INSERT INTO favorites(user_id,book_key,title,authors,publisher,published_date,isbn,thumbnail,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
  'account:admin',
  'admin-book',
  '관리자 도서',
  '[]',
  '출판사',
  '2026',
  '9780000000004',
  '',
  now - 12,
);
sql.exec(
  "INSERT INTO favorites(user_id,book_key,title,authors,publisher,published_date,isbn,thumbnail,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
  'guest:device-id',
  'guest-book',
  '방문자 도서',
  '[]',
  '출판사',
  '2026',
  '9780000000003',
  '',
  now - 10,
);

const usersResponse = await store.fetch(new Request('https://rankings.internal/admin/users'));
const users = await usersResponse.json();
assert.equal(users.summary.userCount, 4);
assert.equal(users.summary.bookCount, 4);
assert.equal(users.summary.bookTypeCount, 3);
assert.equal(users.users[0].userId, 'admin');
assert.equal(users.users[0].isAdmin, true);
assert.deepEqual(new Set(users.users.map((user) => user.userId)), new Set(['admin', 'legacy-user', 'server-user', 'odd id!@#']));
assert.equal(users.users.find((user) => user.userId === 'legacy-user').recommendedBookCount, 1);

const filteredUsersResponse = await store.fetch(new Request('https://rankings.internal/admin/users?query=no-match'));
const filteredUsers = await filteredUsersResponse.json();
assert.deepEqual(filteredUsers.users.map((user) => user.userId), ['admin']);

const resetResponse = await store.fetch(new Request('https://rankings.internal/admin/users/password/reset', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'legacy-user', resetHash: 'reset-hash', resetSalt: 'reset-salt' }),
}));
assert.equal(resetResponse.status, 200);

const authInfoResponse = await store.fetch(new Request('https://rankings.internal/account/auth-info?userId=legacy-user'));
const authInfo = await authInfoResponse.json();
assert.equal(authInfo.exists, true);
assert.equal(authInfo.mustReset, true);
assert.equal(authInfo.resetSalt, 'reset-salt');

const recommendationResetResponse = await store.fetch(new Request('https://rankings.internal/admin/users/recommendations/reset', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'legacy-user' }),
}));
assert.equal(recommendationResetResponse.status, 200);

const unusualIdResetResponse = await store.fetch(new Request('https://rankings.internal/admin/users/recommendations/reset', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'odd id!@#' }),
}));
assert.equal(unusualIdResetResponse.status, 200);

const adminResetResponse = await store.fetch(new Request('https://rankings.internal/admin/users/recommendations/reset', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'admin' }),
}));
assert.equal(adminResetResponse.status, 200);

const usersAfterResetResponse = await store.fetch(new Request('https://rankings.internal/admin/users'));
const usersAfterReset = await usersAfterResetResponse.json();
assert.equal(usersAfterReset.summary.userCount, 4);
assert.equal(usersAfterReset.summary.bookCount, 1);
assert.equal(usersAfterReset.summary.bookTypeCount, 1);
assert.equal(usersAfterReset.users[0].userId, 'admin');
assert.equal(usersAfterReset.users[0].recommendedBookCount, 0);
assert.equal(usersAfterReset.users.find((user) => user.userId === 'legacy-user').recommendedBookCount, 0);
assert.equal(usersAfterReset.users.find((user) => user.userId === 'odd id!@#').recommendedBookCount, 0);

sql.exec(
  'INSERT INTO recommendation_sessions(user_id,book_count,profile_json,created_at) VALUES(?,?,?,?)',
  'server-user',
  3,
  '{}',
  now,
);
const rejectedDeleteResponse = await store.fetch(new Request('https://rankings.internal/account/delete', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'server-user', passwordHash: 'wrong-hash' }),
}));
assert.equal(rejectedDeleteResponse.status, 401);

const deleteResponse = await store.fetch(new Request('https://rankings.internal/account/delete', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'server-user', passwordHash: 'hash' }),
}));
assert.equal(deleteResponse.status, 200);
const deletedAccount = sql.exec('SELECT user_id FROM accounts WHERE user_id=?', 'server-user');
const deletedRegistry = sql.exec('SELECT user_id FROM user_registry WHERE user_id=?', 'server-user');
const deletedFavorites = sql.exec('SELECT user_id FROM favorites WHERE user_id=?', 'account:server-user');
const deletedRecommendations = sql.exec('SELECT user_id FROM recommendation_sessions WHERE user_id=?', 'server-user');
assert.equal(deletedAccount.length, 0);
assert.equal(deletedRegistry.length, 0);
assert.equal(deletedFavorites.length, 0);
assert.equal(deletedRecommendations.length, 0);

const paperFavorite = {
  type: 'paper',
  title: 'Effects of User Innovation Activities on Innovation Performance',
  authors: ['Eun-Hwa Lee', 'Jae-Wook Yoo'],
  publisher: 'Korean Corporation Management Review',
  publishedDate: '2021',
  doi: 'https://doi.org/10.21052/kcmr.2021.28.2.02',
  landingUrl: 'https://doi.org/10.21052/kcmr.2021.28.2.02',
  match: 49,
};
const paperSaveResponse = await store.fetch(new Request('https://rankings.internal/favorite', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'guest:paper-test', saved: true, book: paperFavorite }),
}));
assert.equal(paperSaveResponse.status, 200);
const paperShelfResponse = await store.fetch(new Request('https://rankings.internal/shelf?userId=guest%3Apaper-test'));
const paperShelf = await paperShelfResponse.json();
assert.equal(paperShelf.books[0].type, 'paper');
assert.equal(paperShelf.books[0].doi, paperFavorite.doi);
assert.equal(paperShelf.books[0].landingUrl, paperFavorite.landingUrl);
assert.equal(paperShelf.books[0].match, 49);
const paperRankingsResponse = await store.fetch(new Request('https://rankings.internal/rankings'));
const paperRankings = await paperRankingsResponse.json();
assert.equal(paperRankings.books.find((book) => book.title === paperFavorite.title)?.type, 'paper');

const workerEnv = {
  ADMIN_SESSION_SECRET: 'account-test-secret',
  RANKINGS: {
    idFromName(name) {
      return name;
    },
    get() {
      return store;
    },
  },
};
const accountLoginResponse = await worker.fetch(new Request('https://gmuc.test/api/account/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'delete-test', password: 'test-password' }),
}), workerEnv, {});
assert.equal(accountLoginResponse.status, 200);
const userCookie = accountLoginResponse.headers.get('set-cookie').split(';')[0];

const wrongPasswordDeleteResponse = await worker.fetch(new Request('https://gmuc.test/api/account/delete', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie: userCookie },
  body: JSON.stringify({ password: 'wrong-password' }),
}), workerEnv, {});
assert.equal(wrongPasswordDeleteResponse.status, 401);

const accountDeleteResponse = await worker.fetch(new Request('https://gmuc.test/api/account/delete', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie: userCookie },
  body: JSON.stringify({ password: 'test-password' }),
}), workerEnv, {});
assert.equal(accountDeleteResponse.status, 200);
assert.match(accountDeleteResponse.headers.get('set-cookie'), /Max-Age=0/);

const deletedSessionResponse = await worker.fetch(new Request('https://gmuc.test/api/account/session', {
  headers: { cookie: userCookie },
}), workerEnv, {});
assert.equal(deletedSessionResponse.status, 401);

console.log('관리자 사용자 저장소 회귀 테스트 통과');
