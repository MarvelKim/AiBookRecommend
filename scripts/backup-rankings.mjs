import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(resolve(root, 'ranking-storage-lock.json'), 'utf8'));

export async function backupRankings(label = 'manual') {
  const response = await fetch(`${lock.liveOrigin}/api/rankings?backup=${Date.now()}`, {
    headers: { accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`랭킹 API 응답 오류: HTTP ${response.status}`);

  const payload = await response.json();
  if (!Array.isArray(payload.books)) throw new Error('랭킹 API 응답 형식이 올바르지 않습니다.');

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupDir = resolve(root, '.ranking-backups');
  const backupPath = resolve(backupDir, `${timestamp}-${label}.json`);
  const totalFavorites = payload.books.reduce((sum, book) => sum + Number(book.favoriteCount || 0), 0);
  const backup = {
    createdAt: now.toISOString(),
    source: `${lock.liveOrigin}/api/rankings`,
    storage: lock,
    summary: { rankedBooks: payload.books.length, totalFavorites },
    books: payload.books
  };

  mkdirSync(backupDir, { recursive: true });
  writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
  console.log(`랭킹 백업 완료: ${backupPath}`);
  console.log(`랭킹 도서 ${payload.books.length}권 / 즐겨찾기 합계 ${totalFavorites}건`);
  return backup;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  backupRankings().catch(error => {
    console.error(`랭킹 백업 실패: ${error.message}`);
    process.exit(1);
  });
}
