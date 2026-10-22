'use client';

import React, { useEffect, useState } from 'react';
import { syncEngine, SyncEngineState } from '@/lib/syncEngine';
import {
  Cloud,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  X,
  Smartphone,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from './ui';
import { formatIndonesianDate } from '@/lib/utils';

export const SyncStatusBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [syncState, setSyncState] = useState<SyncEngineState>({
    state: 'tersinkron',
    pendingCount: 0,
    failedCount: 0,
    lastSyncTime: null,
    failedItems: [],
    totalLocalCount: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((st) => {
      setSyncState(st);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = () => {
    syncEngine.triggerSync();
  };

  const handleRetryItem = async (id: string) => {
    setRetryingId(id);
    await syncEngine.retryItem(id);
    setRetryingId(null);
  };

  const handleRetryAll = async () => {
    await syncEngine.retryAllFailed();
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Belum pernah';
    try {
      const d = new Date(iso);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${formatIndonesianDate(iso.split('T')[0])}, ${hours}:${mins}`;
    } catch {
      return iso;
    }
  };

  return (
    <>
      {/* 4 States Badge (Top Corner, Always Visible) */}
      <div
        id="sync-status-badge"
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold shadow-sm select-none cursor-pointer transition-all border ${
          syncState.state === 'tersinkron'
            ? 'bg-emerald-50 border-status-green/40 text-emerald-800 hover:bg-emerald-100'
            : syncState.state === 'mengirim'
            ? 'bg-sky-50 border-sky-400 text-sky-800 hover:bg-sky-100'
            : syncState.state === 'gagal'
            ? 'bg-red-50 border-status-red/40 text-red-800 hover:bg-red-100'
            : 'bg-amber-50 border-status-yellow/50 text-amber-900 hover:bg-amber-100'
        } ${className}`}
        title="Ketuk untuk melihat detail sinkronisasi offline"
      >
        {syncState.state === 'tersinkron' ? (
          <>
            <div className="relative flex items-center justify-center">
              <Cloud size={16} className="text-status-green" />
              <Check size={8} className="text-emerald-950 absolute -bottom-0.5 -right-0.5 font-black stroke-[3]" />
            </div>
            <span>Tersinkron</span>
          </>
        ) : syncState.state === 'mengirim' ? (
          <>
            <RefreshCw size={15} className="text-sky-600 animate-spin" />
            <span>Sedang kirim</span>
          </>
        ) : syncState.state === 'gagal' ? (
          <>
            <AlertCircle size={15} className="text-status-red" />
            <span>Gagal kirim ({syncState.failedCount})</span>
            <button
              type="button"
              id="btn-sync-coba-lagi"
              onClick={(e) => {
                e.stopPropagation();
                handleRetryAll();
              }}
              className="ml-1 px-1.5 py-0.5 rounded bg-status-red text-white text-[10px] font-extrabold hover:bg-red-700"
            >
              Coba lagi
            </button>
          </>
        ) : (
          /* Menunggu sinyal (yellow, show count) */
          <>
            <Clock size={15} className="text-amber-600" />
            <span>
              Menunggu sinyal{syncState.pendingCount > 0 ? ` (${syncState.pendingCount})` : ''}
            </span>
          </>
        )}
      </div>

      {/* Sync Detail Modal / Bottom Sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            id="sync-detail-modal"
            className="w-full max-w-[390px] bg-white rounded-3xl p-5 shadow-2xl border-2 border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-berry-light text-berry flex items-center justify-center font-bold">
                  <Cloud size={18} />
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-slate-900">
                    Status Sinkronisasi
                  </h3>
                  <span className="text-[12px] text-slate-500 font-medium">
                    {typeof navigator !== 'undefined' && navigator.onLine ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Wifi size={13} /> Sinyal Terhubung (Online)
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <WifiOff size={13} /> Tanpa Sinyal (Offline)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Fixed message in simple Indonesian (Rule 5) */}
            <div className="p-3.5 bg-berry-light/70 border border-berry/20 rounded-2xl flex items-start gap-2.5">
              <Smartphone size={20} className="text-berry flex-shrink-0 mt-0.5" />
              <p className="text-[13px] font-bold text-berry leading-relaxed">
                &ldquo;Data aman di HP ini. Akan dikirim otomatis saat ada sinyal.&rdquo;
              </p>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Data Tersimpan di HP
                </span>
                <span className="text-[18px] font-black text-slate-900 block mt-0.5">
                  {syncState.totalLocalCount} Balita/Catatan
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Antrean Kirim
                </span>
                <span
                  className={`text-[18px] font-black block mt-0.5 ${
                    syncState.pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {syncState.pendingCount} item
                </span>
              </div>
            </div>

            {/* Last successful sync time */}
            <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[12px]">
              <span className="text-slate-600">Terakhir tersinkron:</span>
              <span className="font-extrabold text-slate-800">
                {formatLastSync(syncState.lastSyncTime)}
              </span>
            </div>

            {/* List of failed items with short reason and retry button (Rule 5) */}
            {syncState.failedItems.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-status-red uppercase tracking-wider">
                    Data Gagal Kirim ({syncState.failedItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleRetryAll}
                    className="text-[11px] font-bold text-berry hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Coba Ulang Semua
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {syncState.failedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-red-50/80 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-[12px]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 block truncate">
                          {item.table === 'anak'
                            ? `Pendaftaran Balita: ${item.payload.nama || 'Baru'}`
                            : item.table === 'pengukuran'
                            ? `Pengukuran: ${item.payload.berat_kg}kg / ${item.payload.tinggi_cm}cm`
                            : item.table === 'tindak_lanjut'
                            ? 'Update Tindak Lanjut'
                            : 'Persetujuan (Consent)'}
                        </span>
                        <span className="text-red-700 text-[11px] block truncate">
                          Alasan: {item.last_error || 'Gagal tersambung ke server'}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={retryingId === item.id}
                        onClick={() => handleRetryItem(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-berry hover:bg-berry-hover text-white text-[11px] font-bold flex-shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {retryingId === item.id ? '...' : 'Coba Lagi'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="primary"
                fullWidth
                id="btn-sync-sekarang"
                onClick={handleManualSync}
                className="min-h-[52px] text-[15px] font-bold shadow-md"
              >
                Sinkronkan Sekarang
              </Button>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="py-2.5 text-center text-slate-600 font-bold text-[13px] hover:text-slate-900 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
