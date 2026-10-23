import React from 'react';
import { CircleCheck, TriangleAlert, OctagonAlert } from 'lucide-react';
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

  // Sizes: full pill, minimum 16px text on kader screens
  const sizeStyles = {
    sm: 'text-[14px] px-3 py-1 gap-1.5 font-semibold', // dashboard compact
    md: 'text-[16px] px-4 py-2 gap-2 font-bold', // standard kader
    lg: 'text-[18px] px-5 py-2.5 gap-2.5 font-bold',
  };

  const iconSizes = {
    sm: 18,
    md: 20,
    lg: 24,
  };

  const iconSize = iconSizes[size];

  // Fixed icon mapping:
  // hijau = CircleCheck, kuning = TriangleAlert, merah = OctagonAlert
  const statusStyles: Record<StatusGizi, { container: string; icon: React.ReactNode }> = {
    hijau: {
      container: 'bg-green-light text-green border border-green/30',
      icon: (
        <CircleCheck
          size={iconSize}
          strokeWidth={2}
          className="text-green flex-shrink-0"
          aria-hidden="true"
        />
      ),
    },
    kuning: {
      container: 'bg-yellow-light text-[#9A6F00] border border-yellow/40',
      icon: (
        <TriangleAlert
          size={iconSize}
          strokeWidth={2}
          className="text-yellow flex-shrink-0"
          aria-hidden="true"
        />
      ),
    },
    merah: {
      container: 'bg-red-light text-red border border-red/40',
      icon: (
        <OctagonAlert
          size={iconSize}
          strokeWidth={2}
          className="text-red flex-shrink-0"
          aria-hidden="true"
        />
      ),
    },
  };

  const current = statusStyles[status];

  return (
    <span
      role="status"
      className={`inline-flex items-center rounded-full ${sizeStyles[size]} ${current.container} ${className}`}
    >
      {showIcon && current.icon}
      <span>{displayText}</span>
    </span>
  );
};
