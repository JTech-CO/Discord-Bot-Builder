import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { nodeNumber } from '../flow/model';
import { getDef } from '../nodes/registry';
import { useIssues } from '../store/issues';
import { useProject } from '../store/project';
import { useUI } from '../store/ui';
import { cx } from '../ui/controls';
import { t } from '../i18n/t';
import { tx } from '../i18n/tx';

export function ProblemsList() {
  const issues = useIssues((s) => s.all);
  const types = useProject(useShallow((s) => Object.fromEntries(s.nodes.map((n) => [n.id, n.data.type]))));
  const focusNode = useUI((s) => s.focusNode);

  if (issues.length === 0) {
    return (
      <p className="flex items-center gap-2 p-4 text-sm text-fg-muted">{tx('{0}문제가 없습니다.', [<CircleCheck size={16} className="text-success" aria-hidden />])}</p>
    );
  }

  return (
    <ul className="scroll-hidden h-full overflow-y-auto py-1">
      {issues.map((i) => {
        const Icon = i.level === 'error' ? CircleAlert : TriangleAlert;
        const label = i.nodeId ? getDef(types[i.nodeId] ?? '')?.label : undefined;
        const content = (
          <>
            <Icon size={15} className={cx('mt-0.5 shrink-0', i.level === 'error' ? 'text-danger' : 'text-warning')} aria-label={i.level === 'error' ? t('오류') : t('경고')} />
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
  );
}
