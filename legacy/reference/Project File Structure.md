# Hybrid AI Bot Builder 프로젝트 파일 구조 (Project File Structure)

- **버전**: 1.0
- **작성일**: 2026년 02월 09일
- **작성자**: Project Architect Team
- **참고 문서**: 기획서 v1.0, 기술 백서 v1.0, 디자인 백서 v1.0, Node Schema v1.0

---

## 1. 디렉토리 개요 (Directory Overview)

본 프로젝트는 Electron 기반의 데스크톱 애플리케이션으로, 크게 세 가지 핵심 영역으로 구분됩니다.

| 디렉토리 | 설명 |
|---------|------|
| `/electron` | 데스크톱 시스템 접근 및 윈도우 관리를 담당하는 메인 프로세스(Main Process). |
| `/src` | React 기반의 UI와 비주얼 에디팅 로직을 담당하는 렌더러 프로세스(Renderer Process). |
| `/src/lib/transpiler` | 노드 로직을 실제 코드로 변환하는 핵심 엔진(Core Engine). |

---

## 2. 상세 파일 구조 (Detailed File Structure)

```
[Root]/
├── .env                        # 환경 변수 (Firebase Config 등)
├── .gitignore
├── package.json                # 의존성 및 스크립트 정의
├── tailwind.config.js          # 디자인 시스템 (Discord Colors, Border Radius) 설정
├── postcss.config.js
├── vite.config.js              # Build 설정 (Electron + React 통합)
│
├── electron/                   # [Main Process]
│   ├── main.js                 # 앱 진입점, 윈도우 생성, IPC 통신 핸들링
│   └── preload.js              # Context Isolation 브리지 (fs, shell 등 Node API 노출)
│
├── public/                     # [Static Assets]
│   ├── icon.png                # 앱 아이콘
│   ├── manifest.json
│   └── templates/              # (Optional) 초기 템플릿 메타데이터
│
└── src/                        # [Renderer Process]
    │
    ├── api/                    # [External Communication]
    │   ├── gemini.js           # Google Gemini API 호출 및 에러 핸들링 (Retry Logic)
    │   └── firebase.js         # 커뮤니티 청사진 공유/로드 (Firestore)
    │
    ├── assets/                 # [Styles & Media]
    │   ├── fonts/              # Noto Sans KR, JetBrains Mono
    │   └── styles/
    │       └── index.css       # Tailwind Imports & Global Reset
    │
    ├── components/             # [UI Components]
    │   ├── layout/             # 전체 레이아웃 구조
    │   │   ├── TitleBar.jsx    # 윈도우 컨트롤 (최소화/닫기)
    │   │   ├── SideBar.jsx     # 좌측: 노드 도구 및 템플릿 패널
    │   │   ├── Inspector.jsx   # 우측: 노드 속성 편집 패널
    │   │   └── Workspace.jsx   # 중앙: React Flow 캔버스 래퍼
    │   │
    │   ├── nodes/              # [Custom Nodes] (React Flow)
    │   │   ├── BaseNode.jsx    # 공통 디자인 (헤더, 핸들, 컬러스트립)
    │   │   ├── TriggerNode.jsx # 이벤트 감지 노드 UI
    │   │   ├── ActionNode.jsx  # 액션 실행 노드 UI
    │   │   ├── LogicNode.jsx   # 로직 처리 노드 UI
    │   │   └── AINode.jsx      # AI 프롬프트 입력 노드 UI
    │   │
    │   └── ui/                 # [Atomic Components] (Industrial Design)
    │       ├── Button.jsx      # Sharp Edged Button
    │       ├── Input.jsx       # Dark Theme Input
    │       ├── Modal.jsx       # Global Modal
    │       └── Toggle.jsx      # Custom Toggle Switch
    │
    ├── data/                   # [Static Data & Definitions]
    │   ├── nodeSchema.js       # 30종 노드 스펙 정의 (Input/Output Types)
    │   └── templates/          # 초기 봇 프리셋 (JSON)
    │       ├── economyBot.json
    │       ├── modBot.json
    │       └── blankProject.json
    │
    ├── hooks/                  # [Custom Hooks]
    │   ├── useAutosave.js      # IndexedDB 자동 저장 로직
    │   ├── useUndoRedo.js      # 실행 취소/다시 실행
    │   └── useTranspile.js     # 코드 변환 트리거 훅
    │
    ├── lib/                    # [Core Logic Libraries]
    │   ├── ai/
    │   │   ├── prompts.js      # 시스템 프롬프트 모음 (노드 생성용)
    │   │   └── parser.js       # AI 응답(JSON) 파싱 및 유효성 검사
    │   │
    │   └── transpiler/         # [The Engine: Node to Code]
    │       ├── index.js        # 변환기 진입점 (Orchestrator)
    │       ├── irGenerator.js  # React Flow Nodes -> Intermediate Rep(IR) 변환
    │       └── languages/      # 언어별 코드 생성기
    │           ├── python/     # discord.py
    │           │   ├── generators.js
    │           │   └── templates.js
    │           └── javascript/ # discord.js
    │               ├── generators.js
    │               └── templates.js
    │
    ├── store/                  # [State Management] (Zustand)
    │   ├── nodeStore.js        # 캔버스 노드/엣지 상태 관리
    │   ├── projectStore.js     # 프로젝트 메타데이터 (언어, 토큰 등)
    │   └── uiStore.js          # 패널 열림/닫힘, 모달 상태
    │
    ├── utils/                  # [Helpers]
    │   ├── idGenerator.js      # 난수 생성 (UUID, ShortID)
    │   └── fileSystem.js       # 로컬 파일 저장/불러오기 헬퍼
    │
    ├── App.jsx                 # 라우팅 및 테마 프로바이더
    └── main.jsx                # React Entry Point
```

