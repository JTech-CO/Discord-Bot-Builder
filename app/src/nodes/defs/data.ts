import { Calculator, Database, TextQuote } from 'lucide-react';
import type { NodeDef } from '../types';
import { toNumber, toText } from '../sim';
import { SNOWFLAKE_OR_REF, STORE_KEY, clip, is, str } from '../helpers';
import { t } from '../../i18n/t';

const OPERATION_LABEL: Record<string, string> = { get: '읽기', set: '저장', add: '더하기', subtract: '빼기' };

export const variable: NodeDef = {
  type: 'data.variable',
  category: 'data',
  label: '저장 데이터',
  description: '봇이 꺼져도 남는 값을 읽고 씁니다. (포인트, 레벨, 설정 등)',
  icon: Database,
  fields: [
    {
      key: 'scope', label: '범위', kind: 'select', default: 'user',
      options: [
        { value: 'user', label: '사용자별' },
        { value: 'server', label: '서버별' },
        { value: 'global', label: '봇 전체' },
      ],
    },
    { key: 'key', label: '이름', kind: 'text', required: true, pattern: STORE_KEY, placeholder: '포인트' },
    {
      key: 'user', label: '사용자', kind: 'text', refs: ['user', 'member'], pattern: SNOWFLAKE_OR_REF, when: is('scope', 'user'),
      help: '비워 두면 흐름을 시작한 사용자입니다.',
    },
    {
      key: 'operation', label: '동작', kind: 'select', default: 'get',
      options: Object.entries(OPERATION_LABEL).map(([value, label]) => ({ value, label })),
    },
    { key: 'value', label: '값', kind: 'text', required: true, maxLength: 500, refs: true, when: is('operation', 'set', 'add', 'subtract') },
    { key: 'initial', label: '값이 없을 때 기본값', kind: 'text', maxLength: 500, default: '0' },
  ],
  outputs: () => [{ key: 'value', label: t('결과 값'), type: 'any' }],
  summary: (p) => `${str(p, 'key') || t('이름 없음')} ${t(OPERATION_LABEL[str(p, 'operation')] ?? '읽기')}`,
  simulate: (c) => {
    const scope = str(c.props, 'scope') || 'user';
    const name = str(c.props, 'key');
    const owner = scope === 'user' ? (str(c.props, 'user') ? toText(c.value('user')) : `@${c.user?.name ?? '?'}`) : scope;
    const key = `var:${scope}:${owner}:${name}`;
    const before = c.store.has(key) ? c.store.get(key)! : c.text('initial');
    const op = str(c.props, 'operation') || 'get';
    const after = op === 'set' ? c.text('value')
      : op === 'add' ? toNumber(before) + toNumber(c.text('value'))
      : op === 'subtract' ? toNumber(before) - toNumber(c.text('value'))
      : before;
    if (op !== 'get') c.store.set(key, after);
    const where = scope === 'user' ? t('{0}의 ', [owner]) : scope === 'server' ? t('서버의 ') : '';
    return {
      outputs: { value: after },
      log: op === 'get' ? t('{0}"{1}" 값은 {2}입니다.', [where, name, toText(before)]) : t('{0}"{1}" 값을 {2}에서 {3}(으)로 바꿨습니다.', [where, name, toText(before), toText(after)]),
    };
  },
  spec: (p, f) => {
    const scope = {
      user: `per user (the user is ${str(p, 'user') ? f.target(p.user) : 'the one who started the flow'})`,
      server: 'per server (the server where the flow started)',
      global: 'once for the whole bot',
    }[str(p, 'scope') || 'user'];
    const op = {
      get: 'Read it',
      set: `Set it to ${f.text(p.value)}`,
      add: `Add ${f.text(p.value)} to it as a number`,
      subtract: `Subtract ${f.text(p.value)} from it as a number`,
    }[str(p, 'operation') || 'get'];
    return `Persistent value named ${f.text(p.key)}, stored ${scope}. If it was never set, it is ${f.text(typeof p.initial === 'string' ? p.initial : '0')}. ${op}. Output value is the value after this step.`;
  },
  requires: () => ({ storage: true }),
};

