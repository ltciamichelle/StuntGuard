'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Utensils, TrendingUp, BookOpen } from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

export function KeluargaTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs: TabItem[] = [
    {
      id: 'tab-beranda',
      label: 'Beranda',
      path: '/keluarga',
      icon: <Home size={22} strokeWidth={2.2} />,
    },
    {
      id: 'tab-catat',
      label: 'Catat',
      path: '/keluarga/catat',
      icon: <Utensils size={22} strokeWidth={2.2} />,
    },
    {
      id: 'tab-tumbuh',
      label: 'Tumbuh',
      path: '/keluarga/tumbuh',
      icon: <TrendingUp size={22} strokeWidth={2.2} />,
    },
    {
      id: 'tab-belajar',
      label: 'Belajar',
      path: '/keluarga/belajar',
      icon: <BookOpen size={22} strokeWidth={2.2} />,
    },
  ];

  return (
    <nav
      aria-label="Navigasi Pengasuh"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border shadow-lg"
    >
      <div className="max-w-[480px] mx-auto px-2 flex items-center justify-around h-[64px] pb-[max(4px,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isActive =
            tab.path === '/keluarga'
              ? pathname === '/keluarga'
              : pathname.startsWith(tab.path);

          return (
            <button
              key={tab.id}
              id={tab.id}
              type="button"
              onClick={() => router.push(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[54px] rounded-xl transition-all cursor-pointer relative ${
                isActive
                  ? 'text-primary font-extrabold'
                  : 'text-text-muted font-medium hover:text-text'
              }`}
            >
              <div
                className={`p-1 rounded-full transition-transform duration-200 ${
                  isActive ? 'scale-110 bg-primary-selected' : ''
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[12px] leading-tight mt-0.5 tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
