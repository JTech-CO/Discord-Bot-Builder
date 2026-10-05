import { create } from 'zustand';
import type { DraftResponse } from '../ai/draft';
import { draftToProject, layoutNodes } from '../ai/draftSpec';
import { useApiKey } from '../ai/key';
import { desktop } from '../platform';
import { useGeneration } from './generation';
import { useIssues } from './issues';
import { useProject } from './project';
import { useUI } from './ui';

export type DraftMode = 'new' | 'append';

export interface DraftSummary {
  nodes: number;
  dropped: string[];
  notes: string;
  issues: number;
  usage: { input: number; output: number };
  model: string;
}

interface DraftState {
  status: 'idle' | 'running' | 'error';
  error: string | null;
  summary: DraftSummary | null;
  run: (description: string, mode: DraftMode) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

let controller: AbortController | null = null;
let runId = 0;

async function requestDraft(description: string, signal: AbortSignal): Promise<DraftResponse> {
  const model = useGeneration.getState().model;
  const locale = useProject.getState().meta.locale;
  if (desktop) {
    const res = await desktop.ai.draft({ model, description, locale });
    if (!res.ok) throw { kind: res.kind, message: res.message };
    return res.result;
  }
  const { draftFlow } = await import('../ai/draft');
  return draftFlow({ runtime: 'browser', apiKey: useApiKey.getState().key!, model, description, locale, signal });
}

export const useDraft = create<DraftState>((set) => ({
  status: 'idle',
  error: null,
  summary: null,

  run: async (description, mode) => {
    const key = useApiKey.getState();
    if (desktop ? !key.label : !key.key) {
      useUI.getState().setKeyDialogOpen(true);
      set({ status: 'error', error: 'Anthropic API 키를 먼저 입력해 주세요.' });
      return;
    }
    controller = new AbortController();
    const id = ++runId;
    set({ status: 'running', error: null, summary: null });
    try {
      const { draft, usage } = await requestDraft(description, controller.signal);
      if (id !== runId) return;

      const { nodes: existing, edges: existingEdges, meta, seq } = useProject.getState();
      const append = mode === 'append' && existing.length > 0;
      const converted = draftToProject(draft, append ? seq : 1);
      if (!converted.ok) throw { kind: 'invalid', message: converted.error };
      const p = converted.project;

      if (append) {
        // Place the draft to the right of what is already on the canvas.
        const right = Math.max(...existing.map((n) => n.position.x)) + 400;
        const top = Math.min(...existing.map((n) => n.position.y));
        useProject.getState().load({
          meta,
          nodes: [...existing.map((n) => (n.selected ? { ...n, selected: false } : n)), ...layoutNodes(p.nodes, p.edges, { x: right, y: top })],
          edges: [...existingEdges, ...p.edges],
          seq: p.seq,
        });
      } else {
        useProject.getState().load({ meta: { ...meta, name: p.name, description: p.description }, nodes: p.nodes, edges: p.edges, seq: p.seq });
      }

      const { errors, warnings } = useIssues.getState();
      set({
        status: 'idle',
        summary: { nodes: p.nodes.length, dropped: p.dropped, notes: p.notes, issues: errors + warnings, usage, model: useGeneration.getState().model },
      });
      useUI.getState().requestFit();
    } catch (err) {
      if (id !== runId) return;
      const e = err as { kind?: string; message?: string };
      if (e.kind === 'aborted') set({ status: 'idle', error: null });
      else set({ status: 'error', error: e.message ?? String(err) });
    } finally {
      if (id === runId) controller = null;
    }
  },

  cancel: () => {
    if (!controller) return;
    controller.abort();
    controller = null;
    runId++;
    if (desktop) void desktop.ai.cancel('draft');
    set({ status: 'idle', error: null });
  },

  reset: () => set({ error: null, summary: null, status: 'idle' }),
}));
