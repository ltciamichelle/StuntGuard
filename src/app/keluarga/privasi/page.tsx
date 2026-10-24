'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components/ui';
import { ChevronLeft, ShieldCheck, Database, Eye, HeartHandshake, AlertCircle } from 'lucide-react';

export default function TentangDataKeluargaPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-6 flex flex-col justify-between max-w-[480px] mx-auto w-full pb-10">
      <div className="space-y-6">
        {/* Top Header */}
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
            <span className="text-[14px] font-bold text-teal uppercase tracking-wider block">
              Perlindungan Privasi
            </span>
            <h1 className="text-[22px] font-bold text-text leading-tight">
              Tentang data anak Anda
            </h1>
          </div>
        </header>

        {/* Draft Notice Banner */}
        <div className="p-3.5 rounded-[16px] bg-amber-50 border border-amber-200/80 flex items-center gap-3">
          <AlertCircle size={22} className="text-amber-600 flex-shrink-0" />
          <div className="min-w-0">
            <span className="inline-block px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-800 text-[12px] font-bold uppercase tracking-wider mb-0.5">
              draf, perlu ditinjau
            </span>
            <p className="text-[14px] text-amber-900 font-medium leading-snug">
              Ketentuan perlindungan data ini masih dalam tahap peninjauan bersama tenaga kesehatan setempat.
            </p>
          </div>
        </div>

        {/* Section 1: Data yang Dicatat */}
        <Card padding="20" className="border border-border bg-white shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-teal/10 text-teal flex items-center justify-center flex-shrink-0 mt-0.5">
              <Database size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-text leading-snug">
                Data apa yang dicatat?
              </h2>
              <ul className="mt-2 space-y-1.5 text-[15px] text-text-muted leading-relaxed list-disc list-inside">
                <li>Nama lengkap, tanggal lahir, dan jenis kelamin anak.</li>
                <li>Nomor identitas kependudukan (NIK atau nomor KK bila ada).</li>
                <li>Riwayat penimbangan berat badan dan pengukuran tinggi atau panjang badan anak di Posyandu.</li>
                <li>Hasil perhitungan kurva pertumbuhan dan saran gizi pendamping.</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Section 2: Siapa yang Dapat Melihat */}
        <Card padding="20" className="border border-border bg-white shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Eye size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-text leading-snug">
                Siapa yang dapat melihat data ini?
              </h2>
              <p className="text-[15px] text-text-muted mt-2 leading-relaxed">
                Data anak Anda bersifat pribadi dan hanya dapat diakses oleh:
              </p>
              <ul className="mt-2 space-y-1.5 text-[15px] text-text-muted leading-relaxed list-disc list-inside">
                <li><strong className="text-text">Anda</strong> selaku pengasuh yang sah dan telah menautkan kode balita.</li>
                <li><strong className="text-text">Kader Posyandu</strong> yang bertugas mencatat dan mendampingi Posyandu Anda.</li>
                <li><strong className="text-text">Bidan Desa</strong> serta tenaga medis Puskesmas pembantu setempat.</li>
                <li><strong className="text-text">Petugas desa</strong> yang berwenang dalam pemantauan program pencegahan stunting.</li>
              </ul>
              <p className="text-[14px] text-text-muted mt-3 font-semibold bg-slate-50 p-2.5 rounded-xl border border-border/80">
                Data tidak dapat dilihat oleh keluarga lain dan tidak pernah ditampilkan ke publik.
              </p>
            </div>
          </div>
        </Card>

        {/* Section 3: Tujuan Penggunaan */}
        <Card padding="20" className="border border-border bg-white shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-light text-green flex items-center justify-center flex-shrink-0 mt-0.5">
              <HeartHandshake size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-text leading-snug">
                Tujuan penggunaan data
              </h2>
              <p className="text-[15px] text-text-muted mt-2 leading-relaxed">
                Pencatatan data ini semata-mata digunakan untuk kepentingan pemantauan kesehatan anak Anda, memastikan pertumbuhan optimal, serta memberikan rujukan atau bantuan gizi yang tepat bila terindikasi risiko stunting.
              </p>
            </div>
          </div>
        </Card>

        {/* Back Button */}
        <div className="pt-2">
          <Button
            variant="secondary"
            size="kader"
            onClick={() => router.push('/keluarga')}
            className="min-h-[54px] text-[16px] font-bold"
          >
            Kembali ke Beranda Keluarga
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center">
        <p className="text-[14px] text-text-muted">
          StuntGuard • Menjaga Amanah dan Privasi Data Keluarga Anda
        </p>
      </footer>
    </main>
  );
}
