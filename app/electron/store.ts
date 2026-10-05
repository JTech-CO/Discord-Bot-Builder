import { app, safeStorage } from 'electron';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { t } from '../src/i18n/t';

/**
 * Desktop state in the app's data folder. Secret values (API key, bot tokens) are encrypted
 * with the OS keychain via safeStorage; the renderer can write them but never read them back.
 */
interface State {
  apiKey?: string;
  /** folder → env var name → encrypted value */
  env: Record<string, Record<string, string>>;
  /** Folders the user picked in a dialog. Only these may be written to or run. */
  folders: string[];
}

const file = () => join(app.getPath('userData'), 'desktop-state.json');
let state: State | null = null;

function load(): State {
  if (state) return state;
  try {
    const raw = JSON.parse(readFileSync(file(), 'utf8')) as Partial<State>;
    state = {
      apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : undefined,
      env: raw.env && typeof raw.env === 'object' ? raw.env : {},
      folders: Array.isArray(raw.folders) ? raw.folders.filter((f): f is string => typeof f === 'string') : [],
    };
  } catch {
    state = { env: {}, folders: [] };
  }
  return state;
}

function save() {
  const target = file();
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(`${target}.tmp`, JSON.stringify(state), { mode: 0o600 });
  renameSync(`${target}.tmp`, target);
}

function encrypt(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) throw new Error(t('이 PC에서는 암호화 저장소를 쓸 수 없어 비밀값을 저장하지 않았습니다.'));
  return safeStorage.encryptString(plain).toString('base64');
}

function decrypt(b64: string): string | null {
  try {
    return safeStorage.decryptString(Buffer.from(b64, 'base64'));
  } catch {
    return null;
  }
}

export const store = {
  apiKey: () => (load().apiKey ? decrypt(load().apiKey!) : null),
  setApiKey(key: string) {
    load().apiKey = encrypt(key);
    save();
  },
  clearApiKey() {
    delete load().apiKey;
    save();
  },

  envNames: (dir: string) => Object.keys(load().env[dir] ?? {}),
  envValues(dir: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, enc] of Object.entries(load().env[dir] ?? {})) {
      const value = decrypt(enc);
      if (value !== null) out[name] = value;
    }
    return out;
  },
  setEnv(dir: string, name: string, value: string) {
    const s = load();
    (s.env[dir] ??= {})[name] = encrypt(value);
    save();
  },
  clearEnv(dir: string, name: string) {
    delete load().env[dir]?.[name];
    save();
  },

  approveFolder(dir: string) {
    const s = load();
    if (!s.folders.includes(dir)) {
      s.folders.push(dir);
      save();
    }
  },
  isApproved: (dir: string) => load().folders.includes(dir),
};
