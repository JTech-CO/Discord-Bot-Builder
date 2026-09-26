import type { StateStorage } from 'zustand/middleware';

const DELAY_MS = 400;
const pending = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | undefined;

function flush() {
  clearTimeout(timer);
  timer = undefined;
  for (const [key, value] of pending) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage full or blocked (private mode). The project stays in memory.
    }
  }
  pending.clear();
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', flush);

/** localStorage that batches writes (the canvas changes on every drag frame) and never throws. */
export const debouncedLocalStorage: StateStorage = {
  getItem: (key) => {
    if (pending.has(key)) return pending.get(key)!;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    pending.set(key, value);
    timer ??= setTimeout(flush, DELAY_MS);
  },
  removeItem: (key) => {
    pending.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
