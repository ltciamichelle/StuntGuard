import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'critical' | 'alert-white' | 'danger' | 'alert-red';
  size?: 'kader' | 'pengasuh' | 'ibu' | 'compact';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'kader',
  fullWidth = true,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  // Base styling: full pill shape, accessible touch target, clear focus ring
  const baseStyles =
    'rounded-full font-bold inline-flex items-center justify-center transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

  // Strict sizes based on specifications
  const sizeStyles = {
    kader: 'min-h-[56px] h-14 px-6 text-[16px] gap-2', // 56px high, 16px text, 8px (gap-2)
    pengasuh: 'min-h-[54px] h-[54px] px-6 text-[16px] gap-2', // 54px high
    ibu: 'min-h-[54px] h-[54px] px-6 text-[16px] gap-2', // 54px high (alias)
    compact: 'min-h-[44px] h-11 px-4 text-[14px] gap-2', // 44px high (dashboard only)
  };

  const variantStyles = {
    // Primary: maroon fill (#A72449)
    primary: 'bg-primary hover:bg-[#8E1F3E] text-white shadow-soft active:bg-[#7A1733]',
    // Secondary: white fill, teal border and text (#44636D)
    secondary: 'bg-white text-teal border-2 border-teal hover:bg-slate-50 active:bg-slate-100',
    // Ghost: text only
    ghost: 'bg-transparent text-text hover:bg-slate-100 active:bg-slate-200',
    // Critical: white button on red background (#E5383B), for red alerts
    critical: 'bg-white text-red border-2 border-white shadow-soft hover:bg-red-50 active:bg-red-100',
    // Aliases for backwards compatibility
    'alert-white': 'bg-white text-red border-2 border-white shadow-soft hover:bg-red-50 active:bg-red-100',
    'alert-red': 'bg-red text-white hover:bg-[#c92f32] shadow-soft',
    danger: 'bg-red text-white hover:bg-[#c92f32] shadow-soft',
  };

  const widthStyle = fullWidth ? 'w-full' : 'w-auto';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0 inline-flex items-center" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="truncate">{children}</span>
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0 inline-flex items-center" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
};
