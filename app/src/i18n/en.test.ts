import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EN } from './en';

// Every Korean string in the app's source must have an English entry, and Korean text must only appear inside
// string literals (JSX text has to go through t() or tx()). A missing entry would show Korean in English mode.

const APP = join(__dirname, '..', '..');
const HANGUL = /[가-힣]/;
// Bot content in the example project and dev-only scripts, not UI text.
const SKIP = [/[\\/]src[\\/]test[\\/]/, /\.test\.tsx?$/, /i18n[\\/]en\.ts$/, /flow[\\/]examples\.ts$/, /electron[\\/]smoke\.ts$/];

// comment | quoted string | template | regex literal
const TOKENS =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(`(?:[^`\\]|\\[\s\S])*`)|((?<=[=(,:[!&|?{};]\s*|return\s+)\/(?![*/])(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\/[dgimsuyv]*)/g;

const unescape = (quoted: string) => quoted.slice(1, -1).replace(/\\(.)/g, (_, c: string) => ({ n: '\n', r: '\r', t: '\t' })[c] ?? c);

/** A template's literal text and the code inside its ${…} parts. */
function templateParts(tpl: string): { text: string; code: string } {
  let text = '';
  let code = '';
  let depth = 0;
  for (let i = 1; i < tpl.length - 1; i++) {
    if (depth === 0 && tpl[i] === '\\') text += tpl[i] + tpl[++i];
    else if (depth === 0 && tpl.startsWith('${', i)) (depth = 1), i++;
    else if (depth > 0) {
      if (tpl[i] === '{') depth++;
      else if (tpl[i] === '}' && --depth === 0) {
        code += '\n';
        continue;
      }
      code += tpl[i];
    } else text += tpl[i];
  }
  return { text, code };
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : sources(p);
    return /\.tsx?$/.test(e.name) && !SKIP.some((r) => r.test(p)) ? [p] : [];
  });
}

describe('English dictionary', () => {
  const missing = new Set<string>();
  const used = new Set<string>();
  const untranslated: string[] = [];

  function scan(src: string, loc: string) {
    let last = 0;
    for (const m of src.matchAll(TOKENS)) {
      const gap = src.slice(last, m.index);
      if (HANGUL.test(gap)) untranslated.push(`${loc} ${gap.trim().slice(0, 80)}`);
      last = m.index + m[0].length;
      if (m[2] && HANGUL.test(m[2])) {
        used.add(unescape(m[2]));
        if (!(unescape(m[2]) in EN)) missing.add(unescape(m[2]));
      }
      if (m[3] && HANGUL.test(m[3])) {
        const { text, code } = templateParts(m[3]);
        if (HANGUL.test(text)) untranslated.push(`${loc} template ${m[3].slice(0, 80)}`);
        scan(code, loc);
      }
    }
    if (HANGUL.test(src.slice(last))) untranslated.push(`${loc} ${src.slice(last).trim().slice(0, 80)}`);
  }

  for (const file of [...sources(join(APP, 'src')), ...sources(join(APP, 'electron'))]) {
    const src = readFileSync(file, 'utf8');
    if (HANGUL.test(src)) scan(src, relative(APP, file));
  }

  it('has an entry for every Korean string', () => {
    expect([...missing]).toEqual([]);
  });

  it('has no entries the code no longer uses', () => {
    expect(Object.keys(EN).filter((k) => !used.has(k))).toEqual([]);
  });

  it('finds Korean text only in string literals', () => {
    expect(untranslated).toEqual([]);
  });

  it('keeps every placeholder in the translation', () => {
    // {0} params and node references must match exactly; an example like {{env.이름}} may be translated but not dropped.
    const placeholders = (s: string) =>
      [...[...s.matchAll(/\{\d+\}|\{\{\s*n\d+\.[^}]*\}\}/g)].map((m) => m[0]).sort(), `refs:${(s.match(/\{\{/g) ?? []).length}`];
    const broken = Object.entries(EN).filter(([ko, en]) => placeholders(ko).join() !== placeholders(en).join());
    expect(broken).toEqual([]);
  });
});
