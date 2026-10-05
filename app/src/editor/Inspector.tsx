import { Check, CircleAlert, Copy, CopyPlus, Trash2, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { indexGraph, outputsOf } from '../flow/graph';
import { nodeNumber, type ProjectMeta } from '../flow/model';
import { nodeRef } from '../flow/refs';
import { TYPE_LABEL, type Issue } from '../flow/validate';
import { categoryColor, categoryLabel, fieldVisible, getDef, isTrigger } from '../nodes/registry';
import type { OutputDef } from '../nodes/types';
import { useIssues, useNodeIssues } from '../store/issues';
import { useProject } from '../store/project';
import { Button, IconButton, cx } from '../ui/controls';
import { Field } from './fields';
import { t } from '../i18n/t';

export function Inspector() {
  const selected = useProject(useShallow((s) => s.nodes.filter((n) => n.selected).map((n) => n.id)));
  return (
    <aside aria-label={t('속성')} className="h-full min-h-0 overflow-y-auto border-l border-line bg-panel">
      {selected.length === 1 ? (
        <NodeInspector key={selected[0]} id={selected[0]} />
      ) : selected.length > 1 ? (
        <MultiInspector count={selected.length} />
      ) : (
        <ProjectInspector />
      )}
    </aside>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="space-y-1.5">
      {issues.map((i) => (
        <li
          key={i.key}
          className={cx(
            'flex gap-2 rounded-md px-2.5 py-2 text-[13px]',
            i.level === 'error' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
          )}
        >
          {i.level === 'error' ? <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden /> : <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />}
          <span>{i.message}</span>
        </li>
      ))}
    </ul>
  );
}

function NodeInspector({ id }: { id: string }) {
  const data = useProject((s) => s.nodes.find((n) => n.id === id)?.data);
  const updateProps = useProject((s) => s.updateProps);
  const issues = useNodeIssues(id);
  if (!data) return null;
  const def = getDef(data.type);
  if (!def) return <div className="p-4 text-sm text-danger">{t('알 수 없는 노드 종류입니다.')}</div>;

  const visible = def.fields.filter((f) => fieldVisible(f, data.props));
  const visibleKeys = new Set(visible.map((f) => f.key));
  const general = issues.filter((i) => !i.field || !visibleKeys.has(i.field));
  const color = categoryColor(def.category);

  return (
    <div>
      <header className="border-b border-line p-4">
        <div className="flex items-center gap-2 text-xs text-fg-subtle">
          <def.icon size={14} strokeWidth={2} style={{ color }} aria-hidden />
          <span>{categoryLabel(def.category)}</span>
          <span className="font-mono">#{nodeNumber(id)}</span>
          <div className="ml-auto flex">
            <IconButton icon={CopyPlus} label={t('복제 (Ctrl+D)')} onClick={() => useProject.getState().duplicateSelected()} />
            <IconButton icon={Trash2} label={t('삭제 (Delete)')} variant="danger" onClick={() => useProject.getState().deleteSelected()} />
          </div>
        </div>
        <h2 className="mt-1 text-base font-semibold text-fg">{def.label}</h2>
        <p className="mt-1 text-sm text-fg-muted">{def.description}</p>
      </header>

      <div className="space-y-4 p-4">
        <IssueList issues={general} />
        {visible.length === 0 && <p className="text-sm text-fg-muted">{t('설정할 항목이 없습니다.')}</p>}
        {visible.map((f) => (
          <Field
            key={f.key}
            field={f}
            value={data.props[f.key]}
            nodeId={id}
            issues={issues.filter((i) => i.field === f.key)}
            onChange={(v) => updateProps(id, { [f.key]: v })}
          />
        ))}
      </div>

      <Outputs id={id} trigger={isTrigger(def)} />
    </div>
  );
}

function Outputs({ id, trigger }: { id: string; trigger: boolean }) {
  // Outputs can depend on other nodes (modal fields). Selecting a string keeps the
  // result stable across renders, so dragging nodes doesn't re-render this list.
  const json = useProject((s) => {
    const node = s.nodes.find((n) => n.id === id);
    return JSON.stringify(node ? outputsOf(indexGraph(s.nodes, s.edges), node) : []);
  });
  const outputs = useMemo(() => JSON.parse(json) as OutputDef[], [json]);
  const [copied, setCopied] = useState<string | null>(null);

  if (!outputs.length) return null;

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    } catch {
      // Clipboard can be blocked; the token is still visible to copy by hand.
    }
  };

  return (
    <section aria-labelledby={`out-${id}`} className="border-t border-line p-4">
      <h3 id={`out-${id}`} className="text-sm font-semibold text-fg">{t('출력값')}</h3>
      <p className="mt-1 text-xs text-fg-subtle">{t('{0}의 입력칸에서 변수로 넣어 쓸 수 있습니다.', [trigger ? t('이 흐름의 뒤쪽 노드') : t('이 노드 뒤에 연결된 노드')])}</p>
      <ul className="mt-2 divide-y divide-line">
        {outputs.map((o) => {
          const token = nodeRef(id, o.key);
          return (
            <li key={o.key} className="flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-fg">
                  {o.label} <span className="text-xs text-fg-subtle">{t(TYPE_LABEL[o.type])}</span>
                </div>
                <code className="block truncate font-mono text-xs text-fg-muted">{token}</code>
              </div>
              <IconButton icon={copied === token ? Check : Copy} label={copied === token ? t('복사됨') : t('{0} 복사', [token])} onClick={() => copy(token)} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MultiInspector({ count }: { count: number }) {
  return (
    <div className="p-4">
      <h2 className="text-base font-semibold text-fg">{t('노드 {0}개 선택됨', [count])}</h2>
      <div className="mt-3 flex gap-2">
        <Button icon={CopyPlus} onClick={() => useProject.getState().duplicateSelected()}>{t('복제')}</Button>
        <Button icon={Trash2} variant="danger" onClick={() => useProject.getState().deleteSelected()}>{t('삭제')}</Button>
      </div>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ['드래그', '영역 선택'],
  ['Space + 드래그', '화면 이동'],
  ['휠', '확대·축소'],
  ['Delete', '선택 삭제'],
  ['Ctrl + C / V', '복사 / 붙여넣기'],
  ['Ctrl + D', '복제'],
  ['Ctrl + Z / Y', '실행 취소 / 다시 실행'],
];

function ProjectInspector() {
  const meta = useProject((s) => s.meta);
  const setMeta = useProject((s) => s.setMeta);
  const counts = useProject(useShallow((s) => ({
    nodes: s.nodes.length,
    triggers: s.nodes.filter((n) => isTrigger(getDef(n.data.type))).length,
  })));
  const projectIssues = useIssues(useShallow((s) => s.all.filter((i) => !i.nodeId)));
  const text = (key: 'name' | 'description', label: string, multiline = false, max = 100) => {
    const id = `meta-${key}`;
    const cls = 'w-full rounded-md border border-line bg-field px-2.5 text-sm text-fg focus:border-accent focus:outline-none';
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm text-fg">{label}</label>
        {multiline ? (
          <textarea id={id} rows={4} value={meta[key]} maxLength={max} onChange={(e) => setMeta({ [key]: e.target.value })} className={cx(cls, 'resize-y py-1.5')} />
        ) : (
          <input id={id} value={meta[key]} maxLength={max} onChange={(e) => setMeta({ [key]: e.target.value })} className={cx(cls, 'h-8')} />
        )}
      </div>
    );
  };
  const select = <K extends 'commandScope' | 'locale'>(key: K, label: string, options: [ProjectMeta[K], string][], help?: string) => (
    <div>
      <label htmlFor={`meta-${key}`} className="mb-1 block text-sm text-fg">{label}</label>
      <select
        id={`meta-${key}`}
        value={meta[key]}
        onChange={(e) => setMeta({ [key]: e.target.value } as Partial<ProjectMeta>)}
        className="h-8 w-full rounded-md border border-line bg-field px-2.5 text-sm text-fg focus:border-accent focus:outline-none"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {help && <p className="mt-1 text-xs text-fg-subtle">{help}</p>}
    </div>
  );

  return (
    <div>
      <header className="border-b border-line p-4">
        <h2 className="text-base font-semibold text-fg">{t('봇 설정')}</h2>
        <p className="mt-1 text-sm text-fg-muted">{t('노드 {0}개 · 트리거 {1}개. 노드를 선택하면 그 노드의 속성이 여기에 나옵니다.', [counts.nodes, counts.triggers])}</p>
      </header>
      <div className="space-y-4 p-4">
        <IssueList issues={projectIssues} />
        {text('name', t('봇 이름'))}
        {text('description', t('봇 설명'), true, 2000)}
        {select('commandScope', t('명령어 등록 범위'), [['guild', t('테스트 서버 한 곳 (즉시 반영)')], ['global', t('모든 서버 (반영까지 최대 1시간)')]], t('개발 중에는 테스트 서버를 권장합니다.'))}
        {select('locale', t('봇이 쓰는 언어'), [['ko', t('한국어')], ['en', 'English']])}
      </div>
      <section aria-labelledby="shortcuts" className="border-t border-line p-4">
        <h3 id="shortcuts" className="text-sm font-semibold text-fg">{t('조작법')}</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt><kbd className="font-mono text-xs text-fg-muted">{t(k)}</kbd></dt>
              <dd className="text-fg-muted">{t(v)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
