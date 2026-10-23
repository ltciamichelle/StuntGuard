import React from 'react';

export interface BottomActionBarProps {
  children: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  children,
  secondaryAction,
  className = '',
  maxWidth = 'max-w-[480px]',
}) => {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.04)] ${className}`}
    >
      <div
        className={`w-full ${maxWidth} mx-auto px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] flex flex-col gap-2`}
      >
        {secondaryAction && <div className="w-full">{secondaryAction}</div>}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
};
