import React, { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import useNodeStore from '../../store/nodeStore';
import useAIStore from '../../store/aiStore';
import useUIStore from '../../store/uiStore';
import Button from '../ui/Button';

/**
 * ResetModal - 캔버스 전체 초기화 확인 모달
 * 
 * "초기화"를 정확히 입력해야 초기화 실행
 */
function ResetModal({ isOpen, onClose }) {
    const [inputValue, setInputValue] = useState('');
    const { clearCanvas } = useNodeStore();
    const { clearChatHistory } = useAIStore();
    const { setSelectedNode } = useUIStore();

    if (!isOpen) return null;

    const handleReset = () => {
        if (inputValue.trim() !== '초기화') return;

        // 모든 노드/엣지 삭제
        clearCanvas();
        // AI 채팅 내역 삭제
        clearChatHistory();
        // 선택 해제
        setSelectedNode(null);
        // localStorage 자동저장 데이터도 삭제
        localStorage.removeItem('hybrid-bot-builder-autosave');

        setInputValue('');
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleReset();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && (setInputValue(''), onClose())}
        >
            <div className="max-w-sm w-full bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#202225]">
                    <div className="w-9 h-9 rounded-md-discord bg-discord-red flex items-center justify-center">
                        <AlertTriangle size={18} strokeWidth={2} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-discord-header-primary">캔버스 초기화</h2>
                        <p className="text-[11px] text-discord-text-muted">이 작업은 되돌릴 수 없습니다</p>
                    </div>
                </div>

                {/* Warning */}
                <div className="px-5 py-4">
                    <div className="bg-discord-red/10 border border-discord-red/20 rounded-sm-discord px-3 py-2.5 mb-4">
                        <p className="text-[12px] text-discord-red leading-relaxed">
                            <strong>다음 항목이 모두 삭제됩니다:</strong>
                        </p>
                        <ul className="text-[11px] text-discord-red/80 list-disc list-inside mt-1 space-y-0.5">
                            <li>캔버스의 모든 노드와 연결</li>
                            <li>AI와의 전체 채팅 내역</li>
                            <li>자동 저장된 데이터</li>
                        </ul>
                    </div>

                    <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1.5">
                        확인을 위해 <span className="text-discord-red">"초기화"</span>를 입력하세요
                    </label>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="초기화"
                        autoFocus
                        className="w-full h-9 px-3 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[13px] text-discord-text-normal placeholder-discord-text-muted focus:outline-none focus:border-discord-red transition-colors"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#202225]">
                    <Button variant="secondary" size="sm" onClick={() => { setInputValue(''); onClose(); }}>취소</Button>
                    <Button
                        variant="danger"
                        size="sm"
                        icon={RotateCcw}
                        onClick={handleReset}
                        disabled={inputValue.trim() !== '초기화'}
                    >
                        초기화 실행
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ResetModal;
