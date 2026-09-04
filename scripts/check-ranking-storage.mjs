import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(resolve(root, 'ranking-storage-lock.json'), 'utf8'));
const configText = readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8');
const workerText = readFileSync(resolve(root, 'worker.js'), 'utf8');
const config = JSON.parse(configText.replace(/^\s*\/\/.*$/gm, ''));

const errors = [];
const binding = config.durable_objects?.bindings?.find(item => item.name === lock.bindingName);
const migrations = config.migrations || [];
const sqliteClasses = migrations.flatMap(item => item.new_sqlite_classes || []);
const r2Binding = config.r2_buckets?.find(item => item.binding === lock.challengeFileBinding);

if (config.account_id !== lock.accountId) errors.push(`Cloudflare 계정 ID가 ${lock.accountId}와 다릅니다.`);
if (config.name !== lock.workerName) errors.push(`Worker 이름이 ${lock.workerName}와 다릅니다.`);
if (!binding) errors.push(`Durable Object 바인딩 ${lock.bindingName}을 찾을 수 없습니다.`);
if (binding?.class_name !== lock.className) errors.push(`Durable Object 클래스가 ${lock.className}와 다릅니다.`);
if (!r2Binding) errors.push(`첨부파일 R2 바인딩 ${lock.challengeFileBinding}을 찾을 수 없습니다.`);
if (r2Binding?.bucket_name !== lock.challengeBucketName) errors.push(`첨부파일 R2 버킷이 ${lock.challengeBucketName}와 다릅니다.`);
if (!sqliteClasses.includes(lock.className)) errors.push(`${lock.className}의 SQLite 마이그레이션이 유지되지 않았습니다.`);
if (migrations.some(item => item.deleted_classes || item.renamed_classes || item.transferred_classes)) {
  errors.push('랭킹 저장소를 삭제·이름 변경·이전하는 마이그레이션이 포함되어 있습니다.');
}

const escapedBinding = lock.bindingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapedObject = lock.objectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const objectPattern = new RegExp(`env\\.${escapedBinding}\\.idFromName\\(\\s*['\"]${escapedObject}['\"]\\s*\\)`);
if (!objectPattern.test(workerText)) errors.push(`랭킹 객체 키 ${lock.objectName} 연결을 찾을 수 없습니다.`);
if (!new RegExp(`export\\s+class\\s+${lock.className}\\b`).test(workerText)) errors.push(`${lock.className} export를 찾을 수 없습니다.`);

if (errors.length) {
  console.error('랭킹 저장소 안전 검사 실패:');
  errors.forEach(error => console.error(`- ${error}`));
  console.error('이 상태로 배포하면 기존 추천도서 랭킹과 다른 저장소에 연결될 수 있어 배포를 중단합니다.');
  process.exit(1);
}

console.log(`랭킹 저장소 연결 확인: ${lock.workerName}/${lock.className}/${lock.objectName}`);
console.log(`챌린지 첨부 저장소 연결 확인: ${lock.challengeFileBinding}/${lock.challengeBucketName}`);
