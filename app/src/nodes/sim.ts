import type { SimEntity, SimInputDef, SimInputs, SimValue } from './types';

// Fake Discord objects. IDs only need to be stable and snowflake-shaped.
export const simUser = (name: string): SimEntity => ({ kind: 'user', id: '100000000000000001', name: name || '테스트유저' });
export const asMember = (u: SimEntity): SimEntity => ({ ...u, kind: 'member' });
export const simChannel = (name: string): SimEntity => ({ kind: 'channel', id: '200000000000000001', name: name || '일반' });
export const simRole = (name: string): SimEntity => ({ kind: 'role', id: '300000000000000001', name: name || '역할' });
export const simMessage = (text: string): SimEntity => ({
  kind: 'message', id: '400000000000000001', name: text.length > 30 ? `${text.slice(0, 29)}…` : text,
});

export const inputText = (input: SimInputs, key: string) => (input[key] === undefined ? '' : String(input[key]));
export const inputUser = (input: SimInputs) => simUser(inputText(input, 'user'));

/** Inputs every user-started trigger asks for. */
export const USER_INPUTS: SimInputDef[] = [
  { key: 'user', label: '사용자 이름', kind: 'text', default: '테스트유저' },
  { key: 'admin', label: '관리자 권한 있음', kind: 'boolean', default: false },
];

const isEntity = (v: SimValue): v is SimEntity =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && typeof (v as SimEntity).kind === 'string' && typeof (v as SimEntity).name === 'string';

/** How a value appears when inserted into text, mirroring what the generated bot is told to do. */
export function toText(v: SimValue | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(toText).join(', ');
  if (isEntity(v)) {
    if (v.kind === 'channel') return `#${v.name}`;
    if (v.kind === 'message') return `(메시지: ${v.name})`;
    return `@${v.name}`;
  }
  return JSON.stringify(v);
}

export const toNumber = (v: SimValue | undefined): number => {
  const n = typeof v === 'number' ? v : Number(toText(v).trim());
  return Number.isFinite(n) ? n : 0;
};

const numeric = (s: string) => (s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : null);

/** Same comparison rules the prompt gives the code-generating AI (see logic.if spec). */
export function compareValues(a: string, op: string, b: string): boolean {
  const na = numeric(a);
  const nb = numeric(b);
  const both = na !== null && nb !== null;
  switch (op) {
    case '==': return both ? na === nb : a.trim() === b.trim();
    case '!=': return both ? na !== nb : a.trim() !== b.trim();
    case '>': return both && na > nb;
    case '>=': return both && na >= nb;
    case '<': return both && na < nb;
    case '<=': return both && na <= nb;
    case 'contains': return a.toLowerCase().includes(b.toLowerCase());
    case 'startsWith': return a.toLowerCase().startsWith(b.toLowerCase());
    case 'empty': return a.trim() === '';
    case 'notEmpty': return a.trim() !== '';
    default: return false;
  }
}
