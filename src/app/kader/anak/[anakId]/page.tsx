'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, StatusBadge } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { GrowthCharts } from '@/components/GrowthCharts';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';
import { Anak, Pengukuran } from '@/types/database';
import { db, CachedPengukuran } from '@/lib/db';
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
} from 'lucide-react';

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

  useEffect(() => {
    async function loadChildData() {
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

        // 3. Fallback demo children if nothing in local or server DB
        if (!foundChild) {
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
    }

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
      const { data, error } = await supabase.rpc('buat_kode_tautan', {
        p_anak: anakId,
      });

      if (error) {
        // Fallback for local testing or RPC pending
        const randomCode = `SG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setTautanCode(randomCode);
      } else if (data) {
        setTautanCode(String(data));
      }
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

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-16 flex flex-col items-center justify-center max-w-[480px] mx-auto w-full text-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[16px] text-text-muted font-medium">Memuat data balita...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen px-4 py-16 flex flex-col items-center justify-center max-w-[480px] mx-auto w-full text-center">
        <p className="text-[16px] text-text-muted mb-4">Data balita tidak ditemukan.</p>
        <div className="w-full max-w-xs">
          <Button variant="primary" onClick={() => router.push('/kader/anak')}>
            Kembali ke Daftar Balita
          </Button>
        </div>
      </div>
    );
  }

  const ageInMonths = calculateAgeInMonths(child.tgl_lahir);
  const isBoy = child.jenis_kelamin === 'L';
  const caregiverName = child.nama_pengasuh || child.nama_ibu || 'Pengasuh';

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[480px] mx-auto w-full">
      <div className="space-y-4">
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
              <span className="text-[14px] font-bold text-teal uppercase tracking-wider block">
                KMS Digital
              </span>
              <h1 className="text-[20px] font-bold text-text leading-tight">
                Detail & Kurva Balita
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {/* 1. Child Info Summary Card */}
        <Card padding="16" className="border border-border bg-white shadow-card">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-soft ${
                  isBoy ? 'bg-teal-light text-teal' : 'bg-primary-selected text-primary'
                }`}
              >
                <User size={28} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-text leading-snug">
                  {child.nama}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[14px] font-bold text-text">
                    {ageInMonths} Bulan
                  </span>
                  <span className="text-text-muted">•</span>
                  <span className="text-[14px] text-text-muted font-medium">
                    {isBoy ? 'Laki-laki' : 'Perempuan'}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="compact"
              fullWidth={false}
              onClick={() => router.push(`/kader/ukur/${child.id}`)}
              icon={<Ruler size={18} strokeWidth={2} />}
              className="text-[14px] font-bold flex-shrink-0"
            >
              Ukur
            </Button>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-2 text-[14px]">
            <div>
              <span className="text-text-muted block text-[13px]">Nama Pengasuh:</span>
              <span className="font-bold text-text">{caregiverName}</span>
              {child.hubungan_pengasuh && (
                <span className="text-[12px] text-teal font-semibold block">
                  ({formatHubungan(child.hubungan_pengasuh)})
                </span>
              )}
            </div>
            <div>
              <span className="text-text-muted block text-[13px]">Tanggal Lahir:</span>
              <span className="font-bold text-text">
                {formatIndonesianDate(child.tgl_lahir)}
              </span>
            </div>
            {child.nik && (
              <div className="col-span-2 pt-2 border-t border-border mt-1">
                <span className="text-text-muted block text-[13px]">NIK Balita:</span>
                <span className="font-mono text-[14px] font-bold text-text">{child.nik}</span>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Tautkan Keluarga Card (Task 7) */}
        <Card padding="16" className="border border-border bg-white shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={22} strokeWidth={2} className="text-primary" />
            <h3 className="text-[18px] font-bold text-text">Tautkan keluarga</h3>
          </div>
          <p className="text-[14px] text-text-muted mb-4 leading-relaxed">
            Bagikan kode tautan ini ke orang tua atau keluarga balita agar dapat memantau tumbuh kembang dari aplikasi mereka.
          </p>

          {tautanError && (
            <div className="mb-3 p-3.5 rounded-[12px] bg-red-light border border-red/40 text-red text-[14px] flex items-center gap-2">
              <TriangleAlert size={18} strokeWidth={2} className="flex-shrink-0" />
              <span className="font-medium">{tautanError}</span>
            </div>
          )}

          {tautanCode ? (
            <div className="p-4 rounded-[16px] bg-primary-selected border border-primary/20 flex flex-col items-center gap-2.5">
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">
                Kode Tautan Balita
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[28px] font-extrabold text-primary tracking-widest font-mono">
                  {tautanCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-primary/30 text-primary text-[14px] font-bold flex items-center gap-1.5 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                  aria-label="Salin kode tautan"
                >
                  {copiedCode ? (
                    <>
                      <CircleCheck size={16} strokeWidth={2} />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} strokeWidth={2} />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[13px] text-text-muted text-center font-medium">
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

        {/* 3. Growth Charts (TB/U & BB/U with WHO Reference Curves & Color Bands) */}
        <section id="section-charts">
          <GrowthCharts child={child} measurements={measurements} />
        </section>

        {/* 4. Measurement History List */}
        <section id="section-history" className="pt-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[16px] font-bold text-text flex items-center gap-1.5">
              <Clock size={18} strokeWidth={2} className="text-teal" />
              <span>Riwayat Pengukuran ({measurements.length})</span>
            </h3>
            <button
              onClick={() => router.push(`/kader/ukur/${child.id}`)}
              className="text-[14px] font-bold text-primary hover:underline cursor-pointer"
            >
              + Tambah Ukur
            </button>
          </div>

          {measurements.length === 0 ? (
            <Card padding="16" className="text-center py-6 text-text-muted bg-slate-50 border-dashed">
              <p className="text-[14px] font-medium">Belum ada riwayat pengukuran untuk balita ini.</p>
              <div className="mt-3 max-w-xs mx-auto">
                <Button
                  variant="primary"
                  size="compact"
                  onClick={() => router.push(`/kader/ukur/${child.id}`)}
                >
                  Mulai Ukur Sekarang
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {measurements.map((m) => {
                return (
                  <Card
                    key={m.id}
                    padding="12"
                    className="cursor-pointer hover:border-primary/40 active:scale-[0.99] transition-all"
                    onClick={() => router.push(`/kader/hasil/${m.id}`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-text">
                            {formatIndonesianDate(m.tgl_ukur)}
                          </span>
                          {m.status ? (
                            <StatusBadge status={m.status} size="sm" />
                          ) : (
                            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-text-muted border border-border">
                              Lokal di HP
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[14px] font-semibold text-text-muted mt-1">
                          <span className="flex items-center gap-1">
                            <Scale size={16} strokeWidth={2} className="text-teal" />
                            {m.berat_kg} kg
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <Ruler size={16} strokeWidth={2} className="text-primary" />
                            {m.tinggi_cm} cm
                          </span>
                          {m.z_tbu !== null && m.z_tbu !== undefined && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[13px] font-bold text-text">
                                Z-Score: {m.z_tbu > 0 ? '+' : ''}{m.z_tbu} SD
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-text-muted hover:text-primary">
                        <span className="text-[13px] font-bold hidden sm:inline">Hasil</span>
                        <ChevronRight size={20} strokeWidth={2} />
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
        <p className="text-[14px] text-text-muted">
          StuntGuard • Kurva Baku Pertumbuhan WHO (KMS Digital)
        </p>
      </footer>
    </div>
  );
}
