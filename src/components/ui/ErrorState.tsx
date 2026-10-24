import React from 'react';
import { TriangleAlert, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  onAction?: () => void | Promise<void>;
  retryLabel?: string;
  actionText?: string;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Gagal memuat data',
  message,
  description,
  onRetry,
  onAction,
  retryLabel = 'Coba lagi',
  actionText,
  secondaryAction,
  className = '',
}) => {
  const displayMessage =
    message ||
    description ||
    'Terjadi kendala saat memuat data dari perangkat atau server. Silakan coba kembali.';
  const handleAction = onRetry || onAction;
  const displayLabel = actionText || retryLabel;

  return (
    <div
      role="alert"
      className={`w-full flex flex-col items-center justify-center text-center py-8 px-4 rounded-[24px] bg-white border border-red/30 shadow-card ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-red-light text-red flex items-center justify-center mb-4">
        <TriangleAlert size={32} strokeWidth={2} />
      </div>
      <h3 className="text-[20px] font-bold text-text mb-1 leading-snug">
        {title}
      </h3>
      <p className="text-[16px] font-medium text-text-muted max-w-sm mb-6 leading-relaxed">
        {displayMessage}
      </p>
      <div className="w-full max-w-xs flex flex-col gap-2">
        {handleAction && (
          <Button
            variant="primary"
            size="kader"
            onClick={handleAction}
            icon={<RotateCcw size={20} strokeWidth={2} />}
          >
            {displayLabel}
          </Button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
};
