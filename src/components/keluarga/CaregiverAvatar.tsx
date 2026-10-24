'use client';

import React from 'react';
import { getAvatarProgress, AvatarStageKey } from '@/lib/avatarConfig';
import { Sparkles, Trophy } from 'lucide-react';

interface CaregiverAvatarProps {
  totalPoints: number;
  className?: string;
}

export function CaregiverAvatar({ totalPoints, className = '' }: CaregiverAvatarProps) {
  const progress = getAvatarProgress(totalPoints);

  const renderStageSvg = (key: AvatarStageKey) => {
    switch (key) {
      case 'tunas':
        return (
          <svg viewBox="0 0 160 160" className="w-36 h-36 mx-auto animate-bounce-subtle" fill="none">
            {/* Soft Warm Soil Mound */}
            <ellipse cx="80" cy="130" rx="55" ry="18" fill="#EADBC8" />
            <ellipse cx="80" cy="126" rx="46" ry="14" fill="#D8C4B6" />

            {/* Little Sprout Body */}
            <path
              d="M80 125 C80 95 72 82 66 76 C76 74 88 84 83 125 Z"
              fill="#4ADE80"
              stroke="#22C55E"
              strokeWidth="2"
            />
            {/* Sprout Leaf Left */}
            <path
              d="M78 86 C64 80 58 66 66 60 C78 62 82 76 78 86 Z"
              fill="#86EFAC"
              stroke="#22C55E"
              strokeWidth="2"
            />
            {/* Little Tender Bud Right */}
            <path
              d="M82 86 C94 82 98 70 92 64 C82 66 78 78 82 86 Z"
              fill="#4ADE80"
              stroke="#16A34A"
              strokeWidth="2"
            />

            {/* Cheerful Friendly Face on the sprout */}
            <circle cx="75" cy="80" r="2.2" fill="#14532D" />
            <circle cx="83" cy="80" r="2.2" fill="#14532D" />
            <path d="M77 84 Q79 87 81 84" stroke="#14532D" strokeWidth="1.6" strokeLinecap="round" />

            {/* Rosy Cheeks */}
            <circle cx="72" cy="83" r="2.5" fill="#FDA4AF" opacity="0.8" />
            <circle cx="86" cy="83" r="2.5" fill="#FDA4AF" opacity="0.8" />
          </svg>
        );

      case 'daun':
        return (
          <svg viewBox="0 0 160 160" className="w-36 h-36 mx-auto animate-bounce-subtle" fill="none">
            {/* Cute Rounded Clay Pot */}
            <ellipse cx="80" cy="138" rx="36" ry="10" fill="#CBD5E1" />
            <path d="M50 110 L56 136 C57 140 103 140 104 136 L110 110 Z" fill="#FDBA74" stroke="#EA580C" strokeWidth="2" />
            <rect x="46" y="104" width="68" height="9" rx="4.5" fill="#FB923C" stroke="#EA580C" strokeWidth="1.5" />

            {/* Stem */}
            <path d="M80 106 C80 84 82 72 80 56" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" />

            {/* Left Leaf with Smile */}
            <path
              d="M80 84 C56 78 48 58 60 48 C76 50 82 70 80 84 Z"
              fill="#4ADE80"
              stroke="#16A34A"
              strokeWidth="2"
            />
            {/* Right Leaf */}
            <path
              d="M80 72 C104 66 112 46 100 38 C84 42 78 60 80 72 Z"
              fill="#86EFAC"
              stroke="#16A34A"
              strokeWidth="2"
            />

            {/* Cheerful Face on the Pot */}
            <circle cx="72" cy="122" r="2.5" fill="#7C2D12" />
            <circle cx="88" cy="122" r="2.5" fill="#7C2D12" />
            <path d="M77 127 Q80 131 83 127" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" />
            <circle cx="68" cy="125" r="2.5" fill="#F87171" opacity="0.8" />
            <circle cx="92" cy="125" r="2.5" fill="#F87171" opacity="0.8" />
          </svg>
        );

      case 'tanaman_kecil':
        return (
          <svg viewBox="0 0 160 160" className="w-36 h-36 mx-auto animate-bounce-subtle" fill="none">
            {/* Colorful Plant Pot */}
            <ellipse cx="80" cy="140" rx="38" ry="10" fill="#CBD5E1" />
            <path d="M48 106 L55 138 C56 142 104 142 105 138 L112 106 Z" fill="#A72449" stroke="#831835" strokeWidth="2" />
            <rect x="44" y="100" width="72" height="9" rx="4.5" fill="#BE2C55" />

            {/* Main Branches */}
            <path d="M80 102 C80 76 74 60 72 44" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M78 80 C88 74 98 68 104 54" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
            <path d="M76 66 C64 58 58 50 54 36" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />

            {/* Multiple Healthy Leaves */}
            <circle cx="72" cy="38" r="14" fill="#4ADE80" stroke="#16A34A" strokeWidth="2" />
            <circle cx="106" cy="50" r="13" fill="#86EFAC" stroke="#16A34A" strokeWidth="2" />
            <circle cx="52" cy="34" r="12" fill="#22C55E" stroke="#15803D" strokeWidth="2" />
            <circle cx="86" cy="62" r="10" fill="#4ADE80" stroke="#16A34A" strokeWidth="1.5" />

            {/* Happy Eyes on Pot */}
            <circle cx="71" cy="120" r="2.8" fill="#FFFFFF" />
            <circle cx="89" cy="120" r="2.8" fill="#FFFFFF" />
            <path d="M76 126 Q80 131 84 126" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="66" cy="122" r="2.8" fill="#FCA5A5" />
            <circle cx="94" cy="122" r="2.8" fill="#FCA5A5" />
          </svg>
        );

      case 'tanaman_besar':
        return (
          <svg viewBox="0 0 160 160" className="w-36 h-36 mx-auto animate-bounce-subtle" fill="none">
            {/* Lush Bushy Foliage */}
            <ellipse cx="80" cy="142" rx="42" ry="10" fill="#CBD5E1" />
            <path d="M46 102 L54 139 C55 143 105 143 106 139 L114 102 Z" fill="#44636D" stroke="#2F474F" strokeWidth="2" />
            <rect x="42" y="96" width="76" height="9" rx="4.5" fill="#557B87" />

            {/* Dense Canopy */}
            <circle cx="80" cy="62" r="28" fill="#22C55E" />
            <circle cx="56" cy="68" r="22" fill="#16A34A" />
            <circle cx="104" cy="68" r="22" fill="#16A34A" />
            <circle cx="68" cy="44" r="20" fill="#4ADE80" />
            <circle cx="94" cy="44" r="20" fill="#86EFAC" />
            <circle cx="80" cy="36" r="18" fill="#4ADE80" />

            {/* Tiny Golden Sparkles */}
            <circle cx="60" cy="46" r="3" fill="#FDE047" />
            <circle cx="102" cy="42" r="3" fill="#FDE047" />
            <circle cx="80" cy="58" r="3" fill="#FDE047" />

            {/* Cheerful Pot Face */}
            <circle cx="71" cy="118" r="2.8" fill="#FFFFFF" />
            <circle cx="89" cy="118" r="2.8" fill="#FFFFFF" />
            <path d="M76 124 Q80 130 84 124" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );

      case 'pohon_berbunga':
      default:
        return (
          <svg viewBox="0 0 160 160" className="w-36 h-36 mx-auto animate-bounce-subtle" fill="none">
            {/* Ground / Grassy Mound */}
            <ellipse cx="80" cy="136" rx="58" ry="16" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="2" />

            {/* Strong Trunk with warm brown */}
            <path d="M72 136 C74 104 68 84 62 76 L80 84 L98 76 C92 84 86 104 88 136 Z" fill="#854D0E" />

            {/* Grand Lush Crown */}
            <circle cx="80" cy="64" r="34" fill="#22C55E" />
            <circle cx="52" cy="70" r="24" fill="#16A34A" />
            <circle cx="108" cy="70" r="24" fill="#16A34A" />
            <circle cx="62" cy="44" r="24" fill="#4ADE80" />
            <circle cx="98" cy="44" r="24" fill="#86EFAC" />
            <circle cx="80" cy="32" r="22" fill="#4ADE80" />

            {/* Cheerful Flowers with Pink & Yellow Centers */}
            <g transform="translate(56, 44)">
              <circle cx="0" cy="0" r="6" fill="#FDA4AF" />
              <circle cx="0" cy="0" r="2.5" fill="#FACC15" />
            </g>
            <g transform="translate(104, 46)">
              <circle cx="0" cy="0" r="6" fill="#FDA4AF" />
              <circle cx="0" cy="0" r="2.5" fill="#FACC15" />
            </g>
            <g transform="translate(80, 26)">
              <circle cx="0" cy="0" r="7" fill="#F472B6" />
              <circle cx="0" cy="0" r="3" fill="#FEF08A" />
            </g>
            <g transform="translate(78, 64)">
              <circle cx="0" cy="0" r="6.5" fill="#F472B6" />
              <circle cx="0" cy="0" r="2.5" fill="#FEF08A" />
            </g>
            <g transform="translate(42, 74)">
              <circle cx="0" cy="0" r="5.5" fill="#FDA4AF" />
              <circle cx="0" cy="0" r="2" fill="#FACC15" />
            </g>
            <g transform="translate(116, 76)">
              <circle cx="0" cy="0" r="5.5" fill="#FDA4AF" />
              <circle cx="0" cy="0" r="2" fill="#FACC15" />
            </g>

            {/* Tree Face */}
            <circle cx="75" cy="112" r="2" fill="#451A03" />
            <circle cx="85" cy="112" r="2" fill="#451A03" />
            <path d="M78 116 Q80 119 82 116" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div className={`p-5 rounded-3xl bg-gradient-to-b from-[#FFF5F7] to-[#FAF8F5] border-2 border-border shadow-card text-center flex flex-col items-center select-none ${className}`}>
      {/* Level & Stage Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-primary/20 text-primary text-[13px] font-bold shadow-xs mb-2">
        <Sparkles size={14} className="text-primary" />
        <span>Tahap {progress.currentStage.stage} • {progress.currentStage.name}</span>
      </div>

      {/* Cheerful SVG Avatar */}
      <div className="py-1">
        {renderStageSvg(progress.currentStage.key)}
      </div>

      {/* Progress Bar & Next Stage Text */}
      <div className="w-full max-w-xs mt-3">
        <div className="flex items-center justify-between text-[13px] font-bold mb-1.5 px-1">
          <span className="text-text-muted flex items-center gap-1">
            <Trophy size={14} className="text-amber-500" />
            {totalPoints} Poin Kebiasaan
          </span>
          {progress.nextStage && (
            <span className="text-teal font-extrabold">
              Target: {progress.nextStage.minPoints}
            </span>
          )}
        </div>

        {/* Bar */}
        <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal to-primary transition-all duration-500"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>

        {/* Remaining Points Text */}
        <p className="text-[14px] font-bold text-text mt-2">
          {progress.progressText}
        </p>
      </div>
    </div>
  );
}
