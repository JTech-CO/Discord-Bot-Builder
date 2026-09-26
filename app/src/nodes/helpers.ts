import type { OutputDef, Props, TableRow } from './types';

export const str = (p: Props, key: string): string => (typeof p[key] === 'string' ? (p[key] as string) : '');

export const num = (p: Props, key: string): number | undefined =>
  typeof p[key] === 'number' && Number.isFinite(p[key]) ? (p[key] as number) : undefined;

export const bool = (p: Props, key: string): boolean => p[key] === true;

export const list = (p: Props, key: string): string[] =>
  Array.isArray(p[key]) ? (p[key] as unknown[]).filter((v): v is string => typeof v === 'string') : [];

export const rows = (p: Props, key: string): TableRow[] =>
  Array.isArray(p[key]) ? (p[key] as unknown[]).filter((v): v is TableRow => typeof v === 'object' && v !== null) : [];

export const clip = (s: string, n = 36): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const is = (key: string, ...values: string[]) => (p: Props) => values.includes(str(p, key));

// ── Patterns ──────────────────────────────────────────
// Discord slash command / option names: lowercase letters (any script), digits, - and _.
export const COMMAND_NAME = {
  regex: /^[-_\p{Ll}\p{Lo}\p{N}]{1,32}$/u,
  message: '1~32자의 소문자, 한글, 숫자, -, _ 만 쓸 수 있습니다.',
};

export const CUSTOM_ID = {
  regex: /^[\w:-]{1,100}$/,
  message: '영문, 숫자, _, -, : 만 쓸 수 있습니다. (최대 100자)',
};

export const SNOWFLAKE_OR_REF = {
  regex: /^(\d{17,20}|\{\{[^{}]+\}\})$/,
  message: '디스코드 ID(숫자 17~20자리) 또는 변수 하나를 넣어 주세요.',
};

export const ENV_NAME = {
  regex: /^[A-Z][A-Z0-9_]{0,63}$/,
  message: '대문자, 숫자, _ 만 쓸 수 있습니다. (예: WEATHER_API_KEY)',
};

export const STORE_KEY = {
  regex: /^[\p{L}\p{N}_]{1,40}$/u,
  message: '글자, 숫자, _ 만 쓸 수 있습니다. (최대 40자)',
};

// ── Common outputs ────────────────────────────────────
export const OUT_USER: OutputDef = { key: 'user', label: '사용자', type: 'user' };
export const OUT_MEMBER: OutputDef = { key: 'member', label: '서버 멤버', type: 'member' };
export const OUT_CHANNEL: OutputDef = { key: 'channel', label: '채널', type: 'channel' };
export const OUT_MESSAGE: OutputDef = { key: 'message', label: '메시지', type: 'message' };
