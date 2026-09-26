import { useEffect, useRef } from 'react';
import useNodeStore from '../store/nodeStore';
import useProjectStore from '../store/projectStore';

/**
 * useAutosave - localStorage 자동 저장 (debounced)
 * 
 * - 노드/엣지 변경 시 2초 후 자동 저장
 * - 탭 닫기 전 즉시 저장
 */
const STORAGE_KEY = 'hybrid-bot-builder-autosave';
const DEBOUNCE_MS = 2000;

export default function useAutosave() {
    const timerRef = useRef(null);

    useEffect(() => {
        const unsubNodes = useNodeStore.subscribe((state) => {
            // 노드/엣지 변경 시 dirty 마킹
            useProjectStore.getState().markDirty();

            // debounced save
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                save();
            }, DEBOUNCE_MS);
        });

        // 탭 닫기 전 즉시 저장
        const handleBeforeUnload = () => save();
        window.addEventListener('beforeunload', handleBeforeUnload);

        // 초기 로드
        load();

        return () => {
            unsubNodes();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);
}

function save() {
    try {
        const canvasData = useNodeStore.getState().getSerializableState();
        const meta = useProjectStore.getState().getMeta();
        const data = { meta, canvas: canvasData, version: 1 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        useProjectStore.getState().markClean();
    } catch (e) {
        console.warn('[Autosave] Failed:', e);
    }
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.meta) useProjectStore.getState().loadMeta(data.meta);
        if (data.canvas) useNodeStore.getState().loadProject(data.canvas);
    } catch (e) {
        console.warn('[Autosave] Load failed:', e);
    }
}
