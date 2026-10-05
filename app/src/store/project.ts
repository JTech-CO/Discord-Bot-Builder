import {
  applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange, type XYPosition,
} from '@xyflow/react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { edgeId, fromFile, toFile, type LoadedProject, type ProjectFile } from '../flow/file';
import { wouldCreateCycle } from '../flow/graph';
import { DEFAULT_META, type BotEdge, type BotNode, type ProjectMeta } from '../flow/model';
import { defaultProps, getDef } from '../nodes/registry';
import type { Props } from '../nodes/types';
import { debouncedLocalStorage } from './storage';
import { diceExampleFor } from '../flow/examples';
import { t, useLang, type Lang } from '../i18n/t';

interface Snapshot {
  meta: ProjectMeta;
  nodes: BotNode[];
  edges: BotEdge[];
  seq: number;
}

interface ProjectState extends Snapshot {
  past: Snapshot[];
  future: Snapshot[];
  onNodesChange: (changes: NodeChange<BotNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  connect: (c: Connection) => void;
  canConnect: (c: Connection | BotEdge) => boolean;
  addNode: (type: string, position: XYPosition) => string | null;
  updateProps: (id: string, patch: Props) => void;
  setMeta: (patch: Partial<ProjectMeta>) => void;
  selectOnly: (ids: string[]) => void;
  selectAll: () => void;
  deleteSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  duplicateSelected: () => void;
  checkpoint: (key?: string) => void;
  undo: () => void;
  redo: () => void;
  load: (p: LoadedProject) => void;
  reset: () => void;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1000;
const PASTE_OFFSET = 32;

// Consecutive edits with the same key (typing in one field) share one undo step.
let lastCheckpoint = { key: '', at: 0 };
let clipboard: { nodes: BotNode[]; edges: BotEdge[] } | null = null;

const snapshotOf = (s: Snapshot): Snapshot => ({ meta: s.meta, nodes: s.nodes, edges: s.edges, seq: s.seq });

/** Rewrites {{nOld.x}} to {{nNew.x}} inside strings, lists and table rows. */
function remapRefs(value: unknown, ids: Map<string, string>): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\s*)(n[1-9]\d*)\./g, (m, sp, id) => (ids.has(id) ? `{{${sp}${ids.get(id)}.` : m));
  }
  if (Array.isArray(value)) return value.map((v) => remapRefs(v, ids));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapRefs(v, ids)]));
  }
  return value;
}

