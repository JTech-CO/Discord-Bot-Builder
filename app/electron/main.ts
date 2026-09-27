import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell, type IpcMainInvokeEvent } from 'electron';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { draftFlow } from '../src/ai/draft';
import { MAX_DESCRIPTION } from '../src/ai/draftSpec';
import { GenerationError, generateProject } from '../src/ai/generate';
import { KEY_PATTERN, maskKey } from '../src/ai/keyFormat';
import { MODELS } from '../src/ai/models';
import { projectSlug } from '../src/ai/zip';
import { ENV_NAME } from '../src/nodes/helpers';
import type { DesktopDraftResult, DesktopGenerateResult } from '../src/platform/api';
import { inspectFolder, writeProject } from './files';
import { BotRunner } from './runner';
import { runSmoke } from './smoke';
import { store } from './store';

const DIST = join(__dirname, '..', 'dist');
const devUrl = (() => {
  const arg = process.argv.find((a) => a.startsWith('--dev-url='))?.slice('--dev-url='.length);
  return arg && /^http:\/\/localhost:\d{2,5}$/.test(arg) ? arg : null;
})();
const smoke = process.argv.includes('--smoke');

// Links the app may open in the user's browser. Everything else is blocked.
const EXTERNAL_HOSTS = new Set(['console.anthropic.com', 'platform.claude.com', 'nodejs.org', 'discord.com']);

const isAppUrl = (url: string) =>
  devUrl ? url === devUrl || url.startsWith(`${devUrl}/`) : url.startsWith(pathToFileURL(DIST).href);

let win: BrowserWindow | null = null;
const send = (channel: string, payload: unknown) => win?.webContents.send(channel, payload);
const runner = new BotRunner((s) => send('bot:state', s), (l) => send('bot:log', l));

// ── IPC ───────────────────────────────────────────────
// The renderer is treated as untrusted: every call checks its origin and validates its input.

function handle<S extends z.ZodType>(channel: string, schema: S, fn: (arg: z.infer<S>) => unknown) {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, raw: unknown) => {
    if (!isAppUrl(event.senderFrame?.url ?? '')) throw new Error('허용되지 않은 호출입니다.');
    return fn(schema.parse(raw));
  });
}

const None = z.undefined();
const Dir = z.string().min(1).max(1024).refine((d) => store.isApproved(d), '앱에서 고른 폴더가 아닙니다.');
const EnvName = z.string().regex(ENV_NAME.regex);

handle('ai:keyLabel', None, () => {
  const key = store.apiKey();
  return key ? maskKey(key) : null;
});
handle('ai:setKey', z.string().regex(KEY_PATTERN), (key) => {
  store.setApiKey(key);
  return maskKey(key);
});
handle('ai:clearKey', None, () => store.clearApiKey());

let generation: AbortController | null = null;
handle(
  'ai:generate',
  z.object({ model: z.enum(MODELS.map((m) => m.id) as [string, ...string[]]), prompt: z.string().min(1).max(400_000) }),
  async ({ model, prompt }): Promise<DesktopGenerateResult> => {
    const apiKey = store.apiKey();
    if (!apiKey) return { ok: false, kind: 'auth', message: 'Anthropic API 키를 먼저 입력해 주세요.' };
    generation?.abort();
    const controller = new AbortController();
    generation = controller;
    try {
      const result = await generateProject({
        runtime: 'node', apiKey, model: model as (typeof MODELS)[number]['id'], prompt,
        signal: controller.signal, onProgress: (p) => send('ai:progress', p),
      });
      return { ok: true, result };
    } catch (err) {
      if (err instanceof GenerationError) return { ok: false, kind: err.kind, message: err.message };
      return { ok: false, kind: 'unknown', message: err instanceof Error ? err.message : String(err) };
    } finally {
      if (generation === controller) generation = null;
    }
  },
);
let drafting: AbortController | null = null;
handle(
  'ai:draft',
  z.object({
    model: z.enum(MODELS.map((m) => m.id) as [string, ...string[]]),
    description: z.string().min(1).max(MAX_DESCRIPTION),
    locale: z.enum(['ko', 'en']),
  }),
  async ({ model, description, locale }): Promise<DesktopDraftResult> => {
    const apiKey = store.apiKey();
    if (!apiKey) return { ok: false, kind: 'auth', message: 'Anthropic API 키를 먼저 입력해 주세요.' };
    drafting?.abort();
    const controller = new AbortController();
    drafting = controller;
    try {
      const result = await draftFlow({
        runtime: 'node', apiKey, model: model as (typeof MODELS)[number]['id'], description, locale: locale as 'ko' | 'en', signal: controller.signal,
      });
      return { ok: true, result };
    } catch (err) {
      if (err instanceof GenerationError) return { ok: false, kind: err.kind, message: err.message };
      return { ok: false, kind: 'unknown', message: err instanceof Error ? err.message : String(err) };
    } finally {
      if (drafting === controller) drafting = null;
    }
  },
);

handle('ai:cancel', None, () => {
  generation?.abort();
  drafting?.abort();
});

handle('project:chooseFolder', z.string().max(100), async (name) => {
  const parent = join(app.getPath('documents'), 'Discord Bot Builder');
  mkdirSync(parent, { recursive: true });
  const picked = await dialog.showOpenDialog(win!, {
    title: '봇 프로젝트를 저장할 폴더',
    defaultPath: join(parent, projectSlug(name)),
    properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
  });
  if (picked.canceled || !picked.filePaths[0]) return null;
  const dir = resolve(picked.filePaths[0]);
  mkdirSync(dir, { recursive: true });
  store.approveFolder(dir);
  return dir;
});
handle('project:inspect', Dir, (dir) => inspectFolder(dir));
handle(
  'project:write',
  z.object({ dir: Dir, files: z.array(z.object({ path: z.string().max(200), content: z.string().max(300_000) })).max(150) }),
  ({ dir, files }) => ({ written: writeProject(dir, files) }),
);
handle('project:reveal', Dir, async (dir) => {
  await shell.openPath(dir);
});

handle('env:names', Dir, (dir) => store.envNames(dir));
handle('env:set', z.object({ dir: Dir, name: EnvName, value: z.string().min(1).max(4096) }), ({ dir, name, value }) => store.setEnv(dir, name, value));
handle('env:clear', z.object({ dir: Dir, name: EnvName }), ({ dir, name }) => store.clearEnv(dir, name));

handle('bot:node', None, () => runner.node());
handle('bot:start', Dir, (dir) => runner.start(dir, store.envValues(dir)));
handle('bot:stop', None, () => runner.stop());
handle('bot:state', None, () => runner.current());

// ── Window ────────────────────────────────────────────

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault();
  });
  contents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' && EXTERNAL_HOSTS.has(u.hostname)) void shell.openExternal(url);
    } catch {
      // ignore malformed URLs
    }
    return { action: 'deny' };
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
});

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#18191e',
    show: !smoke,
    title: 'Discord Bot Builder',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
    },
  });
  win.on('closed', () => (win = null));

  if (smoke) runSmoke(win, runner);

  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(DIST, 'index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (win?.isMinimized()) win.restore();
    win?.focus();
  });
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    if (!devUrl) Menu.setApplicationMenu(null);
    createWindow();
  });
  app.on('before-quit', () => void runner.stop());
  app.on('window-all-closed', () => app.quit());
}
