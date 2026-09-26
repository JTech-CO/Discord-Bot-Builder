import { Clock, Mic, MousePointerClick, Power, SmilePlus, SquareSlash, TextCursorInput, UserPlus, MessageSquareText } from 'lucide-react';
import type { CheckResult, NodeDef, OutputDef } from '../types';
import {
  COMMAND_NAME, CUSTOM_ID, OUT_CHANNEL, OUT_MEMBER, OUT_MESSAGE, OUT_USER, SNOWFLAKE_OR_REF,
  clip, is, list, num, rows, str,
} from '../helpers';

const OPTION_TYPES = [
  { value: 'text', label: '텍스트' },
  { value: 'integer', label: '정수' },
  { value: 'number', label: '숫자' },
  { value: 'boolean', label: '참/거짓' },
  { value: 'user', label: '사용자' },
  { value: 'channel', label: '채널' },
  { value: 'role', label: '역할' },
];

const OPTION_VALUE_TYPE = {
  text: 'text', integer: 'number', number: 'number', boolean: 'boolean', user: 'user', channel: 'channel', role: 'role',
} as const;

export const slashCommand: NodeDef = {
  type: 'trigger.slashCommand',
  category: 'trigger',
  label: '슬래시 명령어',
  description: '사용자가 /명령어 를 입력하면 시작합니다.',
  icon: SquareSlash,
  provides: 'interaction',
  fields: [
    { key: 'name', label: '명령어 이름', kind: 'text', required: true, placeholder: '주사위', pattern: COMMAND_NAME },
    { key: 'description', label: '설명', kind: 'text', required: true, maxLength: 100, placeholder: '주사위를 굴립니다' },
    {
      key: 'options', label: '입력 옵션', kind: 'table', maxRows: 25, addLabel: '옵션 추가',
      help: '명령어와 함께 받을 값입니다. 옵션마다 이 노드의 출력값이 생깁니다.',
      columns: [
        { key: 'name', label: '이름', kind: 'text', required: true, pattern: COMMAND_NAME, placeholder: '면', unique: true },
        { key: 'type', label: '종류', kind: 'select', options: OPTION_TYPES, default: 'text' },
        { key: 'description', label: '설명', kind: 'text', required: true, maxLength: 100, placeholder: '주사위 면 수' },
        { key: 'required', label: '필수', kind: 'boolean', default: false },
      ],
    },
  ],
  outputs: (p) => [
    OUT_USER, OUT_MEMBER, OUT_CHANNEL,
    ...rows(p, 'options')
      .filter((r) => typeof r.name === 'string' && r.name)
      .map((r): OutputDef => ({
        key: `opt_${r.name}`,
        label: `옵션: ${r.name}`,
        type: OPTION_VALUE_TYPE[(r.type as keyof typeof OPTION_VALUE_TYPE) ?? 'text'] ?? 'text',
      })),
  ],
  summary: (p) => `/${str(p, 'name') || '명령어'}`,
  check: (p, self, graph) => {
    const out: CheckResult[] = [];
    const name = str(p, 'name');
    if (name && graph.nodesOfType('trigger.slashCommand').some((n) => n.id !== self && str(n.props, 'name') === name)) {
      out.push({ level: 'error', field: 'name', message: `/${name} 명령어가 이미 있습니다.` });
    }
    const opts = rows(p, 'options');
    const firstOptional = opts.findIndex((o) => o.required !== true);
    if (firstOptional >= 0 && opts.slice(firstOptional).some((o) => o.required === true)) {
      out.push({ level: 'error', field: 'options', message: '필수 옵션은 선택 옵션보다 앞에 있어야 합니다.' });
    }
    return out;
  },
};

