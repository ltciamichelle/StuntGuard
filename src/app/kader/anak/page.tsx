'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, BottomActionBar, Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { calculateAgeInMonths } from '@/lib/utils';
import { Anak } from '@/types/database';
import { 
  ChevronLeft, 
  Search, 
  UserPlus, 
  ChevronRight, 
  User, 
  TriangleAlert,
  TrendingUp,
} from 'lucide-react';

// Skenario data contoh balita awal untuk fallback lokal / demo
const FALLBACK_CHILDREN: Anak[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    desa_id: 1,
    posyandu_id: 1,
    nama: 'Rayyan Pratama',
    nik: '3201124508230001',
    no_kk: '3201120000000001',
    nama_pengasuh: 'Siti Rahmawati',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2025-08-15',
    jenis_kelamin: 'L',
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    desa_id: 1,
    posyandu_id: 1,
    nama: 'Aisyah Putri',
    nik: '3201125204230002',
    no_kk: '3201120000000002',
    nama_pengasuh: 'Dewi Lestari',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2025-04-20',
    jenis_kelamin: 'P',
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    desa_id: 1,
    posyandu_id: 1,
    nama: 'Bima Sakti',
    nik: '3201121012220003',
    no_kk: '3201120000000003',
    nama_pengasuh: 'Nur Hasanah',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2024-12-10',
    jenis_kelamin: 'L',
  },
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    desa_id: 1,
    posyandu_id: 2,
    nama: 'Doni Firmansyah',
    nik: '3201121503230004',
    no_kk: '3201120000000004',
    nama_pengasuh: 'Rina Marlina',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2025-03-15',
    jenis_kelamin: 'L',
  },
  {
    id: 'a1b2c3d4-0005-4000-8000-000000000005',
    desa_id: 1,
    posyandu_id: 2,
    nama: 'Zahra Cantika',
    nik: '3201126501240005',
    no_kk: '3201120000000005',
    nama_pengasuh: 'Fitri Handayani',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2025-01-25',
    jenis_kelamin: 'P',
  },
];

