import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  variant?: 'default' | 'selected' | 'alert-red' | 'warning-yellow' | 'success-green';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  selected = false,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  // Base requirement: Cards white, radius 24px, soft shadow
  const baseStyles = 'rounded-card transition-all duration-200';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  // Determine variant style
  const effectiveVariant = selected ? 'selected' : variant;

  const variantStyles = {
    // Standard white card
    default: 'bg-white border border-slate-100 shadow-soft text-slate-800',
    // Selected state: #F9E9ED
    selected: 'bg-berry-light border-2 border-berry shadow-soft text-slate-900',
    // Critical alert red: full red background #E5383B
    'alert-red': 'bg-status-red text-white shadow-alert border-none',
    // Warning yellow
    'warning-yellow': 'bg-amber-50 border-2 border-status-yellow text-slate-900',
    // Success green
    'success-green': 'bg-emerald-50 border-2 border-status-green text-slate-900',
  };

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${variantStyles[effectiveVariant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