export const message: NodeDef = {
  type: 'trigger.message',
  category: 'trigger',
  label: '메시지 감지',
  description: '채널에 특정 단어가 담긴 메시지가 올라오면 시작합니다.',
  icon: MessageSquareText,
  provides: 'message',
  fields: [
    {
      key: 'match', label: '일치 방식', kind: 'select', default: 'contains',
      options: [
        { value: 'contains', label: '포함' },
        { value: 'exact', label: '정확히 일치' },
        { value: 'startsWith', label: '~로 시작' },
      ],
    },
    { key: 'keywords', label: '키워드', kind: 'list', required: true, maxItems: 50, maxLength: 100, placeholder: '안녕' },
    { key: 'ignoreBots', label: '봇이 보낸 메시지는 무시', kind: 'boolean', default: true },
  ],
  outputs: () => [
    { key: 'author', label: '보낸 사람', type: 'user' },
    OUT_MEMBER, OUT_CHANNEL, OUT_MESSAGE,
    { key: 'content', label: '메시지 내용', type: 'text' },
  ],
  summary: (p) => clip(list(p, 'keywords').join(', ') || '키워드 없음'),
};

export const button: NodeDef = {
  type: 'trigger.button',
  category: 'trigger',
  label: '버튼 클릭',
  description: '봇이 보낸 메시지의 버튼을 누르면 시작합니다.',
  icon: MousePointerClick,
  provides: 'interaction',
  fields: [
    {
      key: 'customId', label: '버튼 ID', kind: 'text', required: true, pattern: CUSTOM_ID, placeholder: 'join_game',
      help: '메시지 보내기 노드에서 만든 버튼의 ID와 같아야 합니다.',
    },
  ],
  outputs: () => [OUT_USER, OUT_MEMBER, OUT_CHANNEL, OUT_MESSAGE],
  summary: (p) => str(p, 'customId') || 'ID 없음',
  check: (p, self, graph) => {
    const id = str(p, 'customId');
    if (!id) return [];
    const out: CheckResult[] = [];
    const made = graph.nodesOfType('action.sendMessage')
      .some((n) => rows(n.props, 'buttons').some((b) => b.style !== 'link' && b.customId === id));
    if (!made) out.push({ level: 'warning', field: 'customId', message: `ID가 "${id}"인 버튼을 보내는 노드가 없습니다.` });
    if (graph.nodesOfType('trigger.button').some((n) => n.id !== self && str(n.props, 'customId') === id)) {
      out.push({ level: 'warning', field: 'customId', message: `같은 버튼 ID를 처리하는 트리거가 여러 개입니다.` });
    }
    return out;
  },
};

export const modalSubmit: NodeDef = {
  type: 'trigger.modalSubmit',
  category: 'trigger',
  label: '모달 제출',
  description: '모달 입력창을 제출하면 시작합니다.',
  icon: TextCursorInput,
  provides: 'interaction',
  fields: [
    {
      key: 'customId', label: '모달 ID', kind: 'text', required: true, pattern: CUSTOM_ID, placeholder: 'apply_form',
      help: '모달 띄우기 노드의 모달 ID와 같아야 합니다. 그 모달의 입력칸이 출력값이 됩니다.',
    },
  ],
  outputs: (p, graph) => {
    const id = str(p, 'customId');
    const modal = graph.nodesOfType('action.showModal').find((n) => str(n.props, 'customId') === id);
    const fields = modal ? rows(modal.props, 'fields') : [];
    return [
      OUT_USER, OUT_MEMBER, OUT_CHANNEL,
      ...fields
        .filter((f) => typeof f.id === 'string' && f.id)
        .map((f): OutputDef => ({ key: `field_${f.id}`, label: `입력: ${f.label || f.id}`, type: 'text' })),
    ];
  },
  summary: (p) => str(p, 'customId') || 'ID 없음',
  check: (p, _self, graph) => {
    const id = str(p, 'customId');
    if (!id || graph.nodesOfType('action.showModal').some((n) => str(n.props, 'customId') === id)) return [];
    return [{ level: 'warning', field: 'customId', message: `ID가 "${id}"인 모달을 띄우는 노드가 없습니다.` }];
  },
};

export const member: NodeDef = {
  type: 'trigger.member',
  category: 'trigger',
  label: '멤버 입장·퇴장',
  description: '서버에 멤버가 들어오거나 나가면 시작합니다.',
  icon: UserPlus,
  provides: 'event',
  fields: [
    {
      key: 'event', label: '이벤트', kind: 'select', default: 'join',
      options: [
        { value: 'join', label: '입장' },
        { value: 'leave', label: '퇴장' },
      ],
    },
  ],
  outputs: () => [OUT_USER, OUT_MEMBER],
  summary: (p) => (str(p, 'event') === 'leave' ? '퇴장' : '입장'),
};

