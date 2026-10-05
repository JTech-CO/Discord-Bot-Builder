import { t } from '../i18n/t';
import type { OutputDef, Props, TableRow } from './types';

export const str = (p: Props, key: string): string => (typeof p[key] === 'string' ? (p[key] as string) : '');

export const num = (p: Props, key: string): number | undefined =>
  typeof p[key] === 'number' && Number.isFinite(p[key]) ? (p[key] as number) : undefined;

export const bool = (p: Props, key: string): boolean => p[key] === true;

export const list = (p: Props, key: string): string[] =>
  Array.isArray(p[key]) ? (p[key] as unknown[]).filter((v): v is string => typeof v === 'string') : [];

export const rows = (p: Props, key: string): TableRow[] =>
  Array.isArray(p[key]) ? (p[key] as unknown[]).filter((v): v is TableRow => typeof v === 'object' && v !== null) : [];

/** Shortens {{n3.result}} to #3.result and {{env.KEY}} to $KEY for display. */
export const prettyRefs = (s: string) =>
  s.replace(/\{\{\s*n(\d+)\.([^{}\s]+)\s*\}\}/g, '#$1.$2').replace(/\{\{\s*env\.([A-Z0-9_]+)\s*\}\}/g, '$$$1');

/** Display text cut to n characters. References are shortened first so a cut never leaves half of one. */
export const clip = (s: string, n = 36): string => {
  const short = prettyRefs(s);
  return short.length > n ? `${short.slice(0, n - 1)}…` : short;
};

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

/** Identifier-like text that may appear unquoted in a prompt; anything else becomes "?". */
/** A number with its time unit ("5분", "5 min"), so the two are translated together. */
export const duration = (n: number | string, unit: string) =>
  ({ seconds: t('{0}초', [n]), minutes: t('{0}분', [n]), hours: t('{0}시간', [n]), days: t('{0}일', [n]) })[unit] ?? t('{0}초', [n]);

export const safeKey = (v: unknown): string => {
  const s = typeof v === 'string' ? v : '';
  return /^[\p{L}\p{N}_-]{1,64}$/u.test(s) ? s : '?';
};

/** Picks `v` when it is one of `allowed`, otherwise `fallback`. */
export const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