---

## 3. 핵심 모듈 설명 (Core Module Description)

### 3.1. src/lib/transpiler/ (트랜스파일러 엔진)

이 프로젝트의 심장부입니다. 사용자가 배치한 시각적 노드들을 실제 프로그래밍 코드로 번역합니다.

- **irGenerator.js**: React Flow의 위치 정보(x, y) 등 불필요한 데이터를 제거하고, 실행 순서와 로직만을 담은 중간 언어(IR: Intermediate Representation) 객체로 변환합니다.

- **languages/{lang}/templates.js**: 각 언어별 코드 스니펫(Code Snippet)을 보관합니다.
  - 예: `SEND_MESSAGE` -> `await ctx.send("{content}")`

- **languages/{lang}/generators.js**: IR을 순회하며 위 템플릿에 실제 변수 값을 주입하여 최종 소스 코드 문자열을 합성합니다.

### 3.2. src/data/nodeSchema.js (스키마 정의)

기획서에서 정의한 30가지 노드의 스펙이 코드로 구현된 곳입니다.

**역할:**

- **Inspector UI**: 우측 속성 패널에서 어떤 입력 폼(Input, Select 등)을 보여줄지 결정하는 기준 데이터.
- **AI Context**: Gemini에게 "이런 노드들이 있어"라고 알려주는 학습 데이터의 원본.

**구조 예시:**

```javascript
export const NODE_SCHEMA = {
  TRIGGER_COMMAND: {
    label: "명령어 수신",
    category: "TRIGGER",
    inputs: [
      { name: "command", type: "string", label: "명령어 이름" }
    ],
    outputs: ["user", "channel"]
  },
  // ...
};
```

### 3.3. src/api/gemini.js (AI 게이트웨이)

사용자의 API 키를 이용해 Google Gemini 서버와 통신합니다.

- **Safety Settings**: 코드 생성에 방해되는 과도한 안전 필터를 조정합니다.
- **JSON Enforcement**: 프롬프트에 Response Schema를 포함하여 반드시 파싱 가능한 JSON만 받도록 강제합니다.

### 3.4. src/store/nodeStore.js (Zustand 상태 관리)

React Flow의 `nodes`와 `edges` 배열을 전역에서 관리합니다.

- **주요 액션**: `addNode`, `removeNode`, `onConnect`, `updateNodeData`.
- 이곳의 상태가 변경될 때마다 `useAutosave` 훅이 작동하여 IndexedDB에 스냅샷을 저장합니다.

---

## 4. 개발 워크플로우 (Development Workflow)

### UI 작업 (src/components)

- Tailwind CSS를 사용하여 디스코드 스타일의 Atomic 컴포넌트 개발.
- React Flow 커스텀 노드 디자인 적용.

### 로직 작업 (src/lib)

- 노드 스키마 정의 (`data/nodeSchema.js`).
- Python 변환 로직 구현 (`transpiler/languages/python`).

### 통합 (src/App.jsx)

- Canvas와 Inspector 연결.
- Electron IPC 통신 테스트 (파일 저장 기능).