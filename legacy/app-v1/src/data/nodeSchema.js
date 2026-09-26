/**
 * nodeSchema.js - 30종 노드 스펙 정의
 * 
 * Nodes_EN.md (v1.0) 기반으로 생성
 * 각 노드의 카테고리, 색상, 입력 props, 출력 변수를 정의합니다.
 */

// ── 카테고리 색상 ────────────────────────────
export const CATEGORY_COLORS = {
    TRIGGER: '#5865F2',   // Blurple
    ACTION: '#3BA55C',    // Green
    LOGIC: '#FAA61A',     // Yellow/Orange
    INTEG: '#ED4245',     // Red
    CUSTOM: '#9B59B6',    // Purple
};

export const CATEGORY_LABELS = {
    TRIGGER: 'TRIGGER',
    ACTION: 'ACTION',
    LOGIC: 'LOGIC',
    INTEG: 'INTEGRATION',
    CUSTOM: 'CUSTOM',
};

export const CATEGORY_ICONS = {
    TRIGGER: 'Zap',
    ACTION: 'Send',
    LOGIC: 'GitBranch',
    INTEG: 'Globe',
    CUSTOM: 'Wrench',
};

// ── Prop 타입 정의 ─────────────────────────────
// 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'json' | 'variable' | 'color'

