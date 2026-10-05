import { Dices, Hourglass, Percent, ShieldCheck, Shuffle, Split, Timer, Waypoints } from 'lucide-react';
import type { NodeDef } from '../types';
import { compareValues } from '../sim';
import { SNOWFLAKE_OR_REF, clip, duration, is, list, num, str } from '../helpers';
import { t } from '../../i18n/t';

const OPERATOR_SPEC: Record<string, string> = {
  '==': 'equals', '!=': 'does not equal',
  '>': 'is greater than', '>=': 'is greater than or equal to', '<': 'is less than', '<=': 'is less than or equal to',
  contains: 'contains (case-insensitive)', startsWith: 'starts with (case-insensitive)',
  empty: 'is empty after trimming', notEmpty: 'is not empty after trimming',
};

const COMPARATORS = [
  { value: '==', label: '같음' },
  { value: '!=', label: '다름' },
  { value: '>', label: '보다 큼' },
  { value: '>=', label: '이상' },
  { value: '<', label: '보다 작음' },
  { value: '<=', label: '이하' },
  { value: 'contains', label: '포함' },
  { value: 'startsWith', label: '~로 시작' },
  { value: 'empty', label: '비어 있음' },
  { value: 'notEmpty', label: '비어 있지 않음' },
];

const UNARY = new Set(['empty', 'notEmpty']);
const comparatorLabel = (v: string) => t(COMPARATORS.find((c) => c.value === v)?.label ?? v);

export const ifElse: NodeDef = {
  type: 'logic.if',
  category: 'logic',
  label: '조건 분기',
  description: '조건이 맞는지에 따라 두 갈래로 나눕니다.',
  icon: Split,
  fields: [
    { key: 'left', label: '값', kind: 'text', required: true, maxLength: 500, refs: true },
    { key: 'operator', label: '비교', kind: 'select', default: '==', options: COMPARATORS },
    { key: 'right', label: '비교할 값', kind: 'text', maxLength: 500, refs: true, when: (p) => !UNARY.has(str(p, 'operator')) },
  ],
  ports: () => [
    { id: 'true', label: t('맞음') },
    { id: 'false', label: t('아님') },
  ],
  summary: (p) => {
    const op = str(p, 'operator') || '==';
    const left = str(p, 'left') || '?';
    return clip(UNARY.has(op) ? `${left} ${comparatorLabel(op)}` : `${left} ${op} ${str(p, 'right') || '?'}`, 40);
  },
  simulate: (c) => {
    const op = str(c.props, 'operator') || '==';
    const a = c.text('left');
    const b = c.text('right');
    const ok = compareValues(a, op, b);
    const cond = UNARY.has(op) ? `${JSON.stringify(a)} ${comparatorLabel(op)}` : `${JSON.stringify(a)} ${op} ${JSON.stringify(b)}`;
    return { port: ok ? 'true' : 'false', log: `${cond} → ${ok ? t('맞음') : t('아님')}` };
  },
  spec: (p, f) => {
    const op = str(p, 'operator') || '==';
    const cond = UNARY.has(op) ? `${f.text(p.left)} ${OPERATOR_SPEC[op]}` : `${f.text(p.left)} ${OPERATOR_SPEC[op] ?? op} ${f.text(p.right)}`;
    const how = ['>', '>=', '<', '<='].includes(op)
      ? ' Compare as numbers; if either side is not a number the condition is false.'
      : ['==', '!='].includes(op) ? ' Compare as numbers when both sides are numbers, otherwise as trimmed text.' : '';
    return `Take exit "true" if ${cond}, otherwise exit "false".${how}`;
  },
};

export const switchCase: NodeDef = {
  type: 'logic.switch',
  category: 'logic',
  label: '값에 따라 분기',
  description: '값이 어느 경우와 같은지에 따라 여러 갈래로 나눕니다.',
  icon: Waypoints,
  fields: [
    { key: 'value', label: '값', kind: 'text', required: true, maxLength: 500, refs: true },
    { key: 'cases', label: '경우', kind: 'list', required: true, maxItems: 10, maxLength: 100, placeholder: '가위' },
  ],
  // Ports are index-based so renaming a case keeps its connection.
  ports: (p) => [
    ...list(p, 'cases').map((c, i) => ({ id: `case-${i}`, label: clip(c || t('경우 {0}', [i + 1]), 12) })),
    { id: 'default', label: t('그 외') },
  ],
  summary: (p) => clip(str(p, 'value') || '?'),
  simulate: (c) => {
    const v = c.text('value').trim().toLowerCase();
    const cases = list(c.props, 'cases');
    const i = cases.findIndex((x) => x.trim().toLowerCase() === v);
    return { port: i >= 0 ? `case-${i}` : 'default', log: i >= 0 ? t('{0} → "{1}" 경우', [JSON.stringify(v), cases[i]]) : t('{0} → 맞는 경우가 없어 "그 외"', [JSON.stringify(v)]) };
  },
  draftHint: 'Ports are case-0, case-1, … (one per entry of cases, in order) and then default.',
  spec: (p, f) => {
    const cases = list(p, 'cases').map((c, i) => `"case-${i}" when it equals ${f.text(c)}`).join('; ');
    return `Compare ${f.text(p.value)} (trimmed, case-insensitive) with the cases in order and take the first match: ${cases}. If none match, take exit "default".`;
  },
};