export const math: NodeDef = {
  type: 'data.math',
  category: 'data',
  label: '계산',
  description: '두 값으로 사칙연산을 합니다.',
  icon: Calculator,
  fields: [
    { key: 'left', label: '값 A', kind: 'text', required: true, maxLength: 200, refs: true },
    {
      key: 'operator', label: '연산', kind: 'select', default: '+',
      options: [
        { value: '+', label: '더하기 (+)' },
        { value: '-', label: '빼기 (−)' },
        { value: '*', label: '곱하기 (×)' },
        { value: '/', label: '나누기 (÷)' },
        { value: '%', label: '나머지 (%)' },
        { value: 'min', label: '작은 값' },
        { value: 'max', label: '큰 값' },
      ],
    },
    { key: 'right', label: '값 B', kind: 'text', required: true, maxLength: 200, refs: true },
    {
      key: 'round', label: '반올림', kind: 'select', default: 'none',
      options: [
        { value: 'none', label: '안 함' },
        { value: 'round', label: '반올림' },
        { value: 'floor', label: '내림' },
        { value: 'ceil', label: '올림' },
      ],
    },
  ],
  outputs: () => [{ key: 'result', label: t('계산 결과'), type: 'number' }],
  summary: (p) => clip(`${str(p, 'left') || '?'} ${str(p, 'operator') || '+'} ${str(p, 'right') || '?'}`, 40),
  simulate: (c) => {
    const a = toNumber(c.text('left'));
    const b = toNumber(c.text('right'));
    const op = str(c.props, 'operator') || '+';
    let result = { '+': a + b, '-': a - b, '*': a * b, '/': b === 0 ? 0 : a / b, '%': b === 0 ? 0 : a % b, min: Math.min(a, b), max: Math.max(a, b) }[op] ?? 0;
    const round = str(c.props, 'round');
    if (round === 'round') result = Math.round(result);
    else if (round === 'floor') result = Math.floor(result);
    else if (round === 'ceil') result = Math.ceil(result);
    return { outputs: { result }, log: `${a} ${op} ${b} = ${result}` };
  },
  spec: (p, f) => {
    const a = f.text(p.left);
    const b = f.text(p.right);
    const expr = {
      '+': `${a} plus ${b}`, '-': `${a} minus ${b}`, '*': `${a} times ${b}`, '/': `${a} divided by ${b}`,
      '%': `${a} modulo ${b}`, min: `the smaller of ${a} and ${b}`, max: `the larger of ${a} and ${b}`,
    }[str(p, 'operator') || '+'];
    const round = { round: ', rounded to the nearest integer', floor: ', rounded down', ceil: ', rounded up' }[str(p, 'round')] ?? '';
    return `Compute ${expr} as numbers${round} (non-numbers count as 0; dividing by 0 gives 0) as output result.`;
  },
};

export const text: NodeDef = {
  type: 'data.text',
  category: 'data',
  label: '텍스트 만들기',
  description: '변수를 섞어 문장을 만들거나 다듬습니다.',
  icon: TextQuote,
  fields: [
    { key: 'template', label: '문장', kind: 'textarea', required: true, maxLength: 2000, refs: true, placeholder: '{{n1.user}}님의 점수는 {{n3.value}}점' },
    {
      key: 'transform', label: '변환', kind: 'select', default: 'none',
      options: [
        { value: 'none', label: '그대로' },
        { value: 'upper', label: '대문자로' },
        { value: 'lower', label: '소문자로' },
        { value: 'trim', label: '앞뒤 공백 제거' },
      ],
    },
  ],
  outputs: () => [{ key: 'result', label: t('만든 문장'), type: 'text' }],
  summary: (p) => clip(str(p, 'template') || t('비어 있음')),
  simulate: (c) => {
    let result = c.text('template');
    const transform = str(c.props, 'transform');
    if (transform === 'upper') result = result.toUpperCase();
    else if (transform === 'lower') result = result.toLowerCase();
    else if (transform === 'trim') result = result.trim();
    return { outputs: { result }, log: t('문장을 만들었습니다: "{0}"', [result.length > 40 ? `${result.slice(0, 39)}…` : result]) };
  },
  spec: (p, f) => {
    const how = { upper: ', converted to uppercase', lower: ', converted to lowercase', trim: ', with surrounding whitespace removed' }[str(p, 'transform')] ?? '';
    return `Build the text ${f.text(p.template)}${how} as output result.`;
  },
};

export const dataDefs = [variable, math, text];
