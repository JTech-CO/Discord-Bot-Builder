import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { inspectFolder, writeProject } from './files';

const root = mkdtempSync(join(tmpdir(), 'dbb-files-'));
const dir = join(root, 'bot');
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('writeProject', () => {
  it('writes nested files inside the folder', () => {
    expect(writeProject(dir, [{ path: 'src/flows/주사위.ts', content: '// ok' }, { path: 'package.json', content: '{}' }])).toBe(2);
    expect(readFileSync(join(dir, 'src', 'flows', '주사위.ts'), 'utf8')).toBe('// ok');
    expect(inspectFolder(dir)).toEqual({ exists: true, entries: 2 });
  });

  it('refuses the whole batch if any path escapes the folder', () => {
    for (const bad of ['../escape.txt', '/abs.txt', 'a/../../b.txt', '.env', 'node_modules/x.js']) {
      expect(() => writeProject(dir, [{ path: 'fine.txt', content: 'x' }, { path: bad, content: 'x' }])).toThrow();
    }
    expect(existsSync(join(dir, 'fine.txt'))).toBe(false);
    expect(existsSync(join(root, 'escape.txt'))).toBe(false);
  });
});
