import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backupRankings } from './backup-rankings.mjs';
import { assertChallengePreserved, backupChallenges } from './backup-challenges.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const npxCommand = isWindows ? 'npx.cmd' : 'npx';

function run(command, args) {
  const result = isWindows
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], { cwd: root, stdio: 'inherit' })
    : spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

run(npmCommand, ['run', 'check']);
run(npmCommand, ['run', 'check:ranking-storage']);

let before;
let challengeBefore;
try {
  before = await backupRankings('before-deploy');
  challengeBefore = await backupChallenges('before-deploy');
} catch (error) {
  console.error(`배포 전 데이터 백업에 실패하여 배포를 중단합니다: ${error.message}`);
  process.exit(1);
}

run(npxCommand, ['wrangler', 'deploy', '--keep-vars']);

try {
  const after = await backupRankings('after-deploy');
  const challengeAfter = await backupChallenges('after-deploy');
  if (before.summary.rankedBooks > 0 && after.summary.rankedBooks === 0) {
    console.error('경고: 배포 뒤 랭킹이 비어 있습니다. 배포 전 백업 파일을 보존하고 즉시 원인을 확인하세요.');
    process.exit(2);
  }
  assertChallengePreserved(challengeBefore, challengeAfter);
  console.log('배포 전·후 추천 DB·챌린지 게시글 보존 확인 완료');
} catch (error) {
  console.error(`배포 후 데이터 확인 실패: ${error.message}`);
  process.exit(2);
}
