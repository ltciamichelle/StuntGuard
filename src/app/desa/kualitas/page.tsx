'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, StatusBadge, Skeleton, ErrorState } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { formatIndonesianDate, calculateAgeInMonths } from '@/lib/utils';
import {
  PosyanduQualityStats,
  FlaggedMeasurementItem,
  SKOR_PERLU_PERHATIAN,
} from '@/lib/kualitas-config';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Ruler,
  Calendar,
  Filter,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  User,
  Info,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function DataQualityPage() {
  const router = useRouter();

  // State filter
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedPosyanduId, setSelectedPosyanduId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [overallScore, setOverallScore] = useState<number>(100);
  const [totalMeasurements, setTotalMeasurements] = useState<number>(0);
  const [cleanMeasurements, setCleanMeasurements] = useState<number>(0);
  const [flaggedCount, setFlaggedCount] = useState<number>(0);
  const [coverageUnmeasuredCount, setCoverageUnmeasuredCount] = useState<number>(0);
  const [posyanduStats, setPosyanduStats] = useState<PosyanduQualityStats[]>([]);
  const [flaggedItems, setFlaggedItems] = useState<FlaggedMeasurementItem[]>([]);

  // Fetch quality data from RLS-protected server endpoint
  useEffect(() => {
    fetchQualityData();
  }, [selectedMonth, selectedPosyanduId]);

  async function fetchQualityData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/kualitas?month=${selectedMonth}&posyanduId=${selectedPosyanduId}`
      );
      if (res.ok) {
        const data = await res.json();
        setOverallScore(data.overallScore ?? 100);
        setTotalMeasurements(data.totalMeasurements ?? 0);
        setCleanMeasurements(data.cleanMeasurements ?? 0);
        setFlaggedCount(data.flaggedCount ?? 0);
        setCoverageUnmeasuredCount(data.coverageUnmeasuredCount ?? 0);
        setPosyanduStats(data.posyanduStats ?? []);
        setFlaggedItems(data.flaggedItems ?? []);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Gagal mengambil data kualitas.');
      }
    } catch (err: unknown) {
      console.error('Gagal mengambil data kualitas:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kendala saat memuat data kualitas.');
    } finally {
      setLoading(false);
    }
  }

  // Generate 6 bulan terakhir untuk dropdown
  const monthOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      options.push({ label, value: val });
    }
    return options;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text flex flex-col antialiased">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border shadow-xs">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="w-24 h-4 rounded-full" />
                <Skeleton className="w-48 h-6 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-24 h-10 rounded-full" />
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
          <Skeleton className="w-full h-16 rounded-[24px]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <Skeleton className="w-full h-64 rounded-[24px]" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-text flex flex-col antialiased">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border shadow-xs">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <button
              onClick={() => router.push('/desa')}
              className="w-10 h-10 rounded-full bg-slate-50 border border-border flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary-selected transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Kembali ke dasbor desa"
            >
              <ArrowLeft size={20} />
            </button>
            <SyncStatusBadge />
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-16">
          <ErrorState
            title="Gagal memuat data kualitas antropometri"
            message={error}
            onRetry={fetchQualityData}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/desa')}
              className="w-10 h-10 rounded-full bg-slate-50 border border-border flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary-selected transition-colors cursor-pointer"
              aria-label="Kembali ke Dashboard Desa"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <span className="text-[12px] font-bold text-teal uppercase tracking-wider block">
                Evaluasi & Audit Data
              </span>
              <h1 className="text-[20px] font-bold text-text leading-tight">
                Kualitas Data Antropometri
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Filter Section */}
        <div className="p-4 rounded-[24px] bg-white border border-border shadow-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Bulan */}
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-teal" />
              <label htmlFor="filter-month" className="text-[14px] font-bold text-text-muted">
                Bulan:
              </label>
              <select
                id="filter-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-border bg-slate-50 text-[14px] font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Posyandu */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-teal" />
              <label htmlFor="filter-posyandu" className="text-[14px] font-bold text-text-muted">
                Posyandu:
              </label>
              <select
                id="filter-posyandu"
                value={selectedPosyanduId}
                onChange={(e) => setSelectedPosyanduId(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-border bg-slate-50 text-[14px] font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Semua Posyandu</option>
                {posyanduStats.map((p) => (
                  <option key={p.posyanduId} value={String(p.posyanduId)}>
                    {p.posyanduName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="text-[13px] text-text-muted flex items-center gap-1.5">
            <Info size={16} className="text-teal flex-shrink-0" />
            <span>Skor dihitung dari persentase pengukuran tanpa temuan janggal.</span>
          </div>
        </div>

        {/* Ringkasan Utama (Overall Score Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Skor Kualitas Keseluruhan */}
          <Card padding="24" className="border border-border bg-white shadow-card relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold text-text-muted uppercase tracking-wider">
                  Skor Kualitas Data
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-[36px] font-extrabold text-text tracking-tight">
                    {loading ? '...' : `${overallScore}%`}
                  </span>
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  overallScore < SKOR_PERLU_PERHATIAN
                    ? 'bg-yellow-light text-yellow'
                    : 'bg-green-light text-green'
                }`}
              >
                {overallScore < SKOR_PERLU_PERHATIAN ? (
                  <ShieldAlert size={26} strokeWidth={2} />
                ) : (
                  <ShieldCheck size={26} strokeWidth={2} />
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              {overallScore < SKOR_PERLU_PERHATIAN ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-yellow-light text-[#9A6F00]">
                  <AlertTriangle size={14} />
                  Perlu perhatian
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-green-light text-green">
                  <CheckCircle2 size={14} />
                  Kualitas Baik
                </span>
              )}
              <span className="text-[12px] text-text-muted">
                {cleanMeasurements} dari {totalMeasurements} bersih
              </span>
            </div>
          </Card>

          {/* Card 2: Pengukuran Bertanda (Flagged) */}
          <Card padding="24" className="border border-border bg-white shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold text-text-muted uppercase tracking-wider">
                  Perlu Dicek
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-[36px] font-extrabold text-text tracking-tight">
                    {loading ? '...' : flaggedCount}
                  </span>
                  <span className="text-[14px] text-text-muted font-medium">pengukuran</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[12px] text-text-muted">
              Pengukuran dengan indikasi janggal / tidak wajar
            </div>
          </Card>

          {/* Card 3: Cakupan (Coverage) 60 Hari */}
          <Card padding="24" className="border border-border bg-white shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold text-text-muted uppercase tracking-wider">
                  Cakupan 60 Hari
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-[36px] font-extrabold text-text tracking-tight">
                    {loading ? '...' : coverageUnmeasuredCount}
                  </span>
                  <span className="text-[14px] text-text-muted font-medium">balita</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-light text-teal flex items-center justify-center flex-shrink-0">
                <Clock size={24} strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[12px] text-text-muted">
              Belum ditimbang dalam 60 hari terakhir
            </div>
          </Card>

          {/* Card 4: Penimbangan Manual */}
          <Card padding="24" className="border border-border bg-white shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold text-text-muted uppercase tracking-wider">
                  Timbang Manual
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-[36px] font-extrabold text-text tracking-tight">
                    {loading
                      ? '...'
                      : totalMeasurements > 0
                      ? `${Math.round(
                          (posyanduStats.reduce((acc, s) => acc + s.manualWeightCount, 0) /
                            totalMeasurements) *
                            100
                        )}%`
                      : '0%'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                <Scale size={24} strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[12px] text-text-muted">
              Informasi catatan alat timbang kader (bukan error)
            </div>
          </Card>
        </div>

        {/* Section: Kartu Skor per Posyandu */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-bold text-text">Skor Kualitas per Posyandu</h2>
            <span className="text-[13px] text-text-muted">
              Standar Target: &ge; {SKOR_PERLU_PERHATIAN}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posyanduStats.map((stat) => (
              <Card
                key={stat.posyanduId}
                padding="24"
                className={`border bg-white shadow-card relative transition-all ${
                  stat.needsAttention
                    ? 'border-yellow/50 bg-gradient-to-b from-yellow-light/20 to-white'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-text leading-snug">
                      {stat.posyanduName}
                    </h3>
                    <p className="text-[12px] text-text-muted mt-0.5">
                      {stat.totalMeasurements} pengukuran bulan ini
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-[26px] font-black ${
                        stat.needsAttention ? 'text-[#9A6F00]' : 'text-green'
                      }`}
                    >
                      {stat.score}%
                    </span>
                  </div>
                </div>

                {/* Status Badge per Posyandu */}
                <div className="mt-3 flex items-center gap-2">
                  {stat.needsAttention ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-yellow-light text-[#9A6F00] border border-yellow/30">
                      <AlertTriangle size={13} />
                      Perlu perhatian
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-green-light text-green border border-green/30">
                      <CheckCircle2 size={13} />
                      Baik
                    </span>
                  )}

                  <span className="text-[12px] text-text-muted font-medium">
                    {stat.flaggedMeasurements} perlu dicek
                  </span>
                </div>

                {/* Peringatan Pembulatan jika terdeteksi */}
                {stat.roundingFlag && (
                  <div className="mt-3 p-2.5 rounded-[12px] bg-yellow-light border border-yellow/40 flex items-start gap-2 text-[12px] text-text">
                    <Ruler size={16} className="text-[#9A6F00] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#9A6F00] block">Angka tinggi sering dibulatkan</strong>
                      <span className="text-text-muted">
                        {stat.roundingPercent}% pengukuran berakhiran .0 atau .5
                      </span>
                    </div>
                  </div>
                )}

                {/* Footer card info */}
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-[12px] text-text-muted">
                  <div>
                    <span>Belum diukur 60 hr:</span>
                    <strong className="block text-text font-bold">
                      {stat.coverageUnmeasuredCount} balita
                    </strong>
                  </div>
                  <div>
                    <span>Timbang manual:</span>
                    <strong className="block text-text font-bold">
                      {stat.manualWeightPercent}%
                    </strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Section: Tabel Pengukuran Bertanda (Flagged Measurements) */}
        <section className="bg-white rounded-[24px] border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-bold text-text">Daftar Pengukuran Perlu Dicek</h2>
              <p className="text-[14px] text-text-muted mt-0.5">
                Pengukuran yang terindikasi janggal untuk verifikasi atau pengukuran ulang oleh kader.
              </p>
            </div>

            <span className="px-3.5 py-1 rounded-full text-[13px] font-bold bg-slate-100 text-slate-700 self-start sm:self-center">
              {flaggedItems.length} Pengukuran Ditemukan
            </span>
          </div>

          {flaggedItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <CheckCircle2 size={40} className="text-green mx-auto mb-2" />
              <h3 className="text-[18px] font-bold text-text">Semua Pengukuran Terverifikasi Bersih</h3>
              <p className="text-[14px] text-text-muted mt-1 max-w-md mx-auto">
                Tidak ada data pengukuran yang mencurigakan atau di luar batas biologis pada periode ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-[13px] font-bold text-text-muted">
                    <th className="py-3 px-4">Balita</th>
                    <th className="py-3 px-4">Posyandu</th>
                    <th className="py-3 px-4">Tanggal Ukur</th>
                    <th className="py-3 px-4">Data Tercatat</th>
                    <th className="py-3 px-4">Temuan Perlu Dicek</th>
                    <th className="py-3 px-4">Saran Tindakan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {flaggedItems.map((item, idx) => {
                    const ageInMonths = calculateAgeInMonths(
                      item.child.tgl_lahir,
                      item.measurement.tgl_ukur
                    );

                    return (
                      <tr key={`${item.measurement.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        {/* Balita */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-text block leading-snug">
                            {item.child.nama}
                          </span>
                          <span className="text-[12px] text-text-muted block mt-0.5">
                            {ageInMonths} Bulan • {item.child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </td>

                        {/* Posyandu */}
                        <td className="py-3.5 px-4 font-semibold text-text-muted">
                          {item.posyanduName || 'Posyandu'}
                        </td>

                        {/* Tanggal Ukur */}
                        <td className="py-3.5 px-4 text-text font-medium whitespace-nowrap">
                          {formatIndonesianDate(item.measurement.tgl_ukur)}
                        </td>

                        {/* Data Tercatat */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-text block">
                            {item.measurement.tinggi_cm} cm • {item.measurement.berat_kg} kg
                          </span>
                          <span className="text-[12px] text-text-muted capitalize block">
                            Cara: {item.measurement.cara_ukur}
                          </span>
                        </td>

                        {/* Temuan Flags */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1.5">
                            {item.flags.map((flag, fIdx) => (
                              <div
                                key={fIdx}
                                className="inline-flex items-start gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-light/80 border border-yellow/30 text-[12px] text-text"
                              >
                                <AlertTriangle size={13} className="text-[#9A6F00] flex-shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-[#9A6F00] block">{flag.label}</strong>
                                  {flag.detail && (
                                    <span className="text-text-muted block text-[11px] leading-tight">
                                      {flag.detail}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Saran Tindakan */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            {item.flags.map((flag, fIdx) => (
                              <span key={fIdx} className="text-[13px] font-semibold text-teal block">
                                • {flag.suggestion}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="compact"
                            fullWidth={false}
                            onClick={() => router.push(`/kader/anak/${item.child.id}`)}
                            icon={<ExternalLink size={14} />}
                            className="text-[13px] font-bold"
                          >
                            Buka data anak
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
