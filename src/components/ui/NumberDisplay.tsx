import React from 'react';

export interface NumberDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  helper?: string;
  size?: 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'red' | 'yellow' | 'green';
  className?: string;
}

export const NumberDisplay: React.FC<NumberDisplayProps> = ({
  label,
  value,
  unit,
  helper,
  size = 'lg',
  variant = 'default',
  className = '',
}) => {
  // Metric numbers: 24px or larger Bold
  const sizeStyles = {
    md: 'text-[24px]',
    lg: 'text-[32px]',
    xl: 'text-[40px]',
  };

  const variantStyles = {
    default: 'text-text',
    primary: 'text-primary',
    red: 'text-red',
    yellow: 'text-[#9A6F00]',
    green: 'text-green',
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[16px] font-medium text-text-muted">{label}</span>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`font-bold leading-none tracking-tight ${sizeStyles[size]} ${variantStyles[variant]}`}>
          {value}
        </span>
        {unit && (
          <span className="text-[16px] font-semibold text-text-muted">{unit}</span>
        )}
      </div>
      {helper && <span className="text-[16px] text-text-muted">{helper}</span>}
    </div>
  );
};
