import React from 'react';
import { MessageSquare, X, Download, Bot, User, Loader2 } from 'lucide-react';
import useAIStore from '../../store/aiStore';
import Button from '../ui/Button';

/**
 * ChatHistoryModal - AI 채팅 내역 전체 보기 + 텍스트 다운로드
 */

function getModelShortName(modelId) {
    if (!modelId) return 'Flash';
    if (modelId.includes('pro')) return 'Pro';
    return 'Flash';
}
function ChatHistoryModal({ isOpen, onClose }) {
    const { chatHistory, isProcessing } = useAIStore();

    if (!isOpen) return null;

    const formatTimestamp = (ts) => {
        const d = new Date(ts);
        return d.toLocaleString('ko-KR', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    const handleDownload = () => {
        if (chatHistory.length === 0) return;

        let text = '=== Hybrid AI Bot Builder - AI 채팅 내역 ===\n';
        text += `내보내기 시간: ${new Date().toLocaleString('ko-KR')}\n`;
        text += `총 메시지 수: ${chatHistory.length}\n`;
        text += '='.repeat(50) + '\n\n';

        chatHistory.forEach((msg, i) => {
            const role = msg.role === 'user' ? '👤 사용자' : `🤖 AI (${getModelShortName(msg.model)})`;
            const time = formatTimestamp(msg.timestamp);
            text += `[${time}] ${role}\n`;
            text += msg.content + '\n\n';
        });

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-chat-history-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="max-w-2xl w-full mx-4 bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#202225]">
                    <div className="flex items-center gap-3">
                        <MessageSquare size={18} strokeWidth={2} className="text-discord-blurple" />
                        <h2 className="text-[15px] font-bold text-discord-header-primary">AI 채팅 내역</h2>
                        <span className="text-[10px] text-discord-text-muted bg-discord-bg-tertiary px-2 py-0.5 rounded-sm-discord">
                            {chatHistory.length}개 메시지
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={Download}
                            onClick={handleDownload}
                            disabled={chatHistory.length === 0}
                        >
                            다운로드
                        </Button>
                        <button onClick={onClose} className="p-1 rounded-sm text-discord-text-muted hover:text-discord-text-normal transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                    {chatHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <MessageSquare size={32} className="text-discord-text-muted" />
                            <p className="text-[13px] text-discord-header-secondary font-medium">채팅 내역이 없습니다</p>
                            <p className="text-[11px] text-discord-text-muted">상단 프롬프트 바에서 AI와 대화를 시작하세요</p>
                        </div>
                    ) : (
                        chatHistory.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? '' : ''}`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-discord-blurple' : 'bg-discord-green'}`}>
                                    {msg.role === 'user' ? (
                                        <User size={14} className="text-white" />
                                    ) : (
                                        <Bot size={14} className="text-white" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-[12px] font-semibold ${msg.role === 'user' ? 'text-discord-blurple' : 'text-discord-green'}`}>
                                            {msg.role === 'user' ? '사용자' : `AI Assistant (${getModelShortName(msg.model)})`}
                                        </span>
                                        <span className="text-[10px] text-discord-text-muted">
                                            {formatTimestamp(msg.timestamp)}
                                        </span>
                                    </div>
                                    <div className="text-[13px] text-discord-text-normal leading-relaxed whitespace-pre-wrap break-words bg-discord-bg-secondary border border-[#202225] rounded-sm-discord px-3 py-2">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {isProcessing && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-discord-green">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-discord-text-muted">
                                <Loader2 size={13} className="animate-spin" />
                                AI가 응답 중...
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChatHistoryModal;
