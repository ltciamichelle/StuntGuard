'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { HubunganPengasuh } from '@/types/database';
import { tautkanPengasuh } from '@/lib/tautanEngine';
import {
  ChevronLeft,
  Link2,
  Heart,
  User,
  Users,
  TriangleAlert,
  CircleCheck,
  ShieldAlert,
} from 'lucide-react';

export default function TautkanAnakPage() {
  const router = useRouter();
  const supabase = createClient();

  const [kode, setKode] = useState('');
  const [hubungan, setHubungan] = useState<HubunganPengasuh>('ibu');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      // 1. Check real Supabase user
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setCurrentUser(data.user);
          return;
        }
      } catch {
        // ignore
      }

      // 2. Check dev session cookie
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/sg_dev_session=([^;]+)/);
        if (match) {
          try {
            const parsed = JSON.parse(decodeURIComponent(match[1]));
            setCurrentUser(parsed);
            return;
          } catch {
            // ignore
          }
        }
      }

      // Default fallback test user if running without explicit session
      setCurrentUser({ id: 'dev-pengasuh-fallback', role: 'pengasuh', nama: 'Pengasuh' });
    }

    loadUser();
  }, []);

  const handleKodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto uppercase, remove spaces, limit to 8 characters
    const clean = e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 8);
    setKode(clean);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanCode = kode.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setErrorMessage('Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru ke kader.');
      return;
    }

    setLoading(true);
    try {
      const userId = currentUser?.id || 'dev-pengasuh-fallback';
      const result = await tautkanPengasuh(cleanCode, hubungan, userId, supabase);

      if (result.success && result.anakId) {
        setSuccessMessage('Berhasil menautkan data balita!');
        if (typeof window !== 'undefined') {
          localStorage.setItem('sg_selected_child_id', result.anakId);
        }
        setTimeout(() => {
          router.push('/keluarga');
          router.refresh();
        }, 800);
      } else {
        setErrorMessage(
          result.error || 'Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru ke kader.'
        );
      }
    } catch {
      setErrorMessage('Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru ke kader.');
    } finally {
      setLoading(false);
    }
  };

  const RELATION_OPTIONS: Array<{ value: HubunganPengasuh; label: string; desc: string }> = [
    { value: 'ibu', label: 'Ibu', desc: 'Ibu balita' },
    { value: 'ayah', label: 'Ayah', desc: 'Ayah balita' },
    { value: 'nenek_kakek', label: 'Nenek atau Kakek', desc: 'Keluarga lansia' },
    { value: 'wali_lain', label: 'Wali lain', desc: 'Kerabat / pengasuh' },
  ];

  return (
    <main className="min-h-screen px-4 py-6 flex flex-col justify-between max-w-[480px] mx-auto w-full pb-10">
      <div className="space-y-6">
        {/* Top Header */}
        <header className="flex items-center gap-3 pb-3 border-b border-border">
          <button
            type="button"
            onClick={() => router.push('/keluarga')}
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary transition-colors cursor-pointer"
            aria-label="Kembali"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
          <div>
            <span className="text-[14px] font-bold text-teal uppercase tracking-wider block">
              Akses Pengasuh
            </span>
            <h1 className="text-[22px] font-bold text-text leading-tight">
              Tautkan Anak
            </h1>
          </div>
        </header>

        {/* Informative Card */}
        <Card padding="20" className="border border-border bg-white shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Link2 size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-text leading-snug">
                Hubungkan Akun dengan Data Balita
              </h2>
              <p className="text-[15px] text-text-muted mt-1 leading-relaxed">
                Kode didapat dari kader Posyandu. Satu kode untuk satu orang.
              </p>
            </div>
          </div>
        </Card>

        {/* Form Tautkan */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {/* 1. Field: Kode dari kader */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="input-kode-tautan" className="block text-[16px] font-bold text-text">
                Kode dari Kader <span className="text-red">*</span>
              </label>
              <span className="text-[14px] font-bold text-teal">
                {kode.length} / 8 karakter
              </span>
            </div>

            <input
              id="input-kode-tautan"
              type="text"
              required
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
              value={kode}
              onChange={handleKodeChange}
              placeholder="Contoh: SG7K9P2W"
              className="w-full min-h-[60px] px-4 text-[22px] font-mono font-extrabold tracking-widest text-center uppercase text-primary bg-white border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition-colors"
            />
            <p className="text-[14px] text-text-muted mt-1.5 leading-snug">
              Masukkan 8 karakter kode yang diberikan oleh kader Posyandu Anda.
            </p>
          </div>

          {/* 2. Hubungan dengan anak: 4 Big Picture Buttons */}
          <div>
            <label className="block text-[16px] font-bold text-text mb-2">
              Hubungan dengan Anak <span className="text-red">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {RELATION_OPTIONS.map((opt) => {
                const isSelected = hubungan === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    id={`btn-relasi-${opt.value}`}
                    onClick={() => setHubungan(opt.value)}
                    className={`min-h-[76px] p-3 rounded-[16px] border-2 flex items-center gap-3 transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-primary-selected border-primary shadow-soft'
                        : 'bg-white border-border hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-text-muted'
                      }`}
                    >
                      {opt.value === 'ibu' ? (
                        <Heart size={22} strokeWidth={2} />
                      ) : opt.value === 'ayah' ? (
                        <User size={22} strokeWidth={2} />
                      ) : opt.value === 'nenek_kakek' ? (
                        <Users size={22} strokeWidth={2} />
                      ) : (
                        <User size={22} strokeWidth={2} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`block text-[16px] font-bold leading-tight ${
                          isSelected ? 'text-primary' : 'text-text'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[13px] text-text-muted font-medium truncate block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div role="alert" className="p-4 rounded-[16px] bg-red-light border border-red/40 flex items-start gap-3 text-red animate-fadeIn">
              <TriangleAlert size={22} strokeWidth={2} className="text-red flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[16px] font-semibold leading-snug">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div role="status" className="p-4 rounded-[16px] bg-green-light border border-green/40 flex items-start gap-3 text-green animate-fadeIn">
              <CircleCheck size={22} strokeWidth={2} className="text-green flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[16px] font-semibold leading-snug">
                {successMessage}
              </p>
            </div>
          )}

          {/* Action Button: 54px min height */}
          <div className="pt-2">
            <Button
              id="btn-tautkan-anak"
              type="submit"
              variant="primary"
              size="kader"
              loading={loading}
              disabled={kode.length < 4}
              className="min-h-[54px] text-[17px] font-bold shadow-soft"
            >
              Tautkan
            </Button>
          </div>
        </form>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center">
        <p className="text-[14px] text-text-muted">
          StuntGuard • Pendampingan Tumbuh Kembang Posyandu
        </p>
      </footer>
    </main>
  );
}
