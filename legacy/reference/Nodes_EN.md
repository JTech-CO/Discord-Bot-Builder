# Hybrid AI Bot Builder
## Node Schema Definition (v1.0)

본 문서는 **Hybrid AI Bot Builder**의 **30가지 핵심 노드**에 대한 데이터 구조 명세서입니다.

---

## 공통 노드 속성 (All Nodes)
모든 노드는 아래 공통 속성을 가집니다.

- `id` : Unique String  
- `position` : `{ x, y }` 좌표  
- `type` : 아래 명시된 노드 식별자  

---

## 1. 디스코드 인터페이스 계층 (Interaction Layer)
**Color Theme**: Discord Blurple `#5865F2`

---

### 1-1. Trigger Nodes (시작점)

#### TRIGGER_SLASH_COMMAND
슬래시 명령어(`/command`) 입력을 감지합니다.

**Props (Input)**
- `commandName` (String): 명령어 이름 (예: `help`, `gambling`)
- `description` (String): 명령어 설명
- `options` (Array): 인자값 설정  
  - 예: `{ name: "amount", type: "INTEGER", required: true }`

**Outputs (Variables)**
- `{interaction}`: 상호작용 객체
- `{user}`: 명령어를 입력한 유저
- `{channel}`: 명령어가 입력된 채널
- `{args}`: 입력된 옵션 값 (`{args.amount}`)

---

#### TRIGGER_MESSAGE_KEYWORD
특정 단어가 포함된 메시지를 감지합니다.

**Props**
- `keywords` (Array<String>): 감지할 단어 목록 (예: `["안녕", "hi"]`)
- `isExactMatch` (Boolean): 정확히 일치해야 하는지 여부

**Outputs**
- `{message}`: 메시지 객체
- `{content}`: 메시지 내용

---

#### TRIGGER_COMPONENT
버튼 또는 셀렉트 메뉴 클릭을 감지합니다.

**Props**
- `customId` (String): 감지할 컴포넌트 ID (예: `btn_start_game`)

**Outputs**
- `{selectedValue}`: 셀렉트 메뉴 선택 값 (해당 시)

---

#### TRIGGER_MEMBER_EVENT
멤버 관련 이벤트를 감지합니다.

**Props**
- `eventType` (Enum): `JOIN | LEAVE | BAN | UNBAN`

**Outputs**
- `{member}`: 대상 멤버

---

#### TRIGGER_VOICE_STATE
음성 채널 상태 변화를 감지합니다.

**Props**
- `targetChannel` (String): 감지할 채널 ID (비워두면 전체)

**Outputs**
- `{member}`: 대상 멤버
- `{voiceChannel}`: 접속/퇴장한 채널

---

### 1-2. Action Nodes (출력 및 제어)

#### ACTION_SEND_EMBED
임베드 메시지를 전송합니다.

**Props**
- `title` (String): 제목
- `description` (String): 본문 (변수 사용 가능)
- `color` (ColorHex): 측면 색상
- `imageUrl` (String): 이미지 URL
- `footer` (String): 바닥글

**Outputs**
- `{sentMessageId}`: 전송된 메시지 ID

---

#### ACTION_ATTACH_COMPONENT
메시지에 버튼 또는 메뉴를 부착합니다.  
*(이전 메시지 노드와 연결 필요)*

**Props**
- `componentType` (Enum): `BUTTON | SELECT_MENU`
- `label` (String): 버튼 라벨
- `style` (Enum): `PRIMARY | DANGER | LINK`
- `customId` (String): 고유 ID

**Outputs**
- 없음

---

#### ACTION_SHOW_MODAL
폼 입력창(모달)을 표시합니다.

**Props**
- `title` (String): 모달 제목
- `customId` (String): 모달 ID
- `inputs` (Array): 입력 필드 설정 (Label, Style, ID)

**Outputs**
- 없음 (제출 트리거 별도)

---

#### ACTION_MANAGE_USER
유저 권한을 관리합니다.

**Props**
- `targetUser` (Variable): 대상 유저
- `actionType` (Enum): `ADD_ROLE | REMOVE_ROLE | KICK | BAN | TIMEOUT`
- `value` (String): 역할 ID 또는 타임아웃 시간
- `reason` (String): 사유

**Outputs**
- `{isSuccess}`: 성공 여부 (Boolean)

---

#### ACTION_MANAGE_CHANNEL
채널 또는 스레드를 관리합니다.

**Props**
- `actionType` (Enum): `CREATE | DELETE | ARCHIVE`
- `name` (String): 채널 이름
- `category` (String): 카테고리 ID

**Outputs**
- `{newChannelId}`: 생성된 채널 ID

---

## 2. 기획 및 로직 계층 (Logic Layer)
**Color Theme**: Green `#3BA55C`, Yellow `#FAA61A`

---

### 2-1. Data & Math

#### LOGIC_VARIABLE
변수를 저장하거나 불러옵니다.

**Props**
- `scope` (Enum): `GLOBAL | USER`
- `key` (String): 변수명
- `operation` (Enum): `SET | GET | ADD`
- `value` (Any): 저장 값