export const useProject = create<ProjectState>()(
  persist(
    (set, get) => ({
      meta: DEFAULT_META,
      nodes: [],
      edges: [],
      seq: 1,
      past: [],
      future: [],

      checkpoint: (key) => {
        const now = Date.now();
        if (key && key === lastCheckpoint.key && now - lastCheckpoint.at < COALESCE_MS) {
          lastCheckpoint.at = now;
          return;
        }
        lastCheckpoint = { key: key ?? '', at: now };
        set((s) => ({ past: [...s.past.slice(-HISTORY_LIMIT + 1), snapshotOf(s)], future: [] }));
      },

      undo: () => {
        const { past } = get();
        if (!past.length) return;
        lastCheckpoint = { key: '', at: 0 };
        set((s) => ({ ...past[past.length - 1], past: past.slice(0, -1), future: [snapshotOf(s), ...s.future] }));
      },

      redo: () => {
        const { future } = get();
        if (!future.length) return;
        lastCheckpoint = { key: '', at: 0 };
        set((s) => ({ ...future[0], future: future.slice(1), past: [...s.past, snapshotOf(s)] }));
      },

      onNodesChange: (changes) => {
        if (changes.some((c) => c.type === 'remove')) get().checkpoint('remove');
        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
      },

      onEdgesChange: (changes) => {
        if (changes.some((c) => c.type === 'remove')) get().checkpoint('remove');
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
      },

      canConnect: (c) => !!c.source && !!c.target && !wouldCreateCycle(get().edges, c.source, c.target),

      connect: (c) => {
        if (!get().canConnect(c)) return;
        const port = c.sourceHandle ?? 'next';
        get().checkpoint();
        set((s) => ({
          // One edge per output port: a new connection replaces the old one.
          edges: [
            ...s.edges.filter((e) => !(e.source === c.source && (e.sourceHandle ?? 'next') === port)),
            { id: edgeId(c.source, port, c.target), source: c.source, sourceHandle: port, target: c.target },
          ],
        }));
      },

      addNode: (type, position) => {
        const def = getDef(type);
        if (!def) return null;
        get().checkpoint();
        const id = `n${get().seq}`;
        set((s) => ({
          seq: s.seq + 1,
          nodes: [
            ...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
            { id, type: 'bot', position, selected: true, data: { type, props: defaultProps(def) } },
          ],
          edges: s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
        }));
        return id;
      },

      updateProps: (id, patch) => {
        get().checkpoint(`props:${id}:${Object.keys(patch).join(',')}`);
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, props: { ...n.data.props, ...patch } } } : n)),
        }));
      },

      setMeta: (patch) => {
        get().checkpoint(`meta:${Object.keys(patch).join(',')}`);
        set((s) => ({ meta: { ...s.meta, ...patch } }));
      },

      selectOnly: (ids) => {
        const want = new Set(ids);
        set((s) => ({
          nodes: s.nodes.map((n) => (!!n.selected === want.has(n.id) ? n : { ...n, selected: want.has(n.id) })),
          edges: s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
        }));
      },

      selectAll: () => set((s) => ({ nodes: s.nodes.map((n) => (n.selected ? n : { ...n, selected: true })) })),

      deleteSelected: () => {
        const { nodes, edges } = get();
        const gone = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
        if (!gone.size && !edges.some((e) => e.selected)) return;
        get().checkpoint();
        set({
          nodes: nodes.filter((n) => !gone.has(n.id)),
          edges: edges.filter((e) => !e.selected && !gone.has(e.source) && !gone.has(e.target)),
        });
      },

      copySelected: () => {
        const { nodes, edges } = get();
        const picked = nodes.filter((n) => n.selected);
        if (!picked.length) return;
        const ids = new Set(picked.map((n) => n.id));
        clipboard = {
          nodes: structuredClone(picked),
          edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ ...e })),
        };
      },

      paste: () => {
        if (!clipboard?.nodes.length) return;
        get().checkpoint();
        const { seq } = get();
        const ids = new Map(clipboard.nodes.map((n, i) => [n.id, `n${seq + i}`]));
        const nodes = clipboard.nodes.map((n) => ({
          ...n,
          id: ids.get(n.id)!,
          selected: true,
          position: { x: n.position.x + PASTE_OFFSET, y: n.position.y + PASTE_OFFSET },
          data: { type: n.data.type, props: remapRefs(structuredClone(n.data.props), ids) as Props },
        }));
        const edges = clipboard.edges.map((e) => {
          const source = ids.get(e.source)!;
          const target = ids.get(e.target)!;
          const port = e.sourceHandle ?? 'next';
          return { id: edgeId(source, port, target), source, sourceHandle: port, target };
        });
        // Paste again from the new copies so repeated pastes cascade instead of stacking.
        clipboard = { nodes: structuredClone(nodes), edges };
        set((s) => ({
          seq: s.seq + nodes.length,
          nodes: [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), ...nodes],
          edges: [...s.edges, ...edges],
        }));
      },

      duplicateSelected: () => {
        const saved = clipboard;
        get().copySelected();
        get().paste();
        clipboard = saved;
      },

      load: (p) => {
        get().checkpoint();
        set({ meta: p.meta, nodes: p.nodes, edges: p.edges, seq: p.seq });
      },

      reset: () => {
        get().checkpoint();
        set({ meta: { ...DEFAULT_META, name: t(DEFAULT_META.name) }, nodes: [], edges: [], seq: 1 });
      },
    }),
    {
      name: 'dbb:project',
      version: 1,
      storage: createJSONStorage(() => debouncedLocalStorage),
      // Persist the same format as exported files, and re-validate it on load.
      partialize: (s) => ({ file: toFile(s.meta, s.nodes, s.edges) }),
      merge: (persisted, current) => {
        const file = (persisted as { file?: ProjectFile } | undefined)?.file;
        if (!file) return current;
        const result = fromFile(file);
        return result.ok ? { ...current, ...result.project } : current;
      },
    },
  ),
);

// ── The example follows the UI language ───────────────
// Only while it is untouched. A project the user has edited keeps their text and the bot's language.

/** What a project says and does, ignoring where its nodes sit on the canvas. */
const contentOf = (file: ProjectFile) => JSON.stringify([file.meta, file.nodes.map((n) => [n.id, n.type, n.props]), file.edges]);

function exampleContent(lang: Lang): string | null {
  const loaded = fromFile(diceExampleFor(lang));
  return loaded.ok ? contentOf(toFile(loaded.project.meta, loaded.project.nodes, loaded.project.edges)) : null;
}

useLang.subscribe((s, prev) => {
  if (s.lang === prev.lang) return;
  const { meta, nodes, edges } = useProject.getState();
  if (contentOf(toFile(meta, nodes, edges)) !== exampleContent(prev.lang)) return;
  const next = fromFile(diceExampleFor(s.lang));
  if (!next.ok) return;
  // Same node ids in both languages, so nodes stay where the user moved them.
  const at = new Map(nodes.map((n) => [n.id, n.position]));
  useProject.getState().load({ ...next.project, nodes: next.project.nodes.map((n) => ({ ...n, position: at.get(n.id) ?? n.position })) });
});
