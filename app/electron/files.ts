import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { isSafePath } from '../src/ai/output';
import { t } from '../src/i18n/t';

/** Writes generated files under `dir`. Paths are re-checked here; the renderer is not trusted. */
export function writeProject(dir: string, files: { path: string; content: string }[]): number {
  const root = resolve(dir);
  for (const f of files) {
    const target = resolve(root, ...f.path.split('/'));
    const rel = relative(root, target);
    if (!isSafePath(f.path) || rel.startsWith('..') || isAbsolute(rel)) throw new Error(t('허용되지 않는 경로입니다: {0}', [f.path]));
  }
  for (const f of files) {
    const target = resolve(root, ...f.path.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content, 'utf8');
  }
  return files.length;
}

export function inspectFolder(dir: string) {
  if (!existsSync(dir)) return { exists: false, entries: 0 };
  try {
    return { exists: true, entries: readdirSync(dir).length };
  } catch {
    return { exists: true, entries: 0 };
  }
}
