# Hybrid AI Bot Builder 디자인 백서 (Design Whitepaper)

- **버전**: 1.0
- **작성일**: 2026년 02월 09일
- **작성자**: Project Design Team
- **참고 문서**: 기획서 v1.0, 기술 백서 v1.0, Node Schema Definition v1.0

---

## 1. 프로젝트 개요 (Project Overview)

### 1.1. 프로젝트 명

Hybrid AI Bot Builder (HABB) UI/UX Design

### 1.2. 목적 (Purpose)

본 디자인은 'Discord Bot Maker'라는 도구의 정체성을 확립하기 위해, 디스코드 사용자에게 익숙한 시각적 언어(Dark Theme & Blurple)를 차용하되, 채팅 앱이 아닌 **전문적인 저작 도구(Professional Authoring Tool)**로서의 신뢰감을 주는 인터페이스를 구축하는 것을 목표로 합니다.

곡선을 강조하는 디스코드의 캐주얼함보다는, **직선적이고 정밀한 기계적 미학(Industrial Aesthetic)**을 강조하여 사용자가 '로직을 설계한다'는 느낌을 받도록 합니다.

### 1.3. 핵심 차별점 (Key Differentiators)

- **Precision (정밀함)**: 둥근 모서리(Rounded Corner)를 최소화하고, 얇고 선명한 1px 테두리와 직선적인 레이아웃을 사용하여 복잡한 노드 구조를 깔끔하게 정리합니다.

- **Familiarity (익숙함)**: 색상 팔레트는 디스코드와 100% 동일하게 유지하여, 사용자가 별도의 적응 과정 없이 도구의 상태(활성/비활성, 오류 등)를 인지하도록 합니다.

- **Focus (몰입감)**: 장식적인 이모지 사용을 엄격히 제한하고, 기능적인 라인 아이콘(Lucide Icon)을 사용하여 시각적 노이즈를 줄이고 작업 영역(Canvas)에 집중하도록 유도합니다.

---

## 2. 상세 기능 요구사항 (Detailed Requirements)

### 2.1. 레이아웃 및 인터페이스 (Layout & Interface)

**뷰 모드 (View Mode)**: Full-Window Application Layout (Electron)

| 위치 | 설명 |
|------|------|
| 상단 | 윈도우 컨트롤 및 메뉴 바 (32px 높이) |
| 좌측 | 템플릿 및 도구 패널 (280px 고정) |
| 중앙 | 무한 캔버스 (Fluid) |
| 우측 | 속성 패널 (320px 고정) |

**테마 정책 (Theme Policy)**: Dark Mode Only

밝은 테마는 지원하지 않으며, 장시간 작업 시 눈의 피로를 최소화하는 Deep Grey 톤을 유지합니다.

### 2.2. 사용자 상호작용 (Interaction Logic)

**주요 액션 (Actions)**:

- **Hover Effects**: 배경색 변경보다는 Border Highlight (테두리 발광) 방식을 선호하여 형태를 유지합니다.
- **Drag & Drop**: 노드 이동 시 부드러운 애니메이션보다는 즉각적이고 딱딱한(Snappy) 스냅핑 그리드(Grid Snapping)를 적용합니다.

**입력 방식 (Input)**:

- **노드 내부 입력**: 인라인 에디팅(Inline Editing)보다는 우측 Inspector 패널에서의 수정을 원칙으로 하여 캔버스 복잡도를 낮춥니다.
- **모달(Modal)**: 화면 중앙에 딤(Dim) 처리와 함께 팝업되며, 닫기 버튼은 우측 상단에 명확한 'X' 아이콘으로 배치합니다.

### 2.3. 데이터 구조 및 모듈 (Component Structure)

**사이드 바 (Side Bar)**:

- 탭(Tab) 형식이 아닌 아코디언(Accordion) 리스트 형태.
- 각 카테고리(Trigger, Action, Logic)는 직선적인 헤더로 구분.

**노드 (Node Card)**:

- 디스코드의 임베드(Embed) 메시지와 유사한 구조.
- 좌측에 4px 두께의 컬러 바(Color Strip)로 노드 타입을 구분.
- 상단/하단에 연결 포트(Handle) 배치.

**캔버스 (Canvas)**:

- 배경은 단색이 아닌 20px 간격의 Dot Grid 패턴을 적용하여 설계 도면의 느낌 강조.

### 2.4. 출력 및 결과물 (Output)

- **결과물 형식**: React Components (Functional Components with Hooks).

**품질 기준 (QA Standards)**:

- 모든 텍스트와 아이콘은 최소 명도 대비 4.5:1 이상 준수.
- 마우스 휠 줌인/아웃 시 폰트 깨짐 없는 SVG 아이콘 사용.

---

## 3. 기술 스택 및 라이브러리 (Tech Stack)

### 3.1. Core

- **Frontend Framework**: React 18
- **Styling Engine**: Tailwind CSS (Configuration을 통해 Radius 및 Color 커스텀)

