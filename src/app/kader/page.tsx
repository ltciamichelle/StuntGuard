'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { 
  UserPlus, 
  Scale, 
  AlertCircle, 
  LogOut, 
  ChevronRight, 
  Heart,
  Baby,
  Calendar,
  CheckCircle2,
  X
} from 'lucide-react';

function KaderHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSavedNotification = searchParams.get('saved') === 'true';
  const [dismissedToast, setDismissedToast] = useState(false);

  const [userName, setUserName] = useState<string>('Kader');
  const [posyanduName, setPosyanduName] = useState<string>('Posyandu Melati 03');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadKaderProfile() {
      try {
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (isRealSupabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('nama, posyandu_id')
              .eq('id', user.id)
              .single();

            if (profile?.nama) {
              setUserName(profile.nama);
            }

            if (profile?.posyandu_id) {
              const { data: posyandu } = await supabase
                .from('posyandu')
                .select('nama')
                .eq('id', profile.posyandu_id)
                .single();

              if (posyandu?.nama) {
                setPosyanduName(posyandu.nama);
              }
            }
          }
        } else {
          // Dev fallback reading session cookie
          const cookieMatch = document.cookie
            .split('; ')
            .find((row) => row.startsWith('sg_dev_session='));

          if (cookieMatch) {
            const val = decodeURIComponent(cookieMatch.split('=')[1]);
            const session = JSON.parse(val);
            if (session.nama) setUserName(session.nama);
            if (session.posyandu_nama) setPosyanduName(session.posyandu_nama);
          }
        }
      } catch (err) {
        console.error('Gagal memuat profil kader:', err);
      } finally {
        setLoading(false);
      }
    }

    loadKaderProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore if offline
    }
    document.cookie = 'sg_dev_session=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      <div>
        {/* Top Header Bar with Fixed Sync Status Badge & Small Logout */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          {/* Posyandu Badge */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-berry text-white flex items-center justify-center font-bold text-sm">
              SG
            </div>
            <span className="text-[13px] font-bold text-slateTeal uppercase tracking-wider">
              {posyanduName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Requirement 5: Fixed spot in top corner for sync status icon (always green "Tersinkron") */}
            <SyncStatusBadge />

            {/* Small logout button */}
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="p-2 rounded-full text-slate-500 hover:text-berry hover:bg-slate-100 transition-colors cursor-pointer"
              title="Keluar dari akun"
              aria-label="Keluar"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Success Notification Banner when returning from Measurement */}
        {showSavedNotification && !dismissedToast && (
          <div
            id="toast-saved-success"
            className="mb-4 p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[14px] font-extrabold leading-tight">
                  Pengukuran Berhasil Disimpan!
                </p>
                <p className="text-[12px] text-emerald-700 mt-0.5">
                  Data balita telah tersimpan dan siap dipantau.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissedToast(true)}
              className="p-1 rounded-full text-emerald-700 hover:bg-emerald-100 transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Greeting Banner */}
        <div className="mb-6">
          <p className="text-[14px] text-slateTeal font-bold uppercase tracking-wider">
            Selamat Bertugas
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
            Halo, {userName}
          </h1>
          <p className="text-kader-body text-slate-600 mt-1">
            Pilih tugas pemantauan tumbuh kembang balita hari ini.
          </p>
        </div>

        {/* Three Big Cards (PRD K0 & Requirement 4) */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Registrasi Balita */}
          <Card
            id="card-registrasi-balita"
            padding="lg"
            className="cursor-pointer hover:border-slate-300 active:scale-[0.99] transition-all group"
            onClick={() => router.push('/kader/anak/baru')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-berry-light text-berry flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900 leading-snug">
                    Registrasi Balita
                  </h2>
                  <p className="text-[14px] text-slate-500 mt-0.5">
                    Daftar balita baru dengan NIK atau identitas ibu
                  </p>
                </div>
              </div>
              <ChevronRight size={22} className="text-slate-400 group-hover:text-berry transition-colors flex-shrink-0" />
            </div>
          </Card>

          {/* Card 2: Ukur Balita (Tugas Utama Antropometri) */}
          <Card
            id="card-ukur-balita"
            padding="lg"
            className="cursor-pointer border-2 border-berry/30 bg-gradient-to-br from-white to-berry-light/20 hover:border-berry active:scale-[0.99] transition-all group shadow-md"
            onClick={() => router.push('/kader/anak')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-berry text-white flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 shadow-md">
                  <Scale size={28} />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold text-berry uppercase tracking-wider block">
                    ⭐ Tugas Posyandu
                  </span>
                  <h2 className="text-[19px] font-extrabold text-slate-900 leading-snug">
                    Ukur Balita
                  </h2>
                  <p className="text-[14px] text-slate-600 mt-0.5">
                    Input berat, tinggi badan & hitung Z-Score WHO
                  </p>
                </div>
              </div>
              <ChevronRight size={22} className="text-berry transition-colors flex-shrink-0" />
            </div>
          </Card>

          {/* Card 3: Daftar Tindak Lanjut */}
          <Card
            id="card-tindak-lanjut"
            padding="lg"
            className="cursor-pointer hover:border-slate-300 active:scale-[0.99] transition-all group"
            onClick={() => router.push('/kader/tindak-lanjut')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-status-yellow flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  <AlertCircle size={28} />
                </div>
                <div>
                  <h2 className="text-[18px] font-extrabold text-slate-900 leading-snug">
                    Daftar Tindak Lanjut
                  </h2>
                  <p className="text-[14px] text-slate-500 mt-0.5">
                    Kasus kuning dan merah butuh pendampingan
                  </p>
                </div>
              </div>
              <ChevronRight size={22} className="text-slate-400 group-hover:text-status-yellow transition-colors flex-shrink-0" />
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Information */}
      <footer className="mt-8 pt-4 text-center border-t border-slate-100">
        <p className="text-[12px] text-slate-400">
          StuntGuard • Posyandu ILP Ramah Kader
        </p>
      </footer>
    </div>
  );
}

export default function KaderHomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen px-4 py-16 text-center text-slate-500">Memuat beranda...</div>}>
      <KaderHomeContent />
    </Suspense>
  );
}

