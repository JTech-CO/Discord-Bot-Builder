import { create } from 'zustand';

/**
 * AI Store - Gemini AI 상태 관리
 * 
 * API 키는 localStorage에 암호화 없이 저장합니다.
 * (로컬 데스크톱 앱이므로 서버 전송 없음)
 */
const AI_KEY_STORAGE = 'hybrid-bot-builder-gemini-key';
const AI_MODEL_STORAGE = 'hybrid-bot-builder-gemini-model';

const useAIStore = create((set, get) => ({
    // ── API Key ──────────────────────────────
    apiKey: localStorage.getItem(AI_KEY_STORAGE) || '',
    isKeyValid: false,
    isKeyChecking: false,

    // ── Model Selection ─────────────────────
    selectedModel: localStorage.getItem(AI_MODEL_STORAGE) || 'gemini-2.5-flash',
    setSelectedModel: (m) => {
        localStorage.setItem(AI_MODEL_STORAGE, m);
        set({ selectedModel: m });
    },

    setApiKey: (key) => {
        localStorage.setItem(AI_KEY_STORAGE, key);
        set({ apiKey: key, isKeyValid: false });
    },

    clearApiKey: () => {
        localStorage.removeItem(AI_KEY_STORAGE);
        set({ apiKey: '', isKeyValid: false });
    },

    setKeyValid: (v) => set({ isKeyValid: v }),
    setKeyChecking: (v) => set({ isKeyChecking: v }),

    // ── Processing ───────────────────────────
    isProcessing: false,
    setProcessing: (v) => set({ isProcessing: v }),

    // ── Chat History (AI Prompt Bar) ─────────
    chatHistory: [],
    addChatMessage: (role, content) => set((s) => ({
        chatHistory: [...s.chatHistory, {
            role,
            content,
            timestamp: Date.now(),
            model: s.selectedModel,
        }],
    })),
    clearChatHistory: () => set({ chatHistory: [] }),

    // ── Last Result ──────────────────────────
    lastResult: null,
    setLastResult: (result) => set({ lastResult: result }),

    // ── Settings Modal ───────────────────────
    showKeyModal: false,
    openKeyModal: () => set({ showKeyModal: true }),
    closeKeyModal: () => set({ showKeyModal: false }),
}));

export default useAIStore;
