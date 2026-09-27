import { strToU8, zipSync } from 'fflate';
import type { GeneratedFile } from './output';

/** npm-friendly folder name: lowercase ASCII, falls back to "discord-bot". */
export const projectSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'discord-bot';

/** Paths were validated by checkOutput, so they are plain relative segments. */
export function zipProject(folder: string, files: GeneratedFile[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) entries[`${folder}/${f.path}`] = strToU8(f.content);
  return zipSync(entries, { level: 6 });
}
