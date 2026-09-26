import { redactSecrets } from '../flow/secrets';
import type { SpecFormat } from '../nodes/types';

const NODE_REF = /\{\{\s*n([1-9]\d*)\.([\p{L}\p{N}_]+)\s*\}\}/gu;
const ENV_REF = /\{\{\s*env\.([A-Z][A-Z0-9_]{0,63})\s*\}\}/g;
// Only these exact shapes may appear unquoted in the prompt.
const CLEAN_REF = /^\{\{(?:#[1-9]\d*\.[\p{L}\p{N}_]+|env\.[A-Z][A-Z0-9_]{0,63})\}\}$/u;
const SNOWFLAKE = /^\d{17,20}$/;

/** Turns editor references ({{n3.result}}) into prompt references ({{#3.result}}) and hides secrets. */
export const normalizeRefs = (s: string) =>
  redactSecrets(s).replace(NODE_REF, '{{#$1.$2}}').replace(ENV_REF, '{{env.$1}}');

const asString = (v: unknown) =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';

// JSON.stringify escapes quotes and newlines, so author text can't break out of its string
// and start new prompt sections.
const quote = (s: string) => JSON.stringify(normalizeRefs(s));

export const specFormat: SpecFormat = {
  text: (v) => quote(asString(v)),
  target: (v) => {
    const s = asString(v).trim();
    if (!s) return '(not set)';
    if (SNOWFLAKE.test(s)) return `ID ${s}`;
    const ref = normalizeRefs(s);
    return CLEAN_REF.test(ref) ? ref : quote(s);
  },
  list: (v) =>
    JSON.stringify((Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string').map(normalizeRefs)),
};
