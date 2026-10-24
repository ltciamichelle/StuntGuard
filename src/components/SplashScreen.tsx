'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  /**
   * Optional callback when splash screen finishes and unmounts
   */
  onFinish?: () => void;
  /**
   * Minimum display duration in milliseconds before fade out begins
   * Default: 1500ms
   */
  minDurationMs?: number;
}

export function SplashScreen({
  onFinish,
  minDurationMs = 1500,
}: SplashScreenProps) {
  const [mounted, setMounted] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade out after minDurationMs
    const timerFade = setTimeout(() => {
      setIsFading(true);
    }, minDurationMs);

    // Completely unmount after fade animation completes (600ms transition)
    const timerUnmount = setTimeout(() => {
      setMounted(false);
      if (onFinish) onFinish();
    }, minDurationMs + 600);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerUnmount);
    };
  }, [minDurationMs, onFinish]);

  // Click or touch to skip immediately
  const handleQuickDismiss = () => {
    setIsFading(true);
    setTimeout(() => {
      setMounted(false);
      if (onFinish) onFinish();
    }, 250);
  };

  if (!mounted) return null;

  return (
    <div
      id="stuntguard-splash-screen"
      role="status"
      aria-label="Memuat aplikasi StuntGuard"
      onClick={handleQuickDismiss}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between px-6 py-10 transition-all duration-700 ease-out select-none cursor-pointer ${
        isFading
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100 pointer-events-auto'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 30%, #A72449 0%, #7A1733 45%, #24353A 100%)',
      }}
    >
      {/* Background ambient light effects */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-[#F2B705]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-[#44636D]/25 blur-3xl pointer-events-none" />

      {/* Top subtle badge */}
      <div className="relative z-10 pt-4 flex flex-col items-center animate-fade-in">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-[12px] font-semibold tracking-wider uppercase shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
          Posyandu ILP Indonesia
        </span>
      </div>

      {/* Center content: Animated Logo and Brand */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto">
        {/* Logo Container with Halo and Floating Effect */}
        <div className="relative flex items-center justify-center animate-splash-float mb-6">
          {/* Outer glowing pulsing halo */}
          <div className="absolute -inset-4 rounded-[40px] bg-white/20 blur-xl animate-splash-pulse-ring" />
          <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-tr from-[#F2B705]/40 to-white/40 blur-sm" />

          {/* Logo Card */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-[28px] bg-white/95 backdrop-blur-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/60 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="StuntGuard Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>
        </div>

        {/* Brand Title */}
        <h1 className="text-[32px] sm:text-[36px] font-black text-white tracking-tight leading-none drop-shadow-md">
          Stunt<span className="text-[#FDE68A]">Guard</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[15px] sm:text-[16px] text-white/90 font-medium max-w-xs mt-3 leading-snug drop-shadow-sm">
          Deteksi Dini & Pencegahan Stunting Balita
        </p>

        {/* Loading Progress Indicator */}
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <div className="w-44 h-1.5 bg-black/25 rounded-full overflow-hidden relative border border-white/10">
            <div className="h-full w-24 bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-splash-shimmer" />
          </div>
          <span className="text-[13px] text-white/70 font-medium tracking-wide">
            Memuat data...
          </span>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="relative z-10 flex flex-col items-center text-center pb-2">
        <p className="text-[12px] text-white/60 font-medium leading-relaxed">
          Kementerian Kesehatan Republik Indonesia
        </p>
        <p className="text-[11px] text-white/40 tracking-wider mt-0.5">
          Standar Antropometri WHO 2006 • Posyandu Digital
        </p>
      </div>
    </div>
  );
}
