import { useMemo } from 'react';
import { z } from 'zod';
import { create } from 'zustand';
import type { GenerationErrorKind, GenerationProgress, GenerationResult } from '../ai/generate';
import { useApiKey } from '../ai/key';
import { DEFAULT_MODEL, MODELS, type ModelId } from '../ai/models';
import { checkOutput, isSafePath } from '../ai/output';
import { compilePrompt, flowKey } from '../compiler/compile';
import { desktop } from '../platform';
import { useIssues } from './issues';
import { useProject } from './project';

const RECORD_KEY = 'dbb:last-generation';
const MODEL_KEY = 'dbb:generation-model';
const MAX_STORED_CHARS = 4_000_000;

// The saved record is re-validated on load: localStorage is outside the app's control.
const GenerationRecord = z.object({
  projectName: z.string(),
  // Records saved before flow keys existed get '' and count as made from another flow.
  flowKey: z.string().default(''),
  model: z.string(),
  servedBy: z.string().nullable(),
  createdAt: z.number(),
  usage: z.object({ input: z.number(), output: z.number() }),
  files: z.array(z.object({ path: z.string(), content: z.string() })),
  notes: z.string(),
  problems: z.array(z.object({ level: z.enum(['error', 'warning']), message: z.string() })),
});
export type GenerationRecord = z.infer<typeof GenerationRecord>;

type ErrorKind = GenerationErrorKind | 'no_key' | 'invalid_flow';

interface GenerationState {
  status: 'idle' | 'running' | 'done' | 'error';
  model: ModelId;
  progress: GenerationProgress | null;
  /** When the current run started, for the elapsed-time display. */
  startedAt: number | null;
  error: { kind: ErrorKind; message: string } | null;
  result: GenerationRecord | null;
  /** Selected file path in the result view; null shows the summary. */
  selected: string | null;
  setModel: (m: ModelId) => void;
  select: (path: string | null) => void;
  start: () => Promise<void>;
  cancel: () => void;
}

/** The current flow's API prompt and its key, recompiled only when props, edges or settings change. */
export function useFlowPrompt(): { text: string; key: string } {
  const rev = useIssues((s) => s.rev);
  return useMemo(() => {
    const { meta, nodes, edges } = useProject.getState();
    const text = compilePrompt(meta, nodes, edges, 'api').text;
    return { text, key: flowKey(text) };
  }, [rev]);
}

/** The last result, but only when it was made from the flow that is open now. */
export function useCurrentResult(): GenerationRecord | null {
  const result = useGeneration((s) => s.result);
  const { key } = useFlowPrompt();
  return result?.flowKey === key ? result : null;
}

function load<T>(key: string, parse: (raw: string) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or blocked: the result stays available until the tab closes.
  }
}

const storedRecord = load(RECORD_KEY, (raw) => {
  const parsed = GenerationRecord.safeParse(JSON.parse(raw));
  return parsed.success ? { ...parsed.data, files: parsed.data.files.filter((f) => isSafePath(f.path)) } : null;
});
const storedModel = load(MODEL_KEY, (raw) => (MODELS.some((m) => m.id === raw) ? (raw as ModelId) : null));

let controller: AbortController | null = null;
// Each run gets an id; results from a cancelled or superseded run are ignored.
let runId = 0;

/** Desktop: the main process holds the key and makes the call; progress arrives over IPC. */
async function generateOnDesktop(model: ModelId, prompt: string, onProgress: (p: GenerationProgress) => void): Promise<GenerationResult> {
  const off = desktop!.ai.onProgress(onProgress);
  try {
    const res = await desktop!.ai.generate({ model, prompt });
    if (!res.ok) throw { kind: res.kind, message: res.message };
    return res.result;
  } finally {
    off();
  }
}

const isGenerationError = (e: unknown): e is { kind: GenerationErrorKind; message: string } =>
  typeof e === 'object' && e !== null && 'kind' in e && 'message' in e;

export const useGeneration = create<GenerationState>((set, get) => ({
  status: storedRecord ? 'done' : 'idle',
  model: storedModel ?? DEFAULT_MODEL,
  progress: null,
  startedAt: null,
  error: null,
  result: storedRecord,
  selected: null,

  setModel: (model) => {
    save(MODEL_KEY, model);
    set({ model });
  },

  select: (selected) => set({ selected }),

  start: async () => {
    if (get().status === 'running') return;
    const apiKey = useApiKey.getState().key;
    if (desktop ? !useApiKey.getState().label : !apiKey) {
      set({ error: { kind: 'no_key', message: 'Anthropic API 키를 먼저 입력해 주세요.' } });
      return;
    }
    if (useIssues.getState().errors > 0) {
      set({ error: { kind: 'invalid_flow', message: '흐름에 오류가 있습니다. 문제 탭에서 고친 뒤 생성해 주세요.' } });
      return;
    }
    const { meta, nodes, edges } = useProject.getState();
    const compiled = compilePrompt(meta, nodes, edges, 'api');
    if (compiled.flowCount === 0) {
      set({ error: { kind: 'invalid_flow', message: '트리거가 없어 만들 흐름이 없습니다.' } });
      return;
    }

    controller = new AbortController();
    const id = ++runId;
    const model = get().model;
    set({ status: 'running', error: null, progress: { chars: 0, files: 0, current: null }, startedAt: Date.now() });

    try {
      const onProgress = (progress: GenerationProgress) => id === runId && set({ progress });
      const r = desktop
        ? await generateOnDesktop(model, compiled.text, onProgress)
        : await (await import('../ai/generate')).generateProject({
            runtime: 'browser', apiKey: apiKey!, model, prompt: compiled.text, signal: controller.signal, onProgress,
          });
      if (id !== runId) return;
      const checked = checkOutput(r.output, compiled.requirements.env.map((e) => e.name));
      const record: GenerationRecord = {
        projectName: meta.name,
        flowKey: flowKey(compiled.text),
        model: r.model,
        servedBy: r.servedBy,
        createdAt: Date.now(),
        usage: r.usage,
        ...checked,
      };
      set({ status: 'done', result: record, selected: null, progress: null, startedAt: null });
      const json = JSON.stringify(record);
      if (json.length <= MAX_STORED_CHARS) save(RECORD_KEY, json);
    } catch (err) {
      if (id !== runId) return;
      const e = isGenerationError(err) ? err : { kind: 'unknown' as const, message: String(err) };
      if (e.kind === 'aborted') set({ status: get().result ? 'done' : 'idle', progress: null, startedAt: null, error: null });
      else set({ status: 'error', progress: null, startedAt: null, error: { kind: e.kind, message: e.message } });
    } finally {
      if (id === runId) controller = null;
    }
  },

  cancel: () => {
    if (!controller) return;
    controller.abort();
    if (desktop) void desktop.ai.cancel('generate');
    controller = null;
    runId++;
    // Return to the previous state right away; the aborted request finishes in the background.
    set({ status: get().result ? 'done' : 'idle', progress: null, startedAt: null, error: null });
  },
}));
