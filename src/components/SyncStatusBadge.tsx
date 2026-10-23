'use client';

import React, { useEffect, useState } from 'react';
import { syncEngine, SyncEngineState } from '@/lib/syncEngine';
import {
  CloudCheck,
  CloudOff,
  CloudAlert,
  RefreshCw,
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
      <button
        type="button"
        id="sync-status-badge"
        onClick={() => setIsModalOpen(true)}
        aria-label={`Status sinkronisasi: ${
          syncState.state === 'tersinkron'
            ? 'Tersinkron'
            : syncState.state === 'mengirim'
            ? 'Sedang mengirim data'
            : syncState.state === 'gagal'
            ? `Gagal kirim ${syncState.failedCount} data`
            : `Menunggu sinyal ${syncState.pendingCount} data`
        }`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[14px] font-bold shadow-soft select-none cursor-pointer transition-all border ${
          syncState.state === 'tersinkron'
            ? 'bg-green-light border-green/40 text-green hover:bg-green-100'
            : syncState.state === 'mengirim'
            ? 'bg-sky-50 border-sky-400 text-sky-800 hover:bg-sky-100'
            : syncState.state === 'gagal'
            ? 'bg-red-light border-red/40 text-red hover:bg-red-100'
            : 'bg-yellow-light border-yellow/50 text-[#9A6F00] hover:bg-yellow-100'
        } ${className}`}
      >
        {syncState.state === 'tersinkron' ? (
          <>
            <CloudCheck size={20} strokeWidth={2} className="text-green flex-shrink-0" />
            <span>Tersinkron</span>
          </>
        ) : syncState.state === 'mengirim' ? (
          <>
            <RefreshCw size={20} strokeWidth={2} className="text-sky-600 animate-spin flex-shrink-0" />
            <span>Sedang kirim</span>
          </>
        ) : syncState.state === 'gagal' ? (
          <>
            <CloudAlert size={20} strokeWidth={2} className="text-red flex-shrink-0" />
            <span>Gagal kirim ({syncState.failedCount})</span>
            <span
              id="btn-sync-coba-lagi"
              onClick={(e) => {
                e.stopPropagation();
                handleRetryAll();
              }}
              className="ml-1 px-2 py-0.5 rounded-full bg-red text-white text-[12px] font-bold hover:bg-[#c92f32]"
            >
              Coba lagi
            </span>
          </>
        ) : (
          /* Menunggu sinyal (CloudOff) */
          <>
            <CloudOff size={20} strokeWidth={2} className="text-[#9A6F00] flex-shrink-0" />
            <span>
              Menunggu sinyal{syncState.pendingCount > 0 ? ` (${syncState.pendingCount})` : ''}
            </span>
          </>
        )}
      </button>

      {/* Sync Detail Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <div
            id="sync-detail-modal"
            className="w-full max-w-[400px] bg-white rounded-[24px] p-6 shadow-card border border-border flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary-selected text-primary flex items-center justify-center font-bold">
                  <CloudCheck size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 id="sync-modal-title" className="text-[18px] font-bold text-text">
                    Status Sinkronisasi
                  </h3>
                  <div className="text-[14px] text-text-muted font-medium flex items-center gap-1 mt-0.5">
                    {typeof navigator !== 'undefined' && navigator.onLine ? (
                      <span className="text-green flex items-center gap-1 font-semibold">
                        <Wifi size={16} strokeWidth={2} /> Sinyal Terhubung (Online)
                      </span>
                    ) : (
                      <span className="text-[#9A6F00] flex items-center gap-1 font-semibold">
                        <WifiOff size={16} strokeWidth={2} /> Tanpa Sinyal (Offline)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup jendela status sinkronisasi"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Fixed message in simple Indonesian */}
            <div className="p-4 bg-primary-selected border border-primary/20 rounded-[16px] flex items-start gap-3">
              <Smartphone size={24} strokeWidth={2} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-[16px] font-semibold text-primary leading-relaxed">
                Data aman di HP ini. Akan dikirim otomatis saat ada sinyal.
              </p>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 bg-slate-50 border border-border rounded-[16px]">
                <span className="text-[14px] font-semibold text-text-muted block">
                  Data Tersimpan di HP
                </span>
                <span className="text-[20px] font-bold text-text block mt-1">
                  {syncState.totalLocalCount} Catatan
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-border rounded-[16px]">
                <span className="text-[14px] font-semibold text-text-muted block">
                  Antrean Kirim
                </span>
                <span
                  className={`text-[20px] font-bold block mt-1 ${
                    syncState.pendingCount > 0 ? 'text-[#9A6F00]' : 'text-green'
                  }`}
                >
                  {syncState.pendingCount} data
                </span>
              </div>
            </div>

            {/* Last successful sync time */}
            <div className="p-3 bg-slate-50 border border-border rounded-[16px] flex items-center justify-between text-[14px]">
              <span className="text-text-muted">Terakhir tersinkron:</span>
              <span className="font-bold text-text">
                {formatLastSync(syncState.lastSyncTime)}
              </span>
            </div>

            {/* List of failed items */}
            {syncState.failedItems.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-red uppercase tracking-wider">
                    Data Gagal Kirim ({syncState.failedItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleRetryAll}
                    className="text-[14px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={16} strokeWidth={2} /> Coba Ulang Semua
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                  {syncState.failedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-red-light/60 border border-red/30 rounded-[16px] flex items-center justify-between gap-2 text-[14px]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-text block truncate">
                          {item.table === 'anak'
                            ? `Pendaftaran Balita: ${item.payload.nama || 'Baru'}`
                            : item.table === 'pengukuran'
                            ? `Pengukuran: ${item.payload.berat_kg} kg / ${item.payload.tinggi_cm} cm`
                            : item.table === 'tindak_lanjut'
                            ? 'Catatan Tindak Lanjut'
                            : 'Persetujuan Orang Tua'}
                        </span>
                        <span className="text-red text-[13px] block truncate">
                          Alasan: {item.last_error || 'Gagal tersambung ke server'}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={retryingId === item.id}
                        onClick={() => handleRetryItem(item.id)}
                        className="px-3 py-1.5 rounded-full bg-primary hover:bg-[#8E1F3E] text-white text-[13px] font-bold flex-shrink-0 cursor-pointer disabled:opacity-50"
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
                size="kader"
                id="btn-sync-sekarang"
                onClick={handleManualSync}
              >
                Sinkronkan Sekarang
              </Button>

              <Button
                variant="secondary"
                size="kader"
                onClick={() => setIsModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
