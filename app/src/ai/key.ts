import { create } from 'zustand';

/**
 * The user's own Anthropic API key (BYOK). It is only ever sent to api.anthropic.com.
 * Default: kept in memory for this tab. Opt-in: remembered in this browser's localStorage.
 */
const STORAGE_KEY = 'dbb:anthropic-key';
export const KEY_PATTERN = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

function readStored(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && KEY_PATTERN.test(v) ? v : null;
  } catch {
    return null;
  }
}

interface KeyState {
  key: string | null;
  remembered: boolean;
  setKey: (key: string, remember: boolean) => void;
  clear: () => void;
}

const stored = readStored();

export const useApiKey = create<KeyState>((set) => ({
  key: stored,
  remembered: stored !== null,
  setKey: (key, remember) => {
    try {
      if (remember) localStorage.setItem(STORAGE_KEY, key);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage blocked: the key still works for this tab.
    }
    set({ key, remembered: remember });
  },
  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ key: null, remembered: false });
  },
}));

export const maskKey = (key: string) => `${key.slice(0, 7)}…${key.slice(-4)}`;
