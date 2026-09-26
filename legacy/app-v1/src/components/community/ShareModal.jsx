import React, { useState } from 'react';
import { Share2, Copy, CheckCircle, Loader2, Tag } from 'lucide-react';
import useCommunityStore from '../../store/communityStore';
import useNodeStore from '../../store/nodeStore';
import useProjectStore from '../../store/projectStore';
import { uploadBlueprint, isFirebaseReady } from '../../api/firebase';
import Button from '../ui/Button';

/**
 * ShareModal - 청사진 공유 모달
 */
function ShareModal() {
    const { showShareModal, closeShareModal, openFirebaseSetup, setLastShareResult, addMyUpload } = useCommunityStore();
    const { getSerializableState } = useNodeStore();
    const { projectName } = useProjectStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [author, setAuthor] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [copiedField, setCopiedField] = useState('');

    if (!showShareModal) return null;

    // Firebase 미설정 시
    if (!isFirebaseReady()) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={(e) => e.target === e.currentTarget && closeShareModal()}>
                <div className="max-w-sm w-full bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up p-6 text-center">
                    <Share2 size={32} className="text-discord-text-muted mx-auto mb-3" />
                    <h3 className="text-[14px] font-bold text-discord-header-primary mb-1">Firebase 설정 필요</h3>
                    <p className="text-[12px] text-discord-text-muted mb-4">청사진을 공유하려면 먼저 Firebase를 설정해야 합니다.</p>
                    <div className="flex gap-2 justify-center">
                        <Button variant="secondary" size="sm" onClick={closeShareModal}>취소</Button>
                        <Button variant="primary" size="sm" onClick={() => { closeShareModal(); openFirebaseSetup(); }}>Firebase 설정</Button>
                    </div>
                </div>
            </div>
        );
    }

    const handleAddTag = () => {
        const t = tagInput.trim().toLowerCase();
        if (t && !tags.includes(t) && tags.length < 5) {
            setTags([...tags, t]);
            setTagInput('');
        }
    };

    const handleUpload = async () => {
        if (!name.trim()) return;
        setIsUploading(true);

        try {
            const canvasData = getSerializableState();
            const ids = await uploadBlueprint({
                name: name.trim(),
                description: description.trim(),
                author: author.trim() || 'Anonymous',
                canvasData,
                tags,
            });

            setResult(ids);
            setLastShareResult(ids);
            addMyUpload({ readId: ids.readId, editId: ids.editId, name: name.trim(), date: Date.now() });
        } catch (err) {
            setResult({ error: err.message });
        }

        setIsUploading(false);
    };

    const handleCopy = async (text, field) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(''), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={(e) => e.target === e.currentTarget && closeShareModal()}>
            <div className="max-w-md w-full bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#202225]">
                    <Share2 size={18} strokeWidth={2} className="text-discord-blurple" />
                    <h2 className="text-[15px] font-bold text-discord-header-primary">청사진 공유</h2>
                </div>

                {result && !result.error ? (
                    /* ── 공유 성공 ── */
                    <div className="px-5 py-6 space-y-4">
                        <div className="text-center">
                            <CheckCircle size={36} className="text-discord-green mx-auto mb-2" />
                            <h3 className="text-[14px] font-bold text-discord-header-primary">공유 완료!</h3>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">Read ID (공유용)</label>
                                <div className="flex gap-2">
                                    <input readOnly value={result.readId} className="flex-1 h-8 px-2.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] font-mono text-discord-text-normal" />
                                    <Button variant="ghost" size="sm" icon={copiedField === 'read' ? CheckCircle : Copy} onClick={() => handleCopy(result.readId, 'read')} />
                                </div>
                                <p className="text-[10px] text-discord-text-muted mt-0.5">이 ID를 다른 사용자에게 공유하세요.</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-discord-red uppercase tracking-wider mb-1">Edit ID (수정/삭제용) ⚠️</label>
                                <div className="flex gap-2">
                                    <input readOnly value={result.editId} className="flex-1 h-8 px-2.5 bg-discord-bg-tertiary border border-discord-red/30 rounded-sm-discord text-[12px] font-mono text-discord-text-normal" />
                                    <Button variant="ghost" size="sm" icon={copiedField === 'edit' ? CheckCircle : Copy} onClick={() => handleCopy(result.editId, 'edit')} />
                                </div>
                                <p className="text-[10px] text-discord-red/80 mt-0.5">이 ID는 안전하게 보관하세요. 분실 시 수정/삭제가 불가합니다.</p>
                            </div>
                        </div>

                        <Button variant="secondary" size="sm" onClick={closeShareModal} className="w-full">닫기</Button>
                    </div>
                ) : (
                    /* ── 공유 폼 ── */
                    <div className="px-5 py-4 space-y-3">
                        {result?.error && (
                            <div className="text-[11px] text-discord-red bg-discord-red/10 px-3 py-2 rounded-sm-discord">오류: {result.error}</div>
                        )}

                        <div>
                            <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">청사진 이름 <span className="text-discord-red">*</span></label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={projectName || 'My Bot Blueprint'}
                                className="w-full h-8 px-2.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] text-discord-text-normal placeholder-discord-text-muted focus:outline-none focus:border-discord-blurple transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">설명</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="이 봇이 무엇을 하는지 설명해주세요..."
                                rows={2}
                                className="w-full px-2.5 py-1.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] text-discord-text-normal placeholder-discord-text-muted focus:outline-none focus:border-discord-blurple resize-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">작성자</label>
                            <input
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Anonymous"
                                className="w-full h-8 px-2.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] text-discord-text-normal placeholder-discord-text-muted focus:outline-none focus:border-discord-blurple transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">태그 (최대 5개)</label>
                            <div className="flex gap-2">
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                    placeholder="태그 입력 후 Enter"
                                    className="flex-1 h-8 px-2.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] text-discord-text-normal placeholder-discord-text-muted focus:outline-none focus:border-discord-blurple transition-colors"
                                />
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {tags.map((t) => (
                                        <span
                                            key={t}
                                            onClick={() => setTags(tags.filter((x) => x !== t))}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-discord-blurple/20 text-discord-blurple text-[10px] rounded-sm-discord cursor-pointer hover:bg-discord-blurple/30 transition-colors"
                                        >
                                            <Tag size={9} /> {t} ×
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#202225]">
                            <Button variant="secondary" size="sm" onClick={closeShareModal}>취소</Button>
                            <Button variant="primary" size="sm" icon={isUploading ? Loader2 : Share2} onClick={handleUpload} disabled={isUploading || !name.trim()}>
                                {isUploading ? '업로드 중...' : '공유'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ShareModal;
