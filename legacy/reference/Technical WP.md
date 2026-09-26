# Hybrid AI Bot Builder 기술 백서 (Technical Whitepaper)

- **버전**: 1.0
- **작성일**: 2026년 02월 09일
- **작성자**: Project Development Team
- **참고 문서**: Node Schema Definition v1.0, UI Design Guide v1.0

---

## 1. 프로젝트 개요 (Project Overview)

### 1.1. 프로젝트 명

Hybrid AI Bot Builder (HABB)

### 1.2. 목적 (Purpose)

본 프로젝트는 디스코드 봇 제작의 높은 진입 장벽(코딩 지식 필요)과 기존 노코드 툴의 한계(낮은 자유도, 업데이트 중단)를 해결하기 위해 기획되었습니다.

**자연어 처리(AI)**와 **시각적 순서도(Flowchart)**를 결합한 하이브리드 엔진을 통해, 사용자가 코딩 없이도 복잡한 로직(경제 시스템, API 연동 등)을 갖춘 봇을 제작하고, 이를 6가지 주요 프로그래밍 언어(Python, JS, Java 등)로 변환하여 소유할 수 있도록 하는 데스크톱 애플리케이션을 구축합니다.

### 1.3. 핵심 차별점 (Key Differentiators)

- **하이브리드 AI 엔진 (Hybrid Intelligence)**: 단순한 코드 생성을 넘어, 사용자의 자연어 요청을 분석하여 시각적인 '노드(Node)' 구조로 변환하는 RAG(검색 증강 생성) 기반 아키텍처를 도입하여 할루시네이션을 최소화하고 수정 용이성을 확보합니다.

- **다중 언어 트랜스파일러 (Multi-Language Transpiler)**: 내부적으로 정의된 JSON 기반의 중간 언어(IR)를 사용하여, 단일 로직 설계를 Python(discord.py), Node.js(discord.js) 등 다양한 타겟 언어로 실시간 변환하는 코드 생성 파이프라인을 갖춥니다.

- **보안 강화형 커뮤니티 (Obfuscated Blueprint Sharing)**: Firebase 기반의 클라우드 공유 시스템을 구축하되, 읽기 전용과 수정 가능 버전에 대해 상호 연관성 없는 이중 난수 코드를 발급하여 원작자의 저작권을 보호하면서도 협업을 가능하게 합니다.

---

## 2. 상세 기능 요구사항 (Detailed Requirements)

### 2.1. 시스템 환경 및 인터페이스 (System & Interface)

| 항목 | 설명 |
|------|------|
| 플랫폼 | Electron 기반의 크로스 플랫폼 데스크톱 앱 (Windows/macOS). |
| 뷰 모드 | 데스크톱 환경에 최적화된 고정 레이아웃 (1920x1080 기준), Discord의 UX를 계승한 Dark Mode & Blurple Theme 적용. |
| 오프라인 우선 정책 | 로컬 실행을 기본으로 하며, AI 기능 및 커뮤니티 접속 시에만 네트워크를 사용합니다. |

### 2.2. 사용자 상호작용 로직 (Interaction Logic)

**이벤트 처리 (Event Handling)**:

- **Node Interaction**: React Flow 기반의 드래그 앤 드롭, 줌인/아웃, 노드 간 엣지(Edge) 연결.
- **Context Menu**: 캔버스 우클릭 시 AI 추천 노드 목록(Quick Pick) 팝업 노출.

**데이터 검증 (Validation)**:

- **실시간 검사**: 노드 연결 시 데이터 타입 불일치(예: 문자열 변수를 숫자 연산에 연결) 즉시 경고.
- **순환 참조 방지**: 무한 루프 발생 가능한 연결 구조 감지 및 차단.

### 2.3. 데이터 모델 (Data Model)

**Project Schema (JSON)**:

| 필드 | 설명 |
|------|------|
| `meta` | 프로젝트 이름, 타겟 언어, 생성 일시. |
| `nodes` | 배치된 노드 객체 배열 (`id`, `type`, `position`, `data`). |
| `edges` | 노드 간 연결 선 배열 (`source`, `target`, `logic_type`). |
| `variables` | 전역 변수 초기값 설정. |

