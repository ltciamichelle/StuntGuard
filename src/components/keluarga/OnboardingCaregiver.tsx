'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { ChevronRight, Sparkles } from 'lucide-react';

interface OnboardingCaregiverProps {
  onComplete: () => void;
}

export function OnboardingCaregiver({ onComplete }: OnboardingCaregiverProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sg_keluarga_onboarding_done', 'true');
    }
    onComplete();
  };

  const screens = [
    {
      title: 'Pantau tumbuh kembang anak dengan mudah',
      description:
        'Lihat riwayat tinggi dan berat badan anak langsung dari pencatatan resmi Posyandu secara berkala.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="88" fill="#FDF2F4" stroke="#FCE7EC" strokeWidth="4" />
          {/* Growth Chart / Ruler Graphic */}
          <rect x="55" y="60" width="22" height="85" rx="6" fill="#44636D" />
          <line x1="62" y1="75" x2="72" y2="75" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="62" y1="90" x2="69" y2="90" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="62" y1="105" x2="72" y2="105" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="62" y1="120" x2="69" y2="120" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="62" y1="135" x2="72" y2="135" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          {/* Child figure */}
          <circle cx="125" cy="78" r="20" fill="#A72449" />
          <path d="M102 145 C102 112 148 112 148 145 Z" fill="#A72449" opacity="0.9" />
          {/* Cheerful details */}
          <circle cx="120" cy="76" r="2.5" fill="#FFFFFF" />
          <circle cx="130" cy="76" r="2.5" fill="#FFFFFF" />
          <path d="M121 84 Q125 88 129 84" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <circle cx="156" cy="62" r="8" fill="#FACC15" />
          <path d="M156 56 L156 68 M150 62 L162 62" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: 'Catat makanan anak, kumpulkan poin kebiasaan baik',
      description:
        'Pantau asupan gizi seimbang harian dan bangun kebiasaan sehat keluarga bersama pendamping Posyandu.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="88" fill="#F0FDF4" stroke="#DCFCE7" strokeWidth="4" />
          {/* Plate / Food Bowl */}
          <ellipse cx="100" cy="120" rx="58" ry="24" fill="#E2E8F0" />
          <ellipse cx="100" cy="115" rx="50" ry="20" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          {/* Healthy food items */}
          <circle cx="85" cy="110" r="14" fill="#22C55E" />
          <circle cx="112" cy="108" r="16" fill="#F97316" />
          <circle cx="98" cy="118" r="12" fill="#EAB308" />
          {/* Star badge */}
          <circle cx="135" cy="65" r="20" fill="#FDE047" stroke="#EAB308" strokeWidth="3" />
          <polygon
            points="135,53 139,62 149,63 141,70 144,79 135,74 126,79 129,70 121,63 131,62"
            fill="#CA8A04"
          />
        </svg>
      ),
    },
    {
      title: 'Dapatkan pengingat dan saran yang sesuai usia anak',
      description:
        'Pengingat jadwal Posyandu berikutnya, vitamin, imunisasi, dan anjuran makanan bergizi tepat waktu.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="88" fill="#EFF6FF" stroke="#DBEAFE" strokeWidth="4" />
          {/* Calendar sheet */}
          <rect x="60" y="55" width="80" height="90" rx="14" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="3" />
          <path d="M60 55 H140 V82 H60 Z" fill="#3B82F6" />
          <circle cx="80" cy="68" r="4" fill="#FFFFFF" />
          <circle cx="120" cy="68" r="4" fill="#FFFFFF" />
          {/* Date dots */}
          <circle cx="80" cy="100" r="5" fill="#BFDBFE" />
          <circle cx="100" cy="100" r="5" fill="#BFDBFE" />
          <circle cx="120" cy="100" r="5" fill="#BFDBFE" />
          <circle cx="80" cy="120" r="5" fill="#BFDBFE" />
          <circle cx="100" cy="120" r="7" fill="#EF4444" />
          <circle cx="120" cy="120" r="5" fill="#BFDBFE" />
          {/* Bell reminder */}
          <circle cx="145" cy="135" r="18" fill="#FBBF24" />
          <path
            d="M145 125 C141 125 137 129 137 134 C137 138 135 140 134 141 H156 C155 140 153 138 153 134 C153 129 149 125 145 125 Z"
            fill="#FFFFFF"
          />
          <circle cx="145" cy="144" r="2.5" fill="#FFFFFF" />
        </svg>
      ),
    },
  ];

  const current = screens[step];

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col justify-between max-w-[480px] mx-auto w-full select-none">
      {/* Top Bar with Skip Button */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-bold text-teal uppercase tracking-wider">
          Panduan Pengasuh
        </span>
        <button
          type="button"
          onClick={handleFinish}
          className="text-[16px] font-semibold text-text-muted hover:text-primary px-3 py-2 rounded-xl transition-colors cursor-pointer"
        >
          Lewati
        </button>
      </div>

      {/* Main Slide Content */}
      <div className="my-auto py-6 text-center flex flex-col items-center">
        <div className="mb-6">{current.illustration}</div>

        <h2 className="text-[24px] font-extrabold text-text leading-tight mb-3 px-2">
          {current.title}
        </h2>

        <p className="text-[16px] text-text-muted leading-relaxed max-w-sm px-2">
          {current.description}
        </p>

        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-2 mt-8" aria-label={`Langkah ${step + 1} dari 3`}>
          {screens.map((_, idx) => (
            <span
              key={idx}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === step ? 'w-8 bg-primary' : 'w-2.5 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Action: 54px Min Height Buttons */}
      <div className="space-y-3 pt-4">
        <Button
          variant="primary"
          size="kader"
          onClick={handleNext}
          className="min-h-[54px] text-[17px] font-bold shadow-soft"
          icon={step === 2 ? <Sparkles size={20} /> : <ChevronRight size={20} />}
        >
          {step === 2 ? 'Mulai Sekarang' : 'Lanjut'}
        </Button>

        {step < 2 && (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full min-h-[48px] text-[16px] font-bold text-text-muted hover:text-text transition-colors flex items-center justify-center cursor-pointer"
          >
            Lewati pengenalan
          </button>
        )}
      </div>
    </div>
  );
}
