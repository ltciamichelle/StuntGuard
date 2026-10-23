import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'card' | 'input' | 'button';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
}) => {
  const variantStyles = {
    rectangular: 'rounded-[16px] h-6 w-full',
    circular: 'rounded-full w-12 h-12',
    card: 'rounded-[24px] h-40 w-full',
    input: 'rounded-[16px] h-14 min-h-[56px] w-full',
    button: 'rounded-full h-14 min-h-[56px] w-full',
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200/80 ${variantStyles[variant]} ${className}`}
    />
  );
};
