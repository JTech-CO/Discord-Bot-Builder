import { CircleAlert, CircleCheck, TriangleAlert, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { nodeNumber } from '../flow/model';
import { getDef } from '../nodes/registry';
import { useIssues } from '../store/issues';
import { useProject } from '../store/project';
import { useUI } from '../store/ui';
import { IconButton, cx } from '../ui/controls';

export function ProblemsPanel() {
  const issues = useIssues((s) => s.all);
  const types = useProject(useShallow((s) => Object.fromEntries(s.nodes.map((n) => [n.id, n.data.type]))));
  const focusNode = useUI((s) => s.focusNode);

  return (
    <section aria-labelledby="problems-title" className="flex h-56 min-h-0 flex-col border-t border-line bg-panel">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-line pr-1 pl-4">
        <h2 id="problems-title" className="text-sm font-semibold text-fg">문제</h2>
        <span className="text-xs text-fg-subtle">{issues.length}개</span>
        <IconButton icon={X} label="문제 패널 닫기" className="ml-auto" onClick={() => useUI.getState().setBottomOpen(false)} />
      </header>
      {issues.length === 0 ? (
        <p className="flex items-center gap-2 p-4 text-sm text-fg-muted">
          <CircleCheck size={16} className="text-success" aria-hidden />
          문제가 없습니다.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {issues.map((i) => {
            const Icon = i.level === 'error' ? CircleAlert : TriangleAlert;
            const label = i.nodeId ? getDef(types[i.nodeId] ?? '')?.label : undefined;
            const content = (
              <>
                <Icon size={15} className={cx('mt-0.5 shrink-0', i.level === 'error' ? 'text-danger' : 'text-warning')} aria-label={i.level === 'error' ? '오류' : '경고'} />
                {i.nodeId && (
                  <span className="shrink-0 text-fg-muted">
                    <span className="font-mono">#{nodeNumber(i.nodeId)}</span> {label}
                  </span>
                )}
                <span className="text-fg">{i.message}</span>
              </>
            );
            return (
              <li key={i.key}>
                {i.nodeId ? (
                  <button type="button" onClick={() => focusNode(i.nodeId!)} className="flex w-full gap-2 px-4 py-1.5 text-left text-[13px] hover:bg-hover">
                    {content}
                  </button>
                ) : (
                  <div className="flex gap-2 px-4 py-1.5 text-[13px]">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
