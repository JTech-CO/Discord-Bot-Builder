import React from 'react';

/**
 * Toggle - 커스텀 토글 스위치
 */
function Toggle({ checked, onChange, label, disabled = false }) {
    return (
        <label className={`inline-flex items-center gap-2.5 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} no-select`}>
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => !disabled && onChange?.(e.target.checked)}
                    className="sr-only"
                />
                <div className={`
          w-9 h-5 rounded-full transition-colors duration-200
          ${checked ? 'bg-discord-blurple' : 'bg-discord-bg-tertiary border border-[#202225]'}
        `} />
                <div className={`
          absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200 shadow-sm
          ${checked ? 'translate-x-[18px] bg-white' : 'translate-x-0.5 bg-discord-text-muted'}
        `} />
            </div>
            {label && (
                <span className="text-xs text-discord-text-normal">{label}</span>
            )}
        </label>
    );
}

export default Toggle;
