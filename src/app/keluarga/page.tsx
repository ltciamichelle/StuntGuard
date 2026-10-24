'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, StatusBadge } from '@/components/ui';
import { Anak, Pengukuran, HubunganPengasuh } from '@/types/database';
import { getLinkedChildren } from '@/lib/tautanEngine';
import { db, CachedPengukuran } from '@/lib/db';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';
import { getTbuChartSentence, getBbuChartSentence } from '@/lib/growthChartUtils';
import { TEST_QUALITY_MEASUREMENTS } from '@/lib/kualitas-config';
import { OnboardingCaregiver } from '@/components/keluarga/OnboardingCaregiver';
import {
  User,
  Heart,
  Users,
  Scale,
  Ruler,
  Calendar,
  Link2,
  ChevronRight,
  LogOut,
  Shield,
  Apple,
  Sparkles,
  Info,
  Clock,
  PlusCircle,
} from 'lucide-react';

export default function KeluargaDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [linkedList, setLinkedList] = useState<Array<{ child: Anak; hubungan: HubunganPengasuh }>>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Pengukuran[]>([]);

  useEffect(() => {
    async function initUser() {
      setLoading(true);
      try {
        let userPayload: any = null;

        // 1. Check real Supabase user
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            userPayload = {
              id: data.user.id,
              email: data.user.email,
              role: profile?.role || data.user.user_metadata?.role || 'pengasuh',
              nama: profile?.nama || data.user.user_metadata?.nama || 'Pengasuh',
            };
          }
        } catch {
          // fallback to cookie
        }

        // 2. Dev session cookie fallback
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

        // Enforce role isolation: only role 'pengasuh' can view /keluarga
        if (userPayload.role !== 'pengasuh') {
          if (userPayload.role === 'kader') {
            router.push('/kader');
          } else {
            router.push('/desa');
          }
          return;
        }

        setCurrentUser(userPayload);

        // 3. Check Onboarding completion
        if (typeof window !== 'undefined') {
          const onboardingDone = localStorage.getItem('sg_keluarga_onboarding_done');
          if (!onboardingDone) {
            setShowOnboarding(true);
            setLoading(false);
            return;
          }
        }

        // 4. Load linked children
        await loadChildren(userPayload.id);
      } catch (err) {
        console.error('Error initializing keluarga page:', err);
      } finally {
        setLoading(false);
      }
    }

    initUser();
  }, []);

  const loadChildren = async (userId: string) => {
    try {
      const items = await getLinkedChildren(userId, supabase);
      setLinkedList(items);

      if (items.length > 0) {
        // Retrieve chosen child from localStorage if available
        let chosenId = items[0].child.id;
        if (typeof window !== 'undefined') {
          const savedId = localStorage.getItem('sg_selected_child_id');
          if (savedId && items.some((it) => it.child.id === savedId)) {
            chosenId = savedId;
          }
        }
        setActiveChildId(chosenId);
        await loadMeasurements(chosenId);
      } else {
        setActiveChildId(null);
        setMeasurements([]);
      }
    } catch (err) {
      console.error('Failed to load linked children:', err);
    }
  };

  const loadMeasurements = async (childId: string) => {
    try {
      let found: Pengukuran[] = [];

      // Try IndexedDB first
      try {
        const cached = await db.pengukuran_cache.where('anak_id').equals(childId).toArray();
        if (cached && cached.length > 0) {
          found = cached;
        }
      } catch {
        // ignore
      }

      // If not in IndexedDB, try real Supabase
      if (found.length === 0) {
        try {
          const { data } = await supabase
            .from('pengukuran')
            .select('*')
            .eq('anak_id', childId)
            .order('tgl_ukur', { ascending: true });
          if (data && data.length > 0) {
            found = data;
          }
        } catch {
          // ignore
        }
      }

      // Fallback mock measurements if matching demo dataset
      if (found.length === 0) {
        const fallback = TEST_QUALITY_MEASUREMENTS.filter((m) => m.anak_id === childId);
        if (fallback.length > 0) {
          found = fallback as any;
        }
      }

      found.sort((a, b) => new Date(a.tgl_ukur).getTime() - new Date(b.tgl_ukur).getTime());
      setMeasurements(found);
    } catch {
      setMeasurements([]);
    }
  };

  const handleSelectChild = async (childId: string) => {
    setActiveChildId(childId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sg_selected_child_id', childId);
    }
    await loadMeasurements(childId);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    document.cookie = 'sg_dev_session=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  const getRelationshipLabel = (rel?: HubunganPengasuh) => {
    switch (rel) {
      case 'ayah':
        return 'Ayah';
      case 'ibu':
        return 'Ibu';
      case 'nenek_kakek':
        return 'Nenek / Kakek';
      case 'wali_lain':
        return 'Wali Lain';
      default:
        return 'Pengasuh';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 flex flex-col justify-center items-center max-w-[480px] mx-auto w-full">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-[16px] font-semibold text-text-muted">Memuat data keluarga Anda...</p>
      </div>
    );
  }

  // First visit onboarding
  if (showOnboarding) {
    return (
      <OnboardingCaregiver
        onComplete={() => {
          setShowOnboarding(false);
          if (currentUser?.id) {
            loadChildren(currentUser.id);
          }
        }}
      />
    );
  }

  const activeItem = linkedList.find((it) => it.child.id === activeChildId) || linkedList[0];
  const activeChild = activeItem?.child;
  const activeRelationship = activeItem?.hubungan;

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const ageMonths = activeChild ? calculateAgeInMonths(activeChild.tgl_lahir) : 0;

  return (
    <main className="min-h-screen px-4 py-6 flex flex-col justify-between max-w-[480px] mx-auto w-full pb-16">
      <div className="space-y-6">
        {/* Top Header: Greeting & Quick Links */}
        <header className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <span className="text-[13px] font-bold text-teal uppercase tracking-wider block">
              Portal Keluarga
            </span>
            <h1 className="text-[20px] font-extrabold text-text leading-tight truncate max-w-[240px]">
              Halo, {currentUser?.nama || 'Anda'}!
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/keluarga/privasi')}
              className="p-2.5 rounded-full bg-slate-100 text-text-muted hover:text-teal hover:bg-teal/10 transition-colors cursor-pointer"
              title="Tentang data anak Anda"
              aria-label="Tentang data anak Anda"
            >
              <Shield size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2.5 rounded-full bg-slate-100 text-text-muted hover:text-red hover:bg-red-light transition-colors cursor-pointer"
              title="Keluar dari akun"
              aria-label="Keluar"
            >
              <LogOut size={20} strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* CASE A: No linked child yet (First screen after login) */}
        {linkedList.length === 0 ? (
          <div className="space-y-6 py-4">
            <Card padding="20" className="border-2 border-dashed border-border bg-white text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Link2 size={32} strokeWidth={2} />
              </div>
              <h2 className="text-[20px] font-extrabold text-text mb-2 leading-tight">
                Belum Ada Anak Tertaut
              </h2>
              <p className="text-[15px] text-text-muted leading-relaxed mb-6 max-w-xs">
                Hubungkan data balita Anda menggunakan kode yang diberikan oleh kader Posyandu saat kunjungan atau penimbangan.
              </p>

              <Button
                id="btn-tautkan-anak-pertama"
                variant="primary"
                size="kader"
                onClick={() => router.push('/keluarga/tautkan')}
                className="min-h-[54px] text-[16px] font-bold shadow-soft"
                icon={<Link2 size={18} />}
              >
                Tautkan Anak Pertama Anda
              </Button>
            </Card>

            {/* Note about Privacy */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-border flex items-start gap-3 text-text-muted">
              <Info size={20} className="text-teal flex-shrink-0 mt-0.5" />
              <div className="text-[14px] leading-relaxed">
                <p className="font-semibold text-text mb-0.5">Keamanan & Privasi Data</p>
                <p>
                  Satu kode tautan hanya berlaku untuk satu orang. Anda hanya dapat melihat data anak Anda sendiri.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/keluarga/privasi')}
                  className="text-primary font-bold inline-flex items-center gap-1 mt-1 hover:underline"
                >
                  Pelajari tentang data anak Anda
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CASE B: Linked children exist */
          <>
            {/* Child Switcher (If multiple children, or showing single child with link other button) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-text-muted uppercase tracking-wider">
                  Anak Asuhan Anda
                </span>
                <button
                  type="button"
                  id="btn-tautkan-anak-lain"
                  onClick={() => router.push('/keluarga/tautkan')}
                  className="text-[14px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle size={16} strokeWidth={2.2} />
                  <span>Tautkan anak lain</span>
                </button>
              </div>

              {/* Child Switcher Pills / Cards if more than 1 child */}
              {linkedList.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {linkedList.map((item) => {
                    const isSelected = item.child.id === activeChildId;
                    const cAge = calculateAgeInMonths(item.child.tgl_lahir);
                    return (
                      <button
                        key={item.child.id}
                        type="button"
                        onClick={() => handleSelectChild(item.child.id)}
                        className={`px-4 py-2.5 rounded-2xl border-2 flex items-center gap-2.5 transition-all flex-shrink-0 cursor-pointer min-h-[48px] ${
                          isSelected
                            ? 'bg-primary-selected border-primary shadow-soft text-primary font-bold'
                            : 'bg-white border-border text-text font-medium hover:border-slate-300'
                        }`}
                      >
                        <User size={18} strokeWidth={2} />
                        <span className="text-[15px]">{item.child.nama}</span>
                        <span className="text-[13px] opacity-75 font-normal">({cAge} bln)</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Active Child Profile Card */}
            {activeChild && (
              <Card padding="20" className="border-2 border-border bg-white shadow-soft space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[12px] font-bold uppercase tracking-wider mb-1">
                      Hubungan: {getRelationshipLabel(activeRelationship)}
                    </span>
                    <h2 className="text-[24px] font-extrabold text-text leading-tight">
                      {activeChild.nama}
                    </h2>
                    <p className="text-[15px] text-text-muted mt-0.5 font-medium">
                      {ageMonths} Bulan • {activeChild.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-teal/10 text-teal flex items-center justify-center flex-shrink-0">
                    <User size={26} strokeWidth={2} />
                  </div>
                </div>

                <div className="pt-3 border-t border-border grid grid-cols-2 gap-3 text-[14px]">
                  <div>
                    <span className="text-text-muted block font-medium">Tanggal Lahir:</span>
                    <span className="font-bold text-text">
                      {formatIndonesianDate(activeChild.tgl_lahir)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block font-medium">NIK Balita:</span>
                    <span className="font-mono font-bold text-text">
                      {activeChild.nik ? activeChild.nik : 'Belum diisi'}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Latest Measurement Status */}
            {latestMeasurement ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-bold text-text">
                    Hasil Penimbangan Terakhir
                  </h3>
                  <span className="text-[14px] text-text-muted font-medium">
                    {formatIndonesianDate(latestMeasurement.tgl_ukur)}
                  </span>
                </div>

                <Card padding="20" className="border border-border bg-white shadow-card space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-[15px] font-semibold text-text-muted">
                      Status Pertumbuhan
                    </span>
                    {latestMeasurement.status ? (
                      <StatusBadge status={latestMeasurement.status} size="md" />
                    ) : (
                      <span className="text-[13px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-text-muted border border-border">
                        Tercatat
                      </span>
                    )}
                  </div>

                  {/* Metrics: Height & Weight */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-border/80 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Ruler size={22} strokeWidth={2} />
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-text-muted block">Tinggi / Panjang</span>
                        <span className="text-[20px] font-extrabold text-text">
                          {latestMeasurement.tinggi_cm} <span className="text-[14px] font-semibold text-text-muted">cm</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-border/80 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center flex-shrink-0">
                        <Scale size={22} strokeWidth={2} />
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-text-muted block">Berat Badan</span>
                        <span className="text-[20px] font-extrabold text-text">
                          {latestMeasurement.berat_kg} <span className="text-[14px] font-semibold text-text-muted">kg</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Growth explanation sentence for caregiver */}
                  <div className="p-3.5 rounded-xl bg-primary-selected/60 border border-primary/20 text-text">
                    <p className="text-[15px] leading-relaxed font-medium">
                      {latestMeasurement.z_tbu !== null && latestMeasurement.z_tbu !== undefined
                        ? getTbuChartSentence(latestMeasurement.z_tbu)
                        : 'Hasil penimbangan balita tercatat dengan baik di Posyandu.'}
                    </p>
                  </div>
                </Card>
              </section>
            ) : (
              <Card padding="20" className="border border-border bg-white text-center py-6">
                <Clock size={28} className="text-text-muted mx-auto mb-2 opacity-60" />
                <p className="text-[16px] font-bold text-text">Belum ada riwayat penimbangan</p>
                <p className="text-[14px] text-text-muted mt-1">
                  Kader Posyandu akan mengunggah data setelah jadwal penimbangan anak Anda.
                </p>
              </Card>
            )}

            {/* Age-appropriate Tips & Reminders */}
            <section className="space-y-3">
              <h3 className="text-[18px] font-bold text-text flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                <span>Saran & Pengingat Sesuai Usia</span>
              </h3>

              <Card padding="20" className="border border-border bg-white shadow-soft space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Apple size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-bold text-text leading-snug">
                      {ageMonths < 6
                        ? 'ASI Eksklusif Hingga 6 Bulan'
                        : ageMonths < 12
                        ? 'MPASI Kaya Protein Hewani'
                        : 'Makanan Keluarga Bergizi Seimbang'}
                    </h4>
                    <p className="text-[14px] text-text-muted mt-1 leading-relaxed">
                      {ageMonths < 6
                        ? 'Berikan ASI saja secara teratur sesuai kebutuhan bayi Anda tanpa makanan atau minuman tambahan.'
                        : ageMonths < 12
                        ? 'Kenalkan tekstur bertahap dan lengkapi dengan telur, ikan, atau daging untuk mendukung laju tinggi badan optimal.'
                        : 'Berikan variasi lauk hewani, sayur, buah, serta biasakan mencuci tangan dengan sabun sebelum makan bersama keluarga.'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-[14px]">
                  <span className="text-text-muted font-medium">Jadwal Posyandu Berikutnya:</span>
                  <span className="font-bold text-teal">Bulan Depan di Posyandu</span>
                </div>
              </Card>
            </section>

            {/* Link to Privacy & Information */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/keluarga/privasi')}
                className="w-full p-4 rounded-2xl bg-white border border-border hover:border-primary flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <Shield size={20} className="text-teal" />
                  <div>
                    <span className="font-bold text-[15px] text-text block">Tentang data anak Anda</span>
                    <span className="text-[13px] text-text-muted">Pelajari siapa yang dapat melihat data dan tujuannya</span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-text-muted" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center border-t border-border pt-4">
        <p className="text-[14px] text-text-muted">
          StuntGuard • Pendampingan Tumbuh Kembang Posyandu
        </p>
      </footer>
    </main>
  );
}
