import React from 'react';
import { Cloud, Check } from 'lucide-react';

export const SyncStatusBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-status-green/30 text-emerald-800 text-[13px] font-bold shadow-sm select-none ${className}`}
      title="Status sinkronisasi data dengan server desa"
    >
      <div className="relative flex items-center justify-center">
        <Cloud size={16} className="text-status-green" />
        <Check size={8} className="text-emerald-900 absolute -bottom-0.5 -right-0.5 font-extrabold" />
      </div>
      <span>Tersinkron</span>
    </div>
  );
};
