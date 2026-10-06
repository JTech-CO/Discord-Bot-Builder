import { app, type BrowserWindow } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import type { BotRunner } from './runner';
import { SAMPLE_PROJECT } from './smoke-sample';

// Development checks, run with `electron . --smoke [--shot=<file.png>] [--shots=<dir>]`. Never used in normal runs.

const PROBE = `(async () => {
  // The bottom panel may already be open from an earlier run; the button toggles it.
  if (!document.querySelector('[role=tab]')) [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === '생성')?.click();
  await new Promise((r) => setTimeout(r, 300));
  return {
    api: typeof window.dbb,
    keys: Object.keys(window.dbb || {}),
    node: typeof require,
    buttons: [...document.querySelectorAll('header button')].map((b) => b.textContent.trim()).filter(Boolean),
    tabs: [...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim()),
    keyLabel: await window.dbb.ai.keyLabel(),
    csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]') ? 'present' : 'missing',
    // Each of these must be refused by the main process.
    refused: await Promise.all([
      window.dbb.project.write('C:\\\\Windows', [{ path: 'x.txt', content: 'x' }]),
      window.dbb.ai.setKey('not-a-key'),
      window.dbb.env.set('C:\\\\Windows', 'DISCORD_TOKEN', 'x'),
      window.dbb.env.set('C:\\\\Windows', 'bad name', 'x'),
      window.dbb.bot.start('C:\\\\Windows'),
    ].map((p) => p.then(() => 'ALLOWED', () => 'refused'))),
    // Without a key, drafting must answer with an auth error instead of calling the API.
    draftWithoutKey: (await window.dbb.ai.keyLabel()) === null
      ? await window.dbb.ai.draft({ model: 'claude-opus-5-5', description: 'x', locale: 'ko' }).then((r) => r.ok ? 'CALLED' : r.kind)
      : 'skipped (a key is stored)',
    // Round-trip through the OS keychain, only when no real key is stored.
    keyRoundTrip: (await window.dbb.ai.keyLabel()) === null
      ? await window.dbb.ai.setKey('sk-ant-' + 'x'.repeat(30)).then(async (label) => {
          const back = await window.dbb.ai.keyLabel();
          await window.dbb.ai.clearKey();
          return { label, back, cleared: (await window.dbb.ai.keyLabel()) === null };
        })
      : 'skipped (a key is stored)',
    // A whole generation through the bundled SDK, answered by the stand-in API below.
    generation: await window.dbb.ai.setKey('sk-ant-' + 'y'.repeat(30)).then(async () => {
      const r = await window.dbb.ai.generate({ model: 'claude-opus-5-5', prompt: 'smoke' });
      await window.dbb.ai.clearKey();
      return r.ok ? r.result.output.files.map((f) => f.path) : r.kind + ': ' + r.message;
    }),
  };
})()`;

/** A stand-in for the Anthropic API on localhost, streaming one small project. The real API is never called. */
function startStandInApi(): Promise<string> {
  const project = JSON.stringify(SAMPLE_PROJECT);
  const event = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  const server = createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end(
        event('message_start', { message: { id: 'msg_smoke', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 2900, output_tokens: 1 } } }) +
          event('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) +
          event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: project } }) +
          event('content_block_stop', { index: 0 }) +
          event('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 9800 } }) +
          event('message_stop', {}),
      );
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
}

// A small generated project for screenshots. It has no flow key, so the tabs show it as a result from another flow.
const SAMPLE = {
  projectName: '주사위 봇', model: 'claude-opus-5-5', servedBy: null, createdAt: Date.now(), usage: { input: 2100, output: 3200 },
  files: [
    { path: 'package.json', content: '{"scripts":{"build":"tsc","start":"node dist/index.js"},"dependencies":{"discord.js":"^14.27.0","dotenv":"^17.0.0"}}' },
    { path: '.env.example', content: 'DISCORD_TOKEN=\nDISCORD_CLIENT_ID=\nDISCORD_GUILD_ID=\n' },
  ],
  notes: '', problems: [],
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Shared by the scripted UI steps below.
const HELPERS = `
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = (text) => [...document.querySelectorAll('button, [role=menuitem], [role=tab], [role=radio]')].find((b) => b.textContent.trim() === text)?.click();
  const file = (name) => [...document.querySelectorAll('nav button')].find((b) => b.textContent.trim().startsWith(name))?.click();
  const until = async (ready, ms = 8000) => { for (const end = Date.now() + ms; Date.now() < end; await wait(100)) if (ready()) return; };
  const dismiss = () => document.querySelector('[aria-label="알림 닫기"], [aria-label="Dismiss notification"]')?.click();
`;

/** README screenshots (`--shots=<dir>`): the dice example in the editor, a test run, generated code, the setup guide, and English. */
async function takeShots(win: BrowserWindow, dir: string) {
  const run = (code: string) => win.webContents.executeJavaScript(`(async () => { ${HELPERS} ${code} })()`);
  const save = async (name: string) => {
    await run('dismiss(); await wait(600);');
    const image = await win.webContents.capturePage();
    writeFileSync(join(dir, `${name}.png`), (image.getSize().width > 1600 ? image.resize({ width: 1600, quality: 'best' }) : image).toPNG());
  };
  mkdirSync(dir, { recursive: true });
  // A clean dark editor, and a key so generation goes to the stand-in API.
  await run(`
    await window.dbb.ai.setKey('sk-ant-' + 'z'.repeat(30));
    // Let writes the app still has queued (400 ms) land first, so they can't overwrite this state.
    await wait(700);
    localStorage.clear();
    localStorage.setItem('dbb:ui', JSON.stringify({ state: { theme: 'dark', bottomOpen: false, bottomTab: 'simulate', bottomHeight: 460, promptMode: 'agent' }, version: 0 }));
  `);
  win.webContents.reload();
  await new Promise<void>((r) => win.webContents.once('did-finish-load', () => r()));
  await wait(1500);
  await run(`click('파일'); await wait(200); click('예제: 주사위 봇'); await wait(900);`);
  await save('editor');
  await run(`click('테스트'); await wait(400); click('실행'); await wait(900);`);
  await save('simulator');
  // Room for the code: the properties panel closes for these two, then comes back.
  await run(`document.querySelector('[aria-label="속성 패널 닫기"]')?.click(); click('생성'); await wait(400); click('봇 코드 생성'); await until(() => document.body.innerText.includes('dice.ts')); file('dice.ts'); await wait(300);`);
  await save('generate');
  await run(`file('요약'); await wait(300);`);
  await save('setup');
  // The untouched example switches to English with the UI.
  await run(`document.querySelector('[aria-label="속성 패널 열기"]')?.click(); click('EN'); await wait(500); click('Test'); await wait(300); click('Run'); await wait(900);`);
  await save('english');
  await run(`await window.dbb.ai.clearKey(); localStorage.clear();`);
}

export function runSmoke(win: BrowserWindow, runner: BotRunner) {
  // The SDK reads ANTHROPIC_BASE_URL when a client is created.
  const api = startStandInApi().then((url) => (process.env.ANTHROPIC_BASE_URL = url));
  const shot = process.argv.find((a) => a.startsWith('--shot='))?.slice('--shot='.length);
  const shots = process.argv.find((a) => a.startsWith('--shots='))?.slice('--shots='.length);
  const fail = setTimeout(() => {
    console.log(JSON.stringify({ smoke: 'timeout' }));
    app.exit(2);
  }, shots ? 90_000 : 30_000);
  win.webContents.once('did-fail-load', (_e, code, desc) => {
    console.log(JSON.stringify({ smoke: 'load-failed', code, desc }));
    app.exit(1);
  });
  win.webContents.once('did-finish-load', async () => {
    await wait(1500);
    await api;
    const probe = await win.webContents.executeJavaScript(PROBE);
    if (shot && shot.endsWith('.png')) {
      const ui = { state: { theme: 'dark', bottomOpen: true, bottomTab: 'bot', bottomHeight: 440, promptMode: 'agent' }, version: 0 };
      await win.webContents.executeJavaScript(
        `localStorage.setItem('dbb:ui', ${JSON.stringify(JSON.stringify(ui))}); localStorage.setItem('dbb:last-generation', ${JSON.stringify(JSON.stringify(SAMPLE))});`,
      );
      win.webContents.reload();
      await new Promise<void>((r) => win.webContents.once('did-finish-load', () => r()));
      await wait(1500);
      await win.webContents.executeJavaScript(`(async () => {
        if (!document.querySelector('[role=tab]')) {
          [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === '생성')?.click();
          await new Promise((r) => setTimeout(r, 300));
        }
        [...document.querySelectorAll('[role=tab]')].find((t) => t.textContent.trim() === '봇 실행')?.click();
      })()`);
      await wait(800);
      writeFileSync(shot, (await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript(`localStorage.removeItem('dbb:last-generation')`);
    }
    if (shots) await takeShots(win, shots);
    clearTimeout(fail);
    console.log(JSON.stringify({ smoke: 'ok', ...probe, bot: await runner.node(), shot: shot ?? null, shots: shots ?? null }));
    app.exit(0);
  });
}
