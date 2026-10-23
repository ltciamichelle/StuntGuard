import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { IconButton } from './IconButton';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  backHref,
  rightAction,
  className = '',
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header className={`w-full flex items-center justify-between gap-3 py-4 ${className}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showBack && (
          <IconButton
            aria-label="Kembali"
            icon={<ChevronLeft size={24} strokeWidth={2} className="text-text" />}
            onClick={handleBack}
            className="flex-shrink-0 -ml-2"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold leading-tight text-text truncate">{title}</h1>
          {subtitle && (
            <p className="text-[16px] text-text-muted leading-snug mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {rightAction && (
        <div className="flex-shrink-0 flex items-center gap-2">{rightAction}</div>
      )}
    </header>
  );
};
