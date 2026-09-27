import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { BotLogLine, BotState } from '../src/platform/api';
import { BotRunner } from './runner';

// A stand-in for a generated bot: no dependencies, prints its token, then idles.
const dir = mkdtempSync(join(tmpdir(), 'dbb-runner-'));
writeFileSync(
  join(dir, 'package.json'),
  JSON.stringify({
    name: 'fake-bot',
    private: true,
    scripts: {
      build: 'node -e "console.log(\'built\')"',
      // vsf-ignore: the fake bot prints its token on purpose so the test can check that it gets hidden.
      start: 'node -e "console.log(\'token=\' + process.env.DISCORD_TOKEN); console.log(\'ready\'); setInterval(() => {}, 1000)"',
    },
  }),
);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const until = (check: () => boolean, ms: number) =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const tick = () => (check() ? resolve() : Date.now() - start > ms ? reject(new Error('timed out')) : setTimeout(tick, 100));
    tick();
  });

describe('BotRunner', () => {
  it('installs, builds, runs, hides secrets in logs, and stops', async () => {
    const states: BotState['status'][] = [];
    const logs: BotLogLine[] = [];
    const runner = new BotRunner((s) => states.push(s.status), (l) => logs.push(l));
    const token = 'super-secret-token-value';

    await runner.start(dir, { DISCORD_TOKEN: token });
    await until(() => logs.some((l) => l.text === 'ready'), 60_000);

    expect(states).toEqual(['installing', 'building', 'running']);
    expect(logs.some((l) => l.text === 'built')).toBe(true);
    expect(logs.some((l) => l.text.includes(token))).toBe(false);
    expect(logs.some((l) => l.text === 'token=[숨김]')).toBe(true);

    await runner.stop();
    await until(() => states.at(-1) === 'stopped', 20_000);
    expect(runner.current().status).toBe('stopped');
  }, 90_000);
});
