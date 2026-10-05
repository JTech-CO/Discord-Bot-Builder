import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CircleAlert, TriangleAlert } from 'lucide-react';
import { memo } from 'react';
import { nodeNumber, type BotNode } from '../flow/model';
import { categoryColor, categoryLabel, getDef, isTrigger, portsOf } from '../nodes/registry';
import { prettyRefs } from '../nodes/helpers';
import { useNodeIssues } from '../store/issues';
import { cx } from '../ui/controls';
import { t, useLang } from '../i18n/t';

function BotNodeCard({ id, data, selected }: NodeProps<BotNode>) {
  useLang((s) => s.lang); // memoized by React Flow, so it re-renders itself on a language switch
  const def = getDef(data.type);
  const issues = useNodeIssues(id);

  if (!def) {
    return (
      <div className="w-60 rounded-lg border border-danger bg-raised px-3 py-2.5 text-sm text-danger">{t('알 수 없는 노드: {0}', [data.type])}</div>
    );
  }

  const ports = portsOf(def, data.props);
  const labeled = ports.length > 1 || !!ports[0]?.label;
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.length - errors;
  const summary = def.summary?.(data.props);
  const color = categoryColor(def.category);
  const Icon = def.icon;

  return (
    <div
      className={cx(
        'relative w-60 rounded-lg border bg-raised transition-colors duration-100',
        selected ? 'border-accent ring-1 ring-accent' : errors ? 'border-danger' : 'border-line hover:border-line-strong',
      )}
      style={{ boxShadow: `inset 3px 0 0 ${color}` }}
    >
      {!isTrigger(def) && <Handle type="target" position={Position.Top} aria-label={t('입력')} />}

      <div className="py-2.5 pr-3 pl-4">
        <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <Icon size={14} strokeWidth={2} style={{ color }} aria-hidden />
          <span>{categoryLabel(def.category)}</span>
          {errors > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-danger" title={issues[0].message}>
              <CircleAlert size={13} strokeWidth={2} aria-hidden />
              <span className="sr-only">{t('오류')}</span>
              {errors}
            </span>
          )}
          {!errors && warnings > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-warning" title={issues[0].message}>
              <TriangleAlert size={13} strokeWidth={2} aria-hidden />
              <span className="sr-only">{t('경고')}</span>
              {warnings}
            </span>
          )}
          <span className="ml-auto font-mono">#{nodeNumber(id)}</span>
        </div>
        <div className="mt-1 text-sm font-semibold leading-snug text-fg">{def.label}</div>
        {summary && <div className="mt-0.5 truncate text-[13px] text-fg-muted">{prettyRefs(summary)}</div>}
      </div>

      {labeled && (
        <div className="flex border-t border-line">
          {ports.map((p) => (
            <div key={p.id} className="min-w-0 flex-1 truncate px-1 pt-1 pb-2 text-center text-xs text-fg-muted">
              {p.label}
            </div>
          ))}
        </div>
      )}

      {ports.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="source"
          position={Position.Bottom}
          aria-label={p.label ? t('출력: {0}', [p.label]) : t('출력')}
          style={{ left: `${((i + 0.5) / ports.length) * 100}%` }}
        />
      ))}
    </div>
  );
}

export default memo(BotNodeCard);
