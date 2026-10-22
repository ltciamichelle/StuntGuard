'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button } from '@/components/ui';
import { ArrowLeft, Egg, Fish, Utensils, Heart, CheckCircle2 } from 'lucide-react';

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
      icon: <Egg className="text-amber-500" size={28} />,
      bg: 'bg-amber-50 border-amber-200',
      badge: 'Protein Terbaik',
      title: '1 Butir Telur Tiap Hari',
      desc: 'Berikan balita minimal 1 butir telur ayam setiap hari (direbus, didadar, atau dicampur ke bubur). Telur mengandung protein berkualitas tinggi dan kolin yang sangat ampuh mengejar pertambahan tinggi badan.',
    },
    {
      icon: <Fish className="text-sky-500" size={28} />,
      bg: 'bg-sky-50 border-sky-200',
      badge: 'Ikan Lokal Kaya Omega-3',
      title: 'Ikan Segar Lokal (Kembung, Lele, Gabus)',
      desc: 'Ikan kembung memiliki omega-3 dan protein yang sama baiknya dengan ikan salmon, namun dengan harga terjangkau. Ikan lele dan gabus juga sangat bagus untuk pembentukan jaringan otot dan tulang anak.',
    },
    {
      icon: <Utensils className="text-emerald-500" size={28} />,
      bg: 'bg-emerald-50 border-emerald-200',
      badge: 'Variasi Hewani',
      title: 'Hati Ayam & Daging Cincang',
      desc: 'Hati ayam sangat kaya zat besi dan vitamin A untuk mencegah anak lemas dan kurang darah (anemia). Kombinasikan juga dengan tempe, tahu, atau kacang hijau sebagai protein pendamping.',
    },
    {
      icon: <Heart className="text-rose-500" size={28} />,
      bg: 'bg-rose-50 border-rose-200',
      badge: 'Pola Makan Aktif',
      title: '3x Makan Utama + 2x Selingan Sehat',
      desc: 'Pastikan anak makan teratur 3 kali sehari makanan padat bergizi dan 2 kali camilan sehat (buah, puding susu, atau biskuit bergizi). Jangan biarkan anak kenyang air putih manis atau camilan berpengawet sebelum jam makan.',
    },
  ];

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      <div className="space-y-4">
        {/* Header */}
        <header className="flex items-center gap-3 pb-2 border-b border-slate-100">
          <button
            onClick={handleBack}
            className="w-11 h-11 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-700 hover:border-berry hover:text-berry transition-colors cursor-pointer"
            title="Kembali"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-[11px] font-extrabold text-slateTeal uppercase tracking-wider block">
              Panduan Kader & Orang Tua
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
              Saran Asupan Gizi Balita
            </h1>
          </div>
        </header>

        {/* Intro Banner */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[13px] text-amber-950">
          <p className="font-bold mb-1">
            Prioritas: Tingkatkan Asupan Protein Hewani Lokal
          </p>
          <p className="text-amber-900 leading-relaxed">
            Untuk balita dengan indikasi berat badan rendah atau waspada gagal tumbuh, utamakan sumber protein hewani pada setiap porsi makan anak.
          </p>
        </div>

        {/* Tips List */}
        <div className="space-y-3 pb-4">
          {tips.map((tip, idx) => (
            <Card
              key={idx}
              padding="md"
              className={`border-2 ${tip.bg} shadow-soft transition-all`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                  {tip.icon}
                </div>
                <div className="space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-white/90 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                    {tip.badge}
                  </span>
                  <h3 className="text-[16px] font-extrabold text-slate-900 leading-snug">
                    {tip.title}
                  </h3>
                  <p className="text-[13px] text-slate-700 leading-relaxed">
                    {tip.desc}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-2 pb-4">
        <Button
          variant="primary"
          fullWidth
          onClick={handleBack}
          className="min-h-[56px] text-[16px] font-bold shadow-md"
        >
          Kembali ke Hasil Pengukuran
        </Button>
      </footer>
    </div>
  );
}

export default function SaranGiziPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen px-4 py-16 flex items-center justify-center text-slate-500">
          Memuat panduan gizi...
        </div>
      }
    >
      <SaranGiziContent />
    </Suspense>
  );
}
