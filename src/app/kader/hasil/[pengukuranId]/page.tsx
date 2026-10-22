'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';
import { Anak, Pengukuran, StatusGizi } from '@/types/database';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  TrendingUp,
  Scale,
  Ruler,
  Calendar,
  FileText,
  Utensils,
  LineChart,
} from 'lucide-react';

export default function MeasurementResultPage() {
  const params = useParams();
  const router = useRouter();
  const pengukuranId = (params.pengukuranId || params.id) as string;
  const supabase = createClient();

  const [pengukuran, setPengukuran] = useState<Pengukuran | null>(null);
  const [child, setChild] = useState<Anak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResultData() {
      setLoading(true);
      try {
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        let foundPengukuran: Pengukuran | null = null;
        let foundChild: Anak | null = null;

        if (isRealSupabase) {
          const { data: pData } = await supabase
            .from('pengukuran')
            .select('*')
            .eq('id', pengukuranId)
            .single();

          if (pData) {
            foundPengukuran = pData;

            // Fetch child
            const { data: cData } = await supabase
              .from('anak')
              .select('*')
              .eq('id', pData.anak_id)
              .single();

            if (cData) foundChild = cData;
          }
        }

        // Check local storage if not found in database
        if (!foundPengukuran) {
          const localPengukuran = localStorage.getItem('sg_local_pengukuran');
          if (localPengukuran) {
            const list: Pengukuran[] = JSON.parse(localPengukuran);
            const p = list.find((item) => item.id === pengukuranId);
            if (p) foundPengukuran = p;
          }
        }

        if (foundPengukuran && !foundChild) {
          const localAnak = localStorage.getItem('sg_local_anak');
          if (localAnak) {
            const list: Anak[] = JSON.parse(localAnak);
            const c = list.find((item) => item.id === foundPengukuran?.anak_id);
            if (c) foundChild = c;
          }
        }

        // Demo fallback if testing freshly
        if (!foundPengukuran) {
          foundPengukuran = {
            id: pengukuranId || 'demo-pengukuran',
            anak_id: 'demo-anak',
            desa_id: 1,
            posyandu_id: 1,
            tgl_ukur: new Date().toISOString().split('T')[0],
            berat_kg: 9.8,
            tinggi_cm: 75.0,
            cara_ukur: 'berbaring',
            berat_manual: true,
            z_tbu: -0.29,
            z_bbu: 0.2,
            status: 'hijau',
          };
        }

        if (!foundChild) {
          foundChild = {
            id: foundPengukuran.anak_id,
            desa_id: 1,
            posyandu_id: 1,
            nama: 'Rayyan Pratama',
            nik: '3201124508230001',
            no_kk: '3201120000000001',
            nama_ibu: 'Siti Rahmawati',
            tgl_lahir: '2025-08-15',
            jenis_kelamin: 'L',
          };
        }

        setPengukuran(foundPengukuran);
        setChild(foundChild);
      } catch (err) {
        console.error('Error fetching measurement result:', err);
      } finally {
        setLoading(false);
      }
    }

    if (pengukuranId) {
      fetchResultData();
    }
  }, [pengukuranId]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-16 flex flex-col items-center justify-center max-w-[420px] mx-auto w-full text-slate-500">
        <div className="w-10 h-10 border-3 border-berry border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-[15px] font-bold">Menganalisis hasil pengukuran...</p>
      </div>
    );
  }

  if (!pengukuran || !child) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto w-full">
        <Card padding="lg" className="text-center">
          <p className="text-slate-700 font-bold mb-4">Data pengukuran tidak ditemukan.</p>
          <Button variant="primary" onClick={() => router.push('/kader')}>
            Kembali ke Beranda
          </Button>
        </Card>
      </div>
    );
  }

  const ageInMonths = calculateAgeInMonths(child.tgl_lahir);

  // Check if Z-score is null / missing reference data
  const hasMissingReference =
    pengukuran.z_tbu === null ||
    pengukuran.z_tbu === undefined ||
    pengukuran.z_bbu === null ||
    pengukuran.z_bbu === undefined;

  // Plain Indonesian short explanations for Z-scores
  const getTbuExplanation = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'Data referensi belum tersedia.';
    if (val < -3) return 'Tinggi badan jauh di bawah rata-rata (sangat pendek).';
    if (val < -2) return 'Tinggi badan di bawah rata-rata usianya (pendek).';
    if (val <= 2) return 'Tinggi badan normal sesuai usia anak.';
    return 'Tinggi badan di atas rata-rata seusianya.';
  };

  const getBbuExplanation = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'Data referensi belum tersedia.';
    if (val < -3) return 'Berat badan sangat kurang untuk usianya.';
    if (val < -2) return 'Berat badan kurang untuk usianya (waspada).';
    if (val <= 2) return 'Berat badan normal sesuai usia anak.';
    return 'Berat badan di atas rata-rata seusianya.';
  };

  // Status mapping
  const status: StatusGizi = pengukuran.status || 'hijau';

  // Handler for "Simpan dan selesai"
  const handleSimpanDanSelesai = () => {
    // The data is already saved. Go back to /kader home with a short success message.
    router.push('/kader?saved=true');
  };

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full select-none">
      <div className="space-y-4">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/kader/anak')}
              className="w-11 h-11 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-700 hover:border-berry hover:text-berry transition-colors cursor-pointer"
              title="Kembali ke Daftar Balita"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <span className="text-[11px] font-extrabold text-slateTeal uppercase tracking-wider block">
                Hasil Antropometri
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                Hasil Pengukuran
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {/* 1. Big Alert Card by Status (or Neutral if missing reference) */}
        {hasMissingReference ? (
          /* Neutral Card: "Hasil belum bisa dihitung. Periksa usia anak." Do not show a color status. */
          <div
            id="alert-card-neutral"
            className="p-5 rounded-3xl bg-slate-100 border-2 border-slate-300 text-slate-800 space-y-3 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-300 flex items-center justify-center text-slate-600 flex-shrink-0">
                <HelpCircle size={26} />
              </div>
              <div>
                <h2 className="text-[17px] font-extrabold text-slate-900 leading-snug">
                  Hasil belum bisa dihitung. Periksa usia anak.
                </h2>
                <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                  Data referensi standar WHO untuk usia balita ini belum dapat dipetakan secara akurat. Mohon periksa kembali tanggal lahir balita.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                fullWidth
                id="btn-selesai-neutral"
                onClick={handleSimpanDanSelesai}
                className="min-h-[52px] text-[15px] font-bold"
              >
                Simpan dan selesai
              </Button>
            </div>
          </div>
        ) : status === 'merah' ? (
          /* MERAH: Full red background, alert icon, text "Indikasi stunting: Rujuk ke Puskesmas segera." White button "Buat surat rujukan", plus "Simpan dan selesai". */
          <div
            id="alert-card-merah"
            className="p-5 rounded-3xl bg-status-red text-white space-y-4 shadow-alert animate-in fade-in duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center flex-shrink-0 text-white">
                <AlertOctagon size={30} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-red-100 block">
                  Status Gizi Kritis
                </span>
                <h2 className="text-[19px] font-black leading-snug mt-0.5">
                  Indikasi stunting: Rujuk ke Puskesmas segera.
                </h2>
                <p className="text-[13px] text-red-100 mt-1 leading-relaxed">
                  Tinggi atau berat badan balita berada jauh di bawah garis batas standar WHO (-3 SD). Diperlukan evaluasi klinis mendalam oleh Bidan atau Dokter.
                </p>
              </div>
            </div>

            {/* Buttons: White button "Buat surat rujukan" + "Simpan dan selesai" */}
            <div className="space-y-2 pt-1">
              <Button
                variant="alert-white"
                fullWidth
                id="btn-buat-surat-rujukan"
                icon={<FileText size={18} />}
                onClick={() => router.push(`/kader/rujukan/${pengukuran.id}`)}
                className="min-h-[54px] text-[16px] font-bold shadow-md"
              >
                Buat surat rujukan
              </Button>

              <button
                type="button"
                id="btn-simpan-selesai-merah"
                onClick={handleSimpanDanSelesai}
                className="w-full py-3 rounded-full text-white/90 hover:text-white font-bold text-[14px] hover:bg-white/10 active:bg-white/20 transition-all cursor-pointer"
              >
                Simpan dan selesai
              </button>
            </div>
          </div>
        ) : status === 'kuning' ? (
          /* KUNING: Warning icon. Text "Peringatan: Berat badan stabil rendah. Rekomendasikan asupan telur atau protein hewani!" Buttons: "Lihat saran gizi", "Simpan dan selesai". */
          <div
            id="alert-card-kuning"
            className="p-5 rounded-3xl bg-amber-50 border-2 border-status-yellow/50 text-amber-950 space-y-4 shadow-soft animate-in fade-in duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-status-yellow flex-shrink-0">
                <AlertTriangle size={30} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block">
                  Perhatian Khusus
                </span>
                <h2 className="text-[18px] font-black leading-snug mt-0.5">
                  Peringatan: Berat badan stabil rendah. Rekomendasikan asupan telur atau protein hewani!
                </h2>
                <p className="text-[13px] text-amber-900 mt-1 leading-relaxed">
                  Balita berada di zona waspada gagal tumbuh. Berikan edukasi pemberian makanan tambahan (PMT) kaya protein hewani kepada orang tua.
                </p>
              </div>
            </div>

            {/* Buttons: "Lihat saran gizi", "Simpan dan selesai" */}
            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                fullWidth
                id="btn-lihat-saran-gizi"
                icon={<Utensils size={18} />}
                onClick={() => router.push(`/kader/saran-gizi?pengukuranId=${pengukuran.id}`)}
                className="min-h-[54px] text-[16px] font-bold shadow-md"
              >
                Lihat saran gizi
              </Button>

              <Button
                variant="secondary"
                fullWidth
                id="btn-simpan-selesai-kuning"
                onClick={handleSimpanDanSelesai}
                className="min-h-[50px] text-[15px] font-bold"
              >
                Simpan dan selesai
              </Button>
            </div>
          </div>
        ) : (
          /* HIJAU: Check icon. Text "Pertumbuhan sesuai jalur. Pertahankan!" Button: "Simpan dan selesai". */
          <div
            id="alert-card-hijau"
            className="p-5 rounded-3xl bg-emerald-50 border-2 border-status-green/40 text-emerald-950 space-y-4 shadow-soft animate-in fade-in duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-status-green flex-shrink-0">
                <CheckCircle2 size={30} />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                  Pertumbuhan Normal
                </span>
                <h2 className="text-[19px] font-black leading-snug mt-0.5">
                  Pertumbuhan sesuai jalur. Pertahankan!
                </h2>
                <p className="text-[13px] text-emerald-900 mt-1 leading-relaxed">
                  Berat dan panjang/tinggi badan balita berkembang optimal sesuai standar baku WHO. Ingatkan orang tua untuk rutin datang ke Posyandu tiap bulan.
                </p>
              </div>
            </div>

            {/* Button: "Simpan dan selesai" */}
            <div className="pt-1">
              <Button
                variant="primary"
                fullWidth
                id="btn-simpan-selesai-hijau"
                onClick={handleSimpanDanSelesai}
                className="min-h-[54px] text-[16px] font-bold shadow-md"
              >
                Simpan dan selesai
              </Button>
            </div>
          </div>
        )}

        {/* 2. Child Name, Age, Date, Weight, Height */}
        <Card padding="md" className="border-2 border-slate-200/80 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-extrabold text-slateTeal uppercase tracking-wider">
                Identitas Balita
              </span>
              <h3 className="text-[18px] font-black text-slate-900 mt-0.5">
                {child.nama}
              </h3>
              <p className="text-[13px] text-slate-600">
                Usia: <strong>{ageInMonths} Bulan</strong> ({child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'})
              </p>
              <p className="text-[12px] text-slate-500">
                Nama Ibu: {child.nama_ibu}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-berry-light text-berry flex items-center justify-center font-bold text-xl flex-shrink-0 border border-berry/20">
              {child.jenis_kelamin === 'L' ? '👦' : '👧'}
            </div>
          </div>

          {/* Measurements summary */}
          <div className="pt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Tanggal
              </span>
              <span className="text-[13px] font-extrabold text-slate-800 block mt-0.5">
                {formatIndonesianDate(pengukuran.tgl_ukur).split(' ')[0]} {formatIndonesianDate(pengukuran.tgl_ukur).split(' ')[1]?.slice(0, 3)}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Berat (BB)
              </span>
              <span className="text-[15px] font-black text-slate-900 block mt-0.5">
                {pengukuran.berat_kg} <span className="text-[11px] font-bold text-slate-500">kg</span>
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Tinggi ({pengukuran.cara_ukur === 'berbaring' ? 'PB' : 'TB'})
              </span>
              <span className="text-[15px] font-black text-slate-900 block mt-0.5">
                {pengukuran.tinggi_cm} <span className="text-[11px] font-bold text-slate-500">cm</span>
              </span>
            </div>
          </div>
        </Card>

        {/* 3. Z-score Values in Large Numbers with One Plain-Indonesian Line Explaining Each */}
        <div className="grid grid-cols-2 gap-3">
          {/* Z-Score TB/U Card */}
          <Card padding="md" className="border-2 border-slate-200/80 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Ruler size={16} className="text-berry" />
                <span className="text-[11px] font-extrabold text-slateTeal uppercase tracking-wider">
                  Tinggi menurut umur
                </span>
              </div>

              {/* Large Number Display */}
              <div className="my-2">
                <span
                  id="zscore-tbu-val"
                  className="text-[32px] font-black text-slate-900 tracking-tight leading-none"
                >
                  {pengukuran.z_tbu !== null && pengukuran.z_tbu !== undefined
                    ? `${pengukuran.z_tbu > 0 ? '+' : ''}${pengukuran.z_tbu}`
                    : '-'}
                </span>
                <span className="text-[13px] font-bold text-slate-500 ml-1">SD</span>
              </div>
            </div>

            {/* One short plain-Indonesian line */}
            <p className="text-[12px] font-semibold text-slate-600 leading-snug pt-2 border-t border-slate-100">
              {getTbuExplanation(pengukuran.z_tbu)}
            </p>
          </Card>

          {/* Z-Score BB/U Card */}
          <Card padding="md" className="border-2 border-slate-200/80 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Scale size={16} className="text-slateTeal" />
                <span className="text-[11px] font-extrabold text-slateTeal uppercase tracking-wider">
                  Berat menurut umur
                </span>
              </div>

              {/* Large Number Display */}
              <div className="my-2">
                <span
                  id="zscore-bbu-val"
                  className="text-[32px] font-black text-slate-900 tracking-tight leading-none"
                >
                  {pengukuran.z_bbu !== null && pengukuran.z_bbu !== undefined
                    ? `${pengukuran.z_bbu > 0 ? '+' : ''}${pengukuran.z_bbu}`
                    : '-'}
                </span>
                <span className="text-[13px] font-bold text-slate-500 ml-1">SD</span>
              </div>
            </div>

            {/* One short plain-Indonesian line */}
            <p className="text-[12px] font-semibold text-slate-600 leading-snug pt-2 border-t border-slate-100">
              {getBbuExplanation(pengukuran.z_bbu)}
            </p>
          </Card>
        </div>

        {/* 4. Growth Curve Chart Placeholder (Requirement: Leave a card placeholder) */}
        <Card padding="md" className="border-2 border-dashed border-slate-300 bg-slate-50/70 text-center py-5">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slateTeal mx-auto mb-2 shadow-sm">
            <LineChart size={20} />
          </div>
          <h4 className="text-[14px] font-extrabold text-slate-800">
            Grafik Kurva Pertumbuhan WHO (KMS Digital)
          </h4>
          <p className="text-[12px] text-slate-500 mt-0.5 max-w-[280px] mx-auto">
            Visualisasi kurva standar panjang/tinggi dan berat badan terhadap usia balita.
          </p>
          <span className="inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 uppercase tracking-wider">
            Fitur Segera Hadir
          </span>
        </Card>
      </div>

      {/* 5. Disclaimer line at the bottom */}
      <footer className="pt-5 pb-3 text-center">
        <p className="text-[12px] text-slate-500 font-medium leading-relaxed px-2">
          &ldquo;StuntGuard membantu skrining. Diagnosis dilakukan tenaga kesehatan.&rdquo;
        </p>
      </footer>
    </div>
  );
}
