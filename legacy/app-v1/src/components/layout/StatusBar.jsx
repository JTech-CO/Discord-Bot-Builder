import React from 'react';
import { Plus, Minus, User } from 'lucide-react';
import useUIStore from '../../store/uiStore';

/**
 * StatusBar - 하단 상태바
 * 
 * 좌측: 유저 정보 (아바타 + 이름)
 * 중앙: 줌 컨트롤 [+] 100% [−]
 */
function StatusBar() {
    const { zoomLevel, setZoomLevel } = useUIStore();

    return (
        <div className="h-7 flex items-center justify-between bg-discord-bg-tertiary border-t border-[#202225] px-3 no-select">
            {/* ── Left: User Info ─── */}
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-discord-blurple flex items-center justify-center">
                    <User size={10} strokeWidth={2} className="text-white" />
                </div>
                <span className="text-[11px] text-discord-text-muted">User</span>
            </div>

            {/* ── Center: Zoom Control ─── */}
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => setZoomLevel(zoomLevel - 10)}
                    disabled={zoomLevel <= 10}
                    className="p-0.5 rounded-sm text-discord-text-muted hover:text-discord-text-normal hover:bg-discord-bg-secondary transition-colors disabled:opacity-30"
                >
                    <Minus size={12} strokeWidth={2} />
                </button>
                <span className="text-[11px] font-mono text-discord-text-muted w-10 text-center">
                    {zoomLevel}%
                </span>
                <button
                    onClick={() => setZoomLevel(zoomLevel + 10)}
                    disabled={zoomLevel >= 200}
                    className="p-0.5 rounded-sm text-discord-text-muted hover:text-discord-text-normal hover:bg-discord-bg-secondary transition-colors disabled:opacity-30"
                >
                    <Plus size={12} strokeWidth={2} />
                </button>
            </div>

            {/* ── Right: Spacer ─── */}
            <div className="w-20" />
        </div>
    );
}

export default StatusBar;
