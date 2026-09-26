// Removes dist/ before a build.
// fs.rmSync(..., { recursive: true }) crashes Node 25.2 on Windows when the path has
// non-ASCII characters (0xC0000409), which also breaks Vite's emptyOutDir. Delete by hand.
import { existsSync, lstatSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function remove(path) {
  if (!existsSync(path)) return;
  if (lstatSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) remove(join(path, entry));
    rmdirSync(path);
  } else {
    unlinkSync(path);
  }
}

remove(fileURLToPath(new URL('../dist', import.meta.url)));
