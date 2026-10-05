import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cx } from './controls';
import { t } from '../i18n/t';
import { useUI } from '../store/ui';

/** Copies text; false when the browser blocks the clipboard. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API denied (some embedded browsers): fall back to copying a hidden selection.
  }
  const active = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.append(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    active?.focus();
  }
}

function useCopied(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) =>
    void copyText(text).then((ok) => {
      if (!ok) {
        useUI.getState().notify(t('브라우저가 클립보드 접근을 막았습니다. 직접 선택해서 복사해 주세요.'), 'error');
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return [copied, copy];
}

/** Inline code that copies itself on click. */
export function CopyCode({ text, children }: { text: string; children?: ReactNode }) {
  const [copied, copy] = useCopied();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      title={t('클릭해서 복사')}
      className="inline-flex max-w-full items-baseline gap-1 rounded bg-hover px-1.5 py-px text-left font-mono text-[12.5px] break-all text-fg hover:bg-line"
    >
      <span>{children ?? text}</span>
      {copied ? <Check size={12} className="shrink-0 self-center text-success" aria-label={t('복사됨')} /> : <Copy size={12} className="shrink-0 self-center text-fg-subtle" aria-hidden />}
    </button>
  );
}

/** A small icon button that copies `text`. */
export function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, copy] = useCopied();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      aria-label={copied ? t('복사됨') : label}
      title={copied ? t('복사됨') : label}
      className={cx('inline-flex size-6 shrink-0 items-center justify-center rounded text-fg-subtle hover:bg-hover hover:text-fg', className)}
    >
      {copied ? <Check size={14} className="text-success" aria-hidden /> : <Copy size={14} aria-hidden />}
    </button>
  );
}
