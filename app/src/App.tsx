import { ReactFlowProvider } from '@xyflow/react';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Canvas } from './editor/Canvas';
import { Inspector } from './editor/Inspector';
import { NodeLibrary } from './editor/NodeLibrary';
import { BottomPanel } from './editor/BottomPanel';
import { TopBar } from './editor/TopBar';
import { useUI } from './store/ui';
import { IconButton, cx } from './ui/controls';

function useThemeAttribute() {
  const theme = useUI((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}

function NoticeBar() {
  const notice = useUI((s) => s.notice);
  const dismiss = useUI((s) => s.dismissNotice);
  useEffect(() => {
    if (!notice || notice.level === 'error') return;
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [notice, dismiss]);

  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
      {notice && (
        <div
          role={notice.level === 'error' ? 'alert' : 'status'}
          className={cx(
            'pointer-events-auto flex max-w-xl items-start gap-2 rounded-lg border bg-raised py-2 pr-1 pl-3.5 text-sm shadow-lg',
            notice.level === 'error' ? 'border-danger text-danger' : 'border-line text-fg',
          )}
        >
          <span className="py-1.5">{notice.text}</span>
          <IconButton icon={X} label="알림 닫기" onClick={dismiss} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  useThemeAttribute();
  const leftOpen = useUI((s) => s.leftOpen);
  const rightOpen = useUI((s) => s.rightOpen);
  const bottomOpen = useUI((s) => s.bottomOpen);

  // Wide screens: panels are grid columns. Narrow screens: they float over the canvas.
  const side = 'absolute inset-y-0 z-20 min-h-0 w-[min(340px,85vw)] shadow-lg lg:static lg:z-auto lg:w-auto lg:shadow-none';

  return (
    <ReactFlowProvider>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-panel text-fg">
        <TopBar />
        <div
          className={cx(
            'relative grid min-h-0 grid-cols-1 overflow-hidden',
            leftOpen && rightOpen && 'lg:grid-cols-[272px_minmax(0,1fr)_340px]',
            leftOpen && !rightOpen && 'lg:grid-cols-[272px_minmax(0,1fr)]',
            !leftOpen && rightOpen && 'lg:grid-cols-[minmax(0,1fr)_340px]',
          )}
        >
          {leftOpen && <div className={cx(side, 'left-0')}><NodeLibrary /></div>}
          <main className="relative flex min-h-0 min-w-0 flex-col">
            <h1 className="sr-only">봇 흐름 편집기</h1>
            <div className="min-h-0 flex-1">
              <Canvas />
            </div>
            {bottomOpen && <BottomPanel />}
            <NoticeBar />
          </main>
          {rightOpen && <div className={cx(side, 'right-0')}><Inspector /></div>}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
