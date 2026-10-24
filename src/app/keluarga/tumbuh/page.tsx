'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Skeleton } from '@/components/ui';
import { KeluargaTabBar } from '@/components/keluarga/KeluargaTabBar';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { GrowthCharts } from '@/components/GrowthCharts';
import { Anak, HubunganPengasuh, Pengukuran } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { getLinkedChildren } from '@/lib/tautanEngine';
import { db } from '@/lib/db';
import { verifyAndEnforceCacheSafety } from '@/lib/cacheSafety';
import {
  getCaregiverStatusDetail,
  getCaregiverStatusSentence,
  VISUAL_GUIDE_DISCLAIMER,
} from '@/lib/caregiverStatusConfig';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Baby,
  ChevronDown,
  Ruler,
  Scale,
} from 'lucide-react';

export default function KeluargaTumbuhPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [linkedList, setLinkedList] = useState<Array<{ child: Anak; hubungan: HubunganPengasuh }>>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Pengukuran[]>([]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        let userPayload: any = null;

        // 1. Supabase auth
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            userPayload = {
              id: data.user.id,
              role: data.user.user_metadata?.role || 'pengasuh',
              nama: data.user.user_metadata?.nama || 'Pengasuh',
            };
          }
        } catch {
          // ignore
        }

        // 2. Cookie fallback
        if (!userPayload && typeof document !== 'undefined') {
          const match = document.cookie.match(/sg_dev_session=([^;]+)/);
          if (match) {
            try {
              userPayload = JSON.parse(decodeURIComponent(match[1]));
            } catch {
              userPayload = null;
            }
          }
        }

        if (!userPayload) {
          router.push('/login');
          return;
        }

        if (userPayload.role !== 'pengasuh') {
          router.push(userPayload.role === 'kader' ? '/kader' : '/desa');
          return;
        }

        setCurrentUser(userPayload);

        // Enforce cache safety before displaying any child data
        await verifyAndEnforceCacheSafety(userPayload.id);

        // 3. Load linked children
        const items = await getLinkedChildren(userPayload.id, supabase);
        setLinkedList(items);

        if (items.length > 0) {
          let chosenId = items[0].child.id;
          if (typeof window !== 'undefined') {
            const savedId = localStorage.getItem('sg_selected_child_id');
            if (savedId && items.some((it) => it.child.id === savedId)) {
              chosenId = savedId;
            }
          }
          setActiveChildId(chosenId);
          await loadMeasurements(chosenId);
        }
      } catch (err) {
        console.error('Error initializing tumbuh page:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const loadMeasurements = async (childId: string) => {
    try {
      let list: Pengukuran[] = [];

      // 1. Local IndexedDB cache lookup
      try {
        const cached = await db.pengukuran_cache.where('anak_id').equals(childId).toArray();
        if (cached && cached.length > 0) {
          list = cached;
        }
      } catch {
        // ignore
      }

      // 2. Real Supabase fetch (RLS allows caregiver to read their linked child's rows)
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isRealSupabase && navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('pengukuran')
            .select('*')
            .eq('anak_id', childId)
            .order('tgl_ukur', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            list = data;
            for (const row of data) {
              await db.pengukuran_cache.put(row);
            }
          }
        } catch (supaErr) {
          console.warn('Supabase fetch measurements error:', supaErr);
        }
      }

      // Sort chronological
      list.sort((a, b) => new Date(a.tgl_ukur).getTime() - new Date(b.tgl_ukur).getTime());
      setMeasurements(list);
    } catch (err) {
      console.error('Failed to load child measurements:', err);
    }
  };

  const handleSelectChild = async (childId: string) => {
    setActiveChildId(childId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sg_selected_child_id', childId);
    }
    await loadMeasurements(childId);
  };

  const activeChild = linkedList.find((it) => it.child.id === activeChildId)?.child || null;

  // Latest measurement
  const latestMeasurement =
    measurements.length > 0
      ? [...measurements].sort(
          (a, b) => new Date(b.tgl_ukur).getTime() - new Date(a.tgl_ukur).getTime()
        )[0]
      : null;

  const statusDetail = getCaregiverStatusDetail(latestMeasurement?.status);

  const calculateAgeMonths = (tglLahir: string, refDate?: string) => {
    const b = new Date(tglLahir);
    const now = refDate ? new Date(refDate) : new Date();
    let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
    if (now.getDate() < b.getDate()) months--;
    return Math.max(0, months);
  };

  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusIcon = (status: string) => {
    if (status === 'hijau') return <CheckCircle2 size={18} className="text-emerald-700" />;
    if (status === 'kuning') return <AlertTriangle size={18} className="text-amber-700" />;
    if (status === 'merah') return <AlertOctagon size={18} className="text-rose-700" />;
    return <HelpCircle size={18} className="text-slate-600" />;
  };

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-6 max-w-[480px] mx-auto w-full space-y-6 pb-28">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <Skeleton className="h-10 w-44 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
        <KeluargaTabBar />
      </main>
    );
  }

  if (!activeChild) {
    return (
      <main className="min-h-screen px-4 py-6 max-w-[480px] mx-auto w-full space-y-6 pb-28">
        <header className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <span className="text-[13px] font-bold text-teal uppercase tracking-wider block">
              Kurva Pertumbuhan
            </span>
            <h1 className="text-[22px] font-extrabold text-text leading-tight">
              Tumbuh Kembang
            </h1>
          </div>
          <SyncStatusBadge />
        </header>

        <Card padding="20" className="border-2 border-border bg-card text-center py-10 shadow-soft">
          <div className="w-16 h-16 rounded-full bg-teal/10 text-teal flex items-center justify-center mx-auto mb-3">
            <Baby size={32} />
          </div>
          <h2 className="text-[18px] font-extrabold text-text mb-2">
            Belum Ada Balita Tertaut
          </h2>
          <p className="text-[15px] text-text-muted leading-relaxed mb-6">
            Tautkan data balita Anda terlebih dahulu dengan kode 8 digit dari kader Posyandu.
          </p>
          <Button
            variant="primary"
            size="kader"
            onClick={() => router.push('/keluarga/tautkan')}
            className="w-full min-h-[54px] text-[16px] font-bold"
          >
            Tautkan Balita Sekarang
          </Button>
        </Card>

        <KeluargaTabBar />
      </main>
    );
  }

  const childAgeMonths = calculateAgeMonths(activeChild.tgl_lahir);

  return (
    <main className="min-h-screen px-4 py-6 max-w-[480px] mx-auto w-full space-y-6 pb-28 select-none">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <span className="text-[13px] font-bold text-teal uppercase tracking-wider block">
            Kurva Pertumbuhan
          </span>
          <h1 className="text-[22px] font-extrabold text-text leading-tight">
            Tumbuh Kembang
          </h1>
        </div>
        <SyncStatusBadge />
      </header>

      {/* Child Switcher if multiple children */}
      {linkedList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {linkedList.map((item) => (
            <button
              key={item.child.id}
              onClick={() => handleSelectChild(item.child.id)}
              className={`px-3.5 py-2 rounded-2xl text-[14px] font-bold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                item.child.id === activeChildId
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-text-muted border-border hover:border-primary/50'
              }`}
            >
              <Baby size={16} />
              <span>{item.child.nama}</span>
            </button>
          ))}
        </div>
      )}

      {/* Child Information Pill */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-border shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal/10 text-teal flex items-center justify-center font-bold">
            <Baby size={22} />
          </div>
          <div>
            <h2 className="text-[16px] font-extrabold text-text leading-tight">
              {activeChild.nama}
            </h2>
            <p className="text-[13px] text-text-muted font-medium">
              Usia {childAgeMonths} bulan • {activeChild.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
            </p>
          </div>
        </div>
        {latestMeasurement && (
          <div className="text-right">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
              Ukur Terakhir
            </span>
            <span className="text-[13px] font-extrabold text-text">
              {formatDateIndo(latestMeasurement.tgl_ukur)}
            </span>
          </div>
        )}
      </div>

      {/* 1. Calm Status Card: ONE status badge + ONE kind sentence (NO full-screen red alert) */}
      <Card
        padding="20"
        className={`border-2 ${statusDetail.cardBg} ${statusDetail.cardBorder} shadow-soft space-y-3 transition-all`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-text-muted uppercase tracking-wider">
            Status Perkembangan
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[13px] font-extrabold ${statusDetail.badgeBg} ${statusDetail.badgeBorder} ${statusDetail.badgeText}`}
          >
            {renderStatusIcon(statusDetail.status)}
            <span>{statusDetail.label}</span>
          </span>
        </div>

        <p className="text-[16px] font-bold text-text leading-relaxed">
          {statusDetail.sentence}
        </p>
      </Card>

      {/* 2. Simplified Growth Card: Reuses the prompt C component (variant="caregiver") */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[17px] font-extrabold text-text">
            Grafik Pertumbuhan
          </h3>
          <span className="text-[13px] font-semibold text-teal">
            Standar Baku WHO
          </span>
        </div>

        {/* GrowthCharts component reused from Prompt C */}
        <GrowthCharts
          child={activeChild}
          measurements={measurements}
          variant="caregiver"
          caregiverSentence={statusDetail.sentence}
          className="shadow-soft"
        />
      </div>

      {/* 3. List of Past Measurements in Plain Words */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[17px] font-extrabold text-text">
            Riwayat Pengukuran
          </h3>
          <span className="text-[13px] font-semibold text-text-muted">
            {measurements.length} catatan
          </span>
        </div>

        {measurements.length === 0 ? (
          <Card padding="20" className="border border-border bg-card text-center py-8">
            <p className="text-[15px] font-semibold text-text-muted">
              Belum ada riwayat pengukuran. Jadwal pengukuran berikutnya dapat dilihat di Posyandu.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {[...measurements]
              .sort(
                (a, b) => new Date(b.tgl_ukur).getTime() - new Date(a.tgl_ukur).getTime()
              )
              .map((m, idx) => {
                const itemAge = calculateAgeMonths(activeChild.tgl_lahir, m.tgl_ukur);
                const itemDetail = getCaregiverStatusDetail(m.status);
                return (
                  <Card
                    key={m.id || idx}
                    padding="16"
                    className="border border-border bg-white shadow-soft flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-teal" />
                        <span className="text-[14px] font-extrabold text-text">
                          {formatDateIndo(m.tgl_ukur)}
                        </span>
                        <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          Usia {itemAge} bln
                        </span>
                      </div>
                      <p className="text-[15px] font-bold text-text pl-6">
                        Tinggi {m.tinggi_cm} cm • Berat {m.berat_kg} kg
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[12px] font-extrabold flex-shrink-0 ${itemDetail.badgeBg} ${itemDetail.badgeBorder} ${itemDetail.badgeText}`}
                    >
                      {renderStatusIcon(itemDetail.status)}
                      <span>{itemDetail.label}</span>
                    </span>
                  </Card>
                );
              })}
          </div>
        )}
      </section>

      {/* Bottom Tab Bar */}
      <KeluargaTabBar />
    </main>
  );
}
