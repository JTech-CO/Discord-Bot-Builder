import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, X, Sparkles, Bot, User, GripHorizontal } from 'lucide-react';
import useAIStore from '../../store/aiStore';

/**
 * AiResultPanel - 드래그/리사이즈 가능한 AI 처리 결과 패널
 * 
 * X로 닫으면 FAB(플로팅 원형 버튼)으로 전환
 * 새 메시지가 오면 자동으로 패널 오픈
 */

function getModelShortName(modelId) {
    if (!modelId) return 'Flash';
    if (modelId.includes('pro')) return 'Pro';
    return 'Flash';
}

function AiResultPanel() {
    const { lastResult, setLastResult, chatHistory, isProcessing } = useAIStore();
    const [isPanelOpen, setIsPanelOpen] = useState(true);

    // 드래그 상태
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ w: 320, h: 288 });
    const [isPositioned, setIsPositioned] = useState(false);
    const panelRef = useRef(null);
    const dragRef = useRef(null);

    // FAB 드래그 상태
    const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
    const [isFabPositioned, setIsFabPositioned] = useState(false);

    // 이전 채팅 길이 추적 - 새 메시지 시 자동 오픈
    const prevLenRef = useRef(chatHistory.length);
    useEffect(() => {
        if (chatHistory.length > prevLenRef.current && !isPanelOpen) {
            setIsPanelOpen(true);
        }
        prevLenRef.current = chatHistory.length;
    }, [chatHistory.length, isPanelOpen]);

    // 초기 위치 설정
    useEffect(() => {
        if (!isPositioned) {
            setPos({ x: window.innerWidth - 340 - 320, y: window.innerHeight - 288 - 60 });
            setIsPositioned(true);
        }
        if (!isFabPositioned) {
            setFabPos({ x: window.innerWidth - 340 - 320, y: window.innerHeight - 100 });
            setIsFabPositioned(true);
        }
    }, [isPositioned, isFabPositioned]);

    // 패널 드래그 핸들러
    const handlePanelDragStart = useCallback((e) => {
        e.preventDefault();
        const startX = e.clientX - pos.x;
        const startY = e.clientY - pos.y;

        const onMove = (me) => {
            setPos({ x: me.clientX - startX, y: me.clientY - startY });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [pos]);

    // 리사이즈 핸들러
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = size.w;
        const startH = size.h;

        const onMove = (me) => {
            setSize({
                w: Math.max(260, startW + (me.clientX - startX)),
                h: Math.max(160, startH + (me.clientY - startY)),
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [size]);

    // FAB 드래그 핸들러
    const handleFabDragStart = useCallback((e) => {
        e.preventDefault();
        const startX = e.clientX - fabPos.x;
        const startY = e.clientY - fabPos.y;
        let moved = false;

        const onMove = (me) => {
            moved = true;
            setFabPos({ x: me.clientX - startX, y: me.clientY - startY });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            if (!moved) {
                setIsPanelOpen(true);
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [fabPos]);

    const recentMessages = chatHistory.slice(-6);
    const hasContent = recentMessages.length > 0 || isProcessing;

    if (!hasContent) return null;

    // ── FAB 모드 ──
    if (!isPanelOpen) {
        return (
            <div
                className="fixed z-40 w-12 h-12 rounded-full bg-discord-blurple shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                style={{ left: fabPos.x, top: fabPos.y }}
                onMouseDown={handleFabDragStart}
                title="AI Assistant 열기"
            >
                <Sparkles size={20} strokeWidth={2} className="text-white" />
                {isProcessing && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-discord-red rounded-full flex items-center justify-center">
                        <Loader2 size={10} className="animate-spin text-white" />
                    </div>
                )}
            </div>
        );
    }

    // ── 패널 모드 ──
    return (
        <div
            ref={panelRef}
            className="fixed z-40 flex flex-col bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl overflow-hidden"
            style={{
                left: pos.x,
                top: pos.y,
                width: size.w,
                height: size.h,
            }}
        >
            {/* Drag Handle / Header */}
            <div
                className="flex items-center justify-between px-3 py-2 border-b border-[#202225] bg-discord-bg-secondary cursor-move select-none"
                onMouseDown={handlePanelDragStart}
            >
                <div className="flex items-center gap-2">
                    <GripHorizontal size={10} strokeWidth={2} className="text-discord-text-muted" />
                    <Sparkles size={12} strokeWidth={2} className="text-discord-blurple" />
                    <span className="text-[11px] font-semibold text-discord-header-secondary">
                        AI Assistant
                    </span>
                </div>
                <button
                    onClick={() => setIsPanelOpen(false)}
                    className="p-0.5 rounded-sm text-discord-text-muted hover:text-discord-text-normal transition-colors"
                >
                    <X size={12} strokeWidth={2} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {recentMessages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2">
                        {msg.role === 'user' ? (
                            <User size={12} className="text-discord-text-muted mt-0.5 flex-shrink-0" />
                        ) : msg.role === 'error' ? (
                            <XCircle size={12} className="text-discord-red mt-0.5 flex-shrink-0" />
                        ) : (
                            <Bot size={12} className="text-discord-blurple mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                            {msg.role === 'assistant' && (
                                <span className="text-[9px] text-discord-text-muted font-medium">
                                    {getModelShortName(msg.model)}
                                </span>
                            )}
                            <div className={`
                                text-[11px] leading-relaxed
                                ${msg.role === 'user' ? 'text-discord-text-normal' : ''}
                                ${msg.role === 'assistant' ? 'text-discord-header-secondary' : ''}
                                ${msg.role === 'error' ? 'text-discord-red' : ''}
                            `}>
                                {msg.role === 'assistant' && msg.content.length > 200
                                    ? msg.content.slice(0, 200) + '...'
                                    : msg.content
                                }
                            </div>
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex items-center gap-2 text-[11px] text-discord-text-muted">
                        <Loader2 size={12} className="animate-spin text-discord-blurple" />
                        AI가 플로우를 생성하고 있습니다...
                    </div>
                )}
            </div>

            {/* Result summary */}
            {lastResult && (
                <div className={`
                    px-3 py-2 border-t border-[#202225] text-[11px] flex items-center gap-1.5
                    ${lastResult.success ? 'text-discord-green' : 'text-discord-red'}
                `}>
                    {lastResult.success ? (
                        <>
                            <CheckCircle size={12} />
                            {lastResult.nodesAdded}개 노드가 캔버스에 추가되었습니다.
                        </>
                    ) : (
                        <>
                            <XCircle size={12} />
                            오류: {lastResult.error}
                        </>
                    )}
                </div>
            )}

            {/* Resize handle */}
            <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={handleResizeStart}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" className="text-discord-text-muted">
                    <path d="M14 14L8 14L14 8Z" fill="currentColor" fillOpacity="0.3" />
                    <path d="M14 14L11 14L14 11Z" fill="currentColor" fillOpacity="0.5" />
                </svg>
            </div>
        </div>
    );
}

export default AiResultPanel;
