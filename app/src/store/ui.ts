import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { debouncedLocalStorage } from './storage';

export type Theme = 'system' | 'dark' | 'light';
export type BottomTab = 'problems';

interface Notice {
  text: string;
  level: 'info' | 'error';
  id: number;
}

interface UIState {
  theme: Theme;
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  bottomTab: BottomTab;
  /** Bumped to ask the canvas to pan to a node. */
  focusRequest: { nodeId: string; nonce: number } | null;
  notice: Notice | null;
  setTheme: (t: Theme) => void;
  togglePanel: (side: 'left' | 'right') => void;
  setBottomOpen: (open: boolean) => void;
  openBottom: (tab: BottomTab) => void;
  focusNode: (nodeId: string) => void;
  notify: (text: string, level?: Notice['level']) => void;
  dismissNotice: () => void;
}

const wide = typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches;

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      leftOpen: wide,
      rightOpen: wide,
      bottomOpen: false,
      bottomTab: 'problems',
      focusRequest: null,
      notice: null,
      setTheme: (theme) => set({ theme }),
      togglePanel: (side) => set((s) => (side === 'left' ? { leftOpen: !s.leftOpen } : { rightOpen: !s.rightOpen })),
      setBottomOpen: (bottomOpen) => set({ bottomOpen }),
      openBottom: (bottomTab) => set({ bottomOpen: true, bottomTab }),
      focusNode: (nodeId) => set({ focusRequest: { nodeId, nonce: Date.now() } }),
      notify: (text, level = 'info') => set({ notice: { text, level, id: Date.now() } }),
      dismissNotice: () => set({ notice: null }),
    }),
    {
      name: 'dbb:ui',
      storage: createJSONStorage(() => debouncedLocalStorage),
      partialize: (s) => ({ theme: s.theme, bottomOpen: s.bottomOpen }),
    },
  ),
);
