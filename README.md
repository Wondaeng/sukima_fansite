# 스키마스위치 비공식 콜가이드

모바일 우선으로 만든 정적 SPA입니다.

- UI: React 19
- 빌드 도구: Vite 8
- 클라이언트 라우팅: React Router 7
- 배포: Vercel 정적 배포
- 권장 Node.js: 22.x

Next.js, Vinext, Nitro, Cloudflare Worker는 사용하지 않습니다.

## 로컬 실행

프로젝트 루트에서 다음 명령을 실행합니다.

```bash
npm install
npm run dev
```

프로덕션 빌드 확인:

```bash
npm run build
npm run preview
```

## Vercel 배포

`dist` 폴더만 직접 올리는 방식이 아니라, 이 프로젝트 폴더 전체를 GitHub
저장소에 올린 뒤 Vercel이 소스를 빌드하도록 배포합니다. `node_modules`,
`dist`, `.env`는 Git에 올리지 않습니다.

1. GitHub에 이 프로젝트 루트의 소스를 push합니다.
2. Vercel 대시보드에서 **Add New → Project**를 누릅니다.
3. 방금 올린 GitHub 저장소를 Import합니다.
4. 설정을 다음과 같이 확인합니다.
   - Framework Preset: `Vite`
   - Root Directory: `.`
   - Install Command: `npm install` (기본값 사용 가능)
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. 개발자용 편집 기능이 필요한 임시 배포라면 Environment Variables에
   `VITE_ENABLE_CONTENT_TOOLS` = `true`를 추가합니다.
6. Deploy를 누릅니다.

라우트 새로고침은 `vercel.json`의 SPA rewrite가 처리하므로
`/call-guide/zenryoku-shonen` 같은 주소로 바로 들어가도 404가 나지 않습니다.

공개용 배포에서 편집 기능을 숨기려면 Vercel 환경변수
`VITE_ENABLE_CONTENT_TOOLS`를 삭제하거나 `false`로 바꾼 뒤 Redeploy합니다.
이 기능은 화면 노출을 제어하는 개발 도구일 뿐 인증 기능은 아닙니다.

## 콘텐츠 수정 위치

- 곡 목록·영상·가사: `src/call-guide/songs/<slug>.json`
- 음절·콜·동작·간주 싱크: `src/call-guide/song-sync/<slug>.json`
- 메인 화면: `src/page.tsx`
- 공연 정보 (`/shows`): `src/shows/page.tsx`
- 퀴즈 화면 (`/quiz`): `src/quiz/page.tsx`
- 쉬움 퀴즈 문제·보기·정답·해설: `src/quiz/questions.ts` (`answer`는 0부터 시작하는 보기 번호)
- 공연·퀴즈 스타일: `src/fan-pages.css`
- 전체 스타일: `src/globals.css`

개발자 도구 주소:

- 곡 목록 편집: `/call-guide?edit=1`
- 곡 가사 편집: `/call-guide/<slug>?edit=1`
- 재생 싱크 편집: `/call-guide/<slug>?sync=1`

브라우저에서 내보낸 JSON은 해당 곡의 위 파일에 반영하고 다시 배포합니다.

## 오프라인 및 이미지 저장

- 배포 사이트에 접속하면 Service Worker가 전체 곡의 가사·콜 데이터와 앱 파일을 자동 저장합니다. 곡 목록이나 곡 페이지의 `오프라인 저장 완료` 표시를 확인한 뒤 오프라인으로 전환합니다.
- 같은 브라우저와 주소에서 다시 열 수 있으며, 인터넷이 끊기면 곡 페이지는 가사 전용 보기로 전환됩니다. 영상은 저장하지 않습니다. 브라우저 데이터 삭제·저장 공간 정리 시 캐시가 제거될 수 있습니다.
- 새 배포가 감지되면 `최신 가사로 업데이트` 버튼으로 새 버전을 적용합니다.
- 개발 서버는 Service Worker를 사용하지 않습니다. 검증은 `npm run build` 후 `npm run preview`로 진행합니다.
- 곡별 `한 장 이미지로 내보내기`는 3단 구성의 PNG를 기기에서 생성합니다. 원문·발음·콜/동작 안내가 포함되고 번역을 추가할 수 있습니다. `call` 표시가 있는 부분만 강조합니다.
- 미리보기에서 PNG 다운로드 또는 지원되는 모바일 브라우저의 저장/공유를 이용합니다. 이미지 생성은 오프라인에서도 가능합니다.

## 실행 명령어

- `npm run dev`: 로컬 개발 서버
- `npm run build`: 타입 검사 후 프로덕션 빌드
- `npm run preview`: 빌드 결과 로컬 미리보기
- `npm run lint`: 정적 코드 검사