**Shared Blueprint (Firebase Document)**:

| 필드 | 설명 |
|------|------|
| `doc_id` | 16자리 난수 키 (Primary Key). |
| `permission` | `READ_ONLY` \| `EDITABLE`. |
| `snapshot` | 공유 시점의 Project Schema 데이터 압축본. |

### 2.4. 출력 및 성능 기준 (Output & Performance)

- **결과물 형식**: `.zip` 압축 파일 (소스 코드 + `requirements.txt`/`package.json` + 실행하기.bat).

**품질 기준**:

| 항목 | 기준 |
|------|------|
| Canvas Rendering | 노드 500개 이상 배치 시에도 60fps 유지. |
| Transpilation | 코드 변환 및 내보내기 3초 이내 완료. |

---

## 3. 기술 스택 및 라이브러리 (Tech Stack)

### 3.1. Core

| 영역 | 기술 |
|------|------|
| Frontend (Renderer) | HTML5, CSS3, JavaScript (ES6+) |
| Framework | React 18 (컴포넌트 기반 구조 및 상태 관리 용이성) |
| Backend (Main Process & Logic) | Node.js (Electron 환경) |
| Cloud Database | Firebase Firestore (커뮤니티 데이터 저장) & Realtime Database (실시간 통계) |

### 3.2. Libraries & Tools

**React Flow (필수)**

- **용도**: 노드 기반 비주얼 에디터 구현.
- **설정**: 커스텀 노드 컴포넌트 등록, MiniMap 및 Controls 플러그인 활성화.

**Electron (필수)**

- **용도**: 웹 애플리케이션의 데스크톱 패키징 및 로컬 파일 시스템(fs) 접근.

**Google Generative AI SDK (필수)**

- **용도**: Gemini API 연동 (자연어 -> JSON 변환, 코드 주석 생성).

**JSZip**

- **용도**: 클라이언트 사이드에서 폴더 구조 생성 및 압축 파일 다운로드 처리.

**Tailwind CSS**

- **용도**: 유틸리티 퍼스트 CSS를 통한 빠른 UI 스타일링 및 테마 적용.

---

## 4. 아키텍처 및 로직 (Architecture & Logic)

### 4.1. 상태 관리 전략 (State Management)

애플리케이션은 복잡한 노드 관계와 UI 상태를 관리해야 하므로, 전역 상태와 로컬 상태를 명확히 분리합니다.

**Global Scope (Zustand)**:

| 상태 | 설명 |
|------|------|
| `nodes[]`, `edges[]` | 현재 캔버스의 로직 트리 데이터. |
| `projectMeta` | 프로젝트 설정 (언어, 토큰 등). |
| `apiKey` | 사용자의 Gemini API 키 (암호화되어 LocalStorage 연동). |

**Local Scope (React State)**:

- 각 노드의 입력 폼 데이터, 모달의 열림/닫힘 상태.

### 4.2. 핵심 파이프라인: 코드 트랜스파일링 (The Transpiler Pipeline)

사용자가 시각적으로 배치한 노드를 실제 실행 가능한 코드로 변환하는 과정입니다.

1. **파싱 (Parsing)**: React Flow의 `nodes`와 `edges` 데이터를 순회하며 실행 순서를 결정하는 **방향성 비순환 그래프(DAG)**를 구축합니다.

2. **중간 언어 생성 (IR Generation)**: 각 노드를 시스템 내부의 표준화된 JSON 객체로 변환합니다.

   ```javascript
   // IR 예시
   { "action": "SEND_MESSAGE", "params": { "content": "Hello" }, "next": "node_2" }
   ```

3. **템플릿 매칭 (Template Matching)**: 사용자가 선택한 언어(예: Python)에 맞는 코드 템플릿을 호출합니다.

   | 언어 | 템플릿 예시 |
   |------|-------------|
   | Python | `await ctx.send("{content}")` |
   | JS | `message.channel.send("{content}")` |