export const chance: NodeDef = {
  type: 'logic.chance',
  category: 'logic',
  label: '확률',
  description: '정한 확률로 성공 또는 실패 갈래로 보냅니다.',
  icon: Percent,
  fields: [{ key: 'percent', label: '성공 확률 (%)', kind: 'number', required: true, min: 0, max: 100, default: 50 }],
  ports: () => [
    { id: 'success', label: t('성공') },
    { id: 'fail', label: t('실패') },
  ],
  summary: (p) => `${num(p, 'percent') ?? '?'}%`,
  simulate: (c) => {
    const pct = c.number('percent');
    const ok = c.random() * 100 < pct;
    return { port: ok ? 'success' : 'fail', log: t('{0}% 확률 → {1}', [pct, ok ? t('성공') : t('실패')]) };
  },
  spec: (p) => `Take exit "success" with probability ${num(p, 'percent') ?? 50}%, otherwise exit "fail".`,
};

export const random: NodeDef = {
  type: 'logic.random',
  category: 'logic',
  label: '무작위 숫자',
  description: '범위 안에서 무작위 정수를 뽑습니다.',
  icon: Dices,
  fields: [
    { key: 'min', label: '최솟값', kind: 'number', required: true, default: 1, min: -1e9, max: 1e9 },
    { key: 'max', label: '최댓값', kind: 'number', required: true, default: 6, min: -1e9, max: 1e9 },
  ],
  outputs: () => [{ key: 'result', label: t('뽑은 숫자'), type: 'number' }],
  summary: (p) => `${num(p, 'min') ?? '?'} ~ ${num(p, 'max') ?? '?'}`,
  check: (p) => {
    const min = num(p, 'min');
    const max = num(p, 'max');
    return min !== undefined && max !== undefined && min > max
      ? [{ level: 'error', field: 'max', message: t('최댓값이 최솟값보다 작습니다.') }]
      : [];
  },
  simulate: (c) => {
    let min = Math.ceil(c.number('min'));
    let max = Math.floor(c.number('max'));
    if (min > max) [min, max] = [max, min];
    const result = min + Math.floor(c.random() * (max - min + 1));
    return { outputs: { result }, log: t('{0}~{1} 중 {2}이(가) 나왔습니다.', [min, max, result]) };
  },
  spec: (p) => `Pick a uniformly random integer from ${num(p, 'min') ?? 1} to ${num(p, 'max') ?? 6}, inclusive, as output result.`,
};

export const pick: NodeDef = {
  type: 'logic.pick',
  category: 'logic',
  label: '무작위 선택',
  description: '목록에서 하나를 무작위로 고릅니다.',
  icon: Shuffle,
  fields: [{ key: 'items', label: '항목', kind: 'list', required: true, maxItems: 100, maxLength: 500, placeholder: '대길' }],
  outputs: () => [{ key: 'result', label: t('고른 항목'), type: 'text' }],
  summary: (p) => t('{0}개 중 하나', [list(p, 'items').length]),
  simulate: (c) => {
    const items = list(c.props, 'items').filter((s) => s.trim());
    const result = items.length ? items[Math.floor(c.random() * items.length)] : '';
    return { outputs: { result }, log: items.length ? t('{0}개 중 "{1}"을(를) 골랐습니다.', [items.length, result]) : t('고를 항목이 없습니다.') };
  },
  spec: (p, f) => `Pick one item uniformly at random from ${f.list(p.items)} as output result.`,
};

export const wait: NodeDef = {
  type: 'logic.wait',
  category: 'logic',
  label: '대기',
  description: '정한 시간만큼 기다린 뒤 다음으로 넘어갑니다.',
  icon: Hourglass,
  fields: [
    { key: 'duration', label: '시간', kind: 'number', required: true, min: 1, max: 1440, default: 5 },
    {
      key: 'unit', label: '단위', kind: 'select', default: 'seconds',
      options: [
        { value: 'seconds', label: '초' },
        { value: 'minutes', label: '분' },
        { value: 'hours', label: '시간' },
      ],
    },
  ],
  summary: (p) => duration(num(p, 'duration') ?? '?', str(p, 'unit') || 'seconds'),
  simulate: (c) => ({
    log: t('{0} 기다립니다. (시뮬레이터에서는 건너뜀)', [duration(c.number('duration'), str(c.props, 'unit') || 'seconds')]),
  }),
  spec: (p) => `Wait ${num(p, 'duration') ?? 5} ${str(p, 'unit') || 'seconds'} without blocking other events, then continue.`,
  requires: () => ({ slow: true }),
};

