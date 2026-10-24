'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Button, Skeleton } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { Artikel, Anak, HubunganPengasuh } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { getLinkedChildren } from '@/lib/tautanEngine';
import { getArtikelDetail, bacaArtikel } from '@/lib/artikelEngine';
import {
  ArrowLeft,
  BookOpen,
  Utensils,
  Clock,
  Coins,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Baby,
  CheckCircle2,
} from 'lucide-react';

export default function DetailArtikelPage() {
  const router = useRouter();
  const params = useParams();
  const artikelId = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [artikel, setArtikel] = useState<Artikel | null>(null);
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<Anak | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!artikelId) return;
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

        const userId = userPayload?.id || 'pengasuh-local';

        // 3. Load active child
        let chosenChild: Anak | null = null;
        if (userPayload?.id) {
          const items = await getLinkedChildren(userPayload.id, supabase);
          if (items.length > 0) {
            let chId = items[0].child.id;
            if (typeof window !== 'undefined') {
              const savedId = localStorage.getItem('sg_selected_child_id');
              if (savedId && items.some((it) => it.child.id === savedId)) {
                chId = savedId;
              }
            }
            chosenChild = items.find((it) => it.child.id === chId)?.child || items[0].child;
            setActiveChild(chosenChild);
          }
        }

        // 4. Load article content
        const art = await getArtikelDetail(artikelId, supabase);
        setArtikel(art);

        // 5. Call RPC baca_artikel(p_artikel, p_anak) once to give points
        if (art && chosenChild) {
          const res = await bacaArtikel(art.id, chosenChild.id, userId, supabase);
          if (res.firstRead && res.pointsAwarded > 0) {
            setPointsMessage(`+${res.pointsAwarded} Poin kebiasaan baik!`);
          }
        }
      } catch (err) {
        console.error('Error loading article detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [artikelId]);

  const formatRupiah = (rp?: number | null) => {
    if (!rp) return null;
    return `sekitar Rp ${rp.toLocaleString('id-ID')}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-6 max-w-[480px] mx-auto w-full space-y-5 pb-16">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-32 h-6 rounded-md" />
        </div>
        <Skeleton className="w-full h-48 rounded-3xl" />
        <Skeleton className="w-3/4 h-8 rounded-xl" />
        <Skeleton className="w-full h-36 rounded-2xl" />
      </main>
    );
  }

  if (!artikel) {
    return (
      <main className="min-h-screen px-4 py-6 max-w-[480px] mx-auto w-full space-y-6 pb-16">
        <header className="flex items-center gap-3 pb-3 border-b border-border">
          <button
            type="button"
            onClick={() => router.push('/keluarga/belajar')}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary transition-colors cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-[20px] font-extrabold text-text">Konten Tidak Ditemukan</h1>
        </header>
        <Card padding="20" className="border border-border bg-card text-center py-10">
          <p className="text-[15px] font-semibold text-text-muted mb-6">
            Artikel atau resep yang Anda tuju tidak tersedia.
          </p>
          <Button
            variant="primary"
            size="kader"
            onClick={() => router.push('/keluarga/belajar')}
            className="w-full min-h-[54px] text-[16px] font-bold"
          >
            Kembali ke Belajar
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-[480px] mx-auto w-full space-y-5 pb-16 select-none">
      {/* Top Navigation */}
      <header className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/keluarga/belajar')}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary transition-colors cursor-pointer active:scale-95 shadow-sm"
            aria-label="Kembali ke halaman belajar"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <span className="text-[12px] font-bold text-teal uppercase tracking-wider block">
              {artikel.kategori === 'resep' ? 'Resep MP-ASI' : 'Panduan MP-ASI'}
            </span>
            <h1 className="text-[18px] font-extrabold text-text leading-tight line-clamp-1">
              {artikel.judul}
            </h1>
          </div>
        </div>
        <SyncStatusBadge />
      </header>

      {/* Cheerful First-Read Toast / Banner */}
      {pointsMessage && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal/10 border-2 border-emerald-300 shadow-soft flex items-center gap-3.5 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-black uppercase tracking-wider mb-0.5">
              Bonus Membaca
            </span>
            <h4 className="text-[16px] font-black text-emerald-950 leading-tight">
              {pointsMessage}
            </h4>
            <p className="text-[13px] text-emerald-900 font-medium">
              Terima kasih sudah belajar untuk kebiasaan makan sehat anak!
            </p>
          </div>
        </div>
      )}

      {/* Photo or SVG Placeholder Card */}
      <div className="relative w-full h-48 rounded-3xl bg-gradient-to-br from-rose-50 via-teal/5 to-amber-50 border-2 border-border flex items-center justify-center overflow-hidden shadow-soft">
        {artikel.foto_url ? (
          <img
            src={artikel.foto_url}
            alt={artikel.judul}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-teal/40">
            {artikel.kategori === 'resep' ? (
              <Utensils size={56} strokeWidth={1.5} />
            ) : (
              <BookOpen size={56} strokeWidth={1.5} />
            )}
          </div>
        )}

        {/* Category Pill */}
        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 text-[12px] font-extrabold text-slate-800 shadow-sm flex items-center gap-1.5 capitalize">
          {artikel.kategori === 'resep' ? <Utensils size={13} className="text-teal" /> : <BookOpen size={13} className="text-primary" />}
          <span>{artikel.kategori}</span>
        </span>
      </div>

      {/* Reviewer Badge */}
      <div>
        {artikel.ditinjau ? (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[12px] font-bold flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
            <span>
              Ditinjau ahli gizi{artikel.peninjau_nama ? `: ${artikel.peninjau_nama}` : ''}
              {artikel.ditinjau_pada ? ` (${artikel.ditinjau_pada})` : ''}
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-[12px] font-bold flex items-center gap-2">
            <AlertCircle size={18} className="text-slate-500 flex-shrink-0" />
            <span>Contoh konten, belum ditinjau ahli gizi</span>
          </div>
        )}
      </div>

      {/* Article Header Details */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal/10 text-teal text-[12px] font-extrabold">
            <Baby size={14} />
            <span>Usia {artikel.usia_min_bulan}-{artikel.usia_max_bulan} bulan</span>
          </span>
          {activeChild && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[12px] font-bold">
              Untuk {activeChild.nama}
            </span>
          )}
        </div>

        <h2 className="text-[22px] font-extrabold text-text leading-snug">
          {artikel.judul}
        </h2>
      </div>

      {/* For Resep: Cooking Time & Estimated Cost */}
      {artikel.kategori === 'resep' && (
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white border-2 border-border shadow-soft">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center flex-shrink-0 font-bold">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Waktu Masak
              </span>
              <span className="text-[14px] font-extrabold text-text">
                {artikel.waktu_masak_menit ? `${artikel.waktu_masak_menit} menit` : '15-20 menit'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
              <Coins size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Perkiraan Biaya
              </span>
              <span className="text-[14px] font-extrabold text-text">
                {formatRupiah(artikel.perkiraan_harga_rp) || 'sekitar Rp 5.000'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content Body */}
      <Card padding="20" className="border-2 border-border bg-white shadow-soft space-y-4">
        <div className="text-[15px] text-text leading-relaxed whitespace-pre-line space-y-3">
          {artikel.konten}
        </div>
      </Card>

      {/* Back Button */}
      <div className="pt-2">
        <Button
          variant="secondary"
          size="kader"
          onClick={() => router.push('/keluarga/belajar')}
          className="w-full min-h-[54px] text-[16px] font-bold"
        >
          Kembali ke Daftar Belajar
        </Button>
      </div>
    </main>
  );
}
