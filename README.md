# Discord Bot Builder (v2)

디스코드 봇을 노드로 설계하면, 그 흐름을 프롬프트로 컴파일해 AI가 실제 봇 코드(discord.js · TypeScript)를 만들어 주는 도구입니다.

```
캔버스(노드·연결) → Flow IR → 검증 → 프롬프트 컴파일 → AI 생성(files[]) → 미리보기·내보내기·실행
```

## 폴더

| 경로 | 내용 |
|---|---|
| `app/src/nodes/` | 노드 정의. 폼 필드, 출력 포트, 출력값, 검증 규칙, AI용 명세(`spec`), 필요한 인텐트·권한·환경변수(`requires`), 시뮬레이터 동작(`simulate`)이 노드마다 한 곳에 있습니다. 노드를 추가할 때는 `defs/*.ts`에 항목 하나를 넣으면 됩니다. |
| `app/src/flow/` | 그래프 모델, 변수 참조(`{{n3.result}}`, `{{env.KEY}}`), 검증기, 비밀값 탐지, 프로젝트 파일 포맷(`.dbb.json`) |
| `app/src/compiler/` | 흐름 → 프롬프트 컴파일러. 결정적이며, 작성자 문자열은 JSON 문자열로만 넣고 비밀값은 가립니다. |
| `app/src/sim/` | 흐름 시뮬레이터. 가짜 이벤트로 흐름을 실행하고, 디스코드 동작은 미리보기로, 외부 호출은 모의 값으로 바꿉니다. |
| `app/src/ai/` | 앱 안 생성: Claude 호출(지연 로딩), 결과 검증(경로·필수 파일·크기·비밀값), zip, API 키 보관 |
| `app/src/store/` | 프로젝트(실행 취소 포함), 검증 결과, UI 상태 |
| `app/src/editor/` | 캔버스, 노드 목록, 인스펙터, 문제 패널, 상단 바 |
| `legacy/` | v1 "Hybrid AI Bot Builder"(2026-02) 코드와 기획 문서. 참고용이며 요구사항이 아닙니다. |

## 실행

```bash
cd app
npm install
npm run dev
```

`npm test`는 검증기·컴파일러·파일 불러오기·생성 결과 검사 테스트를 돌립니다. `npm run build`는 타입 검사 후 `app/dist/`에 정적 파일을 만들고, 결과물에 CSP를 넣습니다. PR과 `main` 푸시마다 GitHub Actions가 두 명령을 실행합니다.

## 앱 안 생성과 API 키

생성 탭은 사용자 본인의 Anthropic API 키로 `claude-opus-5`(또는 `claude-sonnet-5`)를 호출합니다. 키는 브라우저에서 `api.anthropic.com`으로만 전송되며, 기본적으로 탭을 닫으면 잊습니다. "이 브라우저에 저장"을 켜면 localStorage에 남습니다. 거절된 요청은 서버 측 대체 모델(`fallbacks: "default"`)로 다시 실행됩니다.

## 로드맵

| 단계 | 내용 | 상태 |
|---|---|---|
| 0 | v1 → `legacy/`, 새 스택(React 19 · @xyflow/react 12 · Tailwind 4 · zod 4 · Vite 8) | 완료 |
| 1 | 에디터 코어: 노드 32종, 캔버스, 인스펙터, 실시간 검증, 자동 저장, 파일 저장·열기 | 완료 |
| 2 | 프롬프트 컴파일러(노드별 명세, 인텐트·권한 비트·환경변수·패키지 집계), 코딩 에이전트용/채팅 AI용 프롬프트 미리보기·복사·저장, 비밀값 차단 | 완료 |
| 3 | 앱 안 AI 생성(Claude, BYOK), 결과 검증, 파일 미리보기, zip 내보내기, CI와 테스트 | 완료 |
| 4a | 흐름 시뮬레이터: 가짜 이벤트 입력, 실행 경로 강조, 디스코드 메시지 미리보기, 단계별 기록, 저장 데이터·쿨다운 유지 | 완료 |
| 4b | Electron 래핑과 생성된 봇 로컬 실행(키·토큰은 main process + safeStorage) | 다음 |
| 이후 | 자연어로 흐름 초안 만들기, 커뮤니티 공유(서버 측 인가로 재설계) | |

## 알려진 문제

Node **v25.2.0**의 `fs.rmSync(..., { recursive: true })`는 Windows에서 경로에 한글이 있으면 크래시합니다(0xC0000409). 이 때문에 Vite의 출력 폴더 비우기 대신 `app/scripts/clean.mjs`를 씁니다. Node 24 LTS를 권장합니다.