// ── 노드 스키마 정의 ───────────────────────────
const NODE_SCHEMA = {

    // ═══════════════════════════════════════════
    // 1. 디스코드 인터페이스 계층 (Interaction Layer)
    // ═══════════════════════════════════════════

    // ── 1-1. Trigger Nodes ────────────────────
    TRIGGER_SLASH_COMMAND: {
        category: 'TRIGGER',
        label: 'Slash Command',
        description: '슬래시 명령어(/command) 입력을 감지합니다.',
        icon: 'Zap',
        props: [
            { key: 'commandName', label: 'Command Name', type: 'string', placeholder: 'help' },
            { key: 'description', label: 'Description', type: 'string', placeholder: '명령어 설명' },
            { key: 'options', label: 'Options', type: 'array', items: { name: 'string', type: 'enum', values: ['STRING', 'INTEGER', 'BOOLEAN', 'USER', 'CHANNEL'], required: 'boolean' } },
        ],
        outputs: ['interaction', 'user', 'channel', 'args'],
        handleConfig: { inputs: 0, outputs: 1 },
    },

    TRIGGER_MESSAGE_KEYWORD: {
        category: 'TRIGGER',
        label: 'Message Keyword',
        description: '특정 단어가 포함된 메시지를 감지합니다.',
        icon: 'MessageSquare',
        props: [
            { key: 'keywords', label: 'Keywords', type: 'array', items: 'string', placeholder: '안녕, hi' },
            { key: 'isExactMatch', label: 'Exact Match', type: 'boolean', default: false },
        ],
        outputs: ['message', 'content'],
        handleConfig: { inputs: 0, outputs: 1 },
    },

    TRIGGER_COMPONENT: {
        category: 'TRIGGER',
        label: 'Component Interaction',
        description: '버튼 또는 셀렉트 메뉴 클릭을 감지합니다.',
        icon: 'MousePointer2',
        props: [
            { key: 'customId', label: 'Component ID', type: 'string', placeholder: 'btn_start_game' },
        ],
        outputs: ['selectedValue'],
        handleConfig: { inputs: 0, outputs: 1 },
    },

    TRIGGER_MEMBER_EVENT: {
        category: 'TRIGGER',
        label: 'Member Event',
        description: '멤버 관련 이벤트를 감지합니다.',
        icon: 'Shield',
        props: [
            { key: 'eventType', label: 'Event Type', type: 'enum', values: ['JOIN', 'LEAVE', 'BAN', 'UNBAN'] },
        ],
        outputs: ['member'],
        handleConfig: { inputs: 0, outputs: 1 },
    },

    TRIGGER_VOICE_STATE: {
        category: 'TRIGGER',
        label: 'Voice State',
        description: '음성 채널 상태 변화를 감지합니다.',
        icon: 'Mic',
        props: [
            { key: 'targetChannel', label: 'Target Channel', type: 'string', placeholder: '채널 ID (비워두면 전체)' },
        ],
        outputs: ['member', 'voiceChannel'],
        handleConfig: { inputs: 0, outputs: 1 },
    },

    // ── 1-2. Action Nodes ─────────────────────
    ACTION_SEND_EMBED: {
        category: 'ACTION',
        label: 'Send Embed',
        description: '임베드 메시지를 전송합니다.',
        icon: 'Send',
        props: [
            { key: 'title', label: 'Title', type: 'string' },
            { key: 'description', label: 'Description', type: 'string', multiline: true },
            { key: 'color', label: 'Color', type: 'color', default: '#5865F2' },
            { key: 'imageUrl', label: 'Image URL', type: 'string' },
            { key: 'footer', label: 'Footer', type: 'string' },
        ],
        outputs: ['sentMessageId'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    ACTION_ATTACH_COMPONENT: {
        category: 'ACTION',
        label: 'Attach Component',
        description: '메시지에 버튼 또는 메뉴를 부착합니다.',
        icon: 'Puzzle',
        props: [
            { key: 'componentType', label: 'Type', type: 'enum', values: ['BUTTON', 'SELECT_MENU'] },
            { key: 'label', label: 'Label', type: 'string' },
            { key: 'style', label: 'Style', type: 'enum', values: ['PRIMARY', 'DANGER', 'LINK'] },
            { key: 'customId', label: 'Custom ID', type: 'string' },
        ],
        outputs: [],
        handleConfig: { inputs: 1, outputs: 0 },
    },

    ACTION_SHOW_MODAL: {
        category: 'ACTION',
        label: 'Show Modal',
        description: '폼 입력창(모달)을 표시합니다.',
        icon: 'FormInput',
        props: [
            { key: 'title', label: 'Modal Title', type: 'string' },
            { key: 'customId', label: 'Modal ID', type: 'string' },
            { key: 'inputs', label: 'Input Fields', type: 'array', items: { label: 'string', style: 'enum', id: 'string' } },
        ],
        outputs: [],
        handleConfig: { inputs: 1, outputs: 0 },
    },

    ACTION_MANAGE_USER: {
        category: 'ACTION',
        label: 'Manage User',
        description: '유저 권한을 관리합니다.',
        icon: 'UserCog',
        props: [
            { key: 'targetUser', label: 'Target User', type: 'variable' },
            { key: 'actionType', label: 'Action', type: 'enum', values: ['ADD_ROLE', 'REMOVE_ROLE', 'KICK', 'BAN', 'TIMEOUT'] },
            { key: 'value', label: 'Value', type: 'string', placeholder: '역할 ID / 타임아웃 시간' },
            { key: 'reason', label: 'Reason', type: 'string' },
        ],
        outputs: ['isSuccess'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    ACTION_MANAGE_CHANNEL: {
        category: 'ACTION',
        label: 'Manage Channel',
        description: '채널 또는 스레드를 관리합니다.',
        icon: 'Hash',
        props: [
            { key: 'actionType', label: 'Action', type: 'enum', values: ['CREATE', 'DELETE', 'ARCHIVE'] },
            { key: 'name', label: 'Channel Name', type: 'string' },
            { key: 'category', label: 'Category ID', type: 'string' },
        ],
        outputs: ['newChannelId'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    // ═══════════════════════════════════════════
    // 2. 기획 및 로직 계층 (Logic Layer)
    // ═══════════════════════════════════════════

    // ── 2-1. Data & Math ──────────────────────
    LOGIC_VARIABLE: {
        category: 'LOGIC',
        label: 'Variable',
        description: '변수를 저장하거나 불러옵니다.',
        icon: 'Variable',
        props: [
            { key: 'scope', label: 'Scope', type: 'enum', values: ['GLOBAL', 'USER'] },
            { key: 'key', label: 'Variable Name', type: 'string' },
            { key: 'operation', label: 'Operation', type: 'enum', values: ['SET', 'GET', 'ADD'] },
            { key: 'value', label: 'Value', type: 'string' },
        ],
        outputs: ['varResult'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    LOGIC_MATH: {
        category: 'LOGIC',
        label: 'Math Operation',
        description: '사칙연산을 수행합니다.',
        icon: 'Calculator',
        props: [
            { key: 'valueA', label: 'Value A', type: 'string' },
            { key: 'operator', label: 'Operator', type: 'enum', values: ['+', '-', '*', '/', '%'] },
            { key: 'valueB', label: 'Value B', type: 'string' },
        ],
        outputs: ['calcResult'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    LOGIC_RANDOM: {
        category: 'LOGIC',
        label: 'Random Number',
        description: '난수 또는 확률 판정을 수행합니다.',
        icon: 'Dices',
        props: [
            { key: 'type', label: 'Type', type: 'enum', values: ['INTEGER', 'PERCENT'] },
            { key: 'min', label: 'Min', type: 'number', default: 1 },
            { key: 'max', label: 'Max', type: 'number', default: 100 },
        ],
        outputs: ['randResult', 'isSuccess'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    // ── 2-2. Flow Control ─────────────────────
    LOGIC_IF_ELSE: {
        category: 'LOGIC',
        label: 'If / Else',
        description: '조건 분기 노드입니다.',
        icon: 'GitBranch',
        props: [
            { key: 'valueA', label: 'Value A', type: 'string' },
            { key: 'comparator', label: 'Comparator', type: 'enum', values: ['==', '!=', '>', '<', 'CONTAINS'] },
            { key: 'valueB', label: 'Value B', type: 'string' },
        ],
        outputs: ['true', 'false'],
        handleConfig: { inputs: 1, outputs: 2, outputLabels: ['True', 'False'] },
    },

    LOGIC_SWITCH: {
        category: 'LOGIC',
        label: 'Switch',
        description: '다중 조건 분기 노드입니다.',
        icon: 'LayoutList',
        props: [
            { key: 'targetVariable', label: 'Target Variable', type: 'variable' },
            { key: 'cases', label: 'Cases', type: 'array', items: 'string' },
        ],
        outputs: ['case', 'default'],
        handleConfig: { inputs: 1, outputs: 3, outputLabels: ['Case 1', 'Case 2', 'Default'] },
    },

    LOGIC_LOOP: {
        category: 'LOGIC',
        label: 'Loop',
        description: '반복 실행을 수행합니다.',
        icon: 'Repeat',
        props: [
            { key: 'loopType', label: 'Loop Type', type: 'enum', values: ['COUNT', 'FOR_EACH'] },
            { key: 'count', label: 'Count', type: 'number', default: 10 },
            { key: 'listVariable', label: 'List Variable', type: 'variable' },
        ],
        outputs: ['currentItem', 'index'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    LOGIC_STRING_MANIPULATION: {
        category: 'LOGIC',
        label: 'String Manipulation',
        description: '문자열을 가공합니다.',
        icon: 'Type',
        props: [
            { key: 'inputText', label: 'Input Text', type: 'string' },
            { key: 'action', label: 'Action', type: 'enum', values: ['JOIN', 'SPLIT', 'REPLACE', 'UPPERCASE'] },
            { key: 'param', label: 'Parameter', type: 'string' },
        ],
        outputs: ['stringResult'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    LOGIC_LIST_MANIPULATION: {
        category: 'LOGIC',
        label: 'List Manipulation',
        description: '리스트(배열)를 관리합니다.',
        icon: 'List',
        props: [
            { key: 'targetList', label: 'Target List', type: 'variable' },
            { key: 'action', label: 'Action', type: 'enum', values: ['ADD', 'REMOVE', 'PICK_RANDOM', 'SHUFFLE'] },
            { key: 'value', label: 'Value', type: 'string' },
        ],
        outputs: ['pickedItem'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    LOGIC_WAIT: {
        category: 'LOGIC',
        label: 'Wait',
        description: '지연 실행(타이머) 노드입니다.',
        icon: 'Timer',
        props: [
            { key: 'duration', label: 'Duration', type: 'number', default: 5 },
            { key: 'unit', label: 'Unit', type: 'enum', values: ['SECONDS', 'MINUTES', 'HOURS'] },
        ],
        outputs: [],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    LOGIC_DATE_TIME: {
        category: 'LOGIC',
        label: 'Date & Time',
        description: '날짜 및 시간을 계산합니다.',
        icon: 'Calendar',
        props: [
            { key: 'action', label: 'Action', type: 'enum', values: ['GET_NOW', 'CALC_DIFF'] },
            { key: 'targetDate', label: 'Target Date', type: 'string' },
        ],
        outputs: ['timestamp', 'formattedDate'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    // ═══════════════════════════════════════════
    // 3. 외부 연동 및 확장 계층 (Integration Layer)
    // ═══════════════════════════════════════════

    // ── 3-1. Network & API ────────────────────
    INTEG_HTTP_REQUEST: {
        category: 'INTEG',
        label: 'HTTP Request',
        description: '외부 API를 호출합니다.',
        icon: 'Globe',
        props: [
            { key: 'method', label: 'Method', type: 'enum', values: ['GET', 'POST'] },
            { key: 'url', label: 'URL', type: 'string', placeholder: 'https://api.example.com' },
            { key: 'headers', label: 'Headers', type: 'json' },
            { key: 'body', label: 'Body', type: 'json' },
        ],
        outputs: ['responseStatus', 'responseData'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    INTEG_JSON_PARSE: {
        category: 'INTEG',
        label: 'JSON Parse',
        description: 'JSON 데이터에서 특정 값을 추출합니다.',
        icon: 'Braces',
        props: [
            { key: 'jsonSource', label: 'JSON Source', type: 'variable' },
            { key: 'path', label: 'Path', type: 'string', placeholder: 'data.items[0].name' },
        ],
        outputs: ['parsedValue'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    INTEG_WEBHOOK: {
        category: 'INTEG',
        label: 'Webhook',
        description: '웹훅을 전송합니다.',
        icon: 'Webhook',
        props: [
            { key: 'webhookUrl', label: 'Webhook URL', type: 'string' },
            { key: 'content', label: 'Content', type: 'string', multiline: true },
            { key: 'username', label: 'Username', type: 'string' },
            { key: 'avatarUrl', label: 'Avatar URL', type: 'string' },
        ],
        outputs: [],
        handleConfig: { inputs: 1, outputs: 0 },
    },

    // ── 3-2. AI Capabilities ──────────────────
    INTEG_LLM_CHAT: {
        category: 'INTEG',
        label: 'AI Chat',
        description: 'AI 대화를 생성합니다.',
        icon: 'Bot',
        props: [
            { key: 'systemPrompt', label: 'System Prompt', type: 'string', multiline: true },
            { key: 'userPrompt', label: 'User Prompt', type: 'string', multiline: true },
            { key: 'temperature', label: 'Temperature', type: 'number', default: 0.7 },
        ],
        outputs: ['aiResponse'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    INTEG_AI_IMAGE: {
        category: 'INTEG',
        label: 'AI Image',
        description: '텍스트 기반 이미지 생성 노드입니다.',
        icon: 'Image',
        props: [
            { key: 'prompt', label: 'Prompt', type: 'string', multiline: true },
            { key: 'style', label: 'Style', type: 'string' },
        ],
        outputs: ['imageUrl'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    INTEG_SMART_CRAWLER: {
        category: 'INTEG',
        label: 'Smart Crawler',
        description: 'URL 콘텐츠를 지능적으로 파싱합니다.',
        icon: 'Scan',
        props: [
            { key: 'targetUrl', label: 'Target URL', type: 'string' },
            { key: 'instruction', label: 'Instruction', type: 'string', multiline: true },
        ],
        outputs: ['crawledResult'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    // ── 3-3. External Tools ───────────────────
    INTEG_GOOGLE_SHEET: {
        category: 'INTEG',
        label: 'Google Sheet',
        description: '구글 시트를 데이터베이스처럼 사용합니다.',
        icon: 'Sheet',
        props: [
            { key: 'sheetId', label: 'Sheet ID', type: 'string' },
            { key: 'range', label: 'Range', type: 'string', placeholder: 'Sheet1!A1:D10' },
            { key: 'action', label: 'Action', type: 'enum', values: ['READ', 'WRITE', 'APPEND'] },
        ],
        outputs: ['sheetData'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    INTEG_TRANSLATE: {
        category: 'INTEG',
        label: 'Translate',
        description: '자동 번역을 수행합니다.',
        icon: 'Languages',
        props: [
            { key: 'sourceText', label: 'Source Text', type: 'string' },
            { key: 'targetLang', label: 'Target Language', type: 'enum', values: ['EN', 'KO', 'JP', 'CN', 'ES', 'FR', 'DE'] },
        ],
        outputs: ['translatedText'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    INTEG_STT_TTS: {
        category: 'INTEG',
        label: 'STT / TTS',
        description: '음성 변환(STT / TTS)을 수행합니다.',
        icon: 'AudioLines',
        props: [
            { key: 'mode', label: 'Mode', type: 'enum', values: ['STT', 'TTS'] },
            { key: 'inputSource', label: 'Input Source', type: 'variable' },
        ],
        outputs: ['resultData'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    INTEG_RSS_READER: {
        category: 'INTEG',
        label: 'RSS Reader',
        description: 'RSS 피드를 감지합니다.',
        icon: 'Rss',
        props: [
            { key: 'rssUrl', label: 'RSS URL', type: 'string' },
        ],
        outputs: ['latestPostTitle', 'latestPostLink'],
        handleConfig: { inputs: 1, outputs: 1 },
    },

    // ═══════════════════════════════════════════
    // 4. 커스텀 계층 (Custom Layer)
    // ═══════════════════════════════════════════

    CUSTOM_CODE_BLOCK: {
        category: 'CUSTOM',
        label: 'Custom Code Block',
        description: '트리거, 액션, 로직 등을 자유롭게 직접 작성합니다. 전문가용.',
        icon: 'Wrench',
        props: [
            { key: 'blockName', label: 'Block Name', type: 'string', placeholder: 'My Custom Logic' },
            { key: 'blockType', label: 'Block Type', type: 'enum', values: ['TRIGGER', 'ACTION', 'LOGIC', 'INTEGRATION'] },
            { key: 'code', label: 'Code', type: 'string', multiline: true, placeholder: '// Write your custom code here...\n// Available: interaction, message, client, guild' },
            { key: 'inputVars', label: 'Input Variables', type: 'string', placeholder: 'var1, var2 (쉼표로 구분)' },
            { key: 'outputVars', label: 'Output Variables', type: 'string', placeholder: 'result1, result2 (쉼표로 구분)' },
            { key: 'description', label: 'Description', type: 'string', multiline: true, placeholder: '이 블럭이 하는 일을 설명하세요' },
        ],
        outputs: ['customResult'],
        handleConfig: { inputs: 1, outputs: 1 },
    },
};

// ── Helper Functions ────────────────────────────

export function getNodeSchema(type) {
    return NODE_SCHEMA[type] || null;
}

export function getCategory(type) {
    const prefix = type?.split('_')[0];
    return prefix || 'LOGIC';
}

export function getCategoryColor(type) {
    const cat = getCategory(type);
    return CATEGORY_COLORS[cat] || '#72767D';
}

export function getCategoryLabel(type) {
    const cat = getCategory(type);
    return CATEGORY_LABELS[cat] || 'NODE';
}

export function getNodesByCategory(category) {
    return Object.entries(NODE_SCHEMA)
        .filter(([, schema]) => schema.category === category)
        .map(([type, schema]) => ({ type, ...schema }));
}

export function getAllCategories() {
    return ['TRIGGER', 'ACTION', 'LOGIC', 'INTEG', 'CUSTOM'];
}

export default NODE_SCHEMA;
