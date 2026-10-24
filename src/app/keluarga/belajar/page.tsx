'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Skeleton } from '@/components/ui';
import { KeluargaTabBar } from '@/components/keluarga/KeluargaTabBar';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { Anak, HubunganPengasuh, Artikel, KategoriArtikel } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { getLinkedChildren } from '@/lib/tautanEngine';
import { getArtikelList } from '@/lib/artikelEngine';
import { getRingkasanPengasuh } from '@/lib/mpasiEngine';
import { verifyAndEnforceCacheSafety } from '@/lib/cacheSafety';
import {
  BookOpen,
  Utensils,
  Clock,
  Coins,
  CheckCircle2,
  Sparkles,
  Baby,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export default function KeluargaBelajarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [linkedList, setLinkedList] = useState<Array<{ child: Anak; hubungan: HubunganPengasuh }>>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [childStatus, setChildStatus] = useState<string | null>(null);
  const [kategoriFilter, setKategoriFilter] = useState<'semua' | 'artikel' | 'resep'>('semua');
  const [articles, setArticles] = useState<Artikel[]>([]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        let userPayload: any = null;

        // 1. Check Supabase auth
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

          // Get child's status from ringkasan
          const ringkasan = await getRingkasanPengasuh(chosenId, userPayload.id, supabase);
          const st = ringkasan?.status_terakhir || null;
          setChildStatus(st);

          const child = items.find((it) => it.child.id === chosenId)?.child;
          const ageMonths = child ? calculateAgeMonths(child.tgl_lahir) : 6;
          await loadArticles(ageMonths, st, 'semua');
        } else {
          await loadArticles(undefined, null, 'semua');
        }
      } catch (err) {
        console.error('Error initializing belajar page:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const calculateAgeMonths = (tglLahir: string) => {
    const b = new Date(tglLahir);
    const now = new Date();
    let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
    if (now.getDate() < b.getDate()) months--;
    return Math.max(0, months);
  };

  const loadArticles = async (
    age?: number,
    status?: string | null,
    filter: 'semua' | 'artikel' | 'resep' = 'semua'
  ) => {
    try {
      const list = await getArtikelList(age, status, filter, supabase);
      setArticles(list);
    } catch (err) {
      console.error('Failed to load articles:', err);
    }
  };

  const handleFilterChange = async (filter: 'semua' | 'artikel' | 'resep') => {
    setKategoriFilter(filter);
    const child = linkedList.find((it) => it.child.id === activeChildId)?.child;
    const ageMonths = child ? calculateAgeMonths(child.tgl_lahir) : undefined;
    await loadArticles(ageMonths, childStatus, filter);
  };

  const activeChild = linkedList.find((it) => it.child.id === activeChildId)?.child || null;
  const childAgeMonths = activeChild ? calculateAgeMonths(activeChild.tgl_lahir) : 6;

  const formatRupiah = (rp?: number | null) => {
    if (!rp) return null;
    return `sekitar Rp ${rp.toLocaleString('id-ID')}`;
  };

  return (
    <main className="min-h-screen px-4 py-6 max-w-[480px] mx-auto w-full space-y-6 pb-28 select-none">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <span className="text-[13px] font-bold text-teal uppercase tracking-wider block">
            Edukasi & Resep
          </span>
          <h1 className="text-[22px] font-extrabold text-text leading-tight">
            Belajar MP-ASI
          </h1>
        </div>
        <SyncStatusBadge />
      </header>

      {/* Child Personalization Banner */}
      {activeChild && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-teal/5 border border-teal/20 shadow-soft">
          <div className="w-10 h-10 rounded-2xl bg-teal/15 text-teal flex items-center justify-center font-bold flex-shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="text-[13px] text-text-muted leading-tight">
            Menampilkan saran yang disesuaikan untuk{' '}
            <strong className="text-text font-extrabold">{activeChild.nama}</strong> (usia{' '}
            {childAgeMonths} bulan).
          </div>
        </div>
      )}

      {/* Filter Chips: Semua, Artikel, Resep */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleFilterChange('semua')}
          className={`flex-1 min-h-[48px] py-2.5 px-4 rounded-2xl text-[15px] font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
            kategoriFilter === 'semua'
              ? 'bg-primary text-white border-primary shadow-soft'
              : 'bg-white text-text-muted border-border hover:border-primary/40'
          }`}
        >
          <Sparkles size={16} />
          <span>Semua</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('artikel')}
          className={`flex-1 min-h-[48px] py-2.5 px-4 rounded-2xl text-[15px] font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
            kategoriFilter === 'artikel'
              ? 'bg-primary text-white border-primary shadow-soft'
              : 'bg-white text-text-muted border-border hover:border-primary/40'
          }`}
        >
          <BookOpen size={16} />
          <span>Artikel</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('resep')}
          className={`flex-1 min-h-[48px] py-2.5 px-4 rounded-2xl text-[15px] font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
            kategoriFilter === 'resep'
              ? 'bg-primary text-white border-primary shadow-soft'
              : 'bg-white text-text-muted border-border hover:border-primary/40'
          }`}
        >
          <Utensils size={16} />
          <span>Resep</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
        </div>
      )}

      {/* Article Cards List */}
      {!loading && articles.length === 0 && (
        <Card padding="20" className="border border-border bg-card text-center py-10">
          <p className="text-[15px] font-bold text-text-muted">
            Tidak ada konten untuk kategori ini.
          </p>
        </Card>
      )}

      {!loading && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((item) => {
            const isMatchAge =
              childAgeMonths >= item.usia_min_bulan && childAgeMonths <= item.usia_max_bulan;
            const isMatchStatus =
              Boolean(childStatus && item.untuk_status && item.untuk_status.toLowerCase() === childStatus.toLowerCase());

            return (
              <div
                key={item.id}
                onClick={() => router.push(`/keluarga/belajar/${item.id}`)}
                className="group p-4 rounded-3xl bg-white border-2 border-border hover:border-primary/50 shadow-soft transition-all cursor-pointer space-y-3 active:scale-[0.99]"
              >
                {/* Card Top: Photo or Illustration Placeholder */}
                <div className="relative w-full h-36 rounded-2xl bg-gradient-to-br from-rose-50 via-teal/5 to-amber-50 border border-border flex items-center justify-center overflow-hidden">
                  {item.foto_url ? (
                    <img
                      src={item.foto_url}
                      alt={item.judul}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-teal/40 group-hover:scale-105 transition-transform">
                      {item.kategori === 'resep' ? (
                        <Utensils size={44} strokeWidth={1.5} />
                      ) : (
                        <BookOpen size={44} strokeWidth={1.5} />
                      )}
                    </div>
                  )}

                  {/* Category Pill on top left */}
                  <span className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 text-[12px] font-extrabold text-slate-800 shadow-sm flex items-center gap-1.5 capitalize">
                    {item.kategori === 'resep' ? <Utensils size={13} className="text-teal" /> : <BookOpen size={13} className="text-primary" />}
                    <span>{item.kategori}</span>
                  </span>

                  {/* Recommendation badge if prioritized */}
                  {(isMatchStatus || isMatchAge) && (
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-extrabold shadow-sm flex items-center gap-1">
                      <Sparkles size={12} />
                      <span>Cocok untuk Usia</span>
                    </span>
                  )}
                </div>

                {/* Reviewer Badge */}
                <div>
                  {item.ditinjau ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-extrabold">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>
                        Ditinjau ahli gizi{item.peninjau_nama ? `: ${item.peninjau_nama}` : ''}
                        {item.ditinjau_pada ? ` (${item.ditinjau_pada})` : ''}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                      <AlertCircle size={14} className="text-slate-500" />
                      <span>Contoh konten, belum ditinjau ahli gizi</span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-[17px] font-extrabold text-text leading-snug group-hover:text-primary transition-colors">
                  {item.judul}
                </h3>

                {/* Short text */}
                <p className="text-[14px] text-text-muted leading-relaxed line-clamp-2">
                  {item.ringkasan}
                </p>

                {/* For Resep: Cooking Time and Estimated Price */}
                {item.kategori === 'resep' && (
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 text-[12px] font-extrabold text-slate-700">
                    {item.waktu_masak_menit && (
                      <div className="flex items-center gap-1 text-teal">
                        <Clock size={14} />
                        <span>{item.waktu_masak_menit} menit</span>
                      </div>
                    )}
                    {item.perkiraan_harga_rp && (
                      <div className="flex items-center gap-1 text-slate-700">
                        <Coins size={14} className="text-amber-600" />
                        <span>{formatRupiah(item.perkiraan_harga_rp)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Tab Bar */}
      <KeluargaTabBar />
    </main>
  );
}
