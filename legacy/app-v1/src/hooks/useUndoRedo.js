import { useCallback, useRef } from 'react';
import useNodeStore from '../store/nodeStore';

/**
 * useUndoRedo - Ctrl+Z / Ctrl+Shift+Z 지원
 * 
 * 캔버스 상태의 스냅샷을 스택으로 관리합니다.
 * 최대 50단계 * 2(undo + redo) 를 유지합니다.
 */
const MAX_HISTORY = 50;

export default function useUndoRedo() {
    const undoStack = useRef([]);
    const redoStack = useRef([]);

    const takeSnapshot = useCallback(() => {
        const snapshot = useNodeStore.getState().getSerializableState();
        undoStack.current.push(JSON.stringify(snapshot));
        if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
        redoStack.current = []; // 새 액션 시 redo 초기화
    }, []);

    const undo = useCallback(() => {
        if (undoStack.current.length === 0) return;

        // 현재 상태를 redo에 저장
        const current = useNodeStore.getState().getSerializableState();
        redoStack.current.push(JSON.stringify(current));

        // 이전 상태 복원
        const prev = JSON.parse(undoStack.current.pop());
        useNodeStore.getState().loadProject(prev);
    }, []);

    const redo = useCallback(() => {
        if (redoStack.current.length === 0) return;

        // 현재 상태를 undo에 저장
        const current = useNodeStore.getState().getSerializableState();
        undoStack.current.push(JSON.stringify(current));

        // 다음 상태 복원
        const next = JSON.parse(redoStack.current.pop());
        useNodeStore.getState().loadProject(next);
    }, []);

    const canUndo = undoStack.current.length > 0;
    const canRedo = redoStack.current.length > 0;

    return { takeSnapshot, undo, redo, canUndo, canRedo };
}