4. **코드 합성 (Synthesis)**: 변수와 로직을 주입하여 최종 소스 코드 파일(`main.py` 등) 문자열을 생성합니다.

### 4.3. 핵심 알고리즘: AI 노드 생성 (AI-Driven Node Generation)

자연어를 입력받아 노드를 자동 배치하는 로직입니다.

1. **프롬프트 엔지니어링**: 사전에 정의된 '30종 노드 스키마(Schema)'를 시스템 프롬프트에 주입합니다.

2. **구조화된 출력 유도**: Gemini에게 JSON 포맷만을 반환하도록 강제하여 파싱 오류를 방지합니다.

3. **자동 배치 알고리즘**: 반환된 노드 리스트를 캔버스에 배치할 때, 겹치지 않도록 `dagre` 알고리즘을 사용하여 x, y 좌표를 자동 계산합니다.

### 4.4. 커뮤니티 보안 로직 (Obfuscated Sharing)

- **Snapshot Isolation**: 공유 시점의 데이터를 복사하여 별도 저장하므로, 원본이 수정되어도 공유된 버전은 변하지 않습니다.

- **Dual-ID System**:
  - 공유 요청 시 `crypto.randomUUID()`를 사용하여 난수를 생성합니다.
  - 사용자가 '수정 가능'과 '읽기 전용'을 동시에 요청하더라도, 시스템은 내부적으로 완전히 다른 두 개의 문서를 생성합니다. 이를 통해 두 링크 간의 연관성을 추적할 수 없게 만듭니다.

---

## 5. UI 구현 가이드 (Implementation Guide)

### 5.1. 디자인 토큰 (Design Tokens)

**Colors:**

| 용도 | 색상 코드 |
|------|-----------|
| PRIMARY_BLURPLE | `#5865F2` (액션 버튼, 활성 상태) |
| BG_DARK | `#36393F` (메인 캔버스 배경) |
| PANEL_DARK | `#2F3136` (사이드바, 속성 창) |
| TEXT_NORMAL | `#DCDDDE` |

**Typography**: Noto Sans KR (기본), JetBrains Mono (코드 블록)

### 5.2. 공통 컴포넌트 (Shared Components)

**CustomNode**: React Flow의 기본 노드를 래핑하여 디자인을 입힌 컴포넌트.

- **Props**: `data` (노드 내부 데이터), `selected` (선택 여부).
- **Handle**: 입력/출력 연결점 (상단/하단 배치).

**InspectorPanel**: 선택된 노드의 속성을 편집하는 우측 패널.

- 노드 타입에 따라 다른 Input Form을 렌더링 (동적 폼 생성).

---

## 6. 개발 시 주의사항 (Implementation Notes)

### 보안 (Security)

- **API Key 보호**: 사용자의 Gemini API 키는 절대 서버로 전송하지 않으며, 브라우저 로컬 스토리지에만 저장해야 합니다.
- **코드 인젝션 방지**: 사용자 입력값이 코드 생성 시 그대로 들어가지 않도록 이스케이프(Escape) 처리를 철저히 해야 합니다. (예: 문자열 내 따옴표 처리).

### 성능 최적화 (Optimization)

- **Memoization**: `React.memo`와 `useCallback`을 적극 활용하여, 캔버스 내 노드 하나가 변경될 때 전체 캔버스가 리렌더링되지 않도록 합니다.
- **Lazy Loading**: 템플릿 데이터나 무거운 아이콘 리소스는 앱 초기 구동 시가 아닌, 필요 시점에 로딩합니다.

### 이슈 대응 (Known Issues)

- **Rate Limit**: Gemini API의 무료 티어 사용 시 요청 제한이 있으므로, 요청 실패 시 '지수 백오프(Exponential Backoff)' 재시도 로직을 구현해야 합니다.
- **Firebase Quota**: 커뮤니티 기능의 과도한 사용을 막기 위해 클라이언트 단에서 1분당 공유 횟수를 제한합니다.