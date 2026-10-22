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

import { db, clearLocalData } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

function KaderHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSavedNotification = searchParams.get('saved') === 'true';
  const [dismissedToast, setDismissedToast] = useState(false);

  const [userName, setUserName] = useState<string>('Kader');
  const [posyanduName, setPosyanduName] = useState<string>('Posyandu Melati 03');
  const [loading, setLoading] = useState(true);

  // Stunting alert notices from synced offline measurements
  const [stuntingNotices, setStuntingNotices] = useState<any[]>([]);

  // Logout confirmation modal for pending outbox items
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    async function loadKaderProfile() {
      try {
        // 1. Immediately read from local Dexie profile_cache for instant offline load
        const cachedProfile = await db.profile_cache.toCollection().first();
        if (cachedProfile) {
          if (cachedProfile.nama) setUserName(cachedProfile.nama);
          if (cachedProfile.posyandu_nama) setPosyanduName(cachedProfile.posyandu_nama);
        }

        // 2. Load synced stunting notifications from offline measurements
        try {
          const raw = localStorage.getItem('sg_stunting_notifications');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
              setStuntingNotices(list);
            }
          }
        } catch {
          // ignore parsing error
        }

        // 3. If online, fetch fresh profile from Supabase and cache it
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (isRealSupabase && navigator.onLine) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, nama, desa_id, posyandu_id, role')
              .eq('id', user.id)
              .single();

            if (profile) {
              let posNama = 'Posyandu Melati 03';
              if (profile.nama) setUserName(profile.nama);

              if (profile.posyandu_id) {
                const { data: posyandu } = await supabase
                  .from('posyandu')
                  .select('nama')
                  .eq('id', profile.posyandu_id)
                  .single();

                if (posyandu?.nama) {
                  posNama = posyandu.nama;
                  setPosyanduName(posyandu.nama);
                }
              }

              // Save to Dexie profile_cache
              await db.profile_cache.put({
                id: user.id,
                user_id: user.id,
                desa_id: profile.desa_id,
                posyandu_id: profile.posyandu_id,
                role: profile.role,
                nama: profile.nama,
                posyandu_nama: posNama,
                updated_at: new Date().toISOString(),
              });

              // Also trigger background cache refresh for anak and tindak_lanjut
              syncEngine.refreshServerCaches();
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

            // Cache dev session
            await db.profile_cache.put({
              id: session.id || 'dev-user',
              user_id: session.id || 'dev-user',
              desa_id: session.desa_id ?? null,
              posyandu_id: session.posyandu_id ?? null,
              role: session.role || 'kader',
              nama: session.nama || 'Kader',
              posyandu_nama: session.posyandu_nama || 'Posyandu Melati 03',
              updated_at: new Date().toISOString(),
            });
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

  const handleDismissNotice = (noticeId: string) => {
    const updated = stuntingNotices.filter((n) => n.id !== noticeId);
    setStuntingNotices(updated);
    if (updated.length > 0) {
      localStorage.setItem('sg_stunting_notifications', JSON.stringify(updated));
    } else {
      localStorage.removeItem('sg_stunting_notifications');
    }
  };

  const handleLogoutClick = async () => {
    // Check if there are pending items in outbox
    const count = await db.outbox.count();
    if (count > 0) {
      setPendingOutboxCount(count);
      setShowLogoutModal(true);
      return;
    }

    // No pending items, proceed directly
    await executeLogout();
  };

  const executeLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore if offline
    }
    // Rule 7 & 8: Clear local Dexie data so the next kader won't see cached data
    await clearLocalData();
    document.cookie = 'sg_dev_session=; path=/; max-age=0';
    setShowLogoutModal(false);
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      <div>
        {/* Top Header Bar with Fixed Sync Status Badge & Small Logout */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          {/* Posyandu Badge with StuntGuard Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="StuntGuard Logo"
              className="w-9 h-9 object-contain rounded-xl bg-white p-0.5 border border-slate-200/80 shadow-xs"
            />
            <div>
              <span className="text-[10px] font-black text-berry uppercase tracking-wider block leading-none">
                StuntGuard
              </span>
              <span className="text-[13px] font-bold text-slateTeal uppercase tracking-tight block leading-tight mt-0.5">
                {posyanduName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Requirement 5: Fixed spot in top corner for sync status icon */}
            <SyncStatusBadge />

            {/* Small logout button */}
            <button
              id="btn-logout"
              onClick={handleLogoutClick}
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

        {/* In-app Notice for Synced Offline Measurements with Status Kuning / Merah (Requirement 6) */}
        {stuntingNotices.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {stuntingNotices.map((notice) => (
              <div
                key={notice.id}
                id={`notice-stunting-${notice.id}`}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 shadow-sm ${
                  notice.status === 'merah'
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle
                    size={22}
                    className={`flex-shrink-0 mt-0.5 ${
                      notice.status === 'merah' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <p className="text-[13px] font-extrabold leading-tight">
                      Hasil Sinkronisasi:{' '}
                      <span className={notice.status === 'merah' ? 'text-status-red' : 'text-status-yellow'}>
                        {notice.status === 'merah' ? '🔴 Merah (Perlu Rujukan)' : '🟡 Kuning (Perlu Dipantau)'}
                      </span>
                    </p>
                    <p className="text-[12px] mt-0.5 opacity-90">
                      Balita <strong>{notice.childName}</strong> memerlukan tindak lanjut kader.
                    </p>
                    <button
                      onClick={() => router.push('/kader/tindak-lanjut')}
                      className="mt-2 text-[12px] font-bold underline cursor-pointer"
                    >
                      Buka Daftar Tindak Lanjut →
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => handleDismissNotice(notice.id)}
                  className="p-1 rounded-full hover:bg-black/10 transition-colors flex-shrink-0"
                  aria-label="Tutup pemberitahuan"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
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

      {/* Logout Warning Modal for Pending Items (Requirement 7) */}
      {showLogoutModal && (
        <div
          id="modal-logout-warning"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-status-yellow flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              Peringatan Keluar Akun
            </h3>

            <p className="text-sm text-slate-600 mb-1 leading-relaxed">
              Masih ada data belum terkirim. Keluar akan menghapusnya.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-xl mb-6 font-semibold">
              {pendingOutboxCount} data antrean di HP ini akan terhapus demi keamanan.
            </p>

            <div className="flex gap-3">
              <Button
                id="btn-cancel-logout"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowLogoutModal(false)}
              >
                Batal
              </Button>
              <Button
                id="btn-confirm-logout"
                variant="danger"
                className="flex-1"
                onClick={executeLogout}
              >
                Tetap Keluar
              </Button>
            </div>
          </div>
        </div>
      )}
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

