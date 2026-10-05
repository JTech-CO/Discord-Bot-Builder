import { create } from 'zustand';
import { EN } from './en';

// UI text is written in Korean in the code; that text is also the key into the English dictionary.
// No React here: the Electron main process uses t() too.

export type Lang = 'ko' | 'en';

// Every launch starts in Korean; a switch to English lasts until the app or tab closes.
export const useLang = create<{ lang: Lang; setLang: (lang: Lang) => void }>((set) => ({
  lang: 'ko',
  setLang: (lang) => set({ lang }),
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
