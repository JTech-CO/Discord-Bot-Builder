<div align="center">

<img src="app/build/icon.svg" width="88" height="88" alt="Discord Bot Builder 로고">

# Discord Bot Builder

**디스코드 봇을 노드로 설계하면, AI가 실행할 수 있는 봇 코드를 만들어 줍니다.**

[![CI](https://github.com/JTech-CO/Discord-Bot-Builder/actions/workflows/ci.yml/badge.svg)](https://github.com/JTech-CO/Discord-Bot-Builder/actions/workflows/ci.yml)
[![version](https://img.shields.io/github/package-json/v/JTech-CO/Discord-Bot-Builder?filename=app%2Fpackage.json&label=version&color=5865F2)](app/package.json)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Web-2a2c33)
![UI](https://img.shields.io/badge/UI-%ED%95%9C%EA%B5%AD%EC%96%B4%20%7C%20English-2a2c33)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/github/package-json/dependency-version/JTech-CO/Discord-Bot-Builder/dev/react?filename=app%2Fpackage.json&logo=react&logoColor=white&label=React&color=087EA4)
![Electron](https://img.shields.io/github/package-json/dependency-version/JTech-CO/Discord-Bot-Builder/dev/electron?filename=app%2Fpackage.json&logo=electron&logoColor=white&label=Electron&color=47848F)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![discord.js](https://img.shields.io/badge/generates-discord.js-5865F2?logo=discord&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-Opus%205.5-D97757?logo=anthropic&logoColor=white)

<img src="docs/images/editor.png" alt="편집기: 왼쪽 노드 목록, 가운데 주사위 봇 흐름, 오른쪽 봇 설정" width="100%">

</div>

## 이렇게 동작합니다

```
캔버스(노드·연결) → 검증 → 프롬프트 컴파일 → Claude가 프로젝트 생성 → 미리보기 · zip · 이 PC에서 실행
```

1. **설계:** 트리거, 디스코드 동작, 흐름 제어, 데이터, 외부 연동 노드 32종을 캔버스에 놓고 잇습니다. 만들고 싶은 봇을 글로 설명하면 Claude가 초안 흐름을 그려 주기도 합니다.
2. **확인:** 디스코드나 AI 없이 앱 안에서 가짜 이벤트로 흐름을 실행해, 어떤 노드를 거쳤고 디스코드에 어떤 메시지가 보일지 미리 봅니다.
3. **생성:** 흐름을 결정적인 명세 프롬프트로 바꿔 Claude에게 보내면 discord.js · TypeScript 프로젝트가 돌아옵니다. 키가 없거나 다른 AI를 쓰려면 프롬프트를 복사해 붙여 넣으면 됩니다.
4. **실행:** 데스크톱 앱에서는 생성된 프로젝트를 폴더에 저장하고 설치·빌드·실행까지 한 번에 하며 로그를 봅니다.

## 화면

<table>
  <tr>
    <td width="50%"><img src="docs/images/simulator.png" alt="테스트 탭: 실행 경로가 강조된 캔버스와 디스코드 메시지 미리보기"></td>
    <td width="50%"><img src="docs/images/generate.png" alt="생성 탭: 생성된 파일 목록과 문법 강조된 코드"></td>
  </tr>
  <tr>
    <td><b>테스트</b> · 가짜 이벤트로 흐름을 돌려 지나간 경로와 디스코드에 보일 메시지를 확인합니다.</td>
    <td><b>생성</b> · Claude가 만든 프로젝트를 파일별로, 문법 색상과 함께 봅니다.</td>
  </tr>
  <tr>
    <td><img src="docs/images/setup.png" alt="생성 요약: 디스코드 개발자 포털 준비 단계와 봇 초대 링크"></td>
    <td><img src="docs/images/english.png" alt="영어 화면에서 테스트를 실행한 모습"></td>
  </tr>
  <tr>
    <td><b>디스코드 준비 안내</b> · 토큰과 ID를 어디서 가져오는지, 켤 인텐트, 권한이 담긴 초대 링크까지 알려 줍니다.</td>
    <td><b>한국어 · English</b> · 상단의 KO / EN으로 화면 언어를 바로 바꿉니다.</td>
  </tr>
</table>

## 주요 기능

- **노드 32종:** 슬래시 명령어, 메시지·버튼·모달·반응·음성·예약 트리거, 메시지·모달·역할·제재 동작, 조건·분기·확률·쿨다운, 저장 데이터·계산, HTTP·AI·웹훅·RSS, 그리고 노드로 표현하기 어려운 동작을 말로 맡기는 노드.
- **실시간 검증:** 빈 칸, 형식, 변수 참조(`{{n3.result}}`), 값의 종류, 연결되지 않은 노드, 순환, 비밀값이 섞인 입력을 문제 탭에 바로 보여 줍니다.
- **프롬프트 컴파일러:** 같은 흐름이면 늘 같은 프롬프트를 만들고, 필요한 인텐트·권한 비트·환경변수·패키지를 모읍니다. 작성자가 쓴 글은 JSON 문자열로만 넣고 비밀값은 가립니다.
- **생성 결과 검사:** 경로, 필수 파일, 크기, 비밀값을 검사하고, 지금 흐름과 다른 흐름으로 만든 결과는 따로 표시합니다.
- **데스크톱 앱:** API 키와 봇 토큰은 운영체제의 암호화 저장소에 보관하고, 생성된 봇은 설치 스크립트를 끈 채 설치·빌드·실행합니다.

## 시작하기

**Windows · macOS:** [설치 파일](#설치-파일-windows--macos)을 받아 설치합니다(Windows는 `Setup.exe`, macOS는 `.dmg`). 생성된 봇을 앱에서 돌리려면 [Node.js](https://nodejs.org/) 22 이상이 필요합니다.

**소스에서 실행:**

```bash
cd app
npm install
npm run dev              # 웹 버전 (http://localhost:5173)
npm run desktop          # 데스크톱 앱
```

`npm test`는 검증기, 컴파일러, 파일 불러오기, 생성 결과 검사, 번역 누락 테스트를 돌립니다. `npm run build`는 타입 검사 후 `app/dist/`에 정적 파일을 만들고 CSP를 넣습니다. PR과 `main` 푸시마다 GitHub Actions가 두 명령을 실행합니다.

## 데스크톱 앱 (Electron)

개발 중에는 한 터미널에서 `npm run dev`, 다른 터미널에서 `npm run desktop:dev`를 실행하면 화면 수정이 바로 반영됩니다.

- **폴더 저장과 봇 실행:** "봇 실행" 탭에서 생성 결과를 고른 폴더에 저장하고, `npm install`(설치 스크립트 끔) → `npm run build` → `npm start` 순서로 실행하며 로그를 봅니다.
- **비밀값:** API 키와 봇 토큰 같은 환경변수는 운영체제의 암호화 저장소(`safeStorage`)에 보관합니다. 화면 쪽 코드는 값을 다시 읽을 수 없고, 봇에는 실행할 때 프로세스 환경변수로만 넘깁니다. `.env` 파일은 만들지 않고, 로그에 찍힌 비밀값은 가립니다.
- **창 보안:** 샌드박스와 컨텍스트 격리를 켜고 Node 통합을 끕니다. 모든 IPC는 호출한 화면의 출처를 확인하고 zod로 검증하며, 파일 쓰기와 실행은 사용자가 대화상자에서 고른 폴더에서만 허용합니다. 외부 링크는 허용 목록에 있는 곳만 브라우저로 엽니다.
- **점검:** `npx electron . --smoke`(먼저 `npm run build`와 `npm run desktop:build`)로 창 로드, preload 연결, 금지된 IPC 호출 거부, 암호화 저장 왕복, 그리고 로컬 가짜 API를 상대로 한 코드 생성 한 번을 확인합니다. 점검은 별도 프로필에서 돌아 실제 앱 데이터를 건드리지 않습니다. `--shots=<폴더>`를 더하면 이 README의 스크린샷을 다시 찍습니다.

## 설치 파일 (Windows · macOS)

코드는 하나이고, 설치 파일만 운영체제별로 만듭니다.

```bash
cd app
npm run dist:win         # Windows에서 → app/release/Discord-Bot-Builder-Setup-<버전>.exe
npm run dist:mac         # macOS에서   → app/release/Discord-Bot-Builder-<버전>-arm64.dmg, -x64.dmg
```

`.dmg`는 macOS에서만 만들 수 있습니다. GitHub Actions의 **Installers** 워크플로가 Windows와 macOS 러너에서 두 설치 파일을 함께 만들며, 데스크톱 앱을 건드리는 PR마다 돌고 결과는 실행 기록의 Artifacts에서 받습니다. `v`로 시작하는 태그(예: `v2.0.0-alpha.1`)를 올리면 GitHub 릴리스를 만들어 설치 파일을 붙입니다.

**Windows**

- 설치 프로그램(NSIS, x64)은 관리자 권한 없이 사용자 계정에 설치하며, 설치 위치를 고를 수 있고 바탕화면·시작 메뉴 바로가기를 만듭니다. 설치 화면은 한국어와 영어를 지원합니다. 삭제는 Windows 설정 → 앱에서 합니다.
- 코드 서명을 하지 않아 처음 실행할 때 Windows SmartScreen이 "Windows의 PC 보호" 경고를 띄웁니다. **추가 정보 → 실행**을 누르면 설치됩니다.

**macOS**

- Apple Silicon(`arm64`)과 Intel(`x64`)용 `.dmg`를 따로 만듭니다. 열어서 앱을 응용 프로그램 폴더로 끌어 놓으면 됩니다.
- Apple Developer ID가 없어 임시 서명(ad-hoc)만 하고 공증하지 않았습니다. 처음 열 때 "확인되지 않은 개발자" 경고가 뜨면, **시스템 설정 → 개인정보 보호 및 보안**에서 **그래도 열기**를 누릅니다. 정식 배포에는 Apple Developer ID 서명과 공증이 필요합니다.
- Finder로 연 앱은 터미널의 PATH를 받지 못하므로, 앱이 시작할 때 로그인 셸에서 PATH를 읽어 Homebrew·nvm·공식 설치 프로그램으로 설치한 Node.js를 찾습니다.
- 메뉴 막대에 앱·편집·윈도우 메뉴가 있어 ⌘C / ⌘V / ⌘Z와 ⌘Q가 동작하고, 화면의 단축키 표시도 ⌘로 바뀝니다.

**공통**

- 화면과 main 프로세스 코드는 의존성까지 번들에 들어 있어 설치본에는 `node_modules`가 없습니다. 그래서 런타임 패키지도 `devDependencies`에 둡니다.
- 아이콘은 `app/build/icon.svg`가 원본이며, 바꾼 뒤 `npm run icon`으로 `icon.png`(1024px)를 다시 만듭니다. Windows `.ico`와 macOS `.icns`는 빌드할 때 여기서 만들어집니다.

## 앱 안 생성과 API 키

생성 탭은 사용자 본인의 Anthropic API 키로 `claude-opus-5-5`(또는 `claude-sonnet-5`)를 호출하며, 요금은 키 소유자에게 청구됩니다.

- **웹 버전:** 키는 브라우저에서 `api.anthropic.com`으로만 전송되며, 기본적으로 탭을 닫으면 잊습니다. "이 브라우저에 저장"을 켜면 localStorage에 남습니다.
- **데스크톱 앱:** 키를 운영체제의 암호화 저장소에 두고 main 프로세스에서 호출합니다.
- **거절된 요청:** 서버 측 대체 모델(`fallbacks: "default"`)로 다시 실행됩니다.

## 폴더

| 경로 | 내용 |
|---|---|
| `app/src/nodes/` | 노드 정의. 폼 필드, 출력 포트, 출력값, 검증 규칙, AI용 명세(`spec`), 필요한 인텐트·권한·환경변수(`requires`), 시뮬레이터 동작(`simulate`)이 노드마다 한 곳에 있습니다. 노드를 추가할 때는 `defs/*.ts`에 항목 하나를 넣으면 됩니다. |
| `app/src/flow/` | 그래프 모델, 변수 참조(`{{n3.result}}`, `{{env.KEY}}`), 검증기, 비밀값 탐지, 프로젝트 파일 포맷(`.dbb.json`), 예제 |
| `app/src/compiler/` | 흐름 → 프롬프트 컴파일러. 결정적이며, 작성자 문자열은 JSON 문자열로만 넣고 비밀값은 가립니다. |
| `app/src/sim/` | 흐름 시뮬레이터. 가짜 이벤트로 흐름을 실행하고, 디스코드 동작은 미리보기로, 외부 호출은 모의 값으로 바꿉니다. |
| `app/src/ai/` | 앱 안 생성과 초안: Claude 호출, 결과 검증(경로·필수 파일·크기·비밀값), 설명 → 흐름 초안(카탈로그 프롬프트, 검증, 자동 배치), zip, API 키 보관 |
| `app/src/i18n/` | 화면 언어. 코드의 한국어 문구가 곧 영어 사전(`en.ts`)의 키이며, 테스트가 빠진 번역을 잡습니다. |
| `app/src/store/` | 프로젝트(실행 취소 포함), 검증 결과, 생성 결과, UI 상태 |
| `app/src/editor/` | 캔버스, 노드 목록, 인스펙터, 하단 패널(테스트·프롬프트·생성·봇 실행·문제), 상단 바 |
| `app/electron/` | 데스크톱 앱: main 프로세스(창 보안, IPC 검증), preload, 암호화 저장소, 프로젝트 폴더 쓰기, 봇 실행기, 점검 |
| `legacy/` | v1 "Hybrid AI Bot Builder"(2026-02) 코드와 기획 문서. 참고용이며 요구사항이 아닙니다. |

## 로드맵

| 단계 | 내용 | 상태 |
|---|---|---|
| 0 | v1 → `legacy/`, 새 스택(React 19 · @xyflow/react 12 · Tailwind 4 · zod 4 · Vite 8) | 완료 |
| 1 | 에디터 코어: 노드 32종, 캔버스, 인스펙터, 실시간 검증, 자동 저장, 파일 저장·열기 | 완료 |
| 2 | 프롬프트 컴파일러(노드별 명세, 인텐트·권한 비트·환경변수·패키지 집계), 코딩 에이전트용/채팅 AI용 프롬프트 미리보기·복사·저장, 비밀값 차단 | 완료 |
| 3 | 앱 안 AI 생성(Claude, BYOK), 결과 검증, 파일 미리보기, zip 내보내기, CI와 테스트 | 완료 |
| 4a | 흐름 시뮬레이터: 가짜 이벤트 입력, 실행 경로 강조, 디스코드 메시지 미리보기, 단계별 기록, 저장 데이터·쿨다운 유지 | 완료 |
| 4b | Electron 데스크톱 앱: 폴더 저장, 생성된 봇 로컬 실행과 로그, API 키·봇 토큰 암호화 보관, main 프로세스에서 Claude 호출 | 완료 |
| 5 | 설명으로 흐름 초안 만들기: 노드 정의에서 만든 카탈로그로 Claude가 흐름을 그리고, 검증·자동 배치 후 캔버스에 추가(실행 취소 가능) | 완료 |
| 6 | 실제 API 품질 점검 반영, 한국어·영어 화면, 코드 문법 색상, 디스코드 준비 안내, Windows 설치 파일(NSIS) | 완료 |
| 다음 | 편집기 개선, 설치 파일 코드 서명·자동 업데이트 | |
| 이후 | 커뮤니티 공유(서버 측 인가로 재설계) | |

## 알려진 문제

- Node **v25.2.0**의 `fs.rmSync(..., { recursive: true })`는 Windows에서 경로에 한글이 있으면 크래시합니다(0xC0000409). 이 때문에 Vite의 출력 폴더 비우기 대신 `app/scripts/clean.mjs`를 씁니다. Node 24 LTS를 권장합니다.
- `npm run dist:win`이 electron-builder 캐시에서 `EPERM: operation not permitted, rename`으로 멈추면, 백신이 방금 푼 파일을 잠근 경우가 많습니다. 다시 실행하면 됩니다.