import { db } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export default function ChildListPage() {
  const router = useRouter();
  const [childrenList, setChildrenList] = useState<Anak[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  const fetchChildren = async () => {
    setLoading(true);
    setErrorMsg('');

    // 1. Determine user posyandu_id from cache, session, or online profile
    let userPosyanduId: number = getDevSessionPosyanduId();
    try {
      const cachedProfile = await db.profile_cache.toCollection().first();
      if (cachedProfile?.posyandu_id) {
        userPosyanduId = cachedProfile.posyandu_id;
      }
    } catch {}

    // 2. Read immediately from local IndexedDB (Dexie anak_cache)
    try {
      const localCached = await db.anak_cache.toArray();
      if (localCached.length > 0) {
        const filtered = localCached.filter(
          (c) => Number(c.posyandu_id) === Number(userPosyanduId)
        );
        if (filtered.length > 0) {
          setChildrenList(filtered.sort((a, b) => a.nama.localeCompare(b.nama)));
          setLoading(false);
        }
      } else {
        // Pre-populate Dexie anak_cache with seeded fallback children
        await db.anak_cache.bulkPut(FALLBACK_CHILDREN);
        const filtered = FALLBACK_CHILDREN.filter(
          (c) => Number(c.posyandu_id) === Number(userPosyanduId)
        );
        setChildrenList(filtered.sort((a, b) => a.nama.localeCompare(b.nama)));
        setLoading(false);
      }
    } catch (dbErr) {
      console.warn('Error reading anak_cache:', dbErr);
    }

    // 3. Whenever online, refresh from server
    try {
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isRealSupabase && navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('posyandu_id')
            .eq('id', user.id)
            .single();
          if (profile?.posyandu_id) {
            userPosyanduId = profile.posyandu_id;
          }
        }

        let query = supabase
          .from('anak')
          .select('*')
          .order('nama', { ascending: true });

        if (userPosyanduId) {
          query = query.eq('posyandu_id', userPosyanduId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Error fetching fresh anak from server:', error);
          setErrorMsg('Gagal menyinkronkan data terbaru dari server.');
        } else if (data && data.length > 0) {
          // Refresh local Dexie cache
          await db.anak_cache.bulkPut(data);
          setChildrenList(data);
        }
      }
    } catch (err) {
      console.warn('Network fetch error (running offline):', err);
    } finally {
      setLoading(false);
    }
  };

  function getDevSessionPosyanduId(): number {
    if (typeof document === 'undefined') return 1;
    const cookieMatch = document.cookie
      .split('; ')
      .find((row) => row.startsWith('sg_dev_session='));
    if (cookieMatch) {
      try {
        const val = decodeURIComponent(cookieMatch.split('=')[1]);
        const session = JSON.parse(val);
        if (session.posyandu_id) return Number(session.posyandu_id);
        if (session.email === 'kader2@test.com') return 2;
      } catch {}
    }
    return 1;
  }

  useEffect(() => {
    fetchChildren();
  }, []);

  // Filter balita berdasarkan nama dari search box
  const filteredChildren = childrenList.filter((anak) =>
    anak.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (anak.nama_pengasuh && anak.nama_pengasuh.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (anak.nik && anak.nik.includes(searchQuery))
  );

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[480px] mx-auto w-full pb-36">
      <div className="space-y-6">
        {/* Top Header: Back Button, Title, and Fixed Sync Badge */}
        <header className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/kader')}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary transition-colors cursor-pointer"
              title="Kembali ke Beranda"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
            <div>
              <span className="text-[16px] font-bold text-teal uppercase tracking-wider block">
                Posyandu ILP
              </span>
              <h1 className="text-[24px] font-bold text-text leading-tight">
                Daftar Balita
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {/* Search Box by nama */}
        <div>
          <div className="relative">
            <input
              id="search-anak-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama balita atau pengasuh..."
              className="w-full min-h-[56px] px-4 pl-12 pr-20 text-[16px] font-medium text-text bg-white border border-border rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
            <Search
              size={22}
              strokeWidth={2}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-bold text-primary hover:underline cursor-pointer"
              >
                Hapus
              </button>
            )}
          </div>
        </div>

        {/* Info Jumlah Balita */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[16px] font-bold text-text-muted uppercase tracking-wider">
            Total {filteredChildren.length} Balita
          </span>
          <span className="text-[16px] text-teal font-bold">
            Pilih untuk mulai ukur
          </span>
        </div>

        {/* Error Notification with Coba Lagi if full fetch error */}
        {errorMsg && (
          <div role="alert" className="p-4 rounded-[16px] bg-yellow-light border border-yellow/40 text-text flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[16px] font-medium">
              <TriangleAlert size={22} strokeWidth={2} className="text-yellow flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={fetchChildren}
              className="px-3 py-1.5 rounded-full bg-white text-primary border border-primary/30 text-[16px] font-bold hover:bg-primary-selected cursor-pointer flex-shrink-0"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* List of Large Child Cards */}
        {loading ? (
          <div className="flex flex-col gap-4 py-2">
            <Skeleton variant="card" className="h-32 rounded-[24px]" />
            <Skeleton variant="card" className="h-32 rounded-[24px]" />
            <Skeleton variant="card" className="h-32 rounded-[24px]" />
          </div>
        ) : filteredChildren.length === 0 ? (
          <EmptyState
            icon={<User size={36} strokeWidth={2} />}
            message={
              searchQuery
                ? `Tidak ada hasil pencarian untuk "${searchQuery}".`
                : 'Belum ada balita terdaftar di Posyandu ini.'
            }
            actionLabel="Daftarkan Balita Baru"
            onAction={() => router.push('/kader/anak/baru')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {filteredChildren.map((anak) => {
              const ageInMonths = calculateAgeInMonths(anak.tgl_lahir);
              const isBoy = anak.jenis_kelamin === 'L';

              return (
                <Card
                  key={anak.id}
                  padding="16"
                  id={`card-anak-${anak.id}`}
                  className="cursor-pointer hover:border-primary/40 active:scale-[0.99] transition-all group min-h-[96px]"
                  onClick={() => router.push(`/kader/ukur/${anak.id}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {/* Avatar Icon with Gender Indicator */}
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isBoy
                            ? 'bg-teal-light text-teal'
                            : 'bg-primary-selected text-primary'
                        }`}
                      >
                        <User size={28} strokeWidth={2} />
                      </div>

                      <div>
                        {/* Child Name */}
                        <h2 className="text-[18px] font-bold text-text group-hover:text-primary transition-colors leading-snug">
                          {anak.nama}
                        </h2>

                        {/* Age in Months (calculated from tgl_lahir) */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[16px] font-bold text-text">
                            {ageInMonths} Bulan
                          </span>
                          <span className="text-border">•</span>
                          <span className="text-[16px] text-text-muted">
                            {anak.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </div>

                        {/* Caregiver Name */}
                        <p className="text-[16px] text-text-muted mt-0.5">
                          Pengasuh: <strong className="text-text font-semibold">{anak.nama_pengasuh}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[16px] font-bold text-primary hidden group-hover:inline">
                          Ukur
                        </span>
                        <ChevronRight size={24} strokeWidth={2} className="text-text-muted group-hover:text-primary transition-colors" />
                      </div>

                      {/* Small 'Lihat kurva' button */}
                      <button
                        type="button"
                        id={`btn-lihat-kurva-${anak.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/kader/anak/${anak.id}`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-text text-[15px] font-bold border border-border transition-colors cursor-pointer min-h-[44px]"
                        title="Lihat grafik kurva pertumbuhan WHO"
                      >
                        <TrendingUp size={18} strokeWidth={2} className="text-teal" />
                        <span>Lihat kurva</span>
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Action in BottomActionBar: "Daftarkan balita baru" */}
      <BottomActionBar>
        <Button
          id="btn-tambah-balita-baru"
          variant="primary"
          size="kader"
          onClick={() => router.push('/kader/anak/baru')}
          icon={<UserPlus size={24} strokeWidth={2} />}
        >
          Daftarkan Balita Baru
        </Button>
      </BottomActionBar>
    </div>
  );
}
