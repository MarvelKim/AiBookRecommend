import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(resolve(root, 'ranking-storage-lock.json'), 'utf8'));

async function fetchJson(path) {
  const response = await fetch(`${lock.liveOrigin}${path}`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' }
  });
  if (!response.ok) throw new Error(`${path} 응답 오류: HTTP ${response.status}`);
  return response.json();
}

async function mapInBatches(items, size, task) {
  const results = [];
  for (let index = 0; index < items.length; index += size) {
    results.push(...await Promise.all(items.slice(index, index + size).map(task)));
  }
  return results;
}

export async function backupChallenges(label = 'manual') {
  const boardPayload = await fetchJson(`/api/challenges?backup=${Date.now()}`);
  if (!Array.isArray(boardPayload.boards)) throw new Error('챌린지 게시판 응답 형식이 올바르지 않습니다.');
  const boards = boardPayload.boards;
  const postSummaries = [];

  for (const board of boards) {
    let page = 1;
    let totalPages = 1;
    do {
      const payload = await fetchJson(`/api/challenges/${encodeURIComponent(board.id)}/posts?page=${page}&backup=${Date.now()}`);
      if (!Array.isArray(payload.posts)) throw new Error(`${board.name} 게시글 응답 형식이 올바르지 않습니다.`);
      postSummaries.push(...payload.posts);
      totalPages = Math.max(1, Number(payload.totalPages) || 1);
      page += 1;
    } while (page <= totalPages);
  }

  const uniquePosts = [...new Map(postSummaries.map(post => [post.id, post])).values()];
  const details = await mapInBatches(uniquePosts, 8, post => fetchJson(`/api/challenges/posts/${encodeURIComponent(post.id)}?backup=${Date.now()}`));
  const comments = details.flatMap(detail => detail.comments || []);
  const attachments = details.flatMap(detail => (detail.attachments || []).map(file => ({
    ...file,
    postId: detail.post.id,
    storageKey: `challenge/${detail.post.id}/${file.id}`
  })));
  const achievementTotal = details.reduce((sum, detail) => sum + Number(detail.post?.achievement || 0), 0);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupDir = resolve(root, '.challenge-backups');
  const backupPath = resolve(backupDir, `${timestamp}-${label}.json`);
  const snapshot = {
    createdAt: now.toISOString(),
    source: `${lock.liveOrigin}/api/challenges`,
    storage: {
      accountId: lock.accountId,
      workerName: lock.workerName,
      durableObjectBinding: lock.bindingName,
      durableObjectClass: lock.className,
      durableObjectName: lock.objectName,
      r2Binding: lock.challengeFileBinding,
      r2Bucket: lock.challengeBucketName
    },
    scope: '공개 목록에 포함된 진행·예정·종료 게시판 전체',
    summary: {
      boards: boards.length,
      posts: details.length,
      comments: comments.length,
      attachments: attachments.length,
      achievementTotal
    },
    boards,
    details,
    attachments
  };

  mkdirSync(backupDir, { recursive: true });
  writeFileSync(backupPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`챌린지 백업 완료: ${backupPath}`);
  console.log(`게시판 ${snapshot.summary.boards}개 / 게시글 ${snapshot.summary.posts}개 / 댓글 ${snapshot.summary.comments}개 / 첨부 ${snapshot.summary.attachments}개`);
  return snapshot;
}

export function assertChallengePreserved(before, after) {
  const entityIds = snapshot => ({
    boards: new Set(snapshot.boards.map(board => board.id)),
    posts: new Set(snapshot.details.map(detail => detail.post.id)),
    comments: new Set(snapshot.details.flatMap(detail => detail.comments || []).map(comment => comment.id)),
    attachments: new Set(snapshot.attachments.map(file => file.id))
  });
  const beforeIds = entityIds(before);
  const afterIds = entityIds(after);
  const missing = [];
  for (const type of Object.keys(beforeIds)) {
    for (const id of beforeIds[type]) if (!afterIds[type].has(id)) missing.push(`${type}:${id}`);
  }
  if (missing.length) throw new Error(`배포 뒤 사라진 챌린지 데이터가 있습니다: ${missing.slice(0, 10).join(', ')}`);
  return true;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  backupChallenges().catch(error => {
    console.error(`챌린지 백업 실패: ${error.message}`);
    process.exit(1);
  });
}
