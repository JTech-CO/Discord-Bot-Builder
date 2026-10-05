import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { BotLogLine, BotState, NodeInfo } from '../src/platform/api';
import { t } from '../src/i18n/t';

const WIN = process.platform === 'win32';
const NPM = WIN ? 'npm.cmd' : 'npm';
const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const MIN_NODE = 22;
const MAX_LINE = 2000;

const mtime = (p: string) => (existsSync(p) ? statSync(p).mtimeMs : 0);

/** Installs, builds and runs one generated bot at a time, streaming its output. */
export class BotRunner {
  private child: ChildProcess | null = null;
  private stopping = false;
  private state: BotState = { status: 'idle', dir: null };
  private hide: string[] = [];

  constructor(
    private readonly onState: (s: BotState) => void,
    private readonly onLog: (l: BotLogLine) => void,
  ) {}

  current = () => this.state;

  private set(s: BotState) {
    this.state = s;
    this.onState(s);
  }

  private log(stream: BotLogLine['stream'], text: string) {
    // Never echo secret values back to the screen, even if the bot prints them.
    let clean = text.replace(ANSI, '');
    for (const secret of this.hide) clean = clean.split(secret).join(t('[숨김]'));
    this.onLog({ stream, text: clean.length > MAX_LINE ? `${clean.slice(0, MAX_LINE)}…` : clean });
  }

  node(): Promise<NodeInfo> {
    return new Promise((done) => {
      execFile('node', ['--version'], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
        const version = stdout?.trim() || null;
        const major = Number(/^v(\d+)/.exec(version ?? '')?.[1] ?? 0);
        if (err || !version) done({ ok: false, version: null, message: t('Node.js를 찾지 못했습니다. nodejs.org에서 LTS 버전을 설치한 뒤 앱을 다시 시작해 주세요.') });
        else if (major < MIN_NODE) done({ ok: false, version, message: t('Node.js {0}는 너무 오래되었습니다. {1} 이상이 필요합니다.', [version, MIN_NODE]) });
        else done({ ok: true, version, message: `Node.js ${version}` });
      });
    });
  }

  private spawnNpm(dir: string, args: string[], env: NodeJS.ProcessEnv): ChildProcess {
    // .cmd files need a shell on Windows, so the command goes in as one line. The arguments are
    // the fixed strings in this file, never user input.
    const opts = { cwd: dir, env, windowsHide: true, detached: !WIN };
    const child = WIN ? spawn(`${NPM} ${args.join(' ')}`, { ...opts, shell: true }) : spawn(NPM, args, opts);
    this.child = child;
    createInterface({ input: child.stdout! }).on('line', (l) => this.log('out', l));
    createInterface({ input: child.stderr! }).on('line', (l) => this.log('err', l));
    child.on('error', (e) => this.log('sys', t('실행하지 못했습니다: {0}', [e.message])));
    return child;
  }

  private step(dir: string, args: string[], env: NodeJS.ProcessEnv): Promise<number | null> {
    this.log('sys', `$ npm ${args.join(' ')}`);
    return new Promise((done) => {
      const child = this.spawnNpm(dir, args, env);
      child.on('close', (code) => {
        if (this.child === child) this.child = null;
        done(code);
      });
    });
  }

  async start(dir: string, secrets: Record<string, string>) {
    await this.stop();
    this.stopping = false;
    this.hide = Object.values(secrets).filter((v) => v.length >= 6);

    const node = await this.node();
    if (!node.ok) {
      this.log('sys', node.message);
      return this.set({ status: 'failed', dir, code: null });
    }
    this.log('sys', `${node.message} · ${dir}`);

    const env: NodeJS.ProcessEnv = { ...process.env, ...secrets, FORCE_COLOR: '0', NO_COLOR: '1' };
    delete env.ELECTRON_RUN_AS_NODE;

    const halted = (code: number | null) => {
      if (this.stopping) this.set({ status: 'stopped', dir, code });
      else if (code !== 0) this.set({ status: 'failed', dir, code });
      return this.stopping || code !== 0;
    };

    // Install scripts are skipped: the dependency list was chosen by an AI.
    if (mtime(join(dir, 'package.json')) > mtime(join(dir, 'node_modules'))) {
      this.set({ status: 'installing', dir });
      if (halted(await this.step(dir, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], env))) return;
    }
    this.set({ status: 'building', dir });
    if (halted(await this.step(dir, ['run', 'build'], env))) return;

    this.set({ status: 'running', dir });
    this.log('sys', '$ npm start');
    const child = this.spawnNpm(dir, ['start'], env);
    child.on('close', (code) => {
      if (this.child === child) this.child = null;
      this.set({ status: this.stopping || code === 0 ? 'stopped' : 'failed', dir, code });
    });
  }

  async stop() {
    const child = this.child;
    if (!child || child.exitCode !== null || child.pid === undefined) return;
    this.stopping = true;
    this.log('sys', t('봇을 멈춥니다.'));
    // Kill the whole tree: npm → node → the bot.
    if (WIN) await new Promise((done) => execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }, () => done(null)));
    else {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        child.kill('SIGTERM');
      }
    }
  }
}
