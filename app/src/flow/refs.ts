/**
 * References embedded in text fields:
 *   {{n3.result}}   an output of node n3
 *   {{env.API_KEY}} an environment variable of the generated bot (for secrets)
 */
export type Ref =
  | { kind: 'node'; raw: string; nodeId: string; key: string }
  | { kind: 'env'; raw: string; name: string }
  | { kind: 'invalid'; raw: string };

const TOKEN_RE = /\{\{([^{}]*)\}\}/g;
const NODE_REF_RE = /^\s*(n[1-9]\d*)\.([\p{L}\p{N}_]+)\s*$/u;
const ENV_REF_RE = /^\s*env\.([A-Z][A-Z0-9_]{0,63})\s*$/;

export function parseRefs(text: string): Ref[] {
  const refs: Ref[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const inner = m[1];
    const node = NODE_REF_RE.exec(inner);
    if (node) {
      refs.push({ kind: 'node', raw: m[0], nodeId: node[1], key: node[2] });
      continue;
    }
    const env = ENV_REF_RE.exec(inner);
    refs.push(env ? { kind: 'env', raw: m[0], name: env[1] } : { kind: 'invalid', raw: m[0] });
  }
  return refs;
}

/** Replaces every {{…}} token with what `fn` returns for its parsed reference. */
export const replaceRefs = (text: string, fn: (ref: Ref) => string) =>
  text.replace(TOKEN_RE, (raw) => fn(parseRefs(raw)[0] ?? { kind: 'invalid', raw }));

export const nodeRef = (nodeId: string, key: string) => `{{${nodeId}.${key}}}`;

/** True when the whole value is exactly one reference (used for type checks). */
export const isSingleRef = (text: string) => /^\{\{[^{}]*\}\}$/.test(text.trim());