**Outputs**
- `{varResult}`: 최종 값

---

#### LOGIC_MATH
사칙연산을 수행합니다.

**Props**
- `valueA` (Number | Variable)
- `operator` (Enum): `+ | - | * | / | %`
- `valueB` (Number | Variable)

**Outputs**
- `{calcResult}`

---

#### LOGIC_RANDOM
난수 또는 확률 판정을 수행합니다.

**Props**
- `type` (Enum): `INTEGER | PERCENT`
- `min` (Number)
- `max` (Number)

**Outputs**
- `{randResult}`
- `{isSuccess}` (확률형일 경우)

---

### 2-2. Flow Control

#### LOGIC_IF_ELSE
조건 분기 노드입니다.

**Props**
- `valueA`
- `comparator` (Enum): `== | != | > | < | CONTAINS`
- `valueB`

**Outputs**
- True Port
- False Port

---

#### LOGIC_SWITCH
다중 조건 분기 노드입니다.

**Props**
- `targetVariable`
- `cases` (Array)

**Outputs**
- 각 Case별 포트
- Default 포트

---

#### LOGIC_LOOP
반복 실행을 수행합니다.

**Props**
- `loopType` (Enum): `COUNT | FOR_EACH`
- `count` (Number)
- `listVariable` (Array)

**Outputs**
- `{currentItem}`
- `{index}`

---

#### LOGIC_STRING_MANIPULATION
문자열을 가공합니다.

**Props**
- `inputText` (String)
- `action` (Enum): `JOIN | SPLIT | REPLACE | UPPERCASE`
- `param` (String)

**Outputs**
- `{stringResult}`

---

#### LOGIC_LIST_MANIPULATION
리스트(배열)를 관리합니다.

**Props**
- `targetList` (Variable)
- `action` (Enum): `ADD | REMOVE | PICK_RANDOM | SHUFFLE`
- `value` (Any)

**Outputs**
- `{pickedItem}` (PICK_RANDOM 시)

---

#### LOGIC_WAIT
지연 실행(타이머) 노드입니다.

**Props**
- `duration` (Number)
- `unit` (Enum): `SECONDS | MINUTES | HOURS`

**Outputs**
- 없음

---

#### LOGIC_DATE_TIME
날짜 및 시간을 계산합니다.

**Props**
- `action` (Enum): `GET_NOW | CALC_DIFF`
- `targetDate` (String)

**Outputs**
- `{timestamp}`
- `{formattedDate}` (`YYYY-MM-DD`)

---

## 3. 외부 연동 및 확장 계층 (Integration Layer)
**Color Theme**: Red `#ED4245`, Special Gradient

---

### 3-1. Network & API

#### INTEG_HTTP_REQUEST
외부 API를 호출합니다.

**Props**
- `method` (Enum): `GET | POST`
- `url` (String)
- `headers` (JSON)
- `body` (JSON)

**Outputs**
- `{responseStatus}`
- `{responseData}`

---

#### INTEG_JSON_PARSE
JSON 데이터에서 특정 값을 추출합니다.

**Props**
- `jsonSource` (Variable)
- `path` (String)

**Outputs**
- `{parsedValue}`

---

#### INTEG_WEBHOOK
웹훅을 전송합니다.

**Props**
- `webhookUrl` (String)
- `content` (String)
- `username` (String)
- `avatarUrl` (String)

**Outputs**
- 없음

---

### 3-2. AI Capabilities (Powered by Gemini)

#### INTEG_LLM_CHAT
AI 대화를 생성합니다.

**Props**
- `systemPrompt` (String)
- `userPrompt` (String)
- `temperature` (Float, 0.0 ~ 1.0)

**Outputs**
- `{aiResponse}`

---

#### INTEG_AI_IMAGE
텍스트 기반 이미지 생성 노드입니다.

**Props**
- `prompt` (String)
- `style` (String)

**Outputs**
- `{imageUrl}`

---

#### INTEG_SMART_CRAWLER
URL 콘텐츠를 지능적으로 파싱합니다.

**Props**
- `targetUrl` (String)
- `instruction` (String)

**Outputs**
- `{crawledResult}`

---

### 3-3. External Tools

#### INTEG_GOOGLE_SHEET
구글 시트를 데이터베이스처럼 사용합니다.

**Props**
- `sheetId` (String)
- `range` (String)
- `action` (Enum): `READ | WRITE | APPEND`

**Outputs**
- `{sheetData}`

---

#### INTEG_TRANSLATE
자동 번역을 수행합니다.

**Props**
- `sourceText` (String)
- `targetLang` (Enum): `EN | KO | JP | ...`

**Outputs**
- `{translatedText}`

---

#### INTEG_STT_TTS
음성 변환(STT / TTS)을 수행합니다.

**Props**
- `mode` (Enum): `STT | TTS`
- `inputSource` (Variable)

**Outputs**
- `{resultData}`

---

#### INTEG_RSS_READER
RSS 피드를 감지합니다.

**Props**
- `rssUrl` (String)

**Outputs**
- `{latestPostTitle}`
- `{latestPostLink}`

---

## End of Schema Definition
