import { create } from 'zustand';
import { desktop } from '../platform';
import type { BotLogLine, BotState, NodeInfo } from '../platform/api';
import { useGeneration } from './generation';
import { useUI } from './ui';
import { t } from '../i18n/t';

const DIR_KEY = 'dbb:bot-dir';
const MAX_LOG_LINES = 2000;

interface DesktopState {
  node: NodeInfo | null;
  dir: string | null;
  /** Name of the project whose result was saved to `dir`; another project doesn't reuse that folder. */
  dirProject: string | null;
  /** Env var names that have an encrypted value stored for `dir`. */
  envSet: string[];
  bot: BotState;
  logs: BotLogLine[];
  refresh: () => Promise<void>;
  chooseAndSave: () => Promise<void>;
  saveAgain: () => Promise<void>;
  setEnv: (name: string, value: string) => Promise<void>;
  clearEnv: (name: string) => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clearLogs: () => void;
}

const readDir = (): { dir: string | null; dirProject: string | null } => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(DIR_KEY) ?? 'null');
    if (saved && typeof saved === 'object' && 'dir' in saved && 'project' in saved && typeof saved.dir === 'string' && typeof saved.project === 'string') {
      return { dir: saved.dir, dirProject: saved.project };
    }
  } catch {
    // Unreadable, or a bare path saved before folders were tied to a project: forget it.
  }
  return { dir: null, dirProject: null };
};

const writeDir = (dir: string, project: string) => {
  try {
    localStorage.setItem(DIR_KEY, JSON.stringify({ dir, project }));
  } catch {
    // ignore
  }
};

/** Env var names the generated project expects, read from its .env.example. */
export function requiredEnv(): string[] {
  const example = useGeneration.getState().result?.files.find((f) => f.path === '.env.example')?.content ?? '';
  return [...new Set([...example.matchAll(/^\s*([A-Z][A-Z0-9_]{0,63})\s*=/gm)].map((m) => m[1]))];
}

function dependencies(): string[] {
  const pkg = useGeneration.getState().result?.files.find((f) => f.path === 'package.json')?.content;
  try {
    const json = JSON.parse(pkg ?? '{}') as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    return Object.entries({ ...json.dependencies, ...json.devDependencies }).map(([n, v]) => `${n}@${v}`);
  } catch {
    return [];
  }
}

const fail = (err: unknown) => useUI.getState().notify(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(err), 'error');

export const useDesktop = create<DesktopState>((set, get) => ({
  node: null,
  ...readDir(),
  envSet: [],
  bot: { status: 'idle', dir: null },
  logs: [],

  refresh: async () => {
    if (!desktop) return;
    const [node, bot] = await Promise.all([desktop.bot.node(), desktop.bot.state()]);
    set({ node, bot });
    const dir = get().dir;
    if (!dir) return;
    try {
      set({ envSet: await desktop.env.names(dir) });
    } catch {
      set({ dir: null, dirProject: null, envSet: [] }); // folder no longer approved (e.g. app data reset)
    }
  },

  chooseAndSave: async () => {
    const result = useGeneration.getState().result;
    if (!desktop || !result) return;
    try {
      const dir = await desktop.project.chooseFolder(result.projectName);
      if (!dir) return;
      const { entries } = await desktop.project.inspect(dir);
      if (entries > 0 && !window.confirm(t('이 폴더에 이미 항목이 {0}개 있습니다. 같은 이름의 파일은 덮어씁니다. 계속할까요?\n\n{1}', [entries, dir]))) return;
      const { written } = await desktop.project.write(dir, result.files);
      writeDir(dir, result.projectName);
      set({ dir, dirProject: result.projectName, envSet: await desktop.env.names(dir) });
      useUI.getState().notify(t('파일 {0}개를 저장했습니다.', [written]));
    } catch (err) {
      fail(err);
    }
  },

  saveAgain: async () => {
    const { dir } = get();
    const result = useGeneration.getState().result;
    if (!desktop || !dir || !result) return;
    try {
      const { written } = await desktop.project.write(dir, result.files);
      useUI.getState().notify(t('최신 결과로 파일 {0}개를 다시 저장했습니다.', [written]));
    } catch (err) {
      fail(err);
    }
  },

  setEnv: async (name, value) => {
    const { dir } = get();
    if (!desktop || !dir) return;
    try {
      await desktop.env.set(dir, name, value);
      set({ envSet: await desktop.env.names(dir) });
    } catch (err) {
      fail(err);
    }
  },

  clearEnv: async (name) => {
    const { dir } = get();
    if (!desktop || !dir) return;
    try {
      await desktop.env.clear(dir, name);
      set({ envSet: await desktop.env.names(dir) });
    } catch (err) {
      fail(err);
    }
  },

  start: async () => {
    const { dir, envSet } = get();
    if (!desktop || !dir) return;
    const missing = requiredEnv().filter((n) => !envSet.includes(n));
    if (missing.length) {
      useUI.getState().notify(t('필요한 값이 비어 있습니다: {0}', [missing.join(', ')]), 'error');
      return;
    }
    const deps = dependencies();
    const ok = window.confirm(
      t('AI가 만든 코드를 이 PC에서 실행합니다. 이 코드는 사용자 계정 권한으로 동작하므로, 처음 실행하기 전에 코드를 한 번 살펴보세요.\n\n') +
        t('설치할 패키지 (설치 스크립트는 실행하지 않음):\n{0}\n\n계속할까요?', [deps.length ? deps.map((d) => `· ${d}`).join('\n') : t('· (package.json을 읽지 못함)')]),
    );
    if (!ok) return;
    set({ logs: [] });
    try {
      await desktop.bot.start(dir);
    } catch (err) {
      fail(err);
    }
  },

  stop: async () => {
    try {
      await desktop?.bot.stop();
    } catch (err) {
      fail(err);
    }
  },

  clearLogs: () => set({ logs: [] }),
}));

if (desktop) {
  desktop.bot.onState((bot) => useDesktop.setState({ bot }));
  desktop.bot.onLog((line) => useDesktop.setState((s) => ({ logs: [...s.logs.slice(-(MAX_LOG_LINES - 1)), line] })));
}
