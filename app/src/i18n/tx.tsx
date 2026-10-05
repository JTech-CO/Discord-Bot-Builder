import { Fragment, type ReactNode } from 'react';
import { EN } from './en';
import { useLang } from './t';

/** Like t(), for text with elements in it: `{0}`, `{1}`, … become the given nodes, in whatever order the translation puts them. */
export function tx(ko: string, params: readonly ReactNode[]): ReactNode {
  const text = useLang.getState().lang === 'en' ? (EN[ko] ?? ko) : ko;
  return text.split(/\{(\d+)\}/).map((part, i) => (i % 2 ? <Fragment key={i}>{params[Number(part)]}</Fragment> : part));
}