### 3.2. Libraries & Tools

**React Flow**

- **용도**: 노드 에디터 코어.
- **설정**: 기본 테마를 제거하고 Custom Node 및 Edge 스타일 적용.

**Lucide React**

- **용도**: UI 아이콘 (Stroke 기반의 깔끔한 벡터 아이콘).
- **설정**: `stroke-width={1.5}` 로 얇고 세련된 느낌 유지.

---

## 4. 아키텍처 및 로직 (Architecture & Logic)

### 4.1. 시각적 계층 구조 (Visual Hierarchy)

정보의 위계를 명확히 하기 위해 타이포그래피와 색상을 활용합니다.

| Level | 용도 | 스타일 |
|-------|------|--------|
| Level 1 | Panel Title | 16px, Bold (700), `#FFFFFF` (White) |
| Level 2 | Node Title | 14px, SemiBold (600), `#DCDDDE` (Light Gray) |
| Level 3 | Body Text | 12px, Regular (400), `#B9BBBE` (Medium Gray) |
| Level 4 | Label/Meta | 11px, Medium (500), `#72767D` (Dark Gray, Uppercase 권장) |

### 4.2. 반응형 로직 (Responsive Logic)

본 애플리케이션은 데스크톱 전용이므로, 모바일 반응형보다는 창 크기 조절에 따른 패널 유동성에 집중합니다.

- **Minimum Size**: 1280px * 720px 이하로 줄어들 경우, 좌/우 패널이 자동으로 접히며 아이콘만 남기는 Collapsed Mode로 전환.
- **Panel Resizing**: 좌/우측 패널은 사용자가 너비를 조절할 수 있도록 Resizer 핸들 제공.

### 4.3. 핵심 컴포넌트 로직 (Core Components)

**[Custom Node]**:

| 상태 | 스타일 |
|------|--------|
| Default | 짙은 회색 배경 (`#2F3136`), 1px 검은 테두리 (`#202225`). |
| Selected | 테두리가 Blurple 색상 (`5865F2`)으로 변경되고 2px로 두꺼워짐. 그림자 없음(Flat). |
| Error | 테두리가 Red 색상 (`#ED4245`)으로 변경. |

**[Connection Edge (선)]**:

- **Type**: Step (직각으로 꺾이는 선) 또는 Straight (직선). 곡선(Bezier)은 사용하지 않음.
- **Animation**: 데이터가 흐르는 듯한 애니메이션은 실행(Debug) 모드에서만 활성화.

---

## 5. UI/UX 디자인 가이드 (Design System)

### 5.1. 색상 팔레트 (Color Palette)

Discord Brand Colors를 기반으로 하되, 용도를 엄격히 제한합니다.

| 용도 | 색상 코드 | 설명 |
|------|-----------|------|
| Primary (Blurple) | `#5865F2` | 강조, 선택, 메인 버튼 |
| Success (Green) | `#3BA55C` | 로직 노드, 실행 성공 |
| Danger (Red) | `#ED4245` | 삭제, 오류, 중요 액션 |
| Background (Tertiary) | `#202225` | 최하단 배경, 인풋 필드 배경 |
| Background (Secondary) | `#2F3136` | 패널 배경, 노드 배경 |
| Background (Primary) | `#36393F` | 메인 캔버스 배경 |
| Text (Header) | `#FFFFFF` | - |
| Text (Body) | `#DCDDDE` | - |

### 5.2. 디자인 토큰 (Design Tokens)

**Border Radius:**

| 토큰 | 값 | 설명 |
|------|----|------|
| `radius-sm` | 2px | 버튼, 인풋 필드, 노드 - 직선적 느낌의 핵심 |
| `radius-md` | 4px | 모달, 큰 컨테이너 |
| `radius-full` | 사용하지 않음 | 원형 아바타 제외 |

**Shadow:**

그림자 사용을 지양하고, Border Color의 차이로 깊이감을 표현 (Flat Design).

---

## 6. 개발 시 주의사항 (Implementation Notes)

### 스타일링 전략 (Styling Strategy)

- Tailwind CSS 사용 시 `rounded-xl` 등의 큰 라운딩 클래스 사용을 금지합니다.
- 모든 색상은 하드코딩하지 않고 `bg-discord-dark`, `text-discord-gray` 등 설정된 유틸리티 클래스를 사용합니다.

### 아이콘 사용 규칙 (Iconography)

- 이모지(Emoji)는 유저가 입력하는 **텍스트 내용(Content)**에만 허용하며, **UI 요소(버튼, 라벨 등)**에는 절대 사용하지 않습니다.
- 모든 아이콘은 Lucide React 라이브러리를 사용하며, 선 두께를 통일합니다.

### 접근성 (Accessibility)

- 색상만으로 정보를 구분하지 않고, 노드 좌측의 'Color Strip'과 함께 텍스트 라벨(Type)을 반드시 병기합니다.