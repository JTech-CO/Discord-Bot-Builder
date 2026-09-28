import { app, type BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import type { BotRunner } from './runner';

// Development checks, run with `electron . --smoke [--shot=<file.png>]`. Never used in normal runs.

const PROBE = `(async () => {
  const generate = [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === '생성');
  generate?.click();
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
  };
})()`;

// A small generated project so the "봇 실행" tab has something to show in screenshots.
const SAMPLE = {
  projectName: '주사위 봇', model: 'claude-opus-5-5', servedBy: null, createdAt: Date.now(), usage: { input: 2100, output: 3200 },
  files: [
    { path: 'package.json', content: '{"scripts":{"build":"tsc","start":"node dist/index.js"},"dependencies":{"discord.js":"^14.27.0","dotenv":"^17.0.0"}}' },
    { path: '.env.example', content: 'DISCORD_TOKEN=\nDISCORD_CLIENT_ID=\nDISCORD_GUILD_ID=\n' },
  ],
  notes: '', problems: [],
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function runSmoke(win: BrowserWindow, runner: BotRunner) {
  const shot = process.argv.find((a) => a.startsWith('--shot='))?.slice('--shot='.length);
  const fail = setTimeout(() => {
    console.log(JSON.stringify({ smoke: 'timeout' }));
    app.exit(2);
  }, 30_000);
  win.webContents.once('did-fail-load', (_e, code, desc) => {
    console.log(JSON.stringify({ smoke: 'load-failed', code, desc }));
    app.exit(1);
  });
  win.webContents.once('did-finish-load', async () => {
    await wait(1500);
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
    clearTimeout(fail);
    console.log(JSON.stringify({ smoke: 'ok', ...probe, bot: await runner.node(), shot: shot ?? null }));
    app.exit(0);
  });
}
