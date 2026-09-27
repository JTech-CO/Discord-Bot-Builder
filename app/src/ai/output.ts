import { z } from 'zod';
import { findSecret, redactSecrets } from '../flow/secrets';

/** Shape requested from the model via structured outputs. Kept free of constraints the API can't enforce. */
export const ProjectOutput = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() })),
  notes: z.string(),
});
export type ProjectOutput = z.infer<typeof ProjectOutput>;

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface OutputProblem {
  level: 'error' | 'warning';
  message: string;
}

export interface CheckedOutput {
  files: GeneratedFile[];
  notes: string;
  problems: OutputProblem[];
}

export const REQUIRED_FILES = ['package.json', 'tsconfig.json', 'src/index.ts', '.env.example', 'README.md'];

const MAX_FILES = 150;
const MAX_FILE_CHARS = 300_000;
const MAX_TOTAL_CHARS = 3_000_000;
const MAX_NOTES_CHARS = 5_000;

// Relative POSIX paths made of plain segments. No "..", no absolute or drive paths, no backslashes.
const SEGMENT = /^(?!\.{1,2}$)[\p{L}\p{N}_.@-]{1,100}$/u;

function pathProblem(path: string): string | null {
  if (path.length === 0 || path.length > 200) return '경로 길이가 올바르지 않습니다';
  const parts = path.split('/');
  if (parts.length > 8) return '폴더가 너무 깊습니다';
  if (!parts.every((p) => SEGMENT.test(p))) return '허용되지 않는 경로입니다';
  return null;
}

export const isSafePath = (path: string) => pathProblem(path) === null && forbidden(path) === null;

/** Files that must never ship from the generator, even if the model produced them. */
function forbidden(path: string): string | null {
  const name = path.split('/').pop()!;
  if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') return '실제 비밀값이 들어갈 .env 파일은 받지 않습니다';
  if (path.startsWith('node_modules/') || path.startsWith('dist/') || path.startsWith('.git/')) return '설치·빌드 결과물 폴더는 받지 않습니다';
  if (/^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/.test(name)) return '잠금 파일은 npm install이 새로 만들도록 제외했습니다';
  return null;
}

/**
 * Validates what the model returned. The model's output is untrusted: files with unsafe paths are
 * dropped, secrets are redacted, and anything the bot needs to build is checked.
 */
export function checkOutput(raw: ProjectOutput, requiredEnv: string[]): CheckedOutput {
  const problems: OutputProblem[] = [];
  const error = (message: string) => problems.push({ level: 'error', message });
  const warn = (message: string) => problems.push({ level: 'warning', message });

  const byPath = new Map<string, GeneratedFile>();
  let total = 0;
  for (const f of raw.files.slice(0, MAX_FILES)) {
    const path = f.path.trim().replace(/^\.\//, '');
    const bad = pathProblem(path);
    if (bad) {
      error(`${JSON.stringify(f.path.slice(0, 80))}: ${bad}. 이 파일은 제외했습니다.`);
      continue;
    }
    const excluded = forbidden(path);
    if (excluded) {
      warn(`${path}: ${excluded}.`);
      continue;
    }
    if (f.content.length > MAX_FILE_CHARS) {
      error(`${path}: 파일이 너무 커서(${f.content.length.toLocaleString()}자) 제외했습니다.`);
      continue;
    }
    if (total + f.content.length > MAX_TOTAL_CHARS) {
      error(`${path}: 전체 크기 한도를 넘어 이후 파일을 제외했습니다.`);
      break;
    }
    let content = f.content;
    const secret = findSecret(content);
    if (secret) {
      content = redactSecrets(content);
      warn(`${path}: 비밀값(${secret})으로 보이는 부분을 가렸습니다.`);
    }
    if (byPath.has(path)) warn(`${path}: 같은 경로의 파일이 여러 번 와서 마지막 것을 썼습니다.`);
    total += content.length;
    byPath.set(path, { path, content });
  }
  if (raw.files.length > MAX_FILES) error(`파일이 ${raw.files.length}개로 너무 많아 앞의 ${MAX_FILES}개만 받았습니다.`);

  for (const required of REQUIRED_FILES) {
    if (!byPath.has(required)) error(`필수 파일 ${required}이(가) 없습니다.`);
  }

  const pkg = byPath.get('package.json');
  if (pkg) {
    try {
      const json = JSON.parse(pkg.content) as { scripts?: Record<string, unknown> };
      for (const script of ['build', 'start']) {
        if (typeof json.scripts?.[script] !== 'string') warn(`package.json에 "${script}" 스크립트가 없습니다.`);
      }
    } catch {
      error('package.json이 올바른 JSON이 아닙니다.');
    }
  }

  const envExample = byPath.get('.env.example')?.content;
  if (envExample !== undefined) {
    const missing = requiredEnv.filter((name) => !new RegExp(`^\\s*${name}\\s*=`, 'm').test(envExample));
    if (missing.length) warn(`.env.example에 빠진 환경변수가 있습니다: ${missing.join(', ')}`);
  }

  const files = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  return { files, notes: redactSecrets(raw.notes).slice(0, MAX_NOTES_CHARS), problems };
}
