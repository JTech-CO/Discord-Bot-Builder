import { useReactFlow } from '@xyflow/react';
import {
  ChevronDown, CircleAlert, CircleCheck, Download, FilePlus2, FolderOpen, Monitor, Moon, PanelLeft, PanelRight,
  Hammer, Play, Redo2, ScrollText, Sun, TriangleAlert, Undo2, Workflow,
} from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { diceExample } from '../flow/examples';
import { MAX_FILE_BYTES, fromFile, parseProjectText, toFile, type LoadResult } from '../flow/file';
import { useIssues } from '../store/issues';
import { useProject } from '../store/project';
import { useUI, type Theme } from '../store/ui';
import { Button, IconButton, Menu, cx } from '../ui/controls';
import { downloadText, safeFileName } from '../ui/files';

const THEME_ICON = { system: Monitor, dark: Moon, light: Sun } as const;
const THEME_LABEL = { system: '시스템 설정', dark: '어둡게', light: '밝게' } as const;

export function TopBar() {
  const rf = useReactFlow();
  const fileInput = useRef<HTMLInputElement>(null);
  const name = useProject((s) => s.meta.name);
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const errors = useIssues((s) => s.errors);
  const warnings = useIssues((s) => s.warnings);
  const { theme, setTheme, bottomOpen, bottomTab, leftOpen, rightOpen, togglePanel, toggleBottom, notify } = useUI();
  const problemsShown = bottomOpen && bottomTab === 'problems';
  const promptShown = bottomOpen && bottomTab === 'prompt';
  const generateShown = bottomOpen && bottomTab === 'generate';
  const simulateShown = bottomOpen && bottomTab === 'simulate';

  const applyLoad = (result: LoadResult, label: string) => {
    if (!result.ok) {
      notify(result.error, 'error');
      return;
    }
    useProject.getState().load(result.project);
    requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 200, maxZoom: 1 }));
    notify(`${label}을(를) 불러왔습니다. 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.`);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      notify('파일이 너무 큽니다. (최대 2MB)', 'error');
      return;
    }
    applyLoad(parseProjectText(await file.text()), `"${file.name}"`);
  };

  const save = () => {
    const { meta, nodes, edges } = useProject.getState();
    downloadText(`${safeFileName(meta.name)}.dbb.json`, JSON.stringify(toFile(meta, nodes, edges), null, 2), 'application/json');
  };

  const newProject = () => {
    if (useProject.getState().nodes.length && !window.confirm('새 프로젝트를 시작할까요? 저장하지 않은 캔버스는 실행 취소로만 되돌릴 수 있습니다.')) return;
    useProject.getState().reset();
  };

  const ThemeIcon = THEME_ICON[theme];

  return (
    <header className="flex h-12 min-w-0 items-center gap-1 border-b border-line bg-panel px-2 sm:gap-2">
      <IconButton icon={PanelLeft} label={leftOpen ? '노드 목록 닫기' : '노드 목록 열기'} aria-pressed={leftOpen} onClick={() => togglePanel('left')} />

      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden size-7 items-center justify-center rounded-md bg-accent text-white sm:inline-flex" aria-hidden>
          <Workflow size={16} strokeWidth={2} />
        </span>
        <span className="hidden text-sm font-semibold text-fg md:inline">Discord Bot Builder</span>
        <span className="hidden text-fg-subtle md:inline" aria-hidden>/</span>
        <label className="min-w-0">
          <span className="sr-only">봇 이름</span>
          <input
            value={name}
            maxLength={100}
            onChange={(e) => useProject.getState().setMeta({ name: e.target.value })}
            className="h-8 max-w-40 min-w-20 truncate rounded-md border border-transparent bg-transparent px-2 text-sm text-fg [field-sizing:content] hover:border-line focus:border-accent focus:outline-none sm:max-w-64"
          />
        </label>
      </div>

      <Menu
        trigger={(p) => (
          <button type="button" {...p} className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-fg-muted hover:bg-hover hover:text-fg">
            파일 <ChevronDown size={14} aria-hidden />
          </button>
        )}
        items={[
          { label: '새 프로젝트', icon: FilePlus2, onSelect: newProject },
          { label: '파일 열기…', icon: FolderOpen, onSelect: () => fileInput.current?.click() },
          { label: '파일로 저장', icon: Download, onSelect: save },
          'divider',
          { label: '예제: 주사위 봇', onSelect: () => applyLoad(fromFile(diceExample), '예제') },
        ]}
      />
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onFile} tabIndex={-1} aria-hidden />

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => toggleBottom('problems')}
          aria-pressed={problemsShown}
          aria-label={`문제: 오류 ${errors}개, 경고 ${warnings}개`}
          className={cx('inline-flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm hover:bg-hover', problemsShown && 'bg-hover')}
        >
          {errors + warnings === 0 ? (
            <span className="inline-flex items-center gap-1 text-fg-muted">
              <CircleCheck size={15} className="text-success" aria-hidden /> <span className="hidden sm:inline">문제 없음</span>
            </span>
          ) : (
            <>
              <span className={cx('inline-flex items-center gap-1 tabular-nums', errors ? 'text-danger' : 'text-fg-subtle')}>
                <CircleAlert size={15} aria-hidden /> {errors}
              </span>
              <span className={cx('inline-flex items-center gap-1 tabular-nums', warnings ? 'text-warning' : 'text-fg-subtle')}>
                <TriangleAlert size={15} aria-hidden /> {warnings}
              </span>
            </>
          )}
        </button>

        <div className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
        <IconButton icon={Undo2} label="실행 취소 (Ctrl+Z)" disabled={!canUndo} onClick={() => useProject.getState().undo()} className="max-sm:hidden" />
        <IconButton icon={Redo2} label="다시 실행 (Ctrl+Y)" disabled={!canRedo} onClick={() => useProject.getState().redo()} className="max-sm:hidden" />
        <Menu
          align="right"
          trigger={(p) => (
            <button type="button" {...p} aria-label={`테마: ${THEME_LABEL[theme]}`} title="테마" className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg">
              <ThemeIcon size={16} strokeWidth={1.75} aria-hidden />
            </button>
          )}
          items={(Object.keys(THEME_LABEL) as Theme[]).map((t) => ({
            label: THEME_LABEL[t] + (t === theme ? ' (사용 중)' : ''),
            icon: THEME_ICON[t],
            onSelect: () => setTheme(t),
          }))}
        />
        <IconButton icon={PanelRight} label={rightOpen ? '속성 패널 닫기' : '속성 패널 열기'} aria-pressed={rightOpen} onClick={() => togglePanel('right')} />
        <Button icon={Play} aria-pressed={simulateShown} onClick={() => toggleBottom('simulate')} className="ml-1">
          <span className="max-sm:sr-only">실행</span>
        </Button>
        <Button icon={ScrollText} aria-pressed={promptShown} onClick={() => toggleBottom('prompt')}>
          <span className="max-sm:sr-only">프롬프트</span>
        </Button>
        <Button variant="primary" icon={Hammer} aria-pressed={generateShown} onClick={() => toggleBottom('generate')}>
          <span className="max-sm:sr-only">생성</span>
        </Button>
      </div>
    </header>
  );
}
