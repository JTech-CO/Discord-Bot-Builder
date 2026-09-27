import { create } from 'zustand';
import { desktop } from '../platform';
import { KEY_PATTERN, maskKey } from './keyFormat';

export { KEY_PATTERN, maskKey } from './keyFormat';

/**
 * The user's own Anthropic API key (BYOK), only ever sent to api.anthropic.com.
 * Web: kept in memory for this tab, or in localStorage if the user opts in.
 * Desktop: handed to the main process, encrypted with the OS keychain; the page never sees it again.
 */
const STORAGE_KEY = 'dbb:anthropic-key';

function readStored(): string | null {
  if (desktop) return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && KEY_PATTERN.test(v) ? v : null;
  } catch {
    return null;
  }
}

interface KeyState {
  /** The key itself. Web only; always null on desktop. */
  key: string | null;
  /** Masked form for display; set whenever a key is available. */
  label: string | null;
  remembered: boolean;
  setKey: (key: string, remember: boolean) => Promise<void>;
  clear: () => Promise<void>;
}

const stored = readStored();

export const useApiKey = create<KeyState>((set) => ({
  key: stored,
  label: stored ? maskKey(stored) : null,
  remembered: stored !== null,
  setKey: async (key, remember) => {
    if (desktop) {
      set({ key: null, label: await desktop.ai.setKey(key), remembered: true });
      return;
    }
    try {
      if (remember) localStorage.setItem(STORAGE_KEY, key);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage blocked: the key still works for this tab.
    }
    set({ key, label: maskKey(key), remembered: remember });
  },
  clear: async () => {
    if (desktop) await desktop.ai.clearKey();
    else {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    set({ key: null, label: null, remembered: false });
  },
}));

if (desktop) void desktop.ai.keyLabel().then((label) => useApiKey.setState({ label, remembered: label !== null }));
