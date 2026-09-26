import { create } from 'zustand';

/**
 * UI Store - 패널 상태, 모달, 줌 레벨 등 UI 전반의 상태 관리
 */
const useUIStore = create((set) => ({
    // ── Panel Visibility ─────────────────────
    sidebarOpen: true,
    inspectorOpen: true,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),

    // ── Modal ────────────────────────────────
    modal: null, // { type: 'export' | 'settings' | 'share', props?: {} }
    openModal: (type, props = {}) => set({ modal: { type, props } }),
    closeModal: () => set({ modal: null }),

    // ── Selected Node ────────────────────────
    selectedNode: null,
    setSelectedNode: (node) => set({ selectedNode: node }),

    // ── Zoom ─────────────────────────────────
    zoomLevel: 100,
    setZoomLevel: (level) => set({ zoomLevel: Math.max(10, Math.min(200, level)) }),

    // ── AI Prompt ────────────────────────────
    aiPromptText: '',
    setAiPromptText: (text) => set({ aiPromptText: text }),
    isAiProcessing: false,
    setAiProcessing: (v) => set({ isAiProcessing: v }),
}));

export default useUIStore;
