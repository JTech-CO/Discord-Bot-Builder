import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle, Zap, Cpu } from 'lucide-react';
import useAIStore from '../../store/aiStore';
import { validateApiKey } from '../../lib/geminiService';
import Button from '../ui/Button';

/**
 * ApiKeyModal - Gemini API 키 설정 + 모델 선택 모달
 */

const MODEL_OPTIONS = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        icon: Zap,
        color: '#FAA61A',
        desc: '빠른 응답 속도, 무료 티어 지원. 일상적인 봇 빌딩에 최적화.',
        tag: '추천',
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        icon: Cpu,
        color: '#5865F2',
        desc: '더 높은 정확도와 복잡한 로직 생성. 고급 봇 설계에 적합.',
        tag: 'Pro',
    },
];

function ApiKeyModal() {
    const {
        showKeyModal, closeKeyModal,
        apiKey, isKeyValid, isKeyChecking,
        clearApiKey,
        selectedModel, setSelectedModel,
    } = useAIStore();

    const [inputKey, setInputKey] = useState('');
    const [realKey, setRealKey] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (showKeyModal && apiKey) {
            setRealKey(apiKey);
            setInputKey(apiKey);
        } else {
            setRealKey('');
            setInputKey('');
        }
        setError('');
    }, [showKeyModal, apiKey]);

    const handleValidate = async () => {
        const key = realKey || inputKey.trim();
        if (!key) {
            setError('API 키를 입력해주세요.');
            return;
        }

        setError('');
        const result = await validateApiKey(key);

        if (result.success) {
            setTimeout(() => closeKeyModal(), 800);
        } else {
            setError(result.error);
        }
    };

    const handleClear = () => {
        clearApiKey();
        setInputKey('');
        setRealKey('');
        setError('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleValidate();
        if (e.key === 'Escape') closeKeyModal();
    };

    if (!showKeyModal) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && closeKeyModal()}
        >
            <div className="max-w-md w-full bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#202225]">
                    <div className="w-9 h-9 rounded-md-discord bg-discord-blurple flex items-center justify-center">
                        <Key size={18} strokeWidth={2} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-discord-header-primary">
                            Gemini API 설정
                        </h2>
                        <p className="text-[11px] text-discord-text-muted">
                            API 키와 AI 모델을 설정합니다
                        </p>
                    </div>
                </div>

                {/* Guide */}
                <div className="px-5 py-3 bg-discord-bg-secondary border-b border-[#202225]">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={14} strokeWidth={2} className="text-[#FAA61A] mt-0.5 flex-shrink-0" />
                        <div className="text-[12px] text-discord-text-normal leading-relaxed">
                            <p className="font-semibold text-discord-header-secondary mb-1">
                                API Key 발급 방법
                            </p>
                            <ol className="list-decimal list-inside space-y-0.5 text-discord-text-muted">
                                <li>아래 링크를 클릭하여 Google AI Studio에 접속</li>
                                <li>Google 계정으로 로그인</li>
                                <li><strong className="text-discord-text-normal">"Get API Key"</strong> 또는 <strong className="text-discord-text-normal">"API 키 만들기"</strong> 클릭</li>
                                <li>생성된 키를 복사하여 아래 입력란에 붙여넣기</li>
                            </ol>
                        </div>
                    </div>
                    <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] text-discord-blurple hover:text-white hover:bg-discord-blurple transition-colors group"
                    >
                        <ExternalLink size={13} strokeWidth={2} />
                        <span className="font-medium">Google AI Studio에서 API Key 발급받기</span>
                        <span className="text-[10px] text-discord-text-muted group-hover:text-white/60 ml-auto">
                            aistudio.google.com
                        </span>
                    </a>
                </div>

                {/* Model Selection */}
                <div className="px-5 py-3 border-b border-[#202225]">
                    <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-2">
                        AI 모델 선택
                    </label>
                    <div className="space-y-1.5">
                        {MODEL_OPTIONS.map((m) => {
                            const Icon = m.icon;
                            const isSelected = selectedModel === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedModel(m.id)}
                                    className={`
                                        w-full flex items-start gap-3 px-3 py-2.5 rounded-sm-discord border transition-all text-left
                                        ${isSelected
                                            ? 'border-discord-blurple bg-discord-blurple/10'
                                            : 'border-[#202225] bg-discord-bg-tertiary hover:border-[#4F5660]'
                                        }
                                    `}
                                >
                                    <div
                                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: isSelected ? m.color : '#2f3136' }}
                                    >
                                        <Icon size={14} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[13px] font-semibold ${isSelected ? 'text-discord-header-primary' : 'text-discord-header-secondary'}`}>
                                                {m.name}
                                            </span>
                                            <span
                                                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                                                style={{
                                                    backgroundColor: isSelected ? m.color + '30' : '#2f3136',
                                                    color: isSelected ? m.color : '#72767d',
                                                }}
                                            >
                                                {m.tag}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-discord-text-muted mt-0.5 leading-relaxed">
                                            {m.desc}
                                        </p>
                                    </div>
                                    {/* Radio indicator */}
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${isSelected ? 'border-discord-blurple' : 'border-[#4F5660]'}`}>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-discord-blurple" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* API Key Input */}
                <div className="px-5 py-4 space-y-3">
                    <div>
                        <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1.5">
                            API Key
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={inputKey}
                                onChange={(e) => {
                                    setInputKey(e.target.value);
                                    setRealKey(e.target.value);
                                    setError('');
                                }}
                                onKeyDown={handleKeyDown}
                                onContextMenu={(e) => e.preventDefault()}
                                placeholder="API 키를 입력하세요"
                                autoComplete="off"
                                className="
                  w-full h-10 px-3 pr-10
                  bg-discord-bg-tertiary border rounded-sm-discord
                  text-[13px] text-discord-text-normal placeholder-discord-text-muted font-mono
                  focus:outline-none focus:border-discord-blurple
                  border-[#202225] transition-colors
                "
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {isKeyChecking && (
                                    <Loader2 size={16} className="text-discord-blurple animate-spin" />
                                )}
                                {!isKeyChecking && isKeyValid && (
                                    <CheckCircle size={16} className="text-discord-green" />
                                )}
                                {!isKeyChecking && error && (
                                    <XCircle size={16} className="text-discord-red" />
                                )}
                            </div>
                        </div>

                        {error && (
                            <p className="mt-1.5 text-[11px] text-discord-red flex items-center gap-1">
                                <XCircle size={11} /> {error}
                            </p>
                        )}
                        {isKeyValid && !error && (
                            <p className="mt-1.5 text-[11px] text-discord-green flex items-center gap-1">
                                <CheckCircle size={11} /> API 키가 확인되었습니다! AI 기능을 사용할 수 있습니다.
                            </p>
                        )}
                    </div>

                    <div className="text-[10px] text-discord-text-muted leading-relaxed">
                        <p>• API 키는 이 기기의 브라우저에만 저장되며 외부로 전송되지 않습니다.</p>
                        <p>• 모델을 변경하면 다음 AI 요청부터 적용됩니다.</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#202225]">
                    <div>
                        {apiKey && (
                            <Button
                                variant="danger"
                                size="sm"
                                icon={Trash2}
                                onClick={handleClear}
                            >
                                키 삭제
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={closeKeyModal}>
                            취소
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleValidate}
                            disabled={isKeyChecking || (!inputKey.trim())}
                            icon={isKeyChecking ? Loader2 : Key}
                        >
                            {isKeyChecking ? '확인 중...' : '키 확인'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ApiKeyModal;
