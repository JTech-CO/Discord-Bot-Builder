import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PromptMode } from '../compiler/compile';
import { debouncedLocalStorage } from './storage';

export type Theme = 'system' | 'dark' | 'light';
export type BottomTab = 'generate' | 'prompt' | 'problems';

export const BOTTOM_MIN = 160;
export const BOTTOM_DEFAULT = 320;

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
  bottomHeight: number;
  promptMode: PromptMode;
  /** Bumped to ask the canvas to pan to a node. */
  focusRequest: { nodeId: string; nonce: number } | null;
  notice: Notice | null;
  keyDialogOpen: boolean;
  setKeyDialogOpen: (open: boolean) => void;
  setTheme: (t: Theme) => void;
  togglePanel: (side: 'left' | 'right') => void;
  setBottomOpen: (open: boolean) => void;
  /** Opens the tab, or closes the panel if that tab is already showing. */
  toggleBottom: (tab: BottomTab) => void;
  openBottom: (tab: BottomTab) => void;
  setBottomHeight: (h: number) => void;
  setPromptMode: (m: PromptMode) => void;
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
      bottomHeight: BOTTOM_DEFAULT,
      promptMode: 'agent',
      focusRequest: null,
      notice: null,
      keyDialogOpen: false,
      setKeyDialogOpen: (keyDialogOpen) => set({ keyDialogOpen }),
      setTheme: (theme) => set({ theme }),
      togglePanel: (side) => set((s) => (side === 'left' ? { leftOpen: !s.leftOpen } : { rightOpen: !s.rightOpen })),
      setBottomOpen: (bottomOpen) => set({ bottomOpen }),
      toggleBottom: (tab) => set((s) => (s.bottomOpen && s.bottomTab === tab ? { bottomOpen: false } : { bottomOpen: true, bottomTab: tab })),
      openBottom: (bottomTab) => set({ bottomOpen: true, bottomTab }),
      setBottomHeight: (h) => set({ bottomHeight: Math.round(Math.max(BOTTOM_MIN, h)) }),
      setPromptMode: (promptMode) => set({ promptMode }),
      focusNode: (nodeId) => set({ focusRequest: { nodeId, nonce: Date.now() } }),
      notify: (text, level = 'info') => set({ notice: { text, level, id: Date.now() } }),
      dismissNotice: () => set({ notice: null }),
    }),
    {
      name: 'dbb:ui',
      storage: createJSONStorage(() => debouncedLocalStorage),
      partialize: (s) => ({ theme: s.theme, bottomOpen: s.bottomOpen, bottomTab: s.bottomTab, bottomHeight: s.bottomHeight, promptMode: s.promptMode }),
    },
  ),
);
