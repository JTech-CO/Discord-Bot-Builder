import React, { forwardRef } from 'react';

/**
 * Input - Dark Theme 인풋 필드
 */
const Input = forwardRef(function Input({
    label,
    helper,
    error,
    icon: Icon,
    className = '',
    ...props
}, ref) {
    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-[11px] font-semibold text-discord-text-muted uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <Icon
                        size={14}
                        strokeWidth={1.5}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-text-muted pointer-events-none"
                    />
                )}
                <input
                    ref={ref}
                    className={`
            w-full h-9 px-3 ${Icon ? 'pl-9' : ''}
            bg-discord-bg-tertiary border rounded-sm-discord
            text-[13px] text-discord-text-normal placeholder-discord-text-muted
            transition-colors duration-150
            focus:outline-none focus:border-discord-blurple
            ${error ? 'border-discord-red' : 'border-[#202225]'}
            ${className}
          `}
                    {...props}
                />
            </div>
            {error && <p className="text-[11px] text-discord-red">{error}</p>}
            {helper && !error && <p className="text-[11px] text-discord-text-muted">{helper}</p>}
        </div>
    );
});

export default Input;
