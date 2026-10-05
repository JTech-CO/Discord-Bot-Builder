import { create } from 'zustand';
import { EN } from './en';

// UI text is written in Korean in the code; that text is also the key into the English dictionary.
// No React here: the Electron main process uses t() too.

export type Lang = 'ko' | 'en';

const KEY = 'dbb:lang';

function stored(): Lang {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'ko';
  } catch {
    return 'ko'; // no storage (main process, private mode)
  }
}

export const useLang = create<{ lang: Lang; setLang: (lang: Lang) => void }>((set) => ({
  lang: stored(),
  setLang: (lang) => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      // the choice still applies until the app closes
    }
    set({ lang });
  },
}));

/** `ko` in the current UI language. `{0}`, `{1}`, … are replaced by `params` in order; null, undefined and false print nothing, as in JSX. */
export function t(ko: string, params?: readonly (string | number | boolean | null | undefined)[]): string {
  const text = useLang.getState().lang === 'en' ? (EN[ko] ?? ko) : ko;
  if (!params) return text;
  return text.replace(/\{(\d+)\}/g, (m, i: string) => {
    if (Number(i) >= params.length) return m;
    const v = params[Number(i)];
    return v === null || v === undefined || v === false ? '' : String(v);
  });
}
