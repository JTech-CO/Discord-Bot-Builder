import { X } from 'lucide-react';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useIssues } from '../store/issues';
import { BOTTOM_MIN, useUI, type BottomTab } from '../store/ui';
import { IconButton, cx } from '../ui/controls';
import { ProblemsList } from './ProblemsPanel';
import { GenerateView } from './GenerateView';
import { PromptView } from './PromptView';

const maxHeight = () => Math.round(window.innerHeight * 0.75);

function ResizeHandle() {
  const height = useUI((s) => s.bottomHeight);
  const setHeight = useUI((s) => s.setBottomHeight);
  const start = useRef<{ y: number; h: number } | null>(null);

  const clamp = (h: number) => Math.min(maxHeight(), Math.max(BOTTOM_MIN, h));
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, h: height };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current) setHeight(clamp(start.current.h + start.current.y - e.clientY));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    if (e.key === 'ArrowUp') setHeight(clamp(height + step));
    else if (e.key === 'ArrowDown') setHeight(clamp(height - step));
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="하단 패널 높이"
      aria-valuenow={height}
      aria-valuemin={BOTTOM_MIN}
      aria-valuemax={maxHeight()}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (start.current = null)}
      onKeyDown={onKeyDown}
      className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize touch-none after:absolute after:inset-x-0 after:top-1 after:h-px after:bg-transparent hover:after:bg-accent focus-visible:after:bg-accent focus-visible:outline-none"
    />
  );
}

export function BottomPanel() {
  const tab = useUI((s) => s.bottomTab);
  const height = useUI((s) => s.bottomHeight);
  const openBottom = useUI((s) => s.openBottom);
  const errors = useIssues((s) => s.errors);
  const warnings = useIssues((s) => s.warnings);

  const tabs: { id: BottomTab; label: string; badge?: number }[] = [
    { id: 'generate', label: '생성' },
    { id: 'prompt', label: '프롬프트' },
    { id: 'problems', label: '문제', badge: errors + warnings },
  ];

  return (
    <section aria-label="하단 패널" className="relative flex min-h-0 shrink-0 flex-col border-t border-line bg-panel" style={{ height: `min(${height}px, 75vh)` }}>
      <ResizeHandle />
      <div className="flex h-10 shrink-0 items-center border-b border-line pr-1 pl-2">
        <div role="tablist" aria-label="하단 패널" className="flex h-full">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => openBottom(t.id)}
              className={cx(
                'relative inline-flex h-full items-center gap-1.5 px-3 text-sm',
                tab === t.id ? 'text-fg after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent' : 'text-fg-muted hover:text-fg',
              )}
            >
              {t.label}
              {!!t.badge && <span className="rounded-full bg-hover px-1.5 text-xs tabular-nums text-fg-muted">{t.badge}</span>}
            </button>
          ))}
        </div>
        <IconButton icon={X} label="하단 패널 닫기" className="ml-auto" onClick={() => useUI.getState().setBottomOpen(false)} />
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1">
        {tab === 'generate' ? <GenerateView /> : tab === 'prompt' ? <PromptView /> : <ProblemsList />}
      </div>
    </section>
  );
}
