import React, { useState } from 'react';
import {
    Minus, Square, X, Bot, Play, Code2, Sparkles, Loader2, Key,
    Share2, Globe, RotateCcw, MessageSquare,
} from 'lucide-react';
import useUIStore from '../../store/uiStore';
import useAIStore from '../../store/aiStore';
import useCommunityStore from '../../store/communityStore';
import { generateFlow } from '../../lib/geminiService';
import Button from '../ui/Button';

/**
 * TitleBar - 커스텀 윈도우 타이틀바
 * 
 * [🤖 Logo] [✨ AI Prompt Bar] [💬] [🔑] [🌐] [📤] [🔄] [▶ Test] [<> Export] [─ □ ✕]
 */
function TitleBar({ onOpenReset, onOpenChatHistory }) {
    const { aiPromptText, setAiPromptText, openModal } = useUIStore();
    const { apiKey, isKeyValid, isProcessing, openKeyModal, chatHistory } = useAIStore();
    const { openShareModal, openCommunityPanel } = useCommunityStore();

    const isElectron = typeof window !== 'undefined' && window.electronAPI;

    const handleMinimize = () => isElectron && window.electronAPI.minimize();
    const handleMaximize = () => isElectron && window.electronAPI.maximize();
    const handleClose = () => isElectron && window.electronAPI.close();

    const handleAiSubmit = async (e) => {
        e.preventDefault();
        if (!aiPromptText.trim() || isProcessing) return;

        if (!apiKey || !isKeyValid) {
            openKeyModal();
            return;
        }

        try {
            await generateFlow(aiPromptText);
            setAiPromptText('');
        } catch (err) {
            console.error('[AI]', err.message);
        }
    };

    return (
        <div className="titlebar-drag no-select flex items-center h-11 bg-discord-bg-tertiary border-b border-[#202225] px-3 gap-3">

            {/* ── Left: App Logo & Badge ─────── */}
            <div className="titlebar-no-drag flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-md-discord bg-discord-blurple flex items-center justify-center">
                    <Bot size={16} strokeWidth={2} className="text-white" />
                </div>
                <span className="text-[13px] font-bold text-discord-header-primary tracking-tight hidden lg:block">
                    Hybrid Builder
                </span>
                <span className="text-[10px] font-semibold bg-discord-blurple text-white px-1.5 py-0.5 rounded-sm-discord uppercase tracking-wider hidden lg:block">
                    Beta
                </span>
            </div>

            {/* ── Center: AI Prompt Bar ──────── */}
            <form onSubmit={handleAiSubmit} className="titlebar-no-drag flex-1 flex items-center min-w-0">
                <div className="relative w-full">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {isProcessing ? (
                            <Loader2 size={14} strokeWidth={2} className="text-discord-blurple animate-spin" />
                        ) : (
                            <Sparkles size={14} strokeWidth={2} className="text-discord-text-muted" />
                        )}
                    </div>
                    <input
                        type="text"
                        value={aiPromptText}
                        onChange={(e) => setAiPromptText(e.target.value)}
                        placeholder={
                            !apiKey
                                ? '🔑 AI를 사용하려면 먼저 API Key를 설정하세요 →'
                                : "Describe your bot logic... (예: '욕설을 감지하면 경고 메시지를 보내는 봇')"
                        }
                        disabled={isProcessing}
                        className="w-full h-8 pl-9 pr-3 bg-discord-bg-secondary border border-[#202225] rounded-md-discord text-[13px] text-discord-text-normal placeholder-discord-text-muted focus:outline-none focus:border-discord-blurple transition-colors disabled:opacity-60"
                    />
                </div>
            </form>

            {/* ── Right: Action Buttons ──────── */}
            <div className="titlebar-no-drag flex items-center gap-1.5 flex-shrink-0">
                {/* Chat History */}
                <button
                    onClick={onOpenChatHistory}
                    title="AI 채팅 내역"
                    className="relative p-1.5 rounded-sm-discord text-discord-text-muted hover:text-discord-blurple hover:bg-discord-bg-secondary transition-colors"
                >
                    <MessageSquare size={14} strokeWidth={2} />
                    {chatHistory.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-discord-red rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                            {chatHistory.length > 9 ? '9+' : chatHistory.length}
                        </span>
                    )}
                </button>

                {/* API Key */}
                <button
                    onClick={openKeyModal}
                    title={isKeyValid ? 'API Key 설정됨' : 'API Key 설정'}
                    className={`p-1.5 rounded-sm-discord transition-colors ${isKeyValid ? 'text-discord-green hover:bg-discord-bg-secondary' : 'text-discord-text-muted hover:text-[#FAA61A] hover:bg-discord-bg-secondary'}`}
                >
                    <Key size={14} strokeWidth={2} />
                </button>

                {/* Community */}
                <button
                    onClick={openCommunityPanel}
                    title="커뮤니티 청사진"
                    className="p-1.5 rounded-sm-discord text-discord-text-muted hover:text-discord-green hover:bg-discord-bg-secondary transition-colors"
                >
                    <Globe size={14} strokeWidth={2} />
                </button>

                {/* Share */}
                <button
                    onClick={openShareModal}
                    title="청사진 공유"
                    className="p-1.5 rounded-sm-discord text-discord-text-muted hover:text-discord-blurple hover:bg-discord-bg-secondary transition-colors"
                >
                    <Share2 size={14} strokeWidth={2} />
                </button>

                {/* Reset */}
                <button
                    onClick={onOpenReset}
                    title="캔버스 초기화"
                    className="p-1.5 rounded-sm-discord text-discord-text-muted hover:text-discord-red hover:bg-discord-bg-secondary transition-colors"
                >
                    <RotateCcw size={14} strokeWidth={2} />
                </button>

                <div className="w-px h-5 bg-[#202225] mx-0.5" />

                <Button variant="success" size="sm" icon={Play} className="hidden sm:inline-flex">
                    Test Run
                </Button>
                <Button variant="primary" size="sm" icon={Code2} onClick={() => openModal('export')}>
                    Export Code
                </Button>

                {/* ── Window Controls ─── */}
                {isElectron && (
                    <>
                        <div className="w-px h-5 bg-[#202225] mx-0.5" />
                        <button onClick={handleMinimize} className="p-1.5 rounded-sm-discord text-discord-text-muted hover:text-discord-text-normal hover:bg-discord-bg-secondary transition-colors">
                            <Minus size={14} strokeWidth={1.5} />
                        </button>
                        <button onClick={handleMaximize} className="p-1.5 rounded-sm-discord text-discord-text-muted hover:text-discord-text-normal hover:bg-discord-bg-secondary transition-colors">
                            <Square size={12} strokeWidth={1.5} />
                        </button>
                        <button onClick={handleClose} className="p-1.5 rounded-sm-discord text-discord-text-muted hover:text-white hover:bg-discord-red transition-colors">
                            <X size={14} strokeWidth={1.5} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default TitleBar;
