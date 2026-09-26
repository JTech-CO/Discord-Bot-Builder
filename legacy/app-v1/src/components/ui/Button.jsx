import React from 'react';

/**
 * Button - Industrial Design 버튼
 * 
 * @param {'primary' | 'secondary' | 'danger' | 'ghost'} variant
 * @param {'sm' | 'md' | 'lg'} size
 */
function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    disabled = false,
    className = '',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 no-select rounded-sm-discord focus:outline-none';

    const variants = {
        primary: 'bg-discord-blurple hover:bg-[#4752C4] active:bg-[#3C45A5] text-white',
        secondary: 'bg-discord-bg-tertiary hover:bg-[#2a2c31] active:bg-[#1e1f23] text-discord-text-normal border border-[#202225]',
        danger: 'bg-discord-red hover:bg-[#c03537] active:bg-[#a12d2f] text-white',
        ghost: 'bg-transparent hover:bg-discord-bg-tertiary text-discord-text-muted hover:text-discord-text-normal',
        success: 'bg-discord-green hover:bg-[#2d8f49] active:bg-[#267a3e] text-white',
    };

    const sizes = {
        sm: 'h-7 px-2.5 text-xs gap-1.5',
        md: 'h-8 px-3.5 text-[13px] gap-2',
        lg: 'h-10 px-5 text-sm gap-2.5',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
            disabled={disabled}
            {...props}
        >
            {Icon && <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2} />}
            {children}
            {IconRight && <IconRight size={size === 'sm' ? 12 : 14} strokeWidth={2} />}
        </button>
    );
}

export default Button;
