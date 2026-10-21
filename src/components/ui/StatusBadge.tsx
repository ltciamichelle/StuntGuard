import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { StatusGizi } from '@/types/database';

export interface StatusBadgeProps {
  status: StatusGizi;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  // CRITICAL RULE: "Color is never the only signal. Always add an icon and a text label with every status."
  const defaultLabels: Record<StatusGizi, string> = {
    hijau: 'Normal',
    kuning: 'Waspada (Gagal Tumbuh)',
    merah: 'Indikasi Stunting (Kritis)',
  };

  const displayText = label || defaultLabels[status];

  const sizeStyles = {
    sm: 'text-[13px] px-3 py-1 gap-1.5 font-semibold',
    md: 'text-[15px] px-4 py-1.5 gap-2 font-bold',
    lg: 'text-[17px] px-5 py-2.5 gap-2.5 font-bold',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const statusStyles: Record<StatusGizi, { container: string; icon: React.ReactNode }> = {
    hijau: {
      container: 'bg-emerald-50 text-emerald-800 border border-status-green/30',
      icon: <CheckCircle2 size={iconSizes[size]} className="text-status-green flex-shrink-0" />,
    },
    kuning: {
      container: 'bg-amber-50 text-amber-900 border border-status-yellow/40',
      icon: <AlertTriangle size={iconSizes[size]} className="text-status-yellow flex-shrink-0" />,
    },
    merah: {
      container: 'bg-red-50 text-red-900 border border-status-red/40',
      icon: <AlertOctagon size={iconSizes[size]} className="text-status-red flex-shrink-0" />,
    },
  };

  const current = statusStyles[status];

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeStyles[size]} ${current.container} ${className}`}
    >
      {showIcon && current.icon}
      <span>{displayText}</span>
    </span>
  );
};
