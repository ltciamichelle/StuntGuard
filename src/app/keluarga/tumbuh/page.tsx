'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components/ui';
import { KeluargaTabBar } from '@/components/keluarga/KeluargaTabBar';
import { TrendingUp, Sparkles, ChevronLeft } from 'lucide-react';

export default function TumbuhPlaceholderPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-6 flex flex-col justify-between max-w-[480px] mx-auto w-full pb-28">
      <div className="space-y-6">
        {/* Header */}
        <header className="flex items-center gap-3 pb-3 border-b border-border">
          <button
            type="button"
            onClick={() => router.push('/keluarga')}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary transition-colors cursor-pointer"
            aria-label="Kembali"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
          <div>
            <span className="text-[13px] font-bold text-teal uppercase tracking-wider block">
              Kurva Pertumbuhan
            </span>
            <h1 className="text-[22px] font-extrabold text-text leading-tight">
              Tumbuh Kembang
            </h1>
          </div>
        </header>

        {/* Cheerful Placeholder Card */}
        <Card padding="20" className="border-2 border-border bg-gradient-to-b from-white to-[#FDF8F9] text-center flex flex-col items-center py-10 shadow-soft">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <TrendingUp size={40} strokeWidth={2} />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-teal/10 text-teal text-[12px] font-bold uppercase tracking-wider mb-2">
            Segera Hadir
          </span>

          <h2 className="text-[20px] font-extrabold text-text leading-tight mb-2 px-2">
            Grafik Tumbuh Kembang Lengkap
          </h2>

          <p className="text-[15px] text-text-muted leading-relaxed max-w-xs mb-6 px-2">
            Pantau kurva tinggi dan berat badan anak Anda berdasarkan standar WHO secara interaktif langsung dari genggaman Anda.
          </p>

          <Button
            variant="secondary"
            size="kader"
            onClick={() => router.push('/keluarga')}
            className="min-h-[54px] text-[16px] font-bold"
            icon={<Sparkles size={18} />}
          >
            Kembali ke Beranda
          </Button>
        </Card>
      </div>

      <KeluargaTabBar />
    </main>
  );
}
