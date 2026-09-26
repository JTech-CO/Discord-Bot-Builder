import React, { useState, useMemo } from 'react';
import {
    Code2, Download, Copy, CheckCircle, AlertTriangle,
    FileCode2, ChevronDown, Bot,
} from 'lucide-react';
import { generateIR } from '../../lib/transpiler/irGenerator';
import { generatePython } from '../../lib/transpiler/pythonGenerator';
import { generateJavaScript } from '../../lib/transpiler/jsGenerator';
import useProjectStore from '../../store/projectStore';
import useNodeStore from '../../store/nodeStore';
import Button from '../ui/Button';

/**
 * ExportModal - 코드 내보내기 모달
 * 
 * IR 생성 → Python / JS 코드 생성 → 프리뷰 + 다운로드
 * 봇 그룹이 2개 이상이면 개별 봇 선택 가능
 */
function ExportModal({ isOpen, onClose }) {
    const { targetLanguage, setTargetLanguage } = useProjectStore();
    const [copied, setCopied] = useState(false);
    const [selectedBotId, setSelectedBotId] = useState('__all__');
    const botGroups = useNodeStore((s) => s.botGroups);

    const result = useMemo(() => {
        if (!isOpen) return null;
        try {
            // 봇 그룹 필터링
            let filterNodeIds = null;
            if (selectedBotId !== '__all__' && botGroups.length >= 2) {
                const group = botGroups.find((g) => g.id === selectedBotId);
                if (group) filterNodeIds = group.nodeIds;
            }

            const ir = generateIR(filterNodeIds);
            const code = targetLanguage === 'python'
                ? generatePython(ir)
                : generateJavaScript(ir);
            return { code, warnings: ir.warnings, error: null };
        } catch (err) {
            return { code: '', warnings: [], error: err.message };
        }
    }, [isOpen, targetLanguage, selectedBotId, botGroups]);

    // 모달 열릴 때 선택 초기화
    useMemo(() => {
        if (isOpen) {
            setSelectedBotId(botGroups.length >= 2 ? '__all__' : '__all__');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopy = async () => {
        if (!result?.code) return;
        await navigator.clipboard.writeText(result.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const selectedGroup = botGroups.find((g) => g.id === selectedBotId);
    const botLabel = selectedGroup ? selectedGroup.label : '전체';

    const handleDownload = () => {
        if (!result?.code) return;
        const ext = targetLanguage === 'python' ? 'py' : 'js';
        const safeName = botLabel.replace(/[^가-힣a-zA-Z0-9]/g, '_');
        const filename = targetLanguage === 'python'
            ? `${safeName}.py`
            : `${safeName}.js`;
        const blob = new Blob([result.code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const lineCount = result?.code?.split('\n').length || 0;
    const hasMultipleBots = botGroups.length >= 2;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="max-w-3xl w-full mx-4 bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#202225]">
                    <div className="flex items-center gap-3">
                        <Code2 size={18} strokeWidth={2} className="text-discord-blurple" />
                        <h2 className="text-[15px] font-bold text-discord-header-primary">
                            Export Code
                        </h2>
                    </div>

                    {/* Selectors */}
                    <div className="flex items-center gap-2">
                        {/* Bot Selector (2개 이상일 때만) */}
                        {hasMultipleBots && (
                            <div className="relative">
                                <select
                                    value={selectedBotId}
                                    onChange={(e) => setSelectedBotId(e.target.value)}
                                    className="
                                        appearance-none h-8 pl-3 pr-8
                                        bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord
                                        text-[12px] font-semibold text-discord-text-normal
                                        focus:outline-none focus:border-discord-blurple cursor-pointer
                                    "
                                >
                                    <option value="__all__">📦 전체 통합 코드</option>
                                    {botGroups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            🤖 {g.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-discord-text-muted pointer-events-none" />
                            </div>
                        )}

                        {/* Language Selector */}
                        <div className="relative">
                            <select
                                value={targetLanguage}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                                className="
                                    appearance-none h-8 pl-3 pr-8
                                    bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord
                                    text-[12px] font-semibold text-discord-text-normal
                                    focus:outline-none focus:border-discord-blurple cursor-pointer
                                "
                            >
                                <option value="python">🐍 Python (discord.py)</option>
                                <option value="javascript">📦 JavaScript (discord.js)</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-discord-text-muted pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Bot indicator (선택된 봇 정보) */}
                {hasMultipleBots && selectedBotId !== '__all__' && selectedGroup && (
                    <div className="px-5 py-2 border-b border-[#202225] bg-discord-bg-secondary flex items-center gap-2">
                        <Bot size={13} className="text-discord-blurple" />
                        <span className="text-[12px] font-semibold text-discord-text-normal">
                            {selectedGroup.label}
                        </span>
                        <span className="text-[11px] text-discord-text-muted">
                            • {selectedGroup.nodeIds.length}개 노드
                        </span>
                    </div>
                )}

                {/* Warnings */}
                {result?.warnings?.length > 0 && (
                    <div className="px-5 py-2 border-b border-[#202225] bg-[#faa61a10]">
                        {result.warnings.map((w, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-[#FAA61A]">
                                <AlertTriangle size={11} strokeWidth={2} />
                                {w}
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {result?.error && (
                    <div className="px-5 py-3 bg-[#ed424520] text-[12px] text-discord-red">
                        오류: {result.error}
                    </div>
                )}

                {/* Code Preview */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-5 py-2 bg-discord-bg-secondary border-b border-[#202225]">
                        <div className="flex items-center gap-2 text-[11px] text-discord-text-muted">
                            <FileCode2 size={12} />
                            {targetLanguage === 'python'
                                ? (selectedGroup ? `${botLabel}.py` : 'main.py')
                                : (selectedGroup ? `${botLabel}.js` : 'index.js')
                            }
                            <span className="text-discord-text-muted">• {lineCount} lines</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <pre className="px-5 py-3 text-[12px] leading-5 font-mono text-discord-text-normal whitespace-pre overflow-x-auto">
                            {result?.code || '// No code generated'}
                        </pre>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#202225]">
                    <span className="text-[11px] text-discord-text-muted">
                        {targetLanguage === 'python' ? 'discord.py 2.0+' : 'discord.js v14+'}
                        {' • '}
                        {targetLanguage === 'python' ? 'pip install discord.py python-dotenv' : 'npm install discord.js dotenv'}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={onClose}>
                            닫기
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={copied ? CheckCircle : Copy}
                            onClick={handleCopy}
                        >
                            {copied ? '복사됨!' : '복사'}
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={Download}
                            onClick={handleDownload}
                        >
                            다운로드
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExportModal;
