'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, StatusBadge, BottomActionBar, ErrorState, Skeleton } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { formatIndonesianDate } from '@/lib/utils';
import { Anak, Pengukuran, TindakLanjut, StatusRujukan } from '@/types/database';
import {
  ChevronLeft,
  ArrowLeft,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  X,
  History,
  Check,
  AlertCircle,
  User,
  Info,
} from 'lucide-react';

import { db, CachedTindakLanjut } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export interface TindakLanjutItem extends TindakLanjut {
  anak?: Anak;
  pengukuran?: Pengukuran;
}

export default function TindakLanjutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<TindakLanjutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Modal: Hubungi Pengasuh
  const [selectedCaregiverItem, setSelectedCaregiverItem] = useState<TindakLanjutItem | null>(null);

  // Modal: Catat Hasil Kunjungan
  const [editingItem, setEditingItem] = useState<TindakLanjutItem | null>(null);
  const [editStatusRujukan, setEditStatusRujukan] = useState<StatusRujukan>('belum');
  const [editCatatan, setEditCatatan] = useState<string>('');
  const [editSelesai, setEditSelesai] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load data
  useEffect(() => {
    loadTindakLanjutData();
  }, []);

  async function loadTindakLanjutData() {
    setLoading(true);
    setLoadError(false);
    try {
      // 1. Read from Dexie tindak_lanjut_cache first (offline support)
      try {
        const cached = await db.tindak_lanjut_cache.toArray();
        if (cached.length > 0) {
          setItems(cached);
          setLoading(false);
        }
      } catch (dbErr) {
        console.warn('Error reading from tindak_lanjut_cache:', dbErr);
      }

      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      let loadedItems: TindakLanjutItem[] = [];

      if (isRealSupabase && navigator.onLine) {
        // Query joined data
        const { data, error } = await supabase
          .from('tindak_lanjut')
          .select(`
            *,
            anak:anak_id (*),
            pengukuran:pengukuran_id (*)
          `)
          .order('tgl_kunjungan_ulang', { ascending: true });

        if (data && data.length > 0) {
          loadedItems = data as TindakLanjutItem[];
          await db.tindak_lanjut_cache.bulkPut(loadedItems as CachedTindakLanjut[]);
        }
      }

      // Check local storage if database returned empty or offline
      if (loadedItems.length === 0) {
        const localSaved = localStorage.getItem('sg_local_tindak_lanjut');
        if (localSaved) {
          loadedItems = JSON.parse(localSaved);
        } else {
          // Initialize sample seeded cases for Kader demo
          loadedItems = [
            {
              id: 101,
              pengukuran_id: 'sample-p-1',
              anak_id: 'sample-c-1',
              desa_id: 1,
              posyandu_id: 1,
              tgl_kunjungan_ulang: '2026-10-18', // Past date -> Terlambat
              status_rujukan: 'belum',
              catatan: 'Balita terindikasi stunting berat. Perlu kunjungan rumah untuk memastikan PMT dan rujukan Puskesmas.',
              selesai: false,
              updated_at: '2026-10-18T10:00:00Z',
              anak: {
                id: 'sample-c-1',
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
              pengukuran: {
                id: 'sample-p-1',
                anak_id: 'sample-c-1',
                desa_id: 1,
                posyandu_id: 1,
                tgl_ukur: '2026-10-15',
                berat_kg: 8.2,
                tinggi_cm: 68.5,
                cara_ukur: 'berbaring',
                berat_manual: true,
                z_tbu: -3.4,
                z_bbu: -2.9,
                status: 'merah',
              },
            },
            {
              id: 102,
              pengukuran_id: 'sample-p-2',
              anak_id: 'sample-c-2',
              desa_id: 1,
              posyandu_id: 1,
              tgl_kunjungan_ulang: '2026-10-25', // Future date -> Urgent
              status_rujukan: 'sudah',
              catatan: 'Sudah dirujuk ke Bidan Desa. Kader perlu mengecek apakah pengasuh sudah mulai memberikan 1 telur per hari.',
              selesai: false,
              updated_at: '2026-10-20T14:30:00Z',
              anak: {
                id: 'sample-c-2',
                desa_id: 1,
                posyandu_id: 1,
                nama: 'Aisyah Putri',
                nik: '3201125510240002',
                no_kk: '3201120000000002',
                nama_pengasuh: 'Nurul Hidayah',
                hubungan_pengasuh: 'ibu',
                tgl_lahir: '2025-04-10',
                jenis_kelamin: 'P',
              },
              pengukuran: {
                id: 'sample-p-2',
                anak_id: 'sample-c-2',
                desa_id: 1,
                posyandu_id: 1,
                tgl_ukur: '2026-10-18',
                berat_kg: 8.9,
                tinggi_cm: 74.0,
                cara_ukur: 'berbaring',
                berat_manual: true,
                z_tbu: -2.3,
                z_bbu: -2.1,
                status: 'kuning',
              },
            },
            {
              id: 103,
              pengukuran_id: 'sample-p-3',
              anak_id: 'sample-c-3',
              desa_id: 1,
              posyandu_id: 1,
              tgl_kunjungan_ulang: '2026-10-12',
              status_rujukan: 'ada_hasil',
              catatan: 'Kunjungan rumah terlaksana. Pengasuh sudah memberikan makanan tinggi protein, berat badan balita naik 400 gram.',
              selesai: true,
              updated_at: '2026-10-14T09:00:00Z',
              anak: {
                id: 'sample-c-3',
                desa_id: 1,
                posyandu_id: 1,
                nama: 'Muhammad Bilal',
                nik: '3201121203240003',
                no_kk: '3201120000000003',
                nama_pengasuh: 'Dewi Lestari',
                hubungan_pengasuh: 'ibu',
                tgl_lahir: '2024-11-20',
                jenis_kelamin: 'L',
              },
              pengukuran: {
                id: 'sample-p-3',
                anak_id: 'sample-c-3',
                desa_id: 1,
                posyandu_id: 1,
                tgl_ukur: '2026-10-10',
                berat_kg: 10.4,
                tinggi_cm: 80.2,
                cara_ukur: 'berdiri',
                berat_manual: true,
                z_tbu: -1.4,
                z_bbu: -1.1,
                status: 'kuning',
              },
            },
          ];
          localStorage.setItem('sg_local_tindak_lanjut', JSON.stringify(loadedItems));
        }
      }

      setItems(loadedItems);
    } catch (err) {
      console.error('Error loading tindak lanjut:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  // Check if date is past today
  function isDatePast(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target < today;
  }

  // Filter items based on active tab
  const pendingItems = items
    .filter((item) => !item.selesai)
    .sort((a, b) => {
      if (!a.tgl_kunjungan_ulang) return 1;
      if (!b.tgl_kunjungan_ulang) return -1;
      return new Date(a.tgl_kunjungan_ulang).getTime() - new Date(b.tgl_kunjungan_ulang).getTime();
    });

  const completedItems = items
    .filter((item) => item.selesai)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const displayedItems = showHistory ? completedItems : pendingItems;

  // Open edit modal
  const handleOpenCatatKunjungan = (item: TindakLanjutItem) => {
    setEditingItem(item);
    setEditStatusRujukan(item.status_rujukan || 'belum');
    setEditCatatan(item.catatan || '');
    setEditSelesai(item.selesai || false);
  };

  // Save edit
  const handleSaveKunjungan = async () => {
    if (!editingItem) return;

    setIsSaving(true);
    const nowIso = new Date().toISOString();

    try {
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      const updatedItem: TindakLanjutItem = {
        ...editingItem,
        status_rujukan: editStatusRujukan,
        catatan: editCatatan.trim() || null,
        selesai: editSelesai,
        updated_at: nowIso,
      };

      // 1. Update Dexie local cache immediately
      await db.tindak_lanjut_cache.put(updatedItem as CachedTindakLanjut);

      // 2. Enqueue into Outbox (Rule 3)
      await syncEngine.enqueue('tindak_lanjut', {
        id: editingItem.id,
        status_rujukan: editStatusRujukan,
        catatan: editCatatan.trim() || null,
        selesai: editSelesai,
      });

      // Update state & legacy localStorage
      const updatedList = items.map((item) => {
        if (item.id === editingItem.id) {
          return updatedItem;
        }
        return item;
      });

      setItems(updatedList);
      localStorage.setItem('sg_local_tindak_lanjut', JSON.stringify(updatedList));

      setEditingItem(null);
    } catch (err) {
      console.error('Error saving tindak lanjut:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusRujukanLabel = (status: StatusRujukan): string => {
    switch (status) {
      case 'belum':
        return 'Belum';
      case 'sudah':
        return 'Sudah dirujuk';
      case 'ada_hasil':
        return 'Ada hasil';
      default:
        return 'Belum';
    }
  };

  return (
    <div className="min-h-screen px-4 py-5 pb-36 max-w-[480px] mx-auto w-full select-none space-y-6">
      {/* Header Bar */}
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/kader')}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary hover:text-primary transition-colors cursor-pointer"
            title="Kembali ke Beranda"
            aria-label="Kembali"
          >
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <div>
            <span className="text-[16px] font-bold text-teal uppercase tracking-wider block">
              Pemantauan Lapangan
            </span>
            <h1 className="text-[22px] font-bold text-text leading-tight">
              Daftar Tindak Lanjut
            </h1>
          </div>
        </div>

        <SyncStatusBadge />
      </header>

      {/* View Switch: Perlu Tindak Lanjut vs Lihat Riwayat Selesai */}
      <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl gap-1">
        <button
          type="button"
          id="tab-perlu-tindak-lanjut"
          onClick={() => setShowHistory(false)}
          className={`flex-1 min-h-[52px] py-2.5 px-3 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            !showHistory
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Perlu Tindak Lanjut</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[14px] font-black ${
              pendingItems.length > 0
                ? 'bg-berry text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {pendingItems.length}
          </span>
        </button>

        <button
          type="button"
          id="tab-riwayat-selesai"
          onClick={() => setShowHistory(true)}
          className={`flex-1 min-h-[52px] py-2.5 px-3 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            showHistory
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History size={18} />
          <span>Riwayat Selesai</span>
          {completedItems.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[14px] font-black">
              {completedItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Informative Guidance Banner */}
      {!showHistory && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-[16px] text-amber-950">
          <AlertCircle size={22} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Daftar diurutkan berdasarkan <strong>tanggal kunjungan ulang terdekat</strong> agar balita yang mendesak mendapat prioritas utama.
          </p>
        </div>
      )}

      {/* Content List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="p-5 rounded-[20px] border border-border bg-white shadow-card space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton height="24px" width="30%" />
                <Skeleton height="24px" width="25%" />
              </div>
              <Skeleton height="28px" width="70%" />
              <Skeleton height="20px" width="50%" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Skeleton height="56px" rounded="rounded-full" />
                <Skeleton height="56px" rounded="rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <ErrorState
          title="Gagal Memuat Daftar Tindak Lanjut"
          description="Terjadi kesalahan saat memuat data tindak lanjut. Silakan coba lagi."
          actionText="Coba lagi"
          onAction={() => loadTindakLanjutData()}
        />
      ) : displayedItems.length === 0 ? (
        <Card padding="lg" className="text-center py-12 border-2 border-dashed border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-status-green flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="text-[20px] font-extrabold text-slate-900">
            {showHistory
              ? 'Belum ada riwayat kunjungan yang selesai.'
              : 'Tidak ada anak yang perlu tindak lanjut.'}
          </h3>
          <p className="text-[16px] text-slate-600 max-w-[340px] mx-auto leading-relaxed">
            {showHistory
              ? 'Tindak lanjut yang telah ditandai selesai akan tersimpan di sini sebagai arsip.'
              : 'Seluruh balita dalam kondisi terpantau baik. Pertahankan koordinasi dengan keluarga dan Posyandu.'}
          </p>

          {showHistory && (
            <div className="pt-2">
              <Button
                variant="secondary"
                size="kader"
                onClick={() => setShowHistory(false)}
              >
                Kembali ke Daftar Aktif
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedItems.map((item) => {
            const childName = item.anak?.nama || 'Nama Balita Tidak Dikenal';
            const caregiverName = item.anak?.nama_pengasuh || item.anak?.nama_ibu || 'Pengasuh Balita';
            const isPast = isDatePast(item.tgl_kunjungan_ulang);
            const measurementStatus = item.pengukuran?.status || 'kuning';

            return (
              <Card
                key={item.id}
                padding="md"
                id={`card-tindak-lanjut-${item.id}`}
                className={`border-2 transition-all bg-white shadow-soft space-y-3 ${
                  isPast && !item.selesai
                    ? 'border-status-red/50 ring-2 ring-status-red/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Top: Status Badge + Overdue Tag */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <StatusBadge status={measurementStatus} size="sm" />

                  <div className="flex items-center gap-1.5">
                    {isPast && !item.selesai && (
                      <span
                        id={`tag-terlambat-${item.id}`}
                        className="px-3 py-1 rounded-full bg-red-100 text-status-red border border-status-red/30 text-[13px] font-black uppercase tracking-wider inline-flex items-center gap-1 animate-pulse"
                      >
                        <AlertTriangle size={14} />
                        Terlambat
                      </span>
                    )}

                    {item.selesai && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[13px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                        <Check size={14} />
                        Selesai
                      </span>
                    )}
                  </div>
                </div>

                {/* Child Name & Pengasuh */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-black text-slate-900 leading-snug">
                      {childName}
                    </h3>
                    <p className="text-[16px] text-text-muted mt-0.5">
                      Pengasuh: <strong className="text-text font-semibold">{caregiverName}</strong>
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-full bg-primary-selected text-primary flex items-center justify-center font-bold flex-shrink-0">
                    <User size={24} strokeWidth={2} />
                  </div>
                </div>

                {/* Meta details */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-[16px]">
                  <div>
                    <span className="text-slate-500 block text-[14px] font-semibold">
                      Jadwal Kunjungan
                    </span>
                    <span className={`font-extrabold block mt-0.5 ${isPast && !item.selesai ? 'text-status-red' : 'text-slate-800'}`}>
                      {item.tgl_kunjungan_ulang
                        ? formatIndonesianDate(item.tgl_kunjungan_ulang)
                        : '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[14px] font-semibold">
                      Status Rujukan
                    </span>
                    <span className="font-extrabold text-slate-800 block mt-0.5">
                      {getStatusRujukanLabel(item.status_rujukan)}
                    </span>
                  </div>
                </div>

                {/* Catatan if available */}
                {item.catatan && (
                  <div className="text-[16px] text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-900 block mb-0.5">Catatan Kader:</span>
                    <p className="italic leading-relaxed">&ldquo;{item.catatan}&rdquo;</p>
                  </div>
                )}

                {/* Action Buttons: >= 56px height */}
                {!item.selesai && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      id={`btn-hubungi-pengasuh-${item.id}`}
                      onClick={() => setSelectedCaregiverItem(item)}
                      className="min-h-[56px] px-3 rounded-full bg-white border-2 border-teal text-teal hover:bg-slate-50 active:bg-slate-100 font-bold text-[16px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Phone size={20} strokeWidth={2} className="text-teal" />
                      <span>Hubungi Pengasuh</span>
                    </button>

                    <button
                      type="button"
                      id={`btn-catat-kunjungan-${item.id}`}
                      onClick={() => handleOpenCatatKunjungan(item)}
                      className="min-h-[56px] px-3 rounded-2xl bg-berry hover:bg-berry-hover active:bg-berry-dark text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <ClipboardCheck size={20} />
                      <span>Catat Hasil</span>
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal 1: Hubungi Pengasuh */}
      {selectedCaregiverItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            id="modal-hubungi-pengasuh"
            className="w-full max-w-[420px] bg-white rounded-[24px] p-6 shadow-card border border-border space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-teal-light text-teal flex items-center justify-center">
                  <Phone size={24} strokeWidth={2} />
                </div>
                <h3 className="text-[20px] font-bold text-text">
                  Kontak Pengasuh Balita
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCaregiverItem(null)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-border rounded-[16px] space-y-3 text-[16px]">
              <div>
                <span className="text-text-muted text-[14px] font-semibold uppercase tracking-wider block">
                  Nama Balita
                </span>
                <span className="font-bold text-text text-[18px] block">
                  {selectedCaregiverItem.anak?.nama}
                </span>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-teal text-[14px] font-bold uppercase tracking-wider block">
                  Nama Pengasuh
                </span>
                <span className="font-bold text-text text-[18px] block">
                  {selectedCaregiverItem.anak?.nama_pengasuh || selectedCaregiverItem.anak?.nama_ibu}
                </span>
                {selectedCaregiverItem.anak?.hubungan_pengasuh && (
                  <span className="text-[14px] text-teal font-semibold capitalize block mt-0.5">
                    Hubungan: {selectedCaregiverItem.anak.hubungan_pengasuh.replace('_', ' / ')}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-yellow-light/60 rounded-[16px] border border-yellow/30 text-[16px] text-text leading-relaxed flex items-start gap-2.5">
              <Info size={22} strokeWidth={2} className="text-teal flex-shrink-0 mt-0.5" />
              <div>
                <strong>Catatan Kader:</strong> Hubungi pengasuh saat jam kunjungan rumah yang disepakati atau koordinasikan pendampingan bersama Bidan Desa.
              </div>
            </div>

            <Button
              variant="secondary"
              size="kader"
              fullWidth
              onClick={() => setSelectedCaregiverItem(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      )}

      {/* Modal 2: Catat Hasil Kunjungan */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            id="modal-catat-kunjungan"
            className="w-full max-w-[420px] bg-white rounded-3xl p-6 shadow-2xl border-2 border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-berry-light text-berry flex items-center justify-center">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-slate-900">
                    Catat Hasil Kunjungan
                  </h3>
                  <span className="text-[14px] text-slate-600 font-medium">
                    {editingItem.anak?.nama}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* Field 1: status_rujukan (Three big options >= 56px) */}
            <div className="space-y-2">
              <label className="text-[14px] font-extrabold text-slateTeal uppercase tracking-wider block">
                Status Rujukan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['belum', 'sudah', 'ada_hasil'] as StatusRujukan[]).map((st) => {
                  const isSelected = editStatusRujukan === st;
                  const label = getStatusRujukanLabel(st);

                  return (
                    <button
                      key={st}
                      type="button"
                      id={`opt-status-rujukan-${st}`}
                      onClick={() => setEditStatusRujukan(st)}
                      className={`min-h-[56px] py-3 px-2 rounded-2xl border-2 text-center transition-all font-bold text-[15px] leading-tight cursor-pointer ${
                        isSelected
                          ? 'border-berry bg-berry-light text-berry shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 2: Catatan */}
            <div className="space-y-2">
              <label className="text-[14px] font-extrabold text-slateTeal uppercase tracking-wider block">
                Catatan Kunjungan
              </label>
              <textarea
                id="input-catatan-kunjungan"
                rows={3}
                value={editCatatan}
                onChange={(e) => setEditCatatan(e.target.value)}
                placeholder="Tuliskan hasil kunjungan rumah, kepatuhan konsumsi protein/PMT, atau kondisi balita..."
                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 focus:border-berry focus:outline-none text-[16px] text-slate-900 leading-relaxed resize-none"
              />
            </div>

            {/* Field 3: Toggle "Tindak lanjut selesai" */}
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[16px] font-extrabold text-slate-900 block">
                  Tindak Lanjut Selesai
                </span>
                <span className="text-[14px] text-slate-600 block mt-0.5">
                  Tandai jika pemantauan kasus ini sudah tuntas
                </span>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                id="toggle-tindak-lanjut-selesai"
                role="switch"
                aria-checked={editSelesai}
                onClick={() => setEditSelesai((prev) => !prev)}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                  editSelesai ? 'bg-status-green' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    editSelesai ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Save Buttons */}
            <div className="pt-2 flex flex-col gap-3">
              <Button
                variant="primary"
                size="kader"
                fullWidth
                id="btn-simpan-catatan-kunjungan"
                loading={isSaving}
                onClick={handleSaveKunjungan}
                className="shadow-md"
              >
                Simpan Hasil Kunjungan
              </Button>

              <Button
                variant="secondary"
                size="kader"
                fullWidth
                onClick={() => setEditingItem(null)}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Main Action Bar */}
      <BottomActionBar>
        <Button
          variant="secondary"
          size="kader"
          fullWidth
          onClick={() => router.push('/kader')}
        >
          Kembali ke Beranda Kader
        </Button>
      </BottomActionBar>
    </div>
  );
}
