import React, { useState, useEffect } from 'react';
import {
    Globe, Search, Download, Heart, X, Users, Clock,
    TrendingUp, Loader2, Package, Database, Tag,
} from 'lucide-react';
import useCommunityStore from '../../store/communityStore';
import useNodeStore from '../../store/nodeStore';
import { listBlueprints, getBlueprint, likeBlueprint, isFirebaseReady } from '../../api/firebase';
import Button from '../ui/Button';

/**
 * CommunityBrowser - 커뮤니티 청사진 탐색/로드 패널
 */
function CommunityBrowser() {
    const { showCommunityPanel, closeCommunityPanel, openFirebaseSetup } = useCommunityStore();
    const { loadProject } = useNodeStore();

    const [blueprints, setBlueprints] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sortBy, setSortBy] = useState('downloads');
    const [searchTag, setSearchTag] = useState('');
    const [loadingId, setLoadingId] = useState(null);
    const [loadedMsg, setLoadedMsg] = useState('');

    // ID로 직접 로드
    const [directId, setDirectId] = useState('');

    useEffect(() => {
        if (showCommunityPanel && isFirebaseReady()) {
            fetchBlueprints();
        }
    }, [showCommunityPanel, sortBy]);

    const fetchBlueprints = async () => {
        setIsLoading(true);
        try {
            const list = await listBlueprints({ sortBy, searchTag: searchTag.trim(), maxResults: 20 });
            setBlueprints(list);
        } catch (err) {
            console.warn('[Community]', err.message);
        }
        setIsLoading(false);
    };

    const handleLoad = async (readId) => {
        setLoadingId(readId);
        try {
            const bp = await getBlueprint(readId);
            loadProject(bp.canvas);
            setLoadedMsg(`"${bp.name}" 로드 완료!`);
            setTimeout(() => {
                setLoadedMsg('');
                closeCommunityPanel();
            }, 1500);
        } catch (err) {
            setLoadedMsg(`오류: ${err.message}`);
        }
        setLoadingId(null);
    };

    const handleLike = async (readId) => {
        try {
            await likeBlueprint(readId);
            setBlueprints((prev) =>
                prev.map((bp) => bp.readId === readId ? { ...bp, likes: (bp.likes || 0) + 1 } : bp)
            );
        } catch { }
    };

    const handleDirectLoad = () => {
        const id = directId.trim();
        if (id) handleLoad(id);
    };

    if (!showCommunityPanel) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={(e) => e.target === e.currentTarget && closeCommunityPanel()}>
            <div className="max-w-2xl w-full mx-4 bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#202225]">
                    <div className="flex items-center gap-3">
                        <Globe size={18} strokeWidth={2} className="text-discord-green" />
                        <h2 className="text-[15px] font-bold text-discord-header-primary">Community Blueprints</h2>
                    </div>
                    <button onClick={closeCommunityPanel} className="p-1 rounded-sm text-discord-text-muted hover:text-discord-text-normal transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Firebase 미설정 */}
                {!isFirebaseReady() ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
                        <Database size={36} className="text-discord-text-muted" />
                        <p className="text-[13px] text-discord-header-secondary font-medium">Firebase 설정이 필요합니다</p>
                        <p className="text-[11px] text-discord-text-muted text-center">커뮤니티 청사진을 탐색하려면<br />Firebase를 먼저 설정해주세요.</p>
                        <Button variant="primary" size="sm" onClick={() => { closeCommunityPanel(); openFirebaseSetup(); }}>Firebase 설정</Button>
                    </div>
                ) : (
                    <>
                        {/* Direct Load by ID */}
                        <div className="px-5 py-3 border-b border-[#202225] bg-discord-bg-secondary">
                            <label className="block text-[10px] font-semibold text-discord-text-muted uppercase tracking-wider mb-1">Read ID로 직접 로드</label>
                            <div className="flex gap-2">
                                <input
                                    value={directId}
                                    onChange={(e) => setDirectId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleDirectLoad()}
                                    placeholder="bp_XXXXXXXXXXXX"
                                    className="flex-1 h-8 px-2.5 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[12px] text-discord-text-normal placeholder-discord-text-muted font-mono focus:outline-none focus:border-discord-blurple transition-colors"
                                />
                                <Button variant="primary" size="sm" icon={Download} onClick={handleDirectLoad}>로드</Button>
                            </div>
                        </div>

                        {/* Sort & Filter */}
                        <div className="flex items-center gap-3 px-5 py-2 border-b border-[#202225]">
                            <button
                                onClick={() => setSortBy('downloads')}
                                className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm-discord transition-colors ${sortBy === 'downloads' ? 'text-discord-blurple bg-discord-blurple/10' : 'text-discord-text-muted hover:text-discord-text-normal'}`}
                            >
                                <TrendingUp size={11} /> 인기순
                            </button>
                            <button
                                onClick={() => setSortBy('createdAt')}
                                className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm-discord transition-colors ${sortBy === 'createdAt' ? 'text-discord-blurple bg-discord-blurple/10' : 'text-discord-text-muted hover:text-discord-text-normal'}`}
                            >
                                <Clock size={11} /> 최신순
                            </button>
                            <div className="ml-auto flex items-center gap-1.5">
                                <Search size={12} className="text-discord-text-muted" />
                                <input
                                    value={searchTag}
                                    onChange={(e) => setSearchTag(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchBlueprints()}
                                    placeholder="태그 검색..."
                                    className="w-32 h-7 px-2 bg-discord-bg-tertiary border border-[#202225] rounded-sm-discord text-[11px] text-discord-text-normal placeholder-discord-text-muted focus:outline-none focus:border-discord-blurple transition-colors"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                            {loadedMsg && (
                                <div className="text-[12px] font-medium text-discord-green bg-discord-green/10 px-3 py-2 rounded-sm-discord text-center animate-fade-in">
                                    {loadedMsg}
                                </div>
                            )}

                            {isLoading ? (
                                <div className="flex items-center justify-center py-8 gap-2 text-discord-text-muted">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-[12px]">로딩 중...</span>
                                </div>
                            ) : blueprints.length === 0 ? (
                                <div className="text-center py-8">
                                    <Package size={28} className="text-discord-text-muted mx-auto mb-2" />
                                    <p className="text-[12px] text-discord-text-muted">공유된 청사진이 없습니다.</p>
                                </div>
                            ) : (
                                blueprints.map((bp) => (
                                    <div key={bp.readId} className="flex items-center gap-3 px-3 py-2.5 bg-discord-bg-secondary border border-[#202225] rounded-sm-discord hover:border-discord-blurple/40 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[13px] font-semibold text-discord-header-primary truncate">{bp.name}</span>
                                                <span className="text-[10px] text-discord-text-muted flex-shrink-0">{bp.nodeCount} nodes</span>
                                            </div>
                                            {bp.description && (
                                                <p className="text-[11px] text-discord-text-muted truncate">{bp.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-discord-text-muted flex items-center gap-1"><Users size={9} /> {bp.author}</span>
                                                <span className="text-[10px] text-discord-text-muted flex items-center gap-1"><Download size={9} /> {bp.downloads || 0}</span>
                                                <span className="text-[10px] text-discord-text-muted flex items-center gap-1"><Heart size={9} /> {bp.likes || 0}</span>
                                                {bp.tags?.map((t) => (
                                                    <span key={t} className="text-[9px] text-discord-blurple bg-discord-blurple/10 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"><Tag size={7} />{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => handleLike(bp.readId)} className="p-1.5 rounded-sm text-discord-text-muted hover:text-discord-red transition-colors">
                                                <Heart size={13} />
                                            </button>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                icon={loadingId === bp.readId ? Loader2 : Download}
                                                onClick={() => handleLoad(bp.readId)}
                                                disabled={loadingId === bp.readId}
                                            >
                                                로드
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default CommunityBrowser;
