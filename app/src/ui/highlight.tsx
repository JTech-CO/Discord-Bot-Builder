import type { ReactNode } from 'react';

// A small highlighter for the files a generated bot contains. It returns React nodes, never HTML,
// so code the AI wrote can't inject markup.

type Kind = 'comment' | 'string' | 'number' | 'keyword' | 'function' | 'type' | 'variable' | 'property';

const KEYWORDS = new Set(
  ('abstract as async await break case catch class const continue debugger declare default delete do else enum export ' +
    'extends false finally for from function get if implements import in instanceof interface is keyof let new null of ' +
    'private protected public readonly return satisfies set static super switch this throw true try type typeof ' +
    'undefined var void while yield').split(' '),
);
const DECLARES = new Set(['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum']);

// comment | string | number | identifier
const CODE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\[\s\S])*`)|(\b(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?)\b)|([A-Za-z_$][\w$]*)/g;

function tokenizeCode(code: string, json: boolean): [Kind | null, string][] {
  const out: [Kind | null, string][] = [];
  let last = 0;
  let prevWord = '';
  for (const m of code.matchAll(CODE)) {
    if (m.index > last) out.push([null, code.slice(last, m.index)]);
    last = m.index + m[0].length;
    const [text, comment, str, num, word] = m;
    if (comment) out.push(['comment', text]);
    else if (str) out.push([json && /^\s*:/.test(code.slice(last, last + 8)) ? 'property' : 'string', text]);
    else if (num) out.push(['number', text]);
    else if (word) {
      const before = code.slice(Math.max(0, m.index - 1), m.index);
      let kind: Kind | null = null;
      if (KEYWORDS.has(word) && before !== '.') kind = 'keyword';
      else if (DECLARES.has(prevWord)) kind = /^[A-Z]/.test(word) && prevWord !== 'const' && prevWord !== 'let' ? 'type' : prevWord === 'function' ? 'function' : 'variable';
      else if (/^\s*\(/.test(code.slice(last, last + 4)) || /^\s*=\s*(?:async\s*)?\(/.test(code.slice(last, last + 16))) kind = 'function';
      else if (/^[A-Z][a-z]/.test(word)) kind = 'type';
      out.push([kind, text]);
      prevWord = word;
      continue;
    }
    prevWord = '';
  }
  if (last < code.length) out.push([null, code.slice(last)]);
  return out;
}

// .env files: comments and KEY=value
function tokenizeEnv(code: string): [Kind | null, string][] {
  return code.split(/(?<=\n)/).flatMap((line): [Kind | null, string][] => {
    if (/^\s*#/.test(line)) return [['comment', line]];
    const m = /^(\s*[A-Za-z_][\w.]*)(\s*=)(.*\n?)$/.exec(line);
    return m ? [['property', m[1]], [null, m[2]], ['string', m[3]]] : [[null, line]];
  });
}

// Markdown: headings, fenced blocks and inline code
function tokenizeMarkdown(code: string): [Kind | null, string][] {
  const out: [Kind | null, string][] = [];
  let fenced = false;
  for (const line of code.split(/(?<=\n)/)) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced || /^\s*```/.test(line)) out.push(['string', line]);
    else if (/^#{1,6}\s/.test(line)) out.push(['keyword', line]);
    else for (const part of line.split(/(`[^`\n]+`)/)) if (part) out.push([part.startsWith('`') ? 'string' : null, part]);
  }
  return out;
}

const MAX_CHARS = 300_000;

/** Highlighted file content, picked by extension; unknown types and huge files stay plain. */
export function highlight(path: string, code: string): ReactNode {
  if (code.length > MAX_CHARS) return code;
  const name = path.split('/').pop() ?? path;
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  const tokens =
    ['ts', 'tsx', 'js', 'mjs', 'cjs', 'jsx'].includes(ext) ? tokenizeCode(code, false)
    : ext === 'json' ? tokenizeCode(code, true)
    : name.startsWith('.env') ? tokenizeEnv(code)
    : ext === 'md' ? tokenizeMarkdown(code)
    : null;
  if (!tokens) return code;
  return tokens.map(([kind, text], i) => (kind ? <span key={i} className={`tok-${kind}`}>{text}</span> : text));
}
