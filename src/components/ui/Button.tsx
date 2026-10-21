import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'alert-white' | 'danger' | 'ghost';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = true,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  // Base styling: full pill shape, minimum height 56px, high contrast, text at least 16px
  const baseStyles = 'min-h-[56px] px-6 rounded-full font-bold text-[16px] inline-flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variantStyles = {
    // Primary action: Berry Maroon #A72449
    primary: 'bg-berry hover:bg-berry-hover text-white shadow-md active:bg-berry-dark',
    // Secondary: White card with slate border
    secondary: 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    // Red alert state requirement: "Red alert uses a full red background, an alert icon, and a white button."
    'alert-white': 'bg-white text-status-red hover:bg-red-50 border-2 border-white shadow-lg active:bg-red-100',
    // Danger
    danger: 'bg-status-red text-white hover:bg-red-700 shadow-md',
    // Ghost
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  };

  const widthStyle = fullWidth ? 'w-full' : 'w-auto';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
