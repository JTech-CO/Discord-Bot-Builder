import { create } from 'zustand';

/**
 * Project Store - 프로젝트 메타데이터 관리
 */
const useProjectStore = create((set, get) => ({
    // ── Meta ──────────────────────────────────
    projectName: 'Untitled Bot',
    targetLanguage: 'python',
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    isDirty: false,

    // ── Actions ───────────────────────────────
    setProjectName: (name) => set({
        projectName: name,
        isDirty: true,
        lastModifiedAt: new Date().toISOString(),
    }),

    setTargetLanguage: (lang) => set({
        targetLanguage: lang,
        isDirty: true,
        lastModifiedAt: new Date().toISOString(),
    }),

    markClean: () => set({ isDirty: false }),
    markDirty: () => set({
        isDirty: true,
        lastModifiedAt: new Date().toISOString(),
    }),

    // ── Serialization ─────────────────────────
    getMeta: () => {
        const { projectName, targetLanguage, createdAt, lastModifiedAt } = get();
        return { projectName, targetLanguage, createdAt, lastModifiedAt };
    },

    loadMeta: (meta) => set({
        projectName: meta.projectName || 'Untitled Bot',
        targetLanguage: meta.targetLanguage || 'python',
        createdAt: meta.createdAt || new Date().toISOString(),
        lastModifiedAt: meta.lastModifiedAt || new Date().toISOString(),
        isDirty: false,
    }),
}));

export default useProjectStore;