/** Cooldowns at least this long (daily rewards and the like) must survive restarts; shorter ones are anti-spam. */
const PERSISTENT_COOLDOWN_SECONDS = 3600;

export const cooldown: NodeDef = {
  type: 'logic.cooldown',
  category: 'logic',
  label: '쿨다운',
  description: '같은 사용자가 너무 자주 실행하지 못하게 막습니다.',
  icon: Timer,
  fields: [
    { key: 'seconds', label: '쿨다운 (초)', kind: 'number', required: true, min: 1, max: 604800, default: 10 },
    {
      key: 'scope', label: '기준', kind: 'select', default: 'user',
      options: [
        { value: 'user', label: '사용자별' },
        { value: 'server', label: '서버별' },
        { value: 'global', label: '전체' },
      ],
    },
  ],
  ports: () => [
    { id: 'pass', label: t('통과') },
    { id: 'blocked', label: t('대기 중') },
  ],
  outputs: () => [{ key: 'remaining', label: t('남은 시간(초)'), type: 'number' }],
  summary: (p) => t('{0}초', [num(p, 'seconds') ?? '?']),
  simulate: (c) => {
    const seconds = c.number('seconds') || 10;
    const scope = str(c.props, 'scope') || 'user';
    const key = `cooldown:${c.self}:${scope === 'user' ? c.user?.name ?? '?' : scope}`;
    const last = c.store.get(key);
    const now = c.now();
    if (typeof last === 'number' && now - last < seconds * 1000) {
      const remaining = Math.ceil((seconds * 1000 - (now - last)) / 1000);
      return { port: 'blocked', outputs: { remaining }, log: t('아직 쿨다운 중입니다. {0}초 남았습니다.', [remaining]) };
    }
    c.store.set(key, now);
    return { port: 'pass', outputs: { remaining: 0 }, log: t('쿨다운을 통과했습니다. 다음 {0}초 동안은 막힙니다.', [seconds]) };
  },
  spec: (p) => {
    const s = num(p, 'seconds') ?? 10;
    const who = { user: 'the same user', server: 'anyone in the same server', global: 'anyone' }[str(p, 'scope') || 'user'];
    const kept = s >= PERSISTENT_COOLDOWN_SECONDS ? 'kept in the persistent data store so restarting the bot does not reset it' : 'kept in memory';
    return `Cooldown of ${s} seconds for this step, ${kept}. If ${who} passed this step less than ${s} seconds ago, take exit "blocked" with output remaining = seconds left, rounded up. Otherwise record the time and take exit "pass".`;
  },
  requires: (p) => ((num(p, 'seconds') ?? 10) >= PERSISTENT_COOLDOWN_SECONDS ? { storage: true } : {}),
};

export const permission: NodeDef = {
  type: 'logic.permission',
  category: 'logic',
  label: '권한 확인',
  description: '멤버에게 권한이나 역할이 있는지에 따라 나눕니다.',
  icon: ShieldCheck,
  fields: [
    { key: 'member', label: '확인할 멤버', kind: 'text', required: true, refs: ['member'], pattern: SNOWFLAKE_OR_REF },
    {
      key: 'check', label: '확인할 것', kind: 'select', default: 'administrator',
      options: [
        { value: 'administrator', label: '관리자 권한' },
        { value: 'manageMessages', label: '메시지 관리 권한' },
        { value: 'manageRoles', label: '역할 관리 권한' },
        { value: 'kickMembers', label: '추방 권한' },
        { value: 'banMembers', label: '차단 권한' },
        { value: 'hasRole', label: '특정 역할 보유' },
      ],
    },
    { key: 'roleId', label: '역할 ID', kind: 'text', required: true, refs: ['role'], pattern: SNOWFLAKE_OR_REF, when: is('check', 'hasRole') },
  ],
  ports: () => [
    { id: 'yes', label: t('있음') },
    { id: 'no', label: t('없음') },
  ],
  simulate: (c) => {
    const ok = c.input.admin === true;
    return { port: ok ? 'yes' : 'no', log: t('트리거 입력의 "관리자 권한 있음"이 {0}으로 판단했습니다.', [ok ? t('켜져 있어 있음') : t('꺼져 있어 없음')]) };
  },
  spec: (p, f) => {
    const check = str(p, 'check') || 'administrator';
    const what = check === 'hasRole'
      ? `has role ${f.target(p.roleId)}`
      : `has the ${{ administrator: 'Administrator', manageMessages: 'Manage Messages', manageRoles: 'Manage Roles', kickMembers: 'Kick Members', banMembers: 'Ban Members' }[check] ?? 'Administrator'} permission in the server`;
    return `Take exit "yes" if member ${f.target(p.member)} ${what}, otherwise exit "no" (also "no" if the member cannot be fetched).`;
  },
};

export const logicDefs = [ifElse, switchCase, chance, random, pick, wait, cooldown, permission];
