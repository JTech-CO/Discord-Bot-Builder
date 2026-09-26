import { Calculator, Database, TextQuote } from 'lucide-react';
import type { NodeDef } from '../types';
import { SNOWFLAKE_OR_REF, STORE_KEY, clip, is, str } from '../helpers';

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
  outputs: () => [{ key: 'value', label: '결과 값', type: 'any' }],
  summary: (p) => `${str(p, 'key') || '이름 없음'} ${OPERATION_LABEL[str(p, 'operation')] ?? '읽기'}`,
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
  outputs: () => [{ key: 'result', label: '계산 결과', type: 'number' }],
  summary: (p) => clip(`${str(p, 'left') || '?'} ${str(p, 'operator') || '+'} ${str(p, 'right') || '?'}`, 40),
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
  outputs: () => [{ key: 'result', label: '만든 문장', type: 'text' }],
  summary: (p) => clip(str(p, 'template') || '비어 있음'),
};

export const dataDefs = [variable, math, text];
