'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, Skeleton, BottomActionBar } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { ArrowLeft, Egg, Fish, Utensils, Heart } from 'lucide-react';

function SaranGiziContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pengukuranId = searchParams.get('pengukuranId');

  const handleBack = () => {
    if (pengukuranId) {
      router.push(`/kader/hasil/${pengukuranId}`);
    } else {
      router.back();
    }
  };

  const tips = [
    {
      icon: <Egg className="text-amber-600" size={32} />,
      bg: 'bg-amber-50 border-amber-300',
      badge: 'Protein Terbaik',
      title: '1 butir telur tiap hari',
      desc: 'Berikan balita minimal 1 butir telur ayam setiap hari (direbus, didadar, atau dicampur ke bubur). Telur mengandung protein berkualitas tinggi dan kolin yang sangat ampuh mengejar pertambahan tinggi badan.',
    },
    {
      icon: <Fish className="text-sky-600" size={32} />,
      bg: 'bg-sky-50 border-sky-300',
      badge: 'Ikan Lokal Kaya Omega-3',
      title: 'Ikan segar lokal (kembung, lele, gabus)',
      desc: 'Ikan kembung memiliki omega-3 dan protein yang sama baiknya dengan ikan salmon, namun dengan harga terjangkau. Ikan lele dan gabus juga sangat bagus untuk pembentukan jaringan otot dan tulang anak.',
    },
    {
      icon: <Utensils className="text-emerald-600" size={32} />,
      bg: 'bg-emerald-50 border-emerald-300',
      badge: 'Variasi Hewani',
      title: 'Hati ayam & daging cincang',
      desc: 'Hati ayam sangat kaya zat besi dan vitamin A untuk mencegah anak lemas dan kurang darah (anemia). Kombinasikan juga dengan tempe, tahu, atau kacang hijau sebagai protein pendamping.',
    },
    {
      icon: <Heart className="text-rose-600" size={32} />,
      bg: 'bg-rose-50 border-rose-300',
      badge: 'Pola Makan Aktif',
      title: '3 kali makan utama + 2 kali selingan sehat',
      desc: 'Pastikan anak makan teratur 3 kali sehari makanan padat bergizi dan 2 kali camilan sehat (buah, puding susu, atau biskuit bergizi). Jangan biarkan anak kenyang air putih manis atau camilan berpengawet sebelum jam makan.',
    },
  ];

  return (
    <div className="min-h-screen px-4 py-5 pb-40 max-w-[480px] mx-auto w-full space-y-6 select-none">
      {/* Header with Back and Sync badge */}
      <header className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center text-slate-800 hover:border-primary hover:text-primary transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shadow-sm"
            title="Kembali"
            aria-label="Kembali"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <span className="text-[16px] font-bold text-primary block leading-none mb-1">
              Panduan kader & orang tua
            </span>
            <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">
              Saran asupan gizi
            </h1>
          </div>
        </div>
        <SyncStatusBadge />
      </header>

      {/* Intro Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1 shadow-sm">
        <p className="text-[18px] font-bold leading-snug">
          Prioritas: Tingkatkan asupan protein hewani lokal
        </p>
        <p className="text-[16px] text-amber-900 leading-relaxed">
          Untuk balita dengan indikasi berat badan rendah atau waspada gagal tumbuh, utamakan sumber protein hewani pada setiap porsi makan anak.
        </p>
      </div>

      {/* Tips List */}
      <div className="space-y-4">
        {tips.map((tip, idx) => (
          <Card
            key={idx}
            padding="lg"
            className={`border-2 ${tip.bg} shadow-soft transition-all`}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-200">
                {tip.icon}
              </div>
              <div className="space-y-1.5 flex-1">
                <span className="inline-block px-3 py-1 rounded-full bg-white text-slate-800 text-[14px] font-extrabold border border-slate-200 shadow-xs">
                  {tip.badge}
                </span>
                <h2 className="text-[18px] font-extrabold text-slate-900 leading-snug">
                  {tip.title}
                </h2>
                <p className="text-[16px] text-slate-800 leading-relaxed">
                  {tip.desc}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Sticky Bottom Action Bar */}
      <BottomActionBar>
        <Button
          variant="primary"
          size="kader"
          fullWidth
          onClick={handleBack}
          className="shadow-md"
        >
          Kembali ke hasil pengukuran
        </Button>
      </BottomActionBar>
    </div>
  );
}

function SaranGiziSkeleton() {
  return (
    <div className="min-h-screen px-4 py-5 pb-40 max-w-[480px] mx-auto w-full space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-48 h-6" />
          </div>
        </div>
        <Skeleton className="w-24 h-10 rounded-full" />
      </div>
      <Skeleton className="w-full h-24 rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="w-full h-36 rounded-2xl" />
        <Skeleton className="w-full h-36 rounded-2xl" />
        <Skeleton className="w-full h-36 rounded-2xl" />
      </div>
    </div>
  );
}

export default function SaranGiziPage() {
  return (
    <Suspense fallback={<SaranGiziSkeleton />}>
      <SaranGiziContent />
    </Suspense>
  );
}

