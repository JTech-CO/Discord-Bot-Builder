import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Modal - 전역 모달 컴포넌트
 * 
 * ESC 키, 바깥 클릭으로 닫기 지원
 */
function Modal({ isOpen, onClose, title, children, width = 'max-w-lg' }) {
    const overlayRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
        >
            <div className={`${width} w-full bg-discord-bg-primary border border-[#202225] rounded-md-discord shadow-2xl animate-slide-up`}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#202225]">
                    <h2 className="text-sm font-semibold text-discord-header-primary">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-sm-discord text-discord-text-muted hover:text-discord-text-normal hover:bg-discord-bg-tertiary transition-colors"
                    >
                        <X size={16} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Modal;
