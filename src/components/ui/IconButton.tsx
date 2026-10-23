import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'compact';
}

export const IconButton: React.FC<IconButtonProps> = ({
  'aria-label': ariaLabel,
  icon,
  variant = 'ghost',
  size = 'default',
  disabled,
  className = '',
  ...props
}) => {
  // 48x48px touch area minimum, accessible label required
  const sizeStyles = {
    default: 'w-12 h-12 min-w-[48px] min-h-[48px]',
    compact: 'w-11 h-11 min-w-[44px] min-h-[44px]',
  };

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-[#8E1F3E] active:bg-[#7A1733] shadow-soft',
    secondary: 'bg-white text-teal border border-border hover:bg-slate-50 active:bg-slate-100',
    ghost: 'bg-transparent text-text hover:bg-slate-100 active:bg-slate-200',
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={`rounded-full inline-flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <span className="flex items-center justify-center pointer-events-none" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
};
