import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center py-8 px-4 rounded-[24px] bg-white border border-border ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-text-muted mb-4">
        {icon}
      </div>
      <p className="text-[16px] font-medium text-text-muted max-w-sm mb-6 leading-relaxed">
        {message}
      </p>
      {actionLabel && onAction && (
        <div className="w-full max-w-xs">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
