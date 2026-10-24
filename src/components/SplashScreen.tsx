'use client';

import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  /**
   * Optional callback when splash screen finishes and unmounts
   */
  onFinish?: () => void;
  /**
   * Minimum display duration in milliseconds before fade out begins
   * Default: 1200ms
   */
  minDurationMs?: number;
}

export function SplashScreen({
  onFinish,
  minDurationMs = 1200,
}: SplashScreenProps) {
  const [mounted, setMounted] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade out after minDurationMs
    const timerFade = setTimeout(() => {
      setIsFading(true);
    }, minDurationMs);

    // Completely unmount after fade animation completes (500ms transition)
    const timerUnmount = setTimeout(() => {
      setMounted(false);
      if (onFinish) onFinish();
    }, minDurationMs + 500);

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
    }, 200);
  };

  if (!mounted) return null;

  return (
    <div
      id="stuntguard-splash-screen"
      role="status"
      aria-label="StuntGuard"
      onClick={handleQuickDismiss}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-white transition-opacity duration-500 ease-out select-none cursor-pointer ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <div className="flex flex-col items-center justify-center p-6 animate-splash-logo">
        <img
          src="/logo.png"
          alt="StuntGuard Logo"
          className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain"
        />
      </div>
    </div>
  );
}
