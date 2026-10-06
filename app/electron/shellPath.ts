import { execFileSync } from 'node:child_process';
import { delimiter } from 'node:path';

// Apps opened from Finder or the Dock get a bare PATH (/usr/bin:/bin:/usr/sbin:/sbin), so Node.js from its
// installer, Homebrew or nvm isn't found. Read the user's PATH from their login shell once, as a terminal would,
// and keep the usual install folders as a fallback. Windows apps already get the user's PATH.

const USUAL = ['/opt/homebrew/bin', '/usr/local/bin'];

export function loadLoginShellPath(): void {
  if (process.platform === 'win32') return;
  const parts = (process.env.PATH ?? '').split(delimiter);
  try {
    const out = execFileSync(process.env.SHELL || '/bin/zsh', ['-ilc', 'printf "\\n__DBB_PATH__%s\\n" "$PATH"'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const found = /__DBB_PATH__(.*)/.exec(out)?.[1];
    if (found) parts.unshift(...found.split(delimiter));
  } catch {
    // A slow or broken shell profile: the usual folders below still cover most installs.
  }
  process.env.PATH = [...new Set([...parts, ...USUAL].filter(Boolean))].join(delimiter);
}
