'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { 
  ChevronLeft, 
  User, 
  TriangleAlert,
  ExternalLink,
  CircleCheck,
  Heart,
  Users,
} from 'lucide-react';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { Anak, HubunganPengasuh, Consent } from '@/types/database';

export default function RegisterChildPage() {
  const router = useRouter();
  const supabase = createClient();

  // Form states
  const [nama, setNama] = useState('');
  const [namaPengasuh, setNamaPengasuh] = useState('');
  const [hubunganPengasuh, setHubunganPengasuh] = useState<HubunganPengasuh>('ibu');
  const [tglLahir, setTglLahir] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  
  // Consent states
  const [consentChecked, setConsentChecked] = useState(false);
  const [diberikanOleh, setDiberikanOleh] = useState('');
  const [consentHubungan, setConsentHubungan] = useState<HubunganPengasuh>('ibu');

  // UI / Error states
  const [loading, setLoading] = useState(false);
  const [nikError, setNikError] = useState('');
  const [duplicateChildId, setDuplicateChildId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState('');

  // Auto-fill nama orang yang menyetujui saat nama pengasuh diketik jika belum diisi manual
  const handleNamaPengasuhChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNamaPengasuh(val);
    if (!diberikanOleh || diberikanOleh === namaPengasuh) {
      setDiberikanOleh(val);
    }
  };

  const handleHubunganChange = (rel: HubunganPengasuh) => {
    setHubunganPengasuh(rel);
    setConsentHubungan(rel);
  };

  // NIK Handler: Only numeric characters, max 16 digits
  const handleNikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setNik(val);
    setNikError('');
    setDuplicateChildId(null);

    if (val.length > 0 && val.length < 16) {
      setNikError('NIK harus 16 angka');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setNikError('');
    setDuplicateChildId(null);

    // Validasi dasar
    if (!nama.trim()) {
      setGeneralError('Nama balita wajib diisi.');
      return;
    }
    if (!namaPengasuh.trim()) {
      setGeneralError('Nama pengasuh wajib diisi.');
      return;
    }
    if (!tglLahir) {
      setGeneralError('Tanggal lahir balita wajib dipilih.');
      return;
    }

    // Validasi NIK jika diisi: harus tepat 16 angka
    const cleanNik = nik.trim();
    if (cleanNik.length > 0 && cleanNik.length !== 16) {
      setNikError('NIK harus 16 angka');
      return;
    }

    // Validasi persetujuan orang tua / wali (Consent)
    if (!consentChecked) {
      setGeneralError('Harap centang persetujuan pencatatan data tumbuh kembang.');
      return;
    }

    const consentPerson = diberikanOleh.trim() || namaPengasuh.trim();
    if (!consentPerson) {
      setGeneralError('Nama yang menyetujui wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const newAnakId = crypto.randomUUID();

      // Retrieve desa_id & posyandu_id from profile cache or dev session
      let desaId = 1;
      let posyanduId = 1;

      try {
        const cachedProfile = await db.profile_cache.toCollection().first();
        if (cachedProfile) {
          if (cachedProfile.desa_id) desaId = cachedProfile.desa_id;
          if (cachedProfile.posyandu_id) posyanduId = cachedProfile.posyandu_id;
        }
      } catch {}

      if (posyanduId === 1 && typeof document !== 'undefined') {
        const cookieMatch = document.cookie
          .split('; ')
          .find((row) => row.startsWith('sg_dev_session='));
        if (cookieMatch) {
          try {
            const val = decodeURIComponent(cookieMatch.split('=')[1]);
            const session = JSON.parse(val);
            if (session.posyandu_id) posyanduId = Number(session.posyandu_id);
            if (session.desa_id) desaId = Number(session.desa_id);
          } catch {}
        }
      }

      // Check local NIK duplicate before saving
      if (cleanNik) {
        const existingLocal = await db.anak_cache.where('nik').equals(cleanNik).first();
        if (existingLocal) {
          setNikError('NIK sudah terdaftar');
          setDuplicateChildId(existingLocal.id);
          setLoading(false);
          return;
        }
      }

      const newChild: Anak = {
        id: newAnakId,
        desa_id: desaId,
        posyandu_id: posyanduId,
        nama: nama.trim(),
        nik: cleanNik ? cleanNik : null,
        no_kk: noKk.trim() ? noKk.trim() : null,
        nama_pengasuh: namaPengasuh.trim(),
        hubungan_pengasuh: hubunganPengasuh,
        // Backward-compat alias
        nama_ibu: namaPengasuh.trim(),
        tgl_lahir: tglLahir,
        jenis_kelamin: jenisKelamin,
      };

      const consentRow: Consent = {
        id: Date.now(),
        anak_id: newAnakId,
        diberikan_oleh: consentPerson,
        hubungan: consentHubungan,
        versi_teks: 'v2',
      };

      // Rule: Every write is saved to local cache/outbox first
      await db.anak_cache.put(newChild);

      // Enqueue: anak first, then consent
      await syncEngine.enqueue('anak', newChild);
      await syncEngine.enqueue('consent', consentRow);

      // Navigate immediately to measurement screen for this new child
      router.push(`/kader/ukur/${newAnakId}`);
      return;
    } catch (err: any) {
      setGeneralError('Terjadi kesalahan saat menyimpan data balita. Silakan coba lagi.');
      setLoading(false);
    }
  };

  const RELATION_OPTIONS: Array<{ value: HubunganPengasuh; label: string; desc: string }> = [
    { value: 'ibu', label: 'Ibu', desc: 'Ibu kandung / utama' },
    { value: 'ayah', label: 'Ayah', desc: 'Ayah balita' },
    { value: 'nenek_kakek', label: 'Nenek atau Kakek', desc: 'Keluarga lansia' },
    { value: 'wali_lain', label: 'Wali lain', desc: 'Kerabat / pengasuh' },
  ];

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[480px] mx-auto w-full">
      <div>
        {/* Top Header: Back button, title, and fixed sync badge */}
        <header className="flex items-center justify-between pb-3 mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/kader/anak')}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary transition-colors cursor-pointer"
              title="Kembali ke Daftar Balita"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
            <div>
              <span className="text-[14px] font-bold text-teal uppercase tracking-wider block">
                Formulir Pendaftaran
              </span>
              <h1 className="text-[24px] font-bold text-text leading-tight">
                Registrasi Balita
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {/* Form Pendaftaran */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pb-20">
          {/* General Error Banner */}
          {generalError && (
            <div className="p-4 rounded-[16px] bg-red-light border border-red/40 flex items-start gap-3 text-red text-[16px]">
              <TriangleAlert size={20} strokeWidth={2} className="text-red flex-shrink-0 mt-0.5" />
              <span className="font-semibold leading-snug">{generalError}</span>
            </div>
          )}

          {/* 1. Nama Balita */}
          <div>
            <label className="block text-[16px] font-semibold text-text mb-1.5">
              Nama Lengkap Balita <span className="text-red">*</span>
            </label>
            <input
              id="input-nama-anak"
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Muhammad Faris"
              className="w-full min-h-[56px] px-4 text-[16px] font-medium text-text bg-white border border-border rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>

          {/* 2. Nama Pengasuh */}
          <div>
            <label className="block text-[16px] font-semibold text-text mb-1.5">
              Nama Pengasuh <span className="text-red">*</span>
            </label>
            <input
              id="input-nama-pengasuh"
              type="text"
              required
              value={namaPengasuh}
              onChange={handleNamaPengasuhChange}
              placeholder="Contoh: Siti Fatimah"
              className="w-full min-h-[56px] px-4 text-[16px] font-medium text-text bg-white border border-border rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>

          {/* 3. Hubungan dengan anak: 4 Big Picture Buttons (Task 2) */}
          <div>
            <label className="block text-[16px] font-semibold text-text mb-1.5">
              Hubungan dengan Anak <span className="text-red">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {RELATION_OPTIONS.map((opt) => {
                const isSelected = hubunganPengasuh === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    id={`btn-relasi-${opt.value}`}
                    onClick={() => handleHubunganChange(opt.value)}
                    className={`min-h-[72px] p-3 rounded-[16px] border-2 flex items-center gap-3 transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-primary-selected border-primary shadow-soft'
                        : 'bg-white border-border hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-text-muted'
                      }`}
                    >
                      {opt.value === 'ibu' ? (
                        <Heart size={20} strokeWidth={2} />
                      ) : opt.value === 'ayah' ? (
                        <User size={20} strokeWidth={2} />
                      ) : opt.value === 'nenek_kakek' ? (
                        <Users size={20} strokeWidth={2} />
                      ) : (
                        <User size={20} strokeWidth={2} />
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
                      <span className="text-[12px] text-text-muted font-medium truncate block">
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Tanggal Lahir (Date Picker) */}
          <div>
            <label className="block text-[16px] font-semibold text-text mb-1.5">
              Tanggal Lahir <span className="text-red">*</span>
            </label>
            <input
              id="input-tgl-lahir"
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={tglLahir}
              onChange={(e) => setTglLahir(e.target.value)}
              className="w-full min-h-[56px] px-4 text-[16px] font-medium text-text bg-white border border-border rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>

          {/* 5. Jenis Kelamin (Two Big Toggle Buttons L and P) */}
          <div>
            <label className="block text-[16px] font-semibold text-text mb-1.5">
              Jenis Kelamin <span className="text-red">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Laki-laki Button */}
              <button
                type="button"
                id="btn-gender-l"
                onClick={() => setJenisKelamin('L')}
                className={`min-h-[76px] p-3 rounded-[16px] border-2 flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  jenisKelamin === 'L'
                    ? 'bg-primary-selected border-primary shadow-soft'
                    : 'bg-white border-border hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    jenisKelamin === 'L' ? 'bg-primary text-white' : 'bg-slate-100 text-text-muted'
                  }`}
                >
                  <User size={24} strokeWidth={2} />
                </div>
                <div className="text-left">
                  <span
                    className={`block text-[16px] font-bold ${
                      jenisKelamin === 'L' ? 'text-primary' : 'text-text'
                    }`}
                  >
                    Laki-laki
                  </span>
                  <span className="text-[14px] text-text-muted font-medium">Kode L</span>
                </div>
              </button>

              {/* Perempuan Button */}
              <button
                type="button"
                id="btn-gender-p"
                onClick={() => setJenisKelamin('P')}
                className={`min-h-[76px] p-3 rounded-[16px] border-2 flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  jenisKelamin === 'P'
                    ? 'bg-primary-selected border-primary shadow-soft'
                    : 'bg-white border-border hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    jenisKelamin === 'P' ? 'bg-primary text-white' : 'bg-slate-100 text-text-muted'
                  }`}
                >
                  <User size={24} strokeWidth={2} />
                </div>
                <div className="text-left">
                  <span
                    className={`block text-[16px] font-bold ${
                      jenisKelamin === 'P' ? 'text-primary' : 'text-text'
                    }`}
                  >
                    Perempuan
                  </span>
                  <span className="text-[14px] text-text-muted font-medium">Kode P</span>
                </div>
              </button>
            </div>
          </div>

          {/* 6. NIK (Optional, 16 Digits) */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[16px] font-semibold text-text">
                NIK Balita <span className="text-text-muted font-normal">(Opsional)</span>
              </label>
              {nik && (
                <span
                  className={`text-[14px] font-bold ${nik.length === 16 ? 'text-green' : 'text-teal'}`}
                >
                  {nik.length} / 16 angka
                </span>
              )}
            </div>

            <input
              id="input-nik-anak"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={nik}
              onChange={handleNikChange}
              placeholder="3201..."
              className={`w-full min-h-[56px] px-4 text-[18px] tracking-wider font-bold text-text bg-white border-2 rounded-[16px] focus:outline-none transition-colors ${
                nikError ? 'border-red' : 'border-border focus:border-primary'
              }`}
            />

            {/* Helper Text jika NIK kosong (Task 2) */}
            {!nik && (
              <p className="text-[14px] text-text-muted font-medium mt-1.5 leading-snug">
                Belum punya NIK? Isi nomor KK atau nama pengasuh.
              </p>
            )}

            {/* NIK Error Message */}
            {nikError && (
              <div className="mt-2 p-3 rounded-[16px] bg-red-light border border-red/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-red text-[14px] font-semibold">
                  <TriangleAlert size={20} strokeWidth={2} className="text-red flex-shrink-0" />
                  <span>{nikError}</span>
                </div>

                {duplicateChildId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/kader/ukur/${duplicateChildId}`)}
                    className="text-[14px] font-bold bg-white text-red px-3 py-1.5 rounded-full border border-red/30 hover:bg-red-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Buka Balita</span>
                    <ExternalLink size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 7. Nomor KK (Optional) */}
          <div>
            <label className="block text-[16px] font-semibold text-text mb-1.5">
              Nomor Kartu Keluarga (KK) <span className="text-text-muted font-normal">(Opsional)</span>
            </label>
            <input
              id="input-no-kk"
              type="text"
              inputMode="numeric"
              maxLength={16}
              value={noKk}
              onChange={(e) => setNoKk(e.target.value.replace(/\D/g, ''))}
              placeholder="16 digit nomor KK keluarga"
              className="w-full min-h-[56px] px-4 text-[16px] font-medium text-text bg-white border border-border rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>

          {/* 8. Consent (Task 3) */}
          <div className="mt-2 p-4 rounded-[20px] bg-slate-50 border border-border flex flex-col gap-3">
            <label
              htmlFor="checkbox-consent"
              className="flex items-start gap-3 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id="checkbox-consent"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="w-6 h-6 mt-0.5 rounded-lg border-2 border-slate-300 text-primary focus:ring-primary cursor-pointer accent-primary flex-shrink-0"
              />
              <span className="text-[16px] text-text font-semibold leading-relaxed">
                Orang tua atau wali yang sah sudah setuju datanya dicatat untuk pemantauan tumbuh kembang anak <span className="text-red">*</span>
              </span>
            </label>

            {/* Field: Nama yang menyetujui */}
            <div className="pt-2 border-t border-border/60">
              <label className="block text-[14px] font-bold text-text-muted mb-1">
                Nama yang Menyetujui <span className="text-red">*</span>
              </label>
              <input
                id="input-consent-diberikan-oleh"
                type="text"
                value={diberikanOleh}
                onChange={(e) => setDiberikanOleh(e.target.value)}
                placeholder="Nama orang tua atau wali"
                className="w-full min-h-[52px] px-3.5 text-[16px] font-medium text-text bg-white border border-border rounded-[12px] focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
            </div>

            {/* Relationship buttons for Consent */}
            <div>
              <label className="block text-[14px] font-bold text-text-muted mb-1">
                Hubungan yang Menyetujui
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RELATION_OPTIONS.map((opt) => {
                  const isSelected = consentHubungan === opt.value;
                  return (
                    <button
                      key={`consent-${opt.value}`}
                      type="button"
                      onClick={() => setConsentHubungan(opt.value)}
                      className={`p-2.5 rounded-[12px] border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary-selected border-primary font-bold text-primary'
                          : 'bg-white border-border text-text font-medium hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[14px]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-3">
            <Button
              id="btn-simpan-balita"
              type="submit"
              variant="primary"
              size="kader"
              loading={loading}
              icon={<CircleCheck size={24} strokeWidth={2} />}
            >
              Simpan & Lanjut Ukur Balita
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
