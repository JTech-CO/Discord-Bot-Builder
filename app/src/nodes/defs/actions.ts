import { AppWindow, Gavel, Hash, Send, Smile, Tags, Trash2 } from 'lucide-react';
import type { CheckResult, NodeDef, Permission, Props, SpecFormat } from '../types';
import { CUSTOM_ID, OUT_CHANNEL, OUT_MESSAGE, SNOWFLAKE_OR_REF, bool, clip, is, num, oneOf, rows, str } from '../helpers';

const BUTTON_STYLES = ['primary', 'secondary', 'success', 'danger'] as const;

const reasonSpec = (p: Props, f: SpecFormat) => (str(p, 'reason').trim() ? ` with audit-log reason ${f.text(p.reason)}` : '');
const FAIL_SOFT = 'If Discord rejects it (missing permission, role hierarchy, unknown member), log the error and continue the flow.';

const reasonField = { key: 'reason', label: '사유', kind: 'text', maxLength: 512, refs: true } as const;

export const sendMessage: NodeDef = {
  type: 'action.sendMessage',
  category: 'action',
  label: '메시지 보내기',
  description: '답장, 채널 메시지, DM을 보냅니다. 임베드와 버튼을 붙일 수 있습니다.',
  icon: Send,
  fields: [
    {
      key: 'target', label: '보낼 곳', kind: 'select', default: 'reply',
      options: [
        { value: 'reply', label: '시작한 곳에 답장' },
        { value: 'channel', label: '특정 채널' },
        { value: 'dm', label: '사용자 DM' },
      ],
    },
    { key: 'channel', label: '채널', kind: 'text', required: true, refs: ['channel'], pattern: SNOWFLAKE_OR_REF, when: is('target', 'channel') },
    { key: 'user', label: '받는 사람', kind: 'text', required: true, refs: ['user', 'member'], pattern: SNOWFLAKE_OR_REF, when: is('target', 'dm') },
    { key: 'content', label: '내용', kind: 'textarea', maxLength: 2000, refs: true, placeholder: '안녕하세요, {{n1.user}}님!' },
    { key: 'ephemeral', label: '나에게만 보이기', kind: 'boolean', default: false, when: is('target', 'reply'), help: '명령어·버튼으로 시작한 경우에만 적용됩니다.' },
    { key: 'embed', label: '임베드 사용', kind: 'boolean', default: false },
    { key: 'embedTitle', label: '임베드 제목', kind: 'text', maxLength: 256, refs: true, when: (p) => bool(p, 'embed') },
    { key: 'embedDescription', label: '임베드 설명', kind: 'textarea', maxLength: 4096, refs: true, when: (p) => bool(p, 'embed') },
    { key: 'embedColor', label: '임베드 색상', kind: 'color', default: '#5865F2', when: (p) => bool(p, 'embed') },
    { key: 'embedImage', label: '이미지 URL', kind: 'text', maxLength: 2048, refs: true, when: (p) => bool(p, 'embed') },
    { key: 'embedFooter', label: '푸터', kind: 'text', maxLength: 2048, refs: true, when: (p) => bool(p, 'embed') },
    {
      key: 'buttons', label: '버튼', kind: 'table', maxRows: 5, addLabel: '버튼 추가',
      help: '누르면 같은 ID를 가진 "버튼 클릭" 트리거가 시작됩니다. 링크 버튼은 URL을 엽니다.',
      columns: [
        { key: 'label', label: '문구', kind: 'text', required: true, maxLength: 80, placeholder: '참가' },
        {
          key: 'style', label: '스타일', kind: 'select', default: 'primary',
          options: [
            { value: 'primary', label: '기본' },
            { value: 'secondary', label: '보조' },
            { value: 'success', label: '성공' },
            { value: 'danger', label: '위험' },
            { value: 'link', label: '링크' },
          ],
        },
        { key: 'customId', label: 'ID 또는 URL', kind: 'text', required: true, maxLength: 512, placeholder: 'join_game' },
      ],
    },
  ],
  outputs: () => [{ ...OUT_MESSAGE, label: '보낸 메시지' }],
  summary: (p) => clip(str(p, 'content') || (bool(p, 'embed') ? str(p, 'embedTitle') : '') || '내용 없음'),
  check: (p, _self, graph) => {
    const out: CheckResult[] = [];
    if (!str(p, 'content').trim() && !bool(p, 'embed')) {
      out.push({ level: 'error', field: 'content', message: '내용을 쓰거나 임베드를 켜 주세요.' });
    }
    if (bool(p, 'embed') && !str(p, 'embedTitle').trim() && !str(p, 'embedDescription').trim()) {
      out.push({ level: 'error', field: 'embedTitle', message: '임베드에는 제목이나 설명이 있어야 합니다.' });
    }
    const seen = new Set<string>();
    for (const b of rows(p, 'buttons')) {
      const id = typeof b.customId === 'string' ? b.customId : '';
      if (!id) continue;
      if (b.style === 'link') {
        if (!/^https?:\/\//.test(id)) out.push({ level: 'error', field: 'buttons', message: `링크 버튼 "${b.label}"에는 http(s) URL이 필요합니다.` });
        continue;
      }
      if (!CUSTOM_ID.regex.test(id)) {
        out.push({ level: 'error', field: 'buttons', message: `버튼 "${b.label}"의 ID: ${CUSTOM_ID.message}` });
      } else if (seen.has(id)) {
        out.push({ level: 'error', field: 'buttons', message: `버튼 ID "${id}"가 중복됩니다.` });
      } else if (!graph.nodesOfType('trigger.button').some((n) => str(n.props, 'customId') === id)) {
        out.push({ level: 'warning', field: 'buttons', message: `버튼 "${id}"를 눌렀을 때 시작할 "버튼 클릭" 트리거가 없습니다.` });
      }
      seen.add(id);
    }
    return out;
  },
  spec: (p, f) => {
    const target = {
      reply: `Reply to the interaction or message that started this flow${bool(p, 'ephemeral') ? ' as an ephemeral reply (only that user sees it; not possible for message-started flows, so reply normally there)' : ''}`,
      channel: `Send a message to channel ${f.target(p.channel)}`,
      dm: `Send a direct message to user ${f.target(p.user)} (if their DMs are closed, log it and continue)`,
    }[str(p, 'target') || 'reply'];
    const parts: string[] = [];
    if (str(p, 'content').trim()) parts.push(`the text ${f.text(p.content)}`);
    if (bool(p, 'embed')) {
      const e = [
        str(p, 'embedTitle').trim() && `title ${f.text(p.embedTitle)}`,
        str(p, 'embedDescription').trim() && `description ${f.text(p.embedDescription)}`,
        `color ${f.text(str(p, 'embedColor') || '#5865F2')}`,
        str(p, 'embedImage').trim() && `image URL ${f.text(p.embedImage)}`,
        str(p, 'embedFooter').trim() && `footer ${f.text(p.embedFooter)}`,
      ].filter(Boolean);
      parts.push(`an embed with ${e.join(', ')}`);
    }
    const buttons = rows(p, 'buttons').filter((b) => b.label);
    if (buttons.length) {
      parts.push(`one row of buttons: ${buttons
        .map((b) => (b.style === 'link'
          ? `a link button ${f.text(b.label)} opening ${f.text(b.customId)}`
          : `a ${oneOf(b.style, BUTTON_STYLES, 'primary')} button ${f.text(b.label)} with custom ID ${f.text(b.customId)}`))
        .join('; ')}`);
    }
    return `${target}, containing ${parts.join(' and ')}. Output message is the sent message.`;
  },
  requires: (p): { permissions: Permission[] } => ({
    permissions: ['ViewChannel', 'SendMessages', ...(bool(p, 'embed') ? (['EmbedLinks'] as Permission[]) : [])],
  }),
};

export const showModal: NodeDef = {
  type: 'action.showModal',
  category: 'action',
  label: '모달 띄우기',
  description: '입력창(모달)을 띄웁니다. 제출하면 "모달 제출" 트리거가 시작됩니다.',
  icon: AppWindow,
  needs: ['interaction'],
  fields: [
    { key: 'title', label: '모달 제목', kind: 'text', required: true, maxLength: 45, placeholder: '가입 신청서' },
    { key: 'customId', label: '모달 ID', kind: 'text', required: true, pattern: CUSTOM_ID, placeholder: 'apply_form' },
    {
      key: 'fields', label: '입력칸', kind: 'table', maxRows: 5, addLabel: '입력칸 추가', required: true,
      columns: [
        { key: 'id', label: 'ID', kind: 'text', required: true, pattern: CUSTOM_ID, placeholder: 'nickname', unique: true },
        { key: 'label', label: '제목', kind: 'text', required: true, maxLength: 45, placeholder: '닉네임' },
        {
          key: 'style', label: '형태', kind: 'select', default: 'short',
          options: [
            { value: 'short', label: '한 줄' },
            { value: 'paragraph', label: '여러 줄' },
          ],
        },
        { key: 'required', label: '필수', kind: 'boolean', default: true },
      ],
    },
  ],
  ports: () => [],
  summary: (p) => `${str(p, 'title') || '제목 없음'} · ${rows(p, 'fields').length}칸`,
  check: (p, _self, graph) => {
    const id = str(p, 'customId');
    if (!id || graph.nodesOfType('trigger.modalSubmit').some((n) => str(n.props, 'customId') === id)) return [];
    return [{ level: 'warning', field: 'customId', message: `모달 "${id}"를 제출했을 때 시작할 "모달 제출" 트리거가 없습니다.` }];
  },
  spec: (p, f) => {
    const inputs = rows(p, 'fields')
      .map((x) => `${f.text(x.id)} labeled ${f.text(x.label)} (${x.style === 'paragraph' ? 'paragraph' : 'short'}, ${x.required === false ? 'optional' : 'required'})`)
      .join('; ');
    return `Show a modal titled ${f.text(p.title)} with custom ID ${f.text(p.customId)} and these text inputs: ${inputs}. It must be the interaction's first response, so never defer before it. The flow ends here; the submission starts the matching modal-submit flow.`;
  },
};

export const role: NodeDef = {
  type: 'action.role',
  category: 'action',
  label: '역할 지급·회수',
  description: '멤버에게 역할을 주거나 뺏습니다.',
  icon: Tags,
  fields: [
    {
      key: 'operation', label: '동작', kind: 'select', default: 'add',
      options: [
        { value: 'add', label: '지급' },
        { value: 'remove', label: '회수' },
      ],
    },
    { key: 'member', label: '대상 멤버', kind: 'text', required: true, refs: ['member', 'user'], pattern: SNOWFLAKE_OR_REF },
    { key: 'roleId', label: '역할 ID', kind: 'text', required: true, refs: ['role'], pattern: SNOWFLAKE_OR_REF },
    reasonField,
  ],
  summary: (p) => (str(p, 'operation') === 'remove' ? '역할 회수' : '역할 지급'),
  spec: (p, f) => {
    const add = str(p, 'operation') !== 'remove';
    return `${add ? 'Give' : 'Remove'} role ${f.target(p.roleId)} ${add ? 'to' : 'from'} member ${f.target(p.member)}${reasonSpec(p, f)}. ${FAIL_SOFT}`;
  },
  requires: () => ({ permissions: ['ManageRoles'] }),
};

export const moderate: NodeDef = {
  type: 'action.moderate',
  category: 'action',
  label: '제재',
  description: '멤버를 타임아웃, 추방, 차단합니다.',
  icon: Gavel,
  fields: [
    {
      key: 'operation', label: '제재 종류', kind: 'select', default: 'timeout',
      options: [
        { value: 'timeout', label: '타임아웃' },
        { value: 'kick', label: '추방' },
        { value: 'ban', label: '차단' },
      ],
    },
    { key: 'member', label: '대상 멤버', kind: 'text', required: true, refs: ['member', 'user'], pattern: SNOWFLAKE_OR_REF },
    { key: 'duration', label: '기간', kind: 'number', min: 1, max: 40320, default: 10, when: is('operation', 'timeout') },
    {
      key: 'unit', label: '단위', kind: 'select', default: 'minutes', when: is('operation', 'timeout'),
      options: [
        { value: 'minutes', label: '분' },
        { value: 'hours', label: '시간' },
        { value: 'days', label: '일' },
      ],
    },
    reasonField,
  ],
  summary: (p) => ({ timeout: '타임아웃', kick: '추방', ban: '차단' })[str(p, 'operation')] ?? '타임아웃',
  check: (p) => {
    if ((str(p, 'operation') || 'timeout') !== 'timeout') return [];
    const minutes = (num(p, 'duration') ?? 0) * ({ minutes: 1, hours: 60, days: 1440 }[str(p, 'unit') || 'minutes'] ?? 1);
    return minutes > 40320 ? [{ level: 'error', field: 'duration', message: '타임아웃은 최대 28일까지 가능합니다.' }] : [];
  },
  spec: (p, f) => {
    const who = f.target(p.member);
    const action = {
      timeout: `Time out member ${who} for ${num(p, 'duration') ?? 10} ${str(p, 'unit') || 'minutes'}`,
      kick: `Kick member ${who} from the server`,
      ban: `Ban user ${who} from the server`,
    }[str(p, 'operation') || 'timeout'];
    return `${action}${reasonSpec(p, f)}. ${FAIL_SOFT}`;
  },
  requires: (p): { permissions: Permission[] } => ({
    permissions: [({ timeout: 'ModerateMembers', kick: 'KickMembers', ban: 'BanMembers' } as Record<string, Permission>)[str(p, 'operation') || 'timeout'] ?? 'ModerateMembers'],
  }),
};

export const deleteMessage: NodeDef = {
  type: 'action.deleteMessage',
  category: 'action',
  label: '메시지 삭제',
  description: '메시지를 삭제합니다.',
  icon: Trash2,
  fields: [
    { key: 'message', label: '삭제할 메시지', kind: 'text', required: true, refs: ['message'], pattern: SNOWFLAKE_OR_REF },
  ],
  spec: (p, f) => `Delete message ${f.target(p.message)}. If it is already gone, continue silently. ${FAIL_SOFT}`,
  requires: () => ({ permissions: ['ManageMessages'] }),
};

export const react: NodeDef = {
  type: 'action.react',
  category: 'action',
  label: '반응 달기',
  description: '메시지에 이모지 반응을 답니다.',
  icon: Smile,
  fields: [
    { key: 'message', label: '메시지', kind: 'text', required: true, refs: ['message'], pattern: SNOWFLAKE_OR_REF },
    { key: 'emoji', label: '이모지', kind: 'text', required: true, maxLength: 64 },
  ],
  summary: (p) => str(p, 'emoji') || '이모지 없음',
  spec: (p, f) => `Add the reaction ${f.text(p.emoji)} to message ${f.target(p.message)}. ${FAIL_SOFT}`,
  requires: () => ({ permissions: ['AddReactions', 'ReadMessageHistory'] }),
};

export const createChannel: NodeDef = {
  type: 'action.createChannel',
  category: 'action',
  label: '채널·스레드 만들기',
  description: '새 텍스트 채널이나 스레드를 만듭니다.',
  icon: Hash,
  fields: [
    {
      key: 'kind', label: '종류', kind: 'select', default: 'thread',
      options: [
        { value: 'thread', label: '스레드' },
        { value: 'text', label: '텍스트 채널' },
      ],
    },
    { key: 'name', label: '이름', kind: 'text', required: true, maxLength: 100, refs: true },
    { key: 'fromMessage', label: '스레드를 달 메시지', kind: 'text', refs: ['message'], pattern: SNOWFLAKE_OR_REF, when: is('kind', 'thread'), help: '비워 두면 현재 채널에 새 스레드를 만듭니다.' },
    { key: 'categoryId', label: '카테고리 ID', kind: 'text', pattern: SNOWFLAKE_OR_REF, when: is('kind', 'text') },
    { key: 'private', label: '비공개', kind: 'boolean', default: false },
  ],
  outputs: () => [{ ...OUT_CHANNEL, label: '만든 채널' }],
  summary: (p) => clip(str(p, 'name') || '이름 없음'),
  spec: (p, f) => {
    const priv = bool(p, 'private');
    const made = str(p, 'kind') === 'text'
      ? `Create a text channel named ${f.text(p.name)}${str(p, 'categoryId') ? ` under category ${f.target(p.categoryId)}` : ''}${priv ? ', visible only to the bot and the user who started the flow (if any)' : ''}`
      : `Create a ${priv ? 'private' : 'public'} thread named ${f.text(p.name)} ${str(p, 'fromMessage') ? `from message ${f.target(p.fromMessage)}` : 'in the channel where the flow started'}`;
    return `${made}. Output channel is the new channel or thread. ${FAIL_SOFT}`;
  },
  requires: (p): { permissions: Permission[] } => ({
    permissions: str(p, 'kind') === 'text'
      ? ['ManageChannels']
      : [bool(p, 'private') ? 'CreatePrivateThreads' : 'CreatePublicThreads', 'SendMessagesInThreads'],
  }),
};

export const actionDefs = [sendMessage, showModal, role, moderate, deleteMessage, react, createChannel];
