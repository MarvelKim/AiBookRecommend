# 구미도시공사 AI 북큐레이터

## 랭킹을 보존하는 배포

운영 사이트는 반드시 `npm run deploy`로 배포한다. 이 명령은 아래 순서로 동작한다.

1. Cloudflare 계정, Worker 이름, Durable Object 클래스와 랭킹 객체 키를 검사한다.
2. 현재 운영 랭킹을 `.ranking-backups` 폴더에 백업한다.
3. Worker를 배포한 뒤 운영 랭킹이 비어 있지 않은지 다시 확인한다.

`wrangler.jsonc`의 `account_id`, `name`, `RANKINGS` 바인딩과 `RankingStore`, `worker.js`의 `global-book-ranking`은 기존 데이터를 가리키는 식별자이므로 임의로 변경하지 않는다.

일반 홈페이지처럼 웹서버에서 `npm start`로 실행합니다. 기본적으로 `0.0.0.0:4180`에서 접속을 받으므로 운영 서버의 도메인을 연결해 사용할 수 있습니다. 서버 PC에서 확인할 때는 `http://localhost:4180`으로 접속합니다. Node.js 18 이상만 필요하며 별도 패키지 설치는 없습니다.

## 구현 기능

- 직렬·업무 분야, 독서 목적, 난이도, 분량 선택
- Google Books·네이버 책 최신 도서 검색과 ISBN 중복 제거
- OpenAI Responses API 기반 직무 적합도 분석(미설정 시 로컬 점수 계산)
- 교보문고 버튼·신간 제목 클릭 시 ISBN 우선 검색 연결
- 도서 표지를 사이트 프록시에서 검증·캐시하고 여러 공식 표지 원본으로 자동 대체
- PC·태블릿·모바일 반응형 화면
- ID·비밀번호만으로 즉시 생성되는 서버 계정과 안전한 비밀번호 초기화
- ID별 오늘의 즐겨찾기 저장 및 날짜 변경 시 나의 서재 자동 초기화
- 10가지 추천 조건과 조건별 추천 순위 변경
- 20권이 끊김 없이 오른쪽으로 순환하는 신간 도서 캐러셀
- 로그인 계정 기반 챌린지 게시판, 게시글, 댓글과 이모지
- JPG·PNG·WebP·GIF·PDF 첨부파일(게시글당 최대 10개, R2 저장)
- 관리자 챌린지 기간·목표 설정, 게시글 관리와 참여자별 월간 달성 현황·CSV
- 구미도시공사 홈페이지·유튜브·인스타그램 공식 채널 링크

계정 ID와 비밀번호 검증용 HMAC은 Cloudflare Durable Object에 저장됩니다. 이름과 이메일은 받지 않으며 비밀번호 원문도 저장하지 않습니다. 기존 브라우저 로컬 계정은 첫 정상 로그인 때 서버 계정으로 이전되며, 즐겨찾기 서재는 서버와 동기화됩니다.

## API 설정

`.env.example`을 복사해 `.env`로 만들고 사용할 서비스의 키를 입력합니다. `.env`는 Git에서 제외되며 API 키가 브라우저에 노출되지 않습니다.

- Google Books는 키 없이도 제한적으로 동작합니다.
- 네이버·OpenAI·도서관정보나루는 키가 있을 때 자동 활성화됩니다.
- 교보문고는 공개 상품 API가 없어 ISBN을 우선 사용하고, ISBN이 없을 때만 제목으로 공식 검색 결과에 연결합니다.

## 관리자 이메일 인증

운영 Worker에는 `ADMIN_INITIAL_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_EMAIL_VERIFICATION_VERSION`을 비밀값으로 등록합니다. 최초 인증 경로는 Cloudflare Access의 이메일 일회용 PIN으로 보호하며, Access JWT의 서명·발급자·대상·만료 시간과 이메일을 Worker에서 다시 검증합니다. 이메일 주소나 인증 버전을 바꾸면 기존 인증은 자동으로 무효화됩니다.

Cloudflare Access 연결값은 `ADMIN_ACCESS_ENABLED`, `ADMIN_ACCESS_TEAM_DOMAIN`, `ADMIN_ACCESS_AUD`로 설정합니다. Access 애플리케이션은 `/api/admin/email/access-verify` 경로만 보호하고 등록된 관리자 이메일 한 개만 허용해야 합니다.

일반 사용자 계정은 Durable Object의 `accounts` 테이블에 저장됩니다. 비밀번호 원문은 저장하지 않고 서버 비밀값으로 만든 검증용 HMAC만 보관합니다. 관리자는 이메일 인증 후 ID 검색, 누적 추천 권수 확인, 추천 기록 초기화, 30분짜리 비밀번호 초기화 코드 발급을 사용할 수 있습니다.

## 챌린지 첨부파일 저장소

챌린지 게시글과 댓글 메타데이터는 기존 `RankingStore`에 추가된 별도 SQLite 테이블에 저장하고, 첨부 원본은 `CHALLENGE_FILES` R2 바인딩으로 분리해 저장합니다. 기존 `RANKINGS` 바인딩, `RankingStore` 클래스와 `global-book-ranking` 객체 키는 변경하지 않습니다.

운영에 처음 반영하기 전 Cloudflare 계정에 아래 버킷을 한 번 생성해야 합니다. 이미 존재하면 다시 만들지 않습니다.

```powershell
npx wrangler r2 bucket create gmuc-challenge-files
```

전체 Worker 기능을 로컬에서 확인할 때는 `npx wrangler dev --local`을 사용합니다. `npm start`는 정적 화면과 기존 Node API를 빠르게 확인하기 위한 서버이므로 Durable Object와 R2 챌린지 저장소는 에뮬레이션하지 않습니다.

운영 반영은 화면 승인과 R2 버킷 확인 뒤 기존 안전 절차인 `npm run deploy`로만 진행합니다.
