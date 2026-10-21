'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { calculateAgeInMonths } from '@/lib/utils';
import { Anak } from '@/types/database';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  ChevronRight, 
  Baby, 
  User, 
  Calendar,
  AlertCircle
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
    nama_ibu: 'Siti Rahmawati',
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
    nama_ibu: 'Dewi Lestari',
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
    nama_ibu: 'Nur Hasanah',
    tgl_lahir: '2024-12-10',
    jenis_kelamin: 'L',
  },
];

export default function ChildListPage() {
  const router = useRouter();
  const [childrenList, setChildrenList] = useState<Anak[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function fetchChildren() {
      setLoading(true);
      setErrorMsg('');

      try {
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (isRealSupabase) {
          // RULE 1: Row Level Security already limits what each user sees. Do not add manual desa or posyandu filters for security. Just query normally.
          const { data, error } = await supabase
            .from('anak')
            .select('*')
            .order('nama', { ascending: true });

          if (error) {
            console.error('Error fetching anak:', error);
            setErrorMsg('Gagal memuat data balita dari server.');
            loadLocalFallback();
          } else if (data) {
            setChildrenList(data);
          }
        } else {
          loadLocalFallback();
        }
      } catch (err) {
        console.error(err);
        loadLocalFallback();
      } finally {
        setLoading(false);
      }
    }

    function loadLocalFallback() {
      // Periksa localStorage untuk anak yang baru didaftarkan di sesi ini
      const localSaved = localStorage.getItem('sg_local_anak');
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          setChildrenList([...parsed, ...FALLBACK_CHILDREN]);
          return;
        } catch {
          // Ignore
        }
      }
      setChildrenList(FALLBACK_CHILDREN);
    }

    fetchChildren();
  }, []);

  // Filter balita berdasarkan nama dari search box
  const filteredChildren = childrenList.filter((anak) =>
    anak.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    anak.nama_ibu.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (anak.nik && anak.nik.includes(searchQuery))
  );

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      <div>
        {/* Top Header: Back Button, Title, and Fixed Sync Badge */}
        <header className="flex items-center justify-between pb-3 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/kader')}
              className="w-11 h-11 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-700 hover:border-berry transition-colors cursor-pointer"
              title="Kembali ke Beranda"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <span className="text-[12px] font-bold text-slateTeal uppercase tracking-wider block">
                Posyandu ILP
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                Daftar Balita
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {/* Search Box by nama */}
        <div className="mb-4">
          <div className="relative">
            <input
              id="search-anak-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama balita atau nama ibu..."
              className="w-full min-h-[54px] px-4 pl-12 text-[16px] font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-berry focus:outline-none transition-colors"
            />
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Hapus
              </button>
            )}
          </div>
        </div>

        {/* Info Jumlah Balita */}
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">
            Total {filteredChildren.length} Balita
          </span>
          <span className="text-[12px] text-slateTeal font-semibold">
            Pilih untuk mulai ukur
          </span>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-status-yellow/40 text-amber-900 text-[13px] flex items-center gap-2">
            <AlertCircle size={16} className="text-status-yellow flex-shrink-0" />
            <span>{errorMsg} (Menggunakan data cadangan)</span>
          </div>
        )}

        {/* List of Large Child Cards */}
        {loading ? (
          <div className="flex flex-col gap-3 py-8 text-center text-slate-500 text-[15px]">
            <div className="w-8 h-8 border-3 border-berry border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat daftar balita...</span>
          </div>
        ) : filteredChildren.length === 0 ? (
          <Card padding="lg" className="text-center py-10 my-4">
            <Baby size={48} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-[17px] font-bold text-slate-800 mb-1">
              Tidak Ada Balita Ditemukan
            </h3>
            <p className="text-[14px] text-slate-500 mb-5">
              {searchQuery
                ? `Tidak ada hasil pencarian untuk "${searchQuery}".`
                : 'Belum ada balita terdaftar di Posyandu ini.'}
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push('/kader/anak/baru')}
              icon={<UserPlus size={18} />}
            >
              Daftarkan Balita Baru Sekarang
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3 pb-24">
            {filteredChildren.map((anak) => {
              const ageInMonths = calculateAgeInMonths(anak.tgl_lahir);
              const isBoy = anak.jenis_kelamin === 'L';

              return (
                <Card
                  key={anak.id}
                  padding="md"
                  id={`card-anak-${anak.id}`}
                  className="cursor-pointer hover:border-berry/40 active:scale-[0.99] transition-all group"
                  onClick={() => router.push(`/kader/ukur/${anak.id}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {/* Avatar Icon with Gender Indicator */}
                      <div
                        className={`w-13 h-13 rounded-2xl flex items-center justify-center font-extrabold text-lg flex-shrink-0 ${
                          isBoy
                            ? 'bg-slateTeal-light text-slateTeal'
                            : 'bg-berry-light text-berry'
                        }`}
                      >
                        {isBoy ? '👦' : '👧'}
                      </div>

                      <div>
                        {/* Child Name */}
                        <h2 className="text-[17px] font-extrabold text-slate-900 group-hover:text-berry transition-colors leading-snug">
                          {anak.nama}
                        </h2>

                        {/* Age in Months (calculated from tgl_lahir) */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[14px] font-bold text-slate-700">
                            {ageInMonths} Bulan
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[13px] text-slate-500">
                            {anak.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </div>

                        {/* Mother's Name */}
                        <p className="text-[13px] text-slate-500 mt-0.5">
                          Ibu: <strong className="text-slate-700 font-semibold">{anak.nama_ibu}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[12px] font-bold text-berry hidden group-hover:inline">
                        Ukur
                      </span>
                      <ChevronRight size={22} className="text-slate-300 group-hover:text-berry transition-colors" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Sticky Bottom Action: "Daftarkan balita baru" */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-pageBg via-pageBg/95 to-transparent flex justify-center z-20">
        <div className="w-full max-w-[420px]">
          <Button
            id="btn-tambah-balita-baru"
            variant="primary"
            onClick={() => router.push('/kader/anak/baru')}
            icon={<UserPlus size={20} />}
          >
            Daftarkan Balita Baru
          </Button>
        </div>
      </div>
    </div>
  );
}