export const voice: NodeDef = {
  type: 'trigger.voice',
  category: 'trigger',
  label: '음성 채널',
  description: '멤버가 음성 채널에 들어오거나 나가면 시작합니다.',
  icon: Mic,
  provides: 'event',
  fields: [
    {
      key: 'event', label: '이벤트', kind: 'select', default: 'join',
      options: [
        { value: 'join', label: '입장' },
        { value: 'leave', label: '퇴장' },
        { value: 'move', label: '채널 이동' },
      ],
    },
    {
      key: 'channelId', label: '음성 채널 ID', kind: 'text', pattern: SNOWFLAKE_OR_REF,
      help: '비워 두면 모든 음성 채널에 반응합니다.',
    },
  ],
  outputs: () => [OUT_USER, OUT_MEMBER, { key: 'channel', label: '음성 채널', type: 'channel' }],
  summary: (p) => ({ join: '입장', leave: '퇴장', move: '이동' })[str(p, 'event')] ?? '입장',
};

export const reaction: NodeDef = {
  type: 'trigger.reaction',
  category: 'trigger',
  label: '반응 추가',
  description: '메시지에 이모지 반응이 달리면 시작합니다.',
  icon: SmilePlus,
  provides: 'event',
  fields: [
    { key: 'emoji', label: '이모지', kind: 'text', maxLength: 64, help: '비워 두면 모든 이모지에 반응합니다.' },
    { key: 'messageId', label: '메시지 ID', kind: 'text', pattern: SNOWFLAKE_OR_REF, help: '비워 두면 모든 메시지에 반응합니다.' },
  ],
  outputs: () => [
    OUT_USER, OUT_MEMBER, OUT_CHANNEL, OUT_MESSAGE,
    { key: 'emoji', label: '이모지', type: 'text' },
  ],
  summary: (p) => str(p, 'emoji') || '모든 이모지',
};

export const schedule: NodeDef = {
  type: 'trigger.schedule',
  category: 'trigger',
  label: '예약 실행',
  description: '정해진 주기나 시각마다 시작합니다.',
  icon: Clock,
  provides: 'event',
  fields: [
    {
      key: 'mode', label: '방식', kind: 'select', default: 'interval',
      options: [
        { value: 'interval', label: '일정 간격' },
        { value: 'daily', label: '매일 정해진 시각' },
      ],
    },
    { key: 'every', label: '간격', kind: 'number', min: 1, max: 1440, default: 30, when: is('mode', 'interval') },
    {
      key: 'unit', label: '단위', kind: 'select', default: 'minutes', when: is('mode', 'interval'),
      options: [
        { value: 'minutes', label: '분' },
        { value: 'hours', label: '시간' },
      ],
    },
    {
      key: 'time', label: '시각', kind: 'text', placeholder: '09:00', when: is('mode', 'daily'), required: true,
      pattern: { regex: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'HH:MM 형식으로 입력해 주세요.' },
    },
    { key: 'timezone', label: '시간대', kind: 'text', default: 'Asia/Seoul', maxLength: 64, when: is('mode', 'daily') },
  ],
  outputs: () => [],
  summary: (p) =>
    str(p, 'mode') === 'daily'
      ? `매일 ${str(p, 'time') || '--:--'}`
      : `${num(p, 'every') ?? '?'}${str(p, 'unit') === 'hours' ? '시간' : '분'}마다`,
};

export const ready: NodeDef = {
  type: 'trigger.ready',
  category: 'trigger',
  label: '봇 시작',
  description: '봇이 켜져 디스코드에 접속하면 한 번 시작합니다.',
  icon: Power,
  provides: 'event',
  fields: [],
  outputs: () => [],
};

export const triggerDefs = [slashCommand, message, button, modalSubmit, member, voice, reaction, schedule, ready];
