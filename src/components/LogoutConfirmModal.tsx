'use client';

import React from 'react';
import { Button } from './ui';
import { AlertTriangle } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  pendingCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({
  isOpen,
  pendingCount,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="modal-konfirmasi-logout"
        className="w-full max-w-[380px] bg-white rounded-[24px] p-6 shadow-card border border-border text-center"
      >
        <div className="w-14 h-14 rounded-full bg-red-light text-red flex items-center justify-center mx-auto mb-4 font-bold">
          <AlertTriangle size={32} strokeWidth={2} />
        </div>

        <h3 id="logout-modal-title" className="text-[20px] font-bold text-text mb-2">
          Peringatan Keluar Akun
        </h3>

        <p className="text-[16px] text-text-muted mb-3 leading-relaxed">
          Masih ada data belum terkirim. Keluar akan menghapusnya.
        </p>

        {pendingCount > 0 && (
          <p className="text-[15px] text-[#9A6F00] bg-yellow-light/60 p-3 rounded-2xl mb-6 font-semibold">
            {pendingCount} data antrean di HP ini akan terhapus demi keamanan.
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          <Button
            id="btn-confirm-logout"
            variant="danger"
            size="kader"
            onClick={onConfirm}
            className="w-full min-h-[54px] text-[16px] font-bold"
          >
            Lanjutkan
          </Button>
          <Button
            id="btn-cancel-logout"
            variant="secondary"
            size="kader"
            onClick={onCancel}
            className="w-full min-h-[54px] text-[16px] font-bold"
          >
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
