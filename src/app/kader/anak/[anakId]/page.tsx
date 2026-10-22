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
  ArrowLeft,
  Scale,
  Ruler,
  Calendar,
  User,
  ChevronRight,
  TrendingUp,
  Clock,
  PlusCircle,
} from 'lucide-react';

export default function ChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const anakId = params.anakId as string;
  const supabase = createClient();

  const [child, setChild] = useState<Anak | null>(null);
  const [measurements, setMeasurements] = useState<Pengukuran[]>([]);
  const [loading, setLoading] = useState(true);

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
          if (!foundChild) {
            const { data: cData } = await supabase
              .from('anak')
              .select('*')
              .eq('id', anakId)
              .single();

            if (cData) {
              foundChild = cData;
              await db.anak_cache.put(cData);
            }
          }

          const { data: mData } = await supabase
            .from('pengukuran')
            .select('*')
            .eq('anak_id', anakId)
            .order('tgl_ukur', { ascending: false });

          if (mData && mData.length > 0) {
            foundMeasurements = mData;
            await db.pengukuran_cache.bulkPut(
              mData.map((m) => ({ ...m, is_offline: false }))
            );
          }
        }

        // 3. Fallback to localStorage demo data if needed
        if (!foundChild) {
          const raw = localStorage.getItem('sg_local_anak');
          if (raw) {
            const list: Anak[] = JSON.parse(raw);
            const c = list.find((item) => item.id === anakId);
            if (c) foundChild = c;
          }
        }

        if (foundChild && foundMeasurements.length === 0) {
          const rawP = localStorage.getItem('sg_local_pengukuran');
          if (rawP) {
            const pList: Pengukuran[] = JSON.parse(rawP);
            foundMeasurements = pList.filter((m) => m.anak_id === anakId);
          }
        }

        // Sort measurements by date descending for the history list
        foundMeasurements.sort(
          (a, b) => new Date(b.tgl_ukur).getTime() - new Date(a.tgl_ukur).getTime()
        );

        setChild(foundChild);
        setMeasurements(foundMeasurements);
      } catch (err) {
        console.error('Error loading child details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (anakId) {
      loadChildData();
    }
  }, [anakId]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-16 text-center text-slate-500 max-w-[420px] mx-auto w-full">
        <div className="w-9 h-9 border-3 border-berry border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[14px] font-bold">Memuat profil dan kurva balita...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto w-full flex flex-col justify-between">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Balita Tidak Ditemukan</h2>
          <p className="text-sm text-slate-500 mb-6">
            Data balita dengan ID ini tidak tersedia di memori perangkat.
          </p>
          <Button variant="primary" onClick={() => router.push('/kader/anak')}>
            Kembali ke Daftar Balita
          </Button>
        </div>
      </div>
    );
  }

  const ageInMonths = calculateAgeInMonths(child.tgl_lahir);
  const isBoy = child.jenis_kelamin === 'L';

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      <div className="space-y-4">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/kader/anak')}
              className="w-11 h-11 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-700 hover:border-berry transition-colors cursor-pointer"
              title="Kembali ke Daftar Balita"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <span className="text-[11px] font-bold text-slateTeal uppercase tracking-wider block">
                KMS Digital
              </span>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                Detail & Kurva Balita
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {/* 1. Child Info Summary Card */}
        <Card padding="md" className="border-2 border-slate-200/90 bg-white">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-2xl flex-shrink-0 shadow-sm ${
                  isBoy ? 'bg-slateTeal-light text-slateTeal' : 'bg-berry-light text-berry'
                }`}
              >
                {isBoy ? '👦' : '👧'}
              </div>
              <div>
                <h2 className="text-[18px] font-black text-slate-900 leading-snug">
                  {child.nama}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[13px] font-bold text-slate-700">
                    {ageInMonths} Bulan
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[13px] text-slate-500 font-medium">
                    {isBoy ? 'Laki-laki' : 'Perempuan'}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              fullWidth={false}
              onClick={() => router.push(`/kader/ukur/${child.id}`)}
              icon={<PlusCircle size={15} />}
              className="text-[12px] font-bold flex-shrink-0 min-h-[38px] py-1.5 px-3"
            >
              Ukur
            </Button>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <span className="text-slate-400 block font-semibold text-[11px]">Nama Ibu:</span>
              <span className="font-bold text-slate-800">{child.nama_ibu}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[11px]">Tanggal Lahir:</span>
              <span className="font-bold text-slate-800">
                {formatIndonesianDate(child.tgl_lahir)}
              </span>
            </div>
            {child.nik && (
              <div className="col-span-2 pt-1 border-t border-slate-100 mt-1">
                <span className="text-slate-400 block font-semibold text-[11px]">NIK Balita:</span>
                <span className="font-mono text-[12px] font-bold text-slate-700">{child.nik}</span>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Growth Charts (TB/U & BB/U with WHO Reference Curves & Color Bands) */}
        <section id="section-charts">
          <GrowthCharts child={child} measurements={measurements} />
        </section>

        {/* 3. Measurement History List */}
        <section id="section-history" className="pt-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[15px] font-extrabold text-slate-900 flex items-center gap-1.5">
              <Clock size={16} className="text-slateTeal" />
              <span>Riwayat Pengukuran ({measurements.length})</span>
            </h3>
            <button
              onClick={() => router.push(`/kader/ukur/${child.id}`)}
              className="text-[12px] font-bold text-berry hover:underline cursor-pointer"
            >
              + Tambah Ukur
            </button>
          </div>

          {measurements.length === 0 ? (
            <Card padding="md" className="text-center py-6 text-slate-500 bg-slate-50/70 border-dashed">
              <p className="text-[13px] font-medium">Belum ada riwayat pengukuran untuk balita ini.</p>
              <Button
                variant="primary"
                fullWidth={false}
                className="mt-3 text-[13px] min-h-[42px] px-4"
                onClick={() => router.push(`/kader/ukur/${child.id}`)}
              >
                Mulai Ukur Sekarang
              </Button>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {measurements.map((m) => {
                const measureAge = calculateAgeInMonths(m.tgl_ukur);
                return (
                  <Card
                    key={m.id}
                    padding="sm"
                    className="cursor-pointer hover:border-berry/40 active:scale-[0.99] transition-all"
                    onClick={() => router.push(`/kader/hasil/${m.id}`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-black text-slate-900">
                            {formatIndonesianDate(m.tgl_ukur)}
                          </span>
                          {m.status ? (
                            <StatusBadge status={m.status} size="sm" />
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Lokal di HP
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[12px] font-bold text-slate-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Scale size={13} className="text-slateTeal" />
                            {m.berat_kg} kg
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <Ruler size={13} className="text-berry" />
                            {m.tinggi_cm} cm
                          </span>
                          {m.z_tbu !== null && m.z_tbu !== undefined && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] font-extrabold text-slate-700">
                                Z-Score: {m.z_tbu > 0 ? '+' : ''}{m.z_tbu} SD
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 hover:text-berry">
                        <span className="text-[11px] font-bold hidden sm:inline">Hasil</span>
                        <ChevronRight size={18} />
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
      <footer className="mt-8 pt-4 text-center border-t border-slate-100">
        <p className="text-[12px] text-slate-400">
          StuntGuard • Kurva Baku Pertumbuhan WHO (KMS Digital)
        </p>
      </footer>
    </div>
  );
}
