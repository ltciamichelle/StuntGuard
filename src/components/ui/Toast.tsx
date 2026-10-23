import React from 'react';
import { CircleCheck, TriangleAlert, OctagonAlert, X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ToastProps {
  message: string;
  variant?: 'success' | 'warning' | 'error';
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'success',
  onClose,
  className = '',
}) => {
  const variantStyles = {
    success: {
      bg: 'bg-card border-green text-text',
      icon: <CircleCheck size={24} strokeWidth={2} className="text-green flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-card border-yellow text-text',
      icon: <TriangleAlert size={24} strokeWidth={2} className="text-yellow flex-shrink-0" />,
    },
    error: {
      bg: 'bg-card border-red text-text',
      icon: <OctagonAlert size={24} strokeWidth={2} className="text-red flex-shrink-0" />,
    },
  };

  const current = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`fixed top-4 left-4 right-4 max-w-[480px] mx-auto z-50 p-4 rounded-[24px] border-2 shadow-soft flex items-center justify-between gap-3 ${current.bg} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {current.icon}
        <p className="text-[16px] font-semibold text-text leading-snug">{message}</p>
      </div>
      {onClose && (
        <IconButton
          aria-label="Tutup notifikasi"
          icon={<X size={20} strokeWidth={2} />}
          size="compact"
          onClick={onClose}
          className="-mr-1 text-text-muted hover:text-text"
        />
      )}
    </div>
  );
};
