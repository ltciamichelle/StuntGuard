import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  variant?: 'default' | 'selected' | 'alert-red' | 'warning-yellow' | 'success-green';
  padding?: 'none' | '12' | '16' | '20' | '24' | '32' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Card: React.FC<CardProps> = ({
  children,
  selected = false,
  variant = 'default',
  padding = '24',
  className = '',
  ...props
}) => {
  // Radius: 24px, Shadow: soft shadow, Border: #E4E7EB
  const baseStyles = 'rounded-[24px] transition-all duration-200 overflow-hidden';

  // Spacing scale: 4, 8, 12, 16, 20, 24, 32
  const paddingStyles: Record<string, string> = {
    none: 'p-0',
    '12': 'p-3',
    '16': 'p-4',
    '20': 'p-5',
    '24': 'p-6',
    '32': 'p-8',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-6',
  };

  const effectiveVariant = selected ? 'selected' : variant;

  const variantStyles = {
    // Standard white card: #FFFFFF, border #E4E7EB, soft shadow
    default: 'bg-card border border-border shadow-card text-text',
    // Selected state: #F9E9ED, border #A72449
    selected: 'bg-primary-selected border-2 border-primary shadow-card text-text',
    // Critical alert red: full red background #E5383B
    'alert-red': 'bg-red text-white shadow-alert border-none',
    // Warning yellow: #FEF9C3, border #F2B705
    'warning-yellow': 'bg-yellow-light border-2 border-yellow text-text',
    // Success green: #DCFCE7, border #22C55E
    'success-green': 'bg-green-light border-2 border-green text-text',
  };

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding] || 'p-6'} ${variantStyles[effectiveVariant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
