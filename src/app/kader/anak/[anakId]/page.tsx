'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, StatusBadge, BottomActionBar, Skeleton, ErrorState } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { GrowthCharts } from '@/components/GrowthCharts';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';
import { Anak, Pengukuran } from '@/types/database';
import { db, CachedPengukuran } from '@/lib/db';
import { buatKodeTautan } from '@/lib/tautanEngine';
import {
  ChevronLeft,
  Scale,
  Ruler,
  Calendar,
  User,
  ChevronRight,
  TrendingUp,
  Clock,
  Link2,
  Copy,
  CircleCheck,
  TriangleAlert,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  evaluateMeasurementFlags,
  TEST_QUALITY_CHILDREN,
  TEST_QUALITY_MEASUREMENTS,
} from '@/lib/kualitas-config';

export default function ChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const anakId = params.anakId as string;
  const supabase = createClient();

  const [child, setChild] = useState<Anak | null>(null);
  const [measurements, setMeasurements] = useState<Pengukuran[]>([]);
  const [loading, setLoading] = useState(true);

  // Tautkan keluarga states
  const [tautanCode, setTautanCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [tautanError, setTautanError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadChildData = async () => {
    setLoading(true);
    try {
      let foundChild: Anak | null = null;
      let foundMeasurements: Pengukuran[] = [];

      // 1. Read from Dexie local IndexedDB first (offline first)
      try {
        const cachedChild = await db.anak_cache.get(anakId);
        if (cachedChild) {
          foundChild = cachedChild;
        }

        const cachedList = await db.pengukuran_cache
          .where('anak_id')
          .equals(anakId)
          .toArray();

        if (cachedList && cachedList.length > 0) {
          foundMeasurements = cachedList;
        }
      } catch (dbErr) {
        console.warn('Error reading from IndexedDB:', dbErr);
      }

      // 2. If online and Supabase is configured, fetch fresh data
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isRealSupabase && navigator.onLine) {
        try {
          const { data: dbChild } = await supabase
            .from('anak')
            .select('*')
            .eq('id', anakId)
            .single();

          if (dbChild) {
            foundChild = dbChild;
            await db.anak_cache.put(dbChild);
          }

          const { data: dbMeasurements } = await supabase
            .from('pengukuran')
            .select('*')
            .eq('anak_id', anakId)
            .order('tgl_ukur', { ascending: true });

          if (dbMeasurements && dbMeasurements.length > 0) {
            foundMeasurements = dbMeasurements;
            for (const m of dbMeasurements) {
              await db.pengukuran_cache.put(m);
            }
          }
        } catch (supaErr) {
          console.warn('Supabase fetch error, using local data:', supaErr);
        }
      }

      // 3. Fallback demo / test quality children if nothing in local or server DB
      if (!foundChild) {
        const testChild = TEST_QUALITY_CHILDREN.find((c) => c.id === anakId);
        if (testChild) {
          foundChild = testChild;
          foundMeasurements = TEST_QUALITY_MEASUREMENTS.filter((m) => m.anak_id === anakId);
        } else {
          foundChild = {
            id: anakId,
            desa_id: 1,
            posyandu_id: 1,
            nama: 'Rayyan Pratama',
            nik: '3201124508230001',
            no_kk: '3201120000000001',
            nama_pengasuh: 'Siti Rahmawati',
            hubungan_pengasuh: 'ibu',
            tgl_lahir: '2025-08-15',
            jenis_kelamin: 'L',
          };
        }
      }

      // Sort measurements chronological
      foundMeasurements.sort(
        (a, b) => new Date(a.tgl_ukur).getTime() - new Date(b.tgl_ukur).getTime()
      );

      setChild(foundChild);
      setMeasurements(foundMeasurements);
    } catch (err) {
      console.error('Fatal load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (anakId) {
      loadChildData();
    }
  }, [anakId]);

  const handleBuatKodeTautan = async () => {
    setTautanError(null);
    setCopiedCode(false);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setTautanError('Butuh sinyal untuk membuat kode.');
      return;
    }

    setLoadingCode(true);
    try {
      const code = await buatKodeTautan(anakId, supabase);
      setTautanCode(code);
    } catch {
      setTautanError('Butuh sinyal untuk membuat kode.');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (tautanCode) {
      try {
        await navigator.clipboard.writeText(tautanCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch {
        // fallback
      }
    }
  };

  const formatHubungan = (h?: string) => {
    switch (h) {
      case 'ibu':
        return 'Ibu';
      case 'ayah':
        return 'Ayah';
      case 'nenek_kakek':
        return 'Nenek / Kakek';
      case 'wali_lain':
        return 'Wali lain';
      default:
        return 'Pengasuh';
    }
  };

  const latestQualityFlags = useMemo(() => {
    if (!child || measurements.length === 0) return [];
    const sorted = [...measurements].sort(
      (a, b) => new Date(a.tgl_ukur).getTime() - new Date(b.tgl_ukur).getTime()
    );
    const latest = sorted[sorted.length - 1];
    return evaluateMeasurementFlags(latest, sorted, child);
  }, [child, measurements]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[480px] mx-auto w-full space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-200/80 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-200/80 rounded animate-pulse" />
              <div className="h-6 w-36 bg-slate-200/80 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-28 rounded-full bg-slate-200/80 animate-pulse" />
        </div>

        <div className="space-y-6">
          <Skeleton variant="card" className="h-44 rounded-[24px]" />
          <Skeleton variant="card" className="h-64 rounded-[24px]" />
          <Skeleton variant="card" className="h-40 rounded-[24px]" />
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen px-4 py-12 flex flex-col justify-center max-w-[480px] mx-auto w-full">
        <ErrorState
          title="Data balita tidak ditemukan"
          message="Data balita mungkin belum tersimpan di perangkat ini atau telah dihapus."
          onRetry={loadChildData}
          retryLabel="Coba lagi"
          secondaryAction={
            <Button
              variant="secondary"
              size="kader"
              onClick={() => router.push('/kader/anak')}
            >
              Kembali ke Daftar Balita
            </Button>
          }
        />
      </div>
    );
  }

  const ageInMonths = calculateAgeInMonths(child.tgl_lahir);
  const isBoy = child.jenis_kelamin === 'L';
  const caregiverName = child.nama_pengasuh || 'Pengasuh';

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[480px] mx-auto w-full pb-36">
      <div className="space-y-6">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/kader/anak')}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary transition-colors cursor-pointer"
              title="Kembali ke Daftar Balita"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
            <div>
              <span className="text-[16px] font-bold text-teal uppercase tracking-wider block">
                KMS Digital
              </span>
              <h1 className="text-[24px] font-bold text-text leading-tight">
                Detail & Kurva Balita
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {/* 1. Child Info Summary Card */}
        <Card padding="20" className="border border-border bg-white shadow-card">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-soft ${
                  isBoy ? 'bg-teal-light text-teal' : 'bg-primary-selected text-primary'
                }`}
              >
                <User size={30} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-text leading-snug">
                  {child.nama}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[16px] font-bold text-text">
                    {ageInMonths} Bulan
                  </span>
                  <span className="text-border">•</span>
                  <span className="text-[16px] text-text-muted font-medium">
                    {isBoy ? 'Laki-laki' : 'Perempuan'}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="kader"
              fullWidth={false}
              onClick={() => router.push(`/kader/ukur/${child.id}`)}
              icon={<Ruler size={20} strokeWidth={2} />}
              className="text-[16px] font-bold flex-shrink-0 px-4"
            >
              Ukur
            </Button>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-3 text-[16px]">
            <div>
              <span className="text-text-muted block text-[16px]">Nama Pengasuh:</span>
              <span className="font-bold text-text text-[16px]">{caregiverName}</span>
              {child.hubungan_pengasuh && (
                <span className="text-[15px] text-teal font-semibold block">
                  ({formatHubungan(child.hubungan_pengasuh)})
                </span>
              )}
            </div>
            <div>
              <span className="text-text-muted block text-[16px]">Tanggal Lahir:</span>
              <span className="font-bold text-text text-[16px]">
                {formatIndonesianDate(child.tgl_lahir)}
              </span>
            </div>
            {child.nik && (
              <div className="col-span-2 pt-2 border-t border-border mt-1">
                <span className="text-text-muted block text-[16px]">NIK Balita:</span>
                <span className="font-mono text-[16px] font-bold text-text">{child.nik}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Calm Card: Kualitas Data Angka Terakhir Perlu Dicek */}
        {latestQualityFlags.length > 0 && (
          <Card
            id="card-quality-perlu-dicek"
            padding="20"
            className="border-2 border-yellow/40 bg-yellow-light/40 shadow-soft"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-yellow/20 text-[#9A6F00] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={24} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[18px] font-bold text-text leading-snug">
                    Angka terakhir perlu dicek. Disarankan ukur ulang.
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {latestQualityFlags.map((flag, idx) => (
                      <div key={idx} className="flex flex-col text-[16px]">
                        <span className="font-bold text-[#9A6F00]">• {flag.label}</span>
                        <span className="text-text-muted text-[16px] ml-3">
                          {flag.suggestion.replace(/salah/gi, 'perlu dipastikan')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-yellow/30 flex justify-end">
                <Button
                  variant="secondary"
                  size="kader"
                  fullWidth={false}
                  onClick={() => router.push(`/kader/ukur/${child.id}`)}
                  icon={<RotateCcw size={18} strokeWidth={2} />}
                  className="text-[16px] font-bold bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Ukur ulang
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 2. Tautkan Keluarga Card */}
        <Card padding="20" className="border border-border bg-white shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={24} strokeWidth={2} className="text-primary" />
            <h3 className="text-[20px] font-bold text-text">Tautkan keluarga</h3>
          </div>
          <p className="text-[16px] text-text-muted mb-4 leading-relaxed">
            Bagikan kode tautan ini ke orang tua atau keluarga balita agar dapat memantau tumbuh kembang dari aplikasi mereka.
          </p>

          {tautanError && (
            <div role="alert" className="mb-3 p-3.5 rounded-[12px] bg-red-light border border-red/40 text-red text-[16px] flex items-center gap-2">
              <TriangleAlert size={20} strokeWidth={2} className="flex-shrink-0" />
              <span className="font-medium">{tautanError}</span>
            </div>
          )}

          {tautanCode ? (
            <div className="p-4 rounded-[16px] bg-primary-selected border border-primary/20 flex flex-col items-center gap-2.5">
              <span className="text-[16px] font-bold text-primary uppercase tracking-wider">
                Kode Tautan Balita
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[28px] font-extrabold text-primary tracking-widest font-mono">
                  {tautanCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-4 py-2.5 rounded-full bg-white border border-primary/30 text-primary text-[16px] font-bold flex items-center gap-2 hover:bg-primary hover:text-white transition-colors cursor-pointer min-h-[48px]"
                  aria-label="Salin kode tautan"
                >
                  {copiedCode ? (
                    <>
                      <CircleCheck size={18} strokeWidth={2} />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} strokeWidth={2} />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[16px] text-text-muted text-center font-medium">
                Berlaku 7 hari. Satu kode untuk satu orang.
              </p>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="kader"
              loading={loadingCode}
              onClick={handleBuatKodeTautan}
            >
              Buat kode
            </Button>
          )}
        </Card>

        {/* 3. Growth Charts */}
        <section id="section-charts">
          <GrowthCharts child={child} measurements={measurements} />
        </section>

        {/* 4. Measurement History List */}
        <section id="section-history" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[18px] font-bold text-text flex items-center gap-2">
              <Clock size={20} strokeWidth={2} className="text-teal" />
              <span>Riwayat Pengukuran ({measurements.length})</span>
            </h3>
            <button
              onClick={() => router.push(`/kader/ukur/${child.id}`)}
              className="text-[16px] font-bold text-primary hover:underline cursor-pointer"
            >
              + Tambah ukur
            </button>
          </div>

          {measurements.length === 0 ? (
            <Card padding="20" className="text-center py-6 text-text-muted bg-slate-50 border-dashed">
              <p className="text-[16px] font-medium">Belum ada riwayat pengukuran untuk balita ini.</p>
              <div className="mt-3 max-w-xs mx-auto">
                <Button
                  variant="primary"
                  size="kader"
                  onClick={() => router.push(`/kader/ukur/${child.id}`)}
                >
                  Mulai ukur sekarang
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {measurements.map((m) => {
                return (
                  <Card
                    key={m.id}
                    padding="16"
                    className="cursor-pointer hover:border-primary/40 active:scale-[0.99] transition-all min-h-[72px]"
                    onClick={() => router.push(`/kader/hasil/${m.id}`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] font-bold text-text">
                            {formatIndonesianDate(m.tgl_ukur)}
                          </span>
                          {m.status ? (
                            <StatusBadge status={m.status} size="sm" />
                          ) : (
                            <span className="text-[14px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-text-muted border border-border">
                              Tersimpan di HP
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[16px] font-semibold text-text-muted mt-1">
                          <span className="flex items-center gap-1.5">
                            <Scale size={18} strokeWidth={2} className="text-teal" />
                            {m.berat_kg} kg
                          </span>
                          <span className="text-border">•</span>
                          <span className="flex items-center gap-1.5">
                            <Ruler size={18} strokeWidth={2} className="text-primary" />
                            {m.tinggi_cm} cm
                          </span>
                          {m.z_tbu !== null && m.z_tbu !== undefined && (
                            <>
                              <span className="text-border">•</span>
                              <span className="text-[16px] font-bold text-text">
                                Z-Score: {m.z_tbu > 0 ? '+' : ''}{m.z_tbu} SD
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-text-muted hover:text-primary">
                        <span className="text-[16px] font-bold hidden sm:inline">Hasil</span>
                        <ChevronRight size={24} strokeWidth={2} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 text-center border-t border-border">
        <p className="text-[16px] text-text-muted">
          StuntGuard • Kurva Baku Pertumbuhan WHO (KMS Digital)
        </p>
      </footer>

      {/* Main Action in BottomActionBar: Ukur Balita Sekarang */}
      <BottomActionBar
        secondaryAction={
          <Button
            variant="secondary"
            size="kader"
            onClick={() => router.push('/kader/anak')}
          >
            Kembali ke Daftar Balita
          </Button>
        }
      >
        <Button
          id="btn-mulai-ukur-bottom"
          variant="primary"
          size="kader"
          onClick={() => router.push(`/kader/ukur/${child.id}`)}
          icon={<Ruler size={24} strokeWidth={2} />}
        >
          Ukur Balita Sekarang
        </Button>
      </BottomActionBar>
    </div>
  );
}
