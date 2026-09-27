import { describe, expect, it } from 'vitest';
import { DISCORD_TOKEN_LIKE } from '../test/graph';
import { checkOutput, REQUIRED_FILES } from './output';

const base = () =>
  REQUIRED_FILES.map((path) => ({
    path,
    content: path === 'package.json' ? '{"scripts":{"build":"tsc","start":"node dist/index.js"}}' : path === '.env.example' ? 'DISCORD_TOKEN=\n' : 'x',
  }));

describe('checkOutput', () => {
  it('accepts a complete project', () => {
    const r = checkOutput({ files: base(), notes: 'ok' }, ['DISCORD_TOKEN']);
    expect(r.problems).toEqual([]);
    expect(r.files.map((f) => f.path)).toEqual([...REQUIRED_FILES].sort((a, b) => a.localeCompare(b)));
  });

  it('drops unsafe paths and forbidden files', () => {
    const r = checkOutput(
      {
        files: [
          ...base(),
          { path: '../../etc/passwd', content: 'x' },
          { path: '/abs.ts', content: 'x' },
          { path: 'src\\win.ts', content: 'x' },
          { path: 'C:/x.ts', content: 'x' },
          { path: '.env', content: 'DISCORD_TOKEN=real' },
          { path: 'node_modules/a/index.js', content: 'x' },
          { path: 'package-lock.json', content: '{}' },
          { path: './src/ok.ts', content: 'x' },
          { path: 'src/flows/주사위.ts', content: 'x' },
        ],
        notes: '',
      },
      [],
    );
    const paths = r.files.map((f) => f.path);
    expect(paths).toContain('src/ok.ts');
    expect(paths).toContain('src/flows/주사위.ts');
    expect(paths.some((p) => p.includes('..') || p.startsWith('/') || p.includes('\\') || p.includes(':'))).toBe(false);
    expect(paths).not.toContain('.env');
    expect(paths).not.toContain('package-lock.json');
    expect(paths.some((p) => p.startsWith('node_modules/'))).toBe(false);
  });

  it('reports missing required files, bad package.json and missing env vars', () => {
    const files = base().filter((f) => f.path !== 'README.md').map((f) => (f.path === 'package.json' ? { ...f, content: '{' } : f));
    const r = checkOutput({ files, notes: '' }, ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID']);
    const text = r.problems.map((p) => p.message).join('\n');
    expect(text).toContain('README.md');
    expect(text).toContain('package.json이 올바른 JSON');
    expect(text).toContain('DISCORD_CLIENT_ID');
  });

  it('redacts secrets in generated files and notes', () => {
    const r = checkOutput({ files: [...base(), { path: 'src/config.ts', content: `const t = "${DISCORD_TOKEN_LIKE}"` }], notes: DISCORD_TOKEN_LIKE }, []);
    expect(JSON.stringify(r)).not.toContain(DISCORD_TOKEN_LIKE);
  });
});
