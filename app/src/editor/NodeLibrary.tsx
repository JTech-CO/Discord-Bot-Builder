import { useReactFlow } from '@xyflow/react';
import { Search, Wand } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, categoryColor, defsByCategory } from '../nodes/registry';
import type { NodeDef } from '../nodes/types';
import { useProject } from '../store/project';
import { useUI } from '../store/ui';
import { NODE_DRAG_MIME, NODE_WIDTH } from './Canvas';
import { openDraft } from './DraftDialog';

const matches = (d: NodeDef, q: string) =>
  !q || d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.type.toLowerCase().includes(q);

export function NodeLibrary() {
  const rf = useReactFlow();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const addAtCenter = (type: string) => {
    const box = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!box) return;
    const c = rf.screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
    // Nudge by node count so repeated clicks don't stack cards exactly on top of each other.
    const n = useProject.getState().nodes.length % 6;
    useProject.getState().addNode(type, { x: Math.round(c.x - NODE_WIDTH / 2 + n * 16), y: Math.round(c.y - 40 + n * 16) });
    // On narrow screens the library covers the canvas, so get out of the way.
    if (!window.matchMedia('(min-width: 1024px)').matches) useUI.getState().togglePanel('left');
  };

  const sections = CATEGORIES.map((c) => ({ ...c, defs: defsByCategory(c.id).filter((d) => matches(d, q)) })).filter(
    (s) => s.defs.length > 0,
  );

  return (
    <aside aria-label="노드 목록" className="flex h-full min-h-0 flex-col border-r border-line bg-panel">
      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={openDraft}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-line text-sm text-fg hover:border-line-strong hover:bg-hover"
        >
          <Wand size={15} strokeWidth={1.75} aria-hidden /> 설명으로 초안 만들기
        </button>
        <label className="relative block">
          <span className="sr-only">노드 검색</span>
          <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="노드 검색"
            className="h-8 w-full rounded-md border border-line bg-field pr-2 pl-8 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {sections.map((s) => (
          <section key={s.id} aria-labelledby={`lib-${s.id}`}>
            <h3 id={`lib-${s.id}`} className="flex items-center gap-2 px-2 pt-3 pb-1 text-xs font-semibold text-fg-subtle">
              <span className="size-2 rounded-full" style={{ background: categoryColor(s.id) }} aria-hidden />
              {s.label}
            </h3>
            <ul>
              {s.defs.map((d) => (
                <li key={d.type}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(NODE_DRAG_MIME, d.type);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => addAtCenter(d.type)}
                    title={`${d.label}: ${d.description}`}
                    className="flex w-full cursor-grab items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-100 hover:bg-hover active:cursor-grabbing"
                  >
                    <d.icon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" style={{ color: categoryColor(d.category) }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm text-fg">{d.label}</span>
                      <span className="block truncate text-xs text-fg-subtle">{d.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {sections.length === 0 && <p className="px-2 pt-3 text-sm text-fg-muted">"{query}"와(과) 맞는 노드가 없습니다.</p>}
      </div>
    </aside>
  );
}
