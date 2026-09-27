import { z } from 'zod';
import { create } from 'zustand';
import type { GenerationErrorKind, GenerationProgress } from '../ai/generate';
import { useApiKey } from '../ai/key';
import { DEFAULT_MODEL, MODELS, type ModelId } from '../ai/models';
import { checkOutput, isSafePath } from '../ai/output';
import { compilePrompt } from '../compiler/compile';
import { useIssues } from './issues';
import { useProject } from './project';

const RECORD_KEY = 'dbb:last-generation';
const MODEL_KEY = 'dbb:generation-model';
const MAX_STORED_CHARS = 4_000_000;

// The saved record is re-validated on load: localStorage is outside the app's control.
const GenerationRecord = z.object({
  projectName: z.string(),
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
  error: { kind: ErrorKind; message: string } | null;
  result: GenerationRecord | null;
  /** Selected file path in the result view; null shows the summary. */
  selected: string | null;
  setModel: (m: ModelId) => void;
  select: (path: string | null) => void;
  start: () => Promise<void>;
  cancel: () => void;
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

const isGenerationError = (e: unknown): e is { kind: GenerationErrorKind; message: string } =>
  typeof e === 'object' && e !== null && 'kind' in e && 'message' in e;

export const useGeneration = create<GenerationState>((set, get) => ({
  status: storedRecord ? 'done' : 'idle',
  model: storedModel ?? DEFAULT_MODEL,
  progress: null,
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
    if (!apiKey) {
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
    set({ status: 'running', error: null, progress: { chars: 0, files: 0, current: null } });

    try {
      const { generateProject } = await import('../ai/generate');
      const r = await generateProject({
        apiKey,
        model,
        prompt: compiled.text,
        signal: controller.signal,
        onProgress: (progress) => id === runId && set({ progress }),
      });
      if (id !== runId) return;
      const checked = checkOutput(r.output, compiled.requirements.env.map((e) => e.name));
      const record: GenerationRecord = {
        projectName: meta.name,
        model: r.model,
        servedBy: r.servedBy,
        createdAt: Date.now(),
        usage: r.usage,
        ...checked,
      };
      set({ status: 'done', result: record, selected: null, progress: null });
      const json = JSON.stringify(record);
      if (json.length <= MAX_STORED_CHARS) save(RECORD_KEY, json);
    } catch (err) {
      if (id !== runId) return;
      const e = isGenerationError(err) ? err : { kind: 'unknown' as const, message: String(err) };
      if (e.kind === 'aborted') set({ status: get().result ? 'done' : 'idle', progress: null, error: null });
      else set({ status: 'error', progress: null, error: { kind: e.kind, message: e.message } });
    } finally {
      if (id === runId) controller = null;
    }
  },

  cancel: () => {
    if (!controller) return;
    controller.abort();
    controller = null;
    runId++;
    // Return to the previous state right away; the aborted request finishes in the background.
    set({ status: get().result ? 'done' : 'idle', progress: null, error: null });
  },
}));
