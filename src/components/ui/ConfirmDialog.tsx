import React, { useEffect } from 'react';
import { Button } from './Button';
import { Card } from './Card';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-[440px]">
        <Card padding="24" className="w-full bg-card shadow-card">
          <h2 id="confirm-dialog-title" className="text-[20px] font-semibold text-text mb-2">
            {title}
          </h2>
          <p className="text-[16px] text-text-muted leading-relaxed mb-6">
            {message}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="kader"
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
            <Button
              variant="secondary"
              size="kader"
              disabled={loading}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
