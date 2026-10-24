'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { 
  UserPlus, 
  Ruler, 
  ClipboardList, 
  TriangleAlert, 
  OctagonAlert, 
  CircleCheck, 
  LogOut, 
  ChevronRight, 
  X 
} from 'lucide-react';

import { db, clearLocalData } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { 
  verifyAndEnforceCacheSafety, 
  getUnsentOutboxCount, 
  clearAllLocalUserData, 
  CACHED_USER_ID_KEY 
} from '@/lib/cacheSafety';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';

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
        // 0. Resolve current user ID and enforce cache safety: never show cached data before user id has been checked
        let currentUserId = '';
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (isRealSupabase) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) currentUserId = user.id;
          } catch {}
        }

        if (!currentUserId && typeof document !== 'undefined') {
          const match = document.cookie.match(/sg_dev_session=([^;]+)/);
          if (match) {
            try {
              const parsed = JSON.parse(decodeURIComponent(match[1]));
              if (parsed?.id) currentUserId = parsed.id;
            } catch {}
          }
        }

        if (currentUserId) {
          await verifyAndEnforceCacheSafety(currentUserId);
        }

        // 1. Read from local Dexie profile_cache only AFTER user verification
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
    const count = await getUnsentOutboxCount();
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
    await clearAllLocalUserData();
    localStorage.removeItem(CACHED_USER_ID_KEY);
    document.cookie = 'sg_dev_session=; path=/; max-age=0';
    document.cookie = 'sg_user_role=; path=/; max-age=0';
    setShowLogoutModal(false);
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[480px] mx-auto w-full">
      <div className="space-y-6">
        {/* Top Header Bar with Fixed Sync Status Badge & Logout */}
        <header className="flex items-center justify-between pb-4 border-b border-border">
          {/* Posyandu Badge with StuntGuard Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="StuntGuard Logo"
              className="w-11 h-11 object-contain rounded-2xl bg-white p-1 border border-border shadow-soft"
            />
            <div>
              <span className="text-[14px] font-bold text-primary uppercase tracking-wider block leading-none">
                StuntGuard
              </span>
              <span className="text-[16px] font-bold text-teal block leading-tight mt-1">
                {posyanduName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Requirement 5: Fixed spot in top corner for sync status icon */}
            <SyncStatusBadge />

            {/* Logout button with accessible touch target */}
            <button
              id="btn-logout"
              onClick={handleLogoutClick}
              className="w-12 h-12 rounded-full flex items-center justify-center text-text-muted hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
              title="Keluar dari akun"
              aria-label="Keluar"
            >
              <LogOut size={22} strokeWidth={2} />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200/80 rounded-full animate-pulse" />
              <div className="h-8 w-48 bg-slate-200/80 rounded-xl animate-pulse" />
              <div className="h-4 w-64 bg-slate-200/80 rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col gap-4">
              <div className="h-28 rounded-[24px] bg-slate-200/80 animate-pulse" />
              <div className="h-28 rounded-[24px] bg-slate-200/80 animate-pulse" />
              <div className="h-28 rounded-[24px] bg-slate-200/80 animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* Success Notification Banner when returning from Measurement */}
            {showSavedNotification && !dismissedToast && (
              <div
                id="toast-saved-success"
                className="p-4 bg-green-light border-2 border-green/30 rounded-[24px] flex items-center justify-between gap-3 text-text shadow-card animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="flex items-center gap-3">
                  <CircleCheck size={24} strokeWidth={2} className="text-green flex-shrink-0" />
                  <div>
                    <p className="text-[16px] font-bold leading-tight">
                      Pengukuran Berhasil Disimpan
                    </p>
                    <p className="text-[16px] text-text-muted mt-0.5">
                      Data balita telah tersimpan dan siap dipantau.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDismissedToast(true)}
                  className="p-2 rounded-full text-text-muted hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Tutup notifikasi"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            )}

            {/* In-app Notice for Synced Measurements with Status Kuning / Merah */}
            {stuntingNotices.length > 0 && (
              <div className="flex flex-col gap-3">
                {stuntingNotices.map((notice) => (
                  <div
                    key={notice.id}
                    id={`notice-stunting-${notice.id}`}
                    className={`p-4 rounded-[24px] border-2 flex items-start justify-between gap-3 shadow-card ${
                      notice.status === 'merah'
                        ? 'bg-red-light border-red/40 text-text'
                        : 'bg-yellow-light border-yellow/40 text-text'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notice.status === 'merah' ? (
                        <OctagonAlert
                          size={24}
                          strokeWidth={2}
                          className="flex-shrink-0 mt-0.5 text-red"
                          aria-hidden="true"
                        />
                      ) : (
                        <TriangleAlert
                          size={24}
                          strokeWidth={2}
                          className="flex-shrink-0 mt-0.5 text-yellow"
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <p className="text-[16px] font-bold leading-tight">
                          Hasil Sinkronisasi:{' '}
                          <span className={notice.status === 'merah' ? 'text-red' : 'text-[#9A6F00]'}>
                            {notice.status === 'merah' ? 'Status Merah (Perlu Rujukan)' : 'Status Kuning (Perlu Dipantau)'}
                          </span>
                        </p>
                        <p className="text-[16px] text-text-muted mt-0.5">
                          Balita <strong>{notice.childName}</strong> memerlukan tindak lanjut kader.
                        </p>
                        <button
                          onClick={() => router.push('/kader/tindak-lanjut')}
                          className="mt-2 text-[16px] font-bold text-primary underline cursor-pointer"
                        >
                          Lihat daftar tindak lanjut
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDismissNotice(notice.id)}
                      className="p-2 rounded-full hover:bg-black/10 transition-colors flex-shrink-0 cursor-pointer"
                      aria-label="Tutup pemberitahuan"
                    >
                      <X size={20} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Greeting Banner */}
            <div>
              <p className="text-[16px] text-teal font-bold uppercase tracking-wider">
                Selamat Bertugas
              </p>
              <h1 className="text-[24px] font-bold text-text mt-0.5">
                Halo, {userName}
              </h1>
              <p className="text-[16px] text-text-muted mt-1">
                Pilih tugas pemantauan tumbuh kembang balita hari ini.
              </p>
            </div>

            {/* Three Big Cards */}
            <div className="flex flex-col gap-4">
              {/* Card 1: Registrasi Balita */}
              <Card
                id="card-registrasi-balita"
                padding="24"
                className="cursor-pointer hover:border-slate-300 active:scale-[0.99] transition-all group min-h-[96px]"
                onClick={() => router.push('/kader/anak/baru')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary-selected text-primary flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                      <UserPlus size={32} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-[20px] font-semibold text-text leading-snug">
                        Registrasi Balita
                      </h2>
                      <p className="text-[16px] text-text-muted mt-0.5">
                        Daftar balita baru dengan NIK atau nama pengasuh
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={24} strokeWidth={2} className="text-text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </Card>

              {/* Card 2: Ukur Balita (Tugas Utama Antropometri) */}
              <Card
                id="card-ukur-balita"
                padding="24"
                className="cursor-pointer border-2 border-primary/30 bg-primary-selected/30 hover:border-primary active:scale-[0.99] transition-all group shadow-card min-h-[96px]"
                onClick={() => router.push('/kader/anak')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 shadow-soft">
                      <Ruler size={32} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="text-[16px] font-bold text-primary uppercase tracking-wider block">
                        Tugas Posyandu
                      </span>
                      <h2 className="text-[20px] font-semibold text-text leading-snug">
                        Ukur Balita
                      </h2>
                      <p className="text-[16px] text-text-muted mt-0.5">
                        Catat berat, tinggi badan & hitung status WHO
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={24} strokeWidth={2} className="text-primary transition-colors flex-shrink-0" />
                </div>
              </Card>

              {/* Card 3: Daftar Tindak Lanjut */}
              <Card
                id="card-tindak-lanjut"
                padding="24"
                className="cursor-pointer hover:border-slate-300 active:scale-[0.99] transition-all group min-h-[96px]"
                onClick={() => router.push('/kader/tindak-lanjut')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-yellow-light text-[#9A6F00] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                      <ClipboardList size={32} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-[20px] font-semibold text-text leading-snug">
                        Daftar Tindak Lanjut
                      </h2>
                      <p className="text-[16px] text-text-muted mt-0.5">
                        Pantau balita kuning dan merah yang perlu rujukan
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={24} strokeWidth={2} className="text-text-muted group-hover:text-yellow transition-colors flex-shrink-0" />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Bottom Information */}
      <footer className="mt-8 pt-4 text-center border-t border-border">
        <p className="text-[16px] text-text-muted font-medium">
          StuntGuard • Posyandu ILP Ramah Kader
        </p>
      </footer>

      {/* Logout Warning Modal for Pending Items */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        pendingCount={pendingOutboxCount}
        onConfirm={executeLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}

export default function KaderHomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen px-4 py-8 max-w-[480px] mx-auto w-full space-y-6">
          <div className="h-14 w-full bg-slate-200/80 rounded-2xl animate-pulse" />
          <div className="h-32 w-full bg-slate-200/80 rounded-[24px] animate-pulse" />
          <div className="h-32 w-full bg-slate-200/80 rounded-[24px] animate-pulse" />
        </div>
      }
    >
      <KaderHomeContent />
    </Suspense>
  );
}

