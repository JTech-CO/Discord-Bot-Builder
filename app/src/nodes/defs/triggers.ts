import { Clock, Mic, MousePointerClick, Power, SmilePlus, SquareSlash, TextCursorInput, UserPlus, MessageSquareText } from 'lucide-react';
import type { CheckResult, NodeDef, OutputDef, SimInputDef, SimValue } from '../types';
import { USER_INPUTS, asMember, inputText, inputUser, simChannel, simMessage, simRole, simUser } from '../sim';
import {
  COMMAND_NAME, CUSTOM_ID, OUT_CHANNEL, OUT_MEMBER, OUT_MESSAGE, OUT_USER, SNOWFLAKE_OR_REF,
  clip, duration, is, list, num, rows, safeKey, str,
} from '../helpers';
import { t } from '../../i18n/t';

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

// discord.js option builder names, so the AI maps option types without guessing.
const OPTION_BUILDER: Record<string, string> = {
  text: 'String', integer: 'Integer', number: 'Number', boolean: 'Boolean', user: 'User', channel: 'Channel', role: 'Role',
};

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
        label: t('옵션: {0}', [r.name]),
        type: OPTION_VALUE_TYPE[(r.type as keyof typeof OPTION_VALUE_TYPE) ?? 'text'] ?? 'text',
      })),
  ],
  summary: (p) => `/${str(p, 'name') || t('명령어')}`,
  check: (p, self, graph) => {
    const out: CheckResult[] = [];
    const name = str(p, 'name');
    if (name && graph.nodesOfType('trigger.slashCommand').some((n) => n.id !== self && str(n.props, 'name') === name)) {
      out.push({ level: 'error', field: 'name', message: t('/{0} 명령어가 이미 있습니다.', [name]) });
    }
    const opts = rows(p, 'options');
    const firstOptional = opts.findIndex((o) => o.required !== true);
    if (firstOptional >= 0 && opts.slice(firstOptional).some((o) => o.required === true)) {
      out.push({ level: 'error', field: 'options', message: t('필수 옵션은 선택 옵션보다 앞에 있어야 합니다.') });
    }
    return out;
  },
  simInputs: (p) => [
    ...USER_INPUTS,
    ...rows(p, 'options').filter((o) => o.name).map((o): SimInputDef => {
      const numeric = o.type === 'integer' || o.type === 'number';
      return {
        key: `opt_${o.name}`,
        label: t('옵션 {0}{1}', [o.name, o.required === true ? t(' (필수)') : '']),
        kind: numeric ? 'number' : o.type === 'boolean' ? 'boolean' : 'text',
        default: numeric ? 1 : o.type === 'boolean' ? false : '',
      };
    }),
  ],
  simulateTrigger: (p, input) => {
    const u = inputUser(input);
    const outputs: Record<string, SimValue> = { user: u, member: asMember(u), channel: simChannel(t('일반')) };
    const missing: string[] = [];
    for (const o of rows(p, 'options').filter((o) => o.name)) {
      const key = `opt_${o.name}`;
      const raw = input[key];
      const empty = raw === undefined || raw === '';
      if (empty && o.required === true) missing.push(String(o.name));
      const text = empty ? '' : String(raw);
      outputs[key] = empty ? null
        : o.type === 'user' ? simUser(text) : o.type === 'channel' ? simChannel(text) : o.type === 'role' ? simRole(text) : raw;
    }
    if (missing.length) return { matched: false, outputs, log: t('필수 옵션({0})이 비어 있으면 디스코드가 명령어를 보내지 않습니다.', [missing.join(', ')]) };
    return { matched: true, outputs, log: t('{0}님이 /{1} 명령어를 입력했습니다.', [u.name, str(p, 'name')]) };
  },
  draftHint: 'Each option adds an output opt_<option name> (for example opt_면).',
  spec: (p, f) => {
    const opts = rows(p, 'options').filter((o) => o.name);
    const options = opts.length
      ? ` Options, in this order: ${opts
          .map((o) => `${f.text(o.name)} (${OPTION_BUILDER[String(o.type)] ?? 'String'}, ${o.required === true ? 'required' : 'optional'}, description ${f.text(o.description)}) → output opt_${safeKey(o.name)}`)
          .join('; ')}. Optional options that were not given are empty.`
      : ' No options.';
    return `Starts when a user runs the slash command named ${f.text(str(p, 'name'))} with description ${f.text(str(p, 'description'))}.${options}`;
  },
  requires: () => ({ intents: ['Guilds'] }),
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
    { key: 'author', label: t('보낸 사람'), type: 'user' },
    OUT_MEMBER, OUT_CHANNEL, OUT_MESSAGE,
    { key: 'content', label: t('메시지 내용'), type: 'text' },
  ],
  summary: (p) => clip(list(p, 'keywords').join(', ') || t('키워드 없음')),
  simInputs: (p) => [
    { key: 'user', label: t('보낸 사람 이름'), kind: 'text', default: t('테스트유저') },
    USER_INPUTS[1],
    { key: 'content', label: t('메시지 내용'), kind: 'text', default: list(p, 'keywords')[0] ?? t('안녕') },
  ],
  simulateTrigger: (p, input) => {
    const u = inputUser(input);
    const content = inputText(input, 'content');
    const text = content.trim().toLowerCase();
    const mode = str(p, 'match') || 'contains';
    const matched = list(p, 'keywords').map((k) => k.trim().toLowerCase()).filter(Boolean)
      .some((k) => (mode === 'exact' ? text === k : mode === 'startsWith' ? text.startsWith(k) : text.includes(k)));
    return {
      matched,
      outputs: { author: u, member: asMember(u), channel: simChannel(t('일반')), message: simMessage(content), content },
      log: matched ? t('{0}님의 메시지 "{1}"가 키워드에 맞습니다.', [u.name, clip(content, 30)]) : t('메시지 "{0}"는 키워드에 맞지 않아 흐름이 시작되지 않습니다.', [clip(content, 30)]),
    };
  },
  spec: (p, f) => {
    const how = { contains: 'contains', exact: 'is exactly (after trimming)', startsWith: 'starts with' }[str(p, 'match') || 'contains'] ?? 'contains';
    const bots = p.ignoreBots === false ? 'Also handle messages from other bots.' : 'Ignore messages sent by bots.';
    return `Starts when a message in a server text channel ${how} any of ${f.list(p.keywords)}, compared case-insensitively. ${bots} Never react to this bot's own messages.`;
  },
  requires: () => ({ intents: ['Guilds', 'GuildMessages', 'MessageContent'], permissions: ['ViewChannel', 'ReadMessageHistory'] }),
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
  summary: (p) => str(p, 'customId') || t('ID 없음'),
  check: (p, self, graph) => {
    const id = str(p, 'customId');
    if (!id) return [];
    const out: CheckResult[] = [];
    const made = graph.nodesOfType('action.sendMessage')
      .some((n) => rows(n.props, 'buttons').some((b) => b.style !== 'link' && b.customId === id));
    if (!made) out.push({ level: 'warning', field: 'customId', message: t('ID가 "{0}"인 버튼을 보내는 노드가 없습니다.', [id]) });
    if (graph.nodesOfType('trigger.button').some((n) => n.id !== self && str(n.props, 'customId') === id)) {
      out.push({ level: 'warning', field: 'customId', message: t('같은 버튼 ID를 처리하는 트리거가 여러 개입니다.') });
    }
    return out;
  },
  simInputs: () => USER_INPUTS,
  simulateTrigger: (p, input) => {
    const u = inputUser(input);
    return {
      matched: true,
      outputs: { user: u, member: asMember(u), channel: simChannel(t('일반')), message: simMessage(t('버튼이 달린 메시지')) },
      log: t('{0}님이 "{1}" 버튼을 눌렀습니다.', [u.name, str(p, 'customId')]),
    };
  },
  spec: (p, f) => `Starts when a user clicks a button whose custom ID is ${f.text(str(p, 'customId'))}. Output message is the message the button is attached to.`,
  requires: () => ({ intents: ['Guilds'] }),
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
        .map((f): OutputDef => ({ key: `field_${f.id}`, label: t('입력: {0}', [f.label || f.id]), type: 'text' })),
    ];
  },
  summary: (p) => str(p, 'customId') || t('ID 없음'),
  check: (p, _self, graph) => {
    const id = str(p, 'customId');
    if (!id || graph.nodesOfType('action.showModal').some((n) => str(n.props, 'customId') === id)) return [];
    return [{ level: 'warning', field: 'customId', message: t('ID가 "{0}"인 모달을 띄우는 노드가 없습니다.', [id]) }];
  },
  simInputs: (p, graph) => {
    const modal = graph.nodesOfType('action.showModal').find((n) => str(n.props, 'customId') === str(p, 'customId'));
    const fields = modal ? rows(modal.props, 'fields').filter((f) => f.id) : [];
    return [
      ...USER_INPUTS,
      ...fields.map((f): SimInputDef => ({ key: `field_${f.id}`, label: t('입력 {0}', [f.label || f.id]), kind: 'text', default: '' })),
    ];
  },
  simulateTrigger: (p, input) => {
    const u = inputUser(input);
    const outputs: Record<string, SimValue> = { user: u, member: asMember(u), channel: simChannel(t('일반')) };
    for (const [key, value] of Object.entries(input)) if (key.startsWith('field_')) outputs[key] = String(value);
    return { matched: true, outputs, log: t('{0}님이 "{1}" 모달을 제출했습니다.', [u.name, str(p, 'customId')]) };
  },
  draftHint: 'Outputs field_<input id> for every input of the action.showModal node with the same customId.',
  spec: (p, f) =>
    `Starts when a user submits the modal whose custom ID is ${f.text(str(p, 'customId'))}. Each text input's value is output field_<input id>.`,
  requires: () => ({ intents: ['Guilds'] }),
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
  summary: (p) => (str(p, 'event') === 'leave' ? t('퇴장') : t('입장')),
  simInputs: () => [USER_INPUTS[0]],
  simulateTrigger: (p, input) => {
    const u = inputUser(input);
    return { matched: true, outputs: { user: u, member: asMember(u) }, log: t('{0}님이 서버에 {1}습니다.', [u.name, str(p, 'event') === 'leave' ? t('나갔') : t('들어왔')]) };
  },
  spec: (p) =>
    str(p, 'event') === 'leave'
      ? 'Starts when a member leaves (or is removed from) a server. The member may be partial.'
      : 'Starts when a new member joins a server.',
  requires: () => ({ intents: ['Guilds', 'GuildMembers'] }),
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
  outputs: () => [OUT_USER, OUT_MEMBER, { key: 'channel', label: t('음성 채널'), type: 'channel' }],
  summary: (p) => ({ join: t('입장'), leave: t('퇴장'), move: t('이동') })[str(p, 'event')] ?? t('입장'),
  simInputs: () => [USER_INPUTS[0], { key: 'channel', label: t('음성 채널 이름'), kind: 'text', default: t('일반 음성') }],
  simulateTrigger: (p, input) => {
    const u = inputUser(input);
    const ch = simChannel(inputText(input, 'channel'));
    const what = { join: t('에 들어왔'), leave: t('에서 나갔'), move: t('(으)로 옮겼') }[str(p, 'event') || 'join'];
    return { matched: true, outputs: { user: u, member: asMember(u), channel: ch }, log: t('{0}님이 #{1}{2}습니다.', [u.name, ch.name, what]) };
  },
  spec: (p, f) => {
    const what = {
      join: 'joins a voice channel (was not in one before)',
      leave: 'leaves voice entirely (is not in any voice channel after)',
      move: 'moves from one voice channel to another',
    }[str(p, 'event') || 'join'];
    const where = str(p, 'channelId') ? ` The voice channel involved must be ${f.target(p.channelId)}.` : '';
    return `Starts when a member ${what}.${where} Output channel is the channel joined, left, or moved into.`;
  },
  requires: () => ({ intents: ['Guilds', 'GuildVoiceStates'] }),
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
    { key: 'emoji', label: t('이모지'), type: 'text' },
  ],
  summary: (p) => str(p, 'emoji') || t('모든 이모지'),
  simInputs: (p) => [USER_INPUTS[0], { key: 'emoji', label: t('반응 이모지'), kind: 'text', default: str(p, 'emoji') || '👍' }],
  simulateTrigger: (p, input) => {
    const u = inputUser(input);
    const emoji = inputText(input, 'emoji');
    const matched = !str(p, 'emoji') || emoji === str(p, 'emoji');
    return {
      matched,
      outputs: { user: u, member: asMember(u), channel: simChannel(t('일반')), message: simMessage(t('반응이 달린 메시지')), emoji },
      log: matched ? t('{0}님이 {1} 반응을 달았습니다.', [u.name, emoji]) : t('{0} 반응은 조건({1})과 달라 흐름이 시작되지 않습니다.', [emoji, str(p, 'emoji')]),
    };
  },
  spec: (p, f) => {
    const emoji = str(p, 'emoji') ? `the reaction ${f.text(str(p, 'emoji'))} (match unicode emoji or custom emoji name)` : 'any reaction';
    const target = str(p, 'messageId') ? `message ${f.target(p.messageId)}` : 'any message';
    return `Starts when a user adds ${emoji} to ${target} in a server. Ignore reactions added by bots. Fetch partial reactions and messages before use.`;
  },
  requires: () => ({
    intents: ['Guilds', 'GuildMessageReactions'],
    partials: ['Message', 'Channel', 'Reaction'],
    permissions: ['ViewChannel', 'ReadMessageHistory'],
  }),
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
    {
      key: 'timezone', label: '시간대', kind: 'text', default: 'Asia/Seoul', maxLength: 64, when: is('mode', 'daily'),
      pattern: { regex: /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){0,2}$/, message: 'Asia/Seoul 같은 IANA 시간대 이름을 넣어 주세요.' },
    },
  ],
  outputs: () => [],
  summary: (p) =>
    str(p, 'mode') === 'daily'
      ? t('매일 {0}', [str(p, 'time') || '--:--'])
      : t('{0}마다', [duration(num(p, 'every') ?? '?', str(p, 'unit') === 'hours' ? 'hours' : 'minutes')]),
  simInputs: () => [],
  simulateTrigger: (p) => ({
    matched: true,
    outputs: {},
    log: str(p, 'mode') === 'daily' ? t('매일 {0}이 되었습니다.', [str(p, 'time') || '--:--']) : t('예약한 간격이 지났습니다.'),
  }),
  spec: (p, f) =>
    str(p, 'mode') === 'daily'
      ? `Starts every day at ${f.text(str(p, 'time'))} in the ${f.text(str(p, 'timezone') || 'Asia/Seoul')} time zone, while the bot is running. There is no user or channel context.`
      : `Starts every ${num(p, 'every') ?? 30} ${str(p, 'unit') === 'hours' ? 'hours' : 'minutes'} while the bot is running (first run one interval after the bot is ready). There is no user or channel context.`,
  requires: () => ({ intents: ['Guilds'] }),
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
  simInputs: () => [],
  simulateTrigger: () => ({ matched: true, outputs: {}, log: t('봇이 켜졌습니다.') }),
  spec: () => 'Starts once each time the bot has logged in and is ready. There is no user or channel context.',
  requires: () => ({ intents: ['Guilds'] }),
};

export const triggerDefs = [slashCommand, message, button, modalSubmit, member, voice, reaction, schedule, ready];

