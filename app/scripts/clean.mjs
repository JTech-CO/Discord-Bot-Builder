// Removes build output folders (default: dist) before a build.
// fs.rmSync(..., { recursive: true }) crashes Node 25.2 on Windows when the path has
// non-ASCII characters (0xC0000409), which also breaks Vite's emptyOutDir. Delete by hand.
import { existsSync, lstatSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ALLOWED = new Set(['dist', 'dist-electron', 'release']);

function remove(path) {
  if (!existsSync(path)) return;
  if (lstatSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) remove(join(path, entry));
    rmdirSync(path);
  } else {
    unlinkSync(path);
  }
}

const targets = process.argv.slice(2);
for (const name of targets.length ? targets : ['dist']) {
  if (!ALLOWED.has(name)) throw new Error(`Refusing to clean "${name}"`);
  remove(resolve(root, name));
}
