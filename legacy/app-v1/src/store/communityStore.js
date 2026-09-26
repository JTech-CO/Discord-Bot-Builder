import { create } from 'zustand';

/**
 * Community Store - 커뮤니티 기능 상태 관리
 */
const useCommunityStore = create((set, get) => ({
    // ── Firebase 설정 상태 ──────────────
    isFirebaseConfigured: false,
    setFirebaseConfigured: (v) => set({ isFirebaseConfigured: v }),

    // ── 모달 상태 ──────────────────────
    showCommunityPanel: false,
    showShareModal: false,
    showLoadModal: false,
    showFirebaseSetup: false,

    openCommunityPanel: () => set({ showCommunityPanel: true }),
    closeCommunityPanel: () => set({ showCommunityPanel: false }),
    openShareModal: () => set({ showShareModal: true }),
    closeShareModal: () => set({ showShareModal: false }),
    openLoadModal: () => set({ showLoadModal: true }),
    closeLoadModal: () => set({ showLoadModal: false }),
    openFirebaseSetup: () => set({ showFirebaseSetup: true }),
    closeFirebaseSetup: () => set({ showFirebaseSetup: false }),

    // ── 청사진 목록 ────────────────────
    blueprints: [],
    isLoading: false,
    setBlueprints: (bps) => set({ blueprints: bps }),
    setLoading: (v) => set({ isLoading: v }),

    // ── 공유 결과 ──────────────────────
    lastShareResult: null,
    setLastShareResult: (r) => set({ lastShareResult: r }),

    // ── 내 업로드 기록 (editId 보관) ───
    myUploads: JSON.parse(localStorage.getItem('hybrid-bot-builder-my-uploads') || '[]'),
    addMyUpload: (upload) => {
        const current = get().myUploads;
        const updated = [upload, ...current].slice(0, 50);
        localStorage.setItem('hybrid-bot-builder-my-uploads', JSON.stringify(updated));
        set({ myUploads: updated });
    },
}));

export default useCommunityStore;
