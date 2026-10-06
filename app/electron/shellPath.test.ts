import { describe, expect, it } from 'vitest';
import { loadLoginShellPath } from './shellPath';

// Runs on the Linux CI runner; Windows keeps its PATH untouched.
describe.skipIf(process.platform === 'win32')('loadLoginShellPath', () => {
  it('adds the login shell PATH and the usual install folders, without duplicates', () => {
    const saved = { path: process.env.PATH, shell: process.env.SHELL };
    process.env.PATH = '/usr/bin:/bin:/usr/bin';
    process.env.SHELL = '/bin/sh';
    try {
      loadLoginShellPath();
      const parts = process.env.PATH.split(':');
      expect(parts).toEqual(expect.arrayContaining(['/usr/bin', '/bin', '/opt/homebrew/bin', '/usr/local/bin']));
      expect(new Set(parts).size).toBe(parts.length);
    } finally {
      process.env.PATH = saved.path;
      process.env.SHELL = saved.shell;
    }
  });
});
