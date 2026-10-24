'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, StatusBadge } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { Anak, Pengukuran, HubunganPengasuh, RingkasanPengasuh } from '@/types/database';
import { getLinkedChildren } from '@/lib/tautanEngine';
import { getRingkasanPengasuh } from '@/lib/mpasiEngine';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';
import { OnboardingCaregiver } from '@/components/keluarga/OnboardingCaregiver';
import { CaregiverAvatar } from '@/components/keluarga/CaregiverAvatar';
import { KeluargaTabBar } from '@/components/keluarga/KeluargaTabBar';
import {
  User,
  Calendar,
  Link2,
  ChevronRight,
  LogOut,
  Shield,
  Sparkles,
  Info,
  Clock,
  PlusCircle,
  CircleCheck,
  Flame,
  Stethoscope,
  ShoppingBag,
  Utensils,
  Lock,
} from 'lucide-react';

export default function KeluargaDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [linkedList, setLinkedList] = useState<Array<{ child: Anak; hubungan: HubunganPengasuh }>>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanPengasuh | null>(null);

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
        let chosenId = items[0].child.id;
        if (typeof window !== 'undefined') {
          const savedId = localStorage.getItem('sg_selected_child_id');
          if (savedId && items.some((it) => it.child.id === savedId)) {
            chosenId = savedId;
          }
        }
        setActiveChildId(chosenId);
        await loadRingkasan(chosenId, userId);
      } else {
        setActiveChildId(null);
        setRingkasan(null);
      }
    } catch (err) {
      console.error('Failed to load linked children:', err);
    }
  };

  const loadRingkasan = async (childId: string, userId: string) => {
    try {
      const data = await getRingkasanPengasuh(childId, userId, supabase);
      setRingkasan(data);
    } catch (err) {
      console.error('Failed to load ringkasan:', err);
    }
  };

  const handleSelectChild = async (childId: string) => {
    setActiveChildId(childId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sg_selected_child_id', childId);
    }
    if (currentUser?.id) {
      await loadRingkasan(childId, currentUser.id);
    }
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

  const getStatusExplanation = (status: string | null | undefined) => {
    if (status === 'hijau') {
      return 'Pertumbuhan anak terpantau optimal dan sesuai usianya.';
    }
    if (status === 'kuning') {
      return 'Pertumbuhan anak perlu diperhatikan dan dipantau lebih dekat.';
    }
    if (status === 'merah') {
      return 'Pertumbuhan anak di bawah rata-rata dan disarankan pendampingan gizi dari petugas.';
    }
    return 'Belum ada hasil ukur terbaru.';
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
  const ageMonths = activeChild ? calculateAgeInMonths(activeChild.tgl_lahir) : 0;

  return (
    <main className="min-h-screen px-4 py-6 flex flex-col justify-between max-w-[480px] mx-auto w-full pb-32">
      <div className="space-y-6">
        {/* Top Header: Child info, Sync Badge, Privacy & Logout */}
        <header className="flex items-center justify-between pb-3 border-b border-border">
          <div className="min-w-0 pr-2">
            {activeChild ? (
              <div>
                <span className="text-[12px] font-bold text-teal uppercase tracking-wider block">
                  Anak Asuhan Anda • {getRelationshipLabel(activeRelationship)}
                </span>
                <h1 className="text-[20px] font-extrabold text-text leading-tight truncate">
                  {activeChild.nama}
                </h1>
                <p className="text-[13px] text-text-muted font-medium">
                  {ageMonths} Bulan ({activeChild.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'})
                </p>
              </div>
            ) : (
              <div>
                <span className="text-[12px] font-bold text-teal uppercase tracking-wider block">
                  Portal Keluarga
                </span>
                <h1 className="text-[20px] font-extrabold text-text leading-tight">
                  Halo, {currentUser?.nama || 'Anda'}!
                </h1>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <SyncStatusBadge />
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
            {/* Child Switcher if multiple children */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-text-muted uppercase tracking-wider">
                  Pilih Anak Asuhan
                </span>
                <button
                  type="button"
                  id="btn-tautkan-anak-lain"
                  onClick={() => router.push('/keluarga/tautkan')}
                  className="text-[13px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle size={15} strokeWidth={2.2} />
                  <span>Tautkan anak lain</span>
                </button>
              </div>

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
                        className={`px-3.5 py-2.5 rounded-2xl border-2 flex items-center gap-2 transition-all flex-shrink-0 cursor-pointer min-h-[48px] ${
                          isSelected
                            ? 'bg-primary-selected border-primary shadow-soft text-primary font-bold'
                            : 'bg-white border-border text-text font-medium hover:border-slate-300'
                        }`}
                      >
                        <User size={16} strokeWidth={2} />
                        <span className="text-[14px]">{item.child.nama}</span>
                        <span className="text-[12px] opacity-75 font-normal">({cAge} bln)</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 1. CHEERFUL AVATAR (Grows with caregiver habit points) */}
            <section>
              <CaregiverAvatar totalPoints={ringkasan?.total_poin ?? 0} />
            </section>

            {/* 2. DAILY GOAL CARD */}
            <section>
              {ringkasan?.sudah_catat_hari_ini ? (
                <Card padding="20" className="border-2 border-green/30 bg-green-light/40 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-green text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <CircleCheck size={26} strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[12px] font-bold text-green uppercase tracking-wider block">
                          Tercatat Hari Ini
                        </span>
                        <h3 className="text-[18px] font-extrabold text-text leading-snug">
                          Hebat! Catatan hari ini sudah ada.
                        </h3>
                        <p className="text-[14px] text-text-muted mt-0.5">
                          Anda telah mengumpulkan +50 poin kebiasaan hari ini.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green/20 flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push('/keluarga/catat')}
                      className="text-[14px] font-bold text-teal hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Lihat / Perbarui Menu</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </Card>
              ) : (
                <Card padding="20" className="border-2 border-primary/20 bg-primary-selected/40 shadow-soft space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <Utensils size={24} strokeWidth={2.2} />
                    </div>
                    <div>
                      <span className="text-[12px] font-bold text-primary uppercase tracking-wider block">
                        Target Hari Ini
                      </span>
                      <h3 className="text-[18px] font-extrabold text-text leading-snug">
                        Catat makanan hari ini, dapat 50 poin
                      </h3>
                      <p className="text-[14px] text-text-muted mt-0.5">
                        Pilih makanan bergizi yang dikonsumsi anak Anda hari ini.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      id="btn-catat-sekarang-beranda"
                      variant="primary"
                      size="kader"
                      onClick={() => router.push('/keluarga/catat')}
                      className="min-h-[54px] text-[16px] font-bold shadow-soft"
                      icon={<Utensils size={18} />}
                    >
                      Catat Sekarang
                    </Button>
                  </div>
                </Card>
              )}
            </section>

            {/* 3. POINT & STREAK CARD */}
            <section className="grid grid-cols-2 gap-3">
              {/* Total Points */}
              <Card padding="20" className="border border-border bg-white shadow-soft text-center flex flex-col items-center justify-center min-h-[110px]">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
                  <Sparkles size={20} />
                </div>
                <span className="text-[13px] font-semibold text-text-muted block">Total Poin</span>
                <span className="text-[26px] font-black text-text leading-none mt-1">
                  {ringkasan?.total_poin ?? 0}
                </span>
                <span className="text-[11px] text-text-muted font-medium mt-0.5">Poin Kebiasaan</span>
              </Card>

              {/* Streak Days */}
              <Card padding="20" className="border border-border bg-white shadow-soft text-center flex flex-col items-center justify-center min-h-[110px]">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                  <Flame size={20} />
                </div>
                <span className="text-[13px] font-semibold text-text-muted block">Kebiasaan Berturut</span>
                {(ringkasan?.streak_hari ?? 0) > 0 ? (
                  <>
                    <span className="text-[26px] font-black text-primary leading-none mt-1">
                      {ringkasan?.streak_hari}
                    </span>
                    <span className="text-[11px] text-primary font-bold mt-0.5">Hari Berturut-turut</span>
                  </>
                ) : (
                  <p className="text-[12px] font-bold text-text-muted mt-1 leading-snug px-1">
                    Mulai lagi hari ini, pelan-pelan saja.
                  </p>
                )}
              </Card>
            </section>

            {/* 4. NEXT VISIT CARD (Hidden if null) */}
            {ringkasan?.tgl_kunjungan_berikutnya && (
              <section>
                <Card padding="20" className="border-2 border-teal/20 bg-teal-light/40 shadow-soft">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-teal text-white flex items-center justify-center flex-shrink-0">
                      <Calendar size={22} strokeWidth={2.2} />
                    </div>
                    <div>
                      <span className="text-[12px] font-bold text-teal uppercase tracking-wider block">
                        Jadwal Posyandu
                      </span>
                      <h3 className="text-[16px] font-bold text-text leading-snug">
                        Kunjungan berikutnya: {formatIndonesianDate(ringkasan.tgl_kunjungan_berikutnya)}
                      </h3>
                      <p className="text-[13px] text-text-muted mt-0.5">
                        Bawa anak Anda untuk pemantauan tumbuh kembang rutin.
                      </p>
                    </div>
                  </div>
                </Card>
              </section>
            )}

            {/* 5. STATUS CARD */}
            <section className="space-y-2">
              <h3 className="text-[16px] font-bold text-text">
                Status Pertumbuhan Anak
              </h3>

              <Card padding="20" className="border border-border bg-white shadow-soft space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-[14px] font-medium text-text-muted">
                    {ringkasan?.tgl_ukur_terakhir
                      ? `Penimbangan: ${formatIndonesianDate(ringkasan.tgl_ukur_terakhir)}`
                      : 'Hasil Terakhir'}
                  </span>
                  {ringkasan?.status_terakhir ? (
                    <StatusBadge status={ringkasan.status_terakhir as any} size="sm" />
                  ) : (
                    <span className="text-[13px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-text-muted border border-border">
                      Belum Diukur
                    </span>
                  )}
                </div>

                <p className="text-[15px] font-semibold text-text leading-relaxed">
                  {getStatusExplanation(ringkasan?.status_terakhir)}
                </p>

                <div className="pt-2 border-t border-border flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.push('/keluarga/tumbuh')}
                    className="text-[13px] font-bold text-teal hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Lihat riwayat grafik</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </Card>
            </section>

            {/* 6. DISABLED "SEGERA HADIR" CARDS */}
            <section className="space-y-3 pt-2">
              <h3 className="text-[16px] font-bold text-text">
                Layanan Tambahan Desa
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Konsultasi Dokter Card (Disabled) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 opacity-60 cursor-not-allowed select-none flex flex-col justify-between min-h-[140px]">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mb-2">
                      <Stethoscope size={20} />
                    </div>
                    <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 tracking-wider">
                      Segera Hadir
                    </span>
                    <h4 className="text-[15px] font-bold text-text mt-2 leading-snug">
                      Konsultasi Dokter
                    </h4>
                  </div>
                  <p className="text-[12px] text-text-muted mt-1 leading-snug">
                    Tanya jawab langsung bersama dokter puskesmas.
                  </p>
                </div>

                {/* Pasar Desa Card (Disabled) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 opacity-60 cursor-not-allowed select-none flex flex-col justify-between min-h-[140px]">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mb-2">
                      <ShoppingBag size={20} />
                    </div>
                    <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 tracking-wider">
                      Segera Hadir
                    </span>
                    <h4 className="text-[15px] font-bold text-text mt-2 leading-snug">
                      Pasar Desa
                    </h4>
                  </div>
                  <p className="text-[12px] text-text-muted mt-1 leading-snug">
                    Bahan pangan bergizi segar dari kelompok tani desa.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center">
        <p className="text-[13px] text-text-muted">
          StuntGuard • Pendampingan Tumbuh Kembang Posyandu
        </p>
      </footer>

      {/* 4-Tab Bottom Navigation Bar */}
      <KeluargaTabBar />
    </main>
  );
}
