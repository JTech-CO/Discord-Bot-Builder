// Contract between the Electron preload (window.dbb) and the renderer. Types only.
import type { GenerationErrorKind, GenerationProgress, GenerationResult } from '../ai/generate';
import type { ModelId } from '../ai/models';

export type BotStatus = 'idle' | 'installing' | 'building' | 'running' | 'stopped' | 'failed';

export interface BotState {
  status: BotStatus;
  dir: string | null;
  /** Exit code when the bot stopped or failed. */
  code?: number | null;
}

export interface BotLogLine {
  stream: 'out' | 'err' | 'sys';
  text: string;
}

export interface NodeInfo {
  ok: boolean;
  version: string | null;
  message: string;
}

export type DesktopGenerateResult =
  | { ok: true; result: GenerationResult }
  | { ok: false; kind: GenerationErrorKind; message: string };

export interface DesktopAPI {
  platform: string;
  ai: {
    /** Masked key ("sk-ant-…abcd") when one is stored, else null. The key itself never reaches the renderer. */
    keyLabel(): Promise<string | null>;
    setKey(key: string): Promise<string>;
    clearKey(): Promise<void>;
    generate(req: { model: ModelId; prompt: string }): Promise<DesktopGenerateResult>;
    cancel(): Promise<void>;
    onProgress(cb: (p: GenerationProgress) => void): () => void;
  };
  project: {
    /** Folder picker; returns an approved folder or null when cancelled. */
    chooseFolder(suggestedName: string): Promise<string | null>;
    inspect(dir: string): Promise<{ exists: boolean; entries: number }>;
    write(dir: string, files: { path: string; content: string }[]): Promise<{ written: number }>;
    reveal(dir: string): Promise<void>;
  };
  env: {
    /** Names that have a stored (encrypted) value for this folder. */
    names(dir: string): Promise<string[]>;
    set(dir: string, name: string, value: string): Promise<void>;
    clear(dir: string, name: string): Promise<void>;
  };
  bot: {
    node(): Promise<NodeInfo>;
    start(dir: string): Promise<void>;
    stop(): Promise<void>;
    state(): Promise<BotState>;
    onState(cb: (s: BotState) => void): () => void;
    onLog(cb: (l: BotLogLine) => void): () => void;
  };
}
