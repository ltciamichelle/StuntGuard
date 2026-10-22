'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  CreditCard, 
  CheckSquare, 
  Square, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function RegisterChildPage() {
  const router = useRouter();
  const supabase = createClient();

  // Form states
  const [nama, setNama] = useState('');
  const [namaIbu, setNamaIbu] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  
  // Consent states
  const [consentChecked, setConsentChecked] = useState(false);
  const [diberikanOleh, setDiberikanOleh] = useState('');

  // UI / Error states
  const [loading, setLoading] = useState(false);
  const [nikError, setNikError] = useState('');
  const [duplicateChildId, setDuplicateChildId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState('');

  // Auto-fill nama orang tua yang setuju saat nama ibu diketik jika belum diisi manual
  const handleNamaIbuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNamaIbu(val);
    if (!diberikanOleh || diberikanOleh === namaIbu) {
      setDiberikanOleh(val);
    }
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
    if (!namaIbu.trim()) {
      setGeneralError('Nama ibu wajib diisi.');
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

    // Validasi persetujuan orang tua (Consent)
    if (!consentChecked) {
      setGeneralError('Harap centang persetujuan pencatatan data tumbuh kembang.');
      return;
    }

    const consentPerson = diberikanOleh.trim() || namaIbu.trim();
    if (!consentPerson) {
      setGeneralError('Nama orang tua yang memberikan persetujuan wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isRealSupabase) {
        // Ambil desa_id dan posyandu_id dari profil user kader yang sedang login (RULE 4)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('desa_id, posyandu_id')
          .eq('id', user.id)
          .single();

        const desaId = profile?.desa_id;
        const posyanduId = profile?.posyandu_id;

        // Cek duplikasi NIK sebelum insert jika NIK diisi
        if (cleanNik) {
          const { data: existingChild } = await supabase
            .from('anak')
            .select('id, nama')
            .eq('nik', cleanNik)
            .maybeSingle();

          if (existingChild) {
            setNikError('NIK sudah terdaftar');
            setDuplicateChildId(existingChild.id);
            setLoading(false);
            return;
          }
        }

        // Siapkan payload anak. RULE 5: nik send null when empty, never an empty string.
        const anakPayload = {
          desa_id: desaId,
          posyandu_id: posyanduId,
          nama: nama.trim(),
          nik: cleanNik ? cleanNik : null,
          no_kk: noKk.trim() ? noKk.trim() : null,
          nama_ibu: namaIbu.trim(),
          tgl_lahir: tglLahir,
          jenis_kelamin: jenisKelamin,
        };

        const { data: newAnak, error: insertAnakError } = await supabase
          .from('anak')
          .insert(anakPayload)
          .select()
          .single();

        if (insertAnakError) {
          // Tangani kemungkinan unique constraint error dari database
          if (insertAnakError.code === '23505' || insertAnakError.message?.toLowerCase().includes('duplicate') || insertAnakError.message?.toLowerCase().includes('unique')) {
            setNikError('NIK sudah terdaftar');
            // Coba ambil ID anak yang sudah ada untuk tombol buka
            if (cleanNik) {
              const { data: dup } = await supabase.from('anak').select('id').eq('nik', cleanNik).maybeSingle();
              if (dup) setDuplicateChildId(dup.id);
            }
          } else {
            setGeneralError(`Gagal menyimpan data: ${insertAnakError.message}`);
          }
          setLoading(false);
          return;
        }

        // Simpan baris consent (versi_teks = 'v1')
        if (newAnak?.id) {
          const { error: consentError } = await supabase
            .from('consent')
            .insert({
              anak_id: newAnak.id,
              diberikan_oleh: consentPerson,
              versi_teks: 'v1',
            });

          if (consentError) {
            console.error('Consent insert warning:', consentError);
          }

          // Setelah berhasil, arahkan ke layar ukur balita ini
          router.push(`/kader/ukur/${newAnak.id}`);
          return;
        }
      } else {
        // Fallback simpan lokal saat Supabase belum terkonfigurasi
        const localSaved = localStorage.getItem('sg_local_anak');
        let currentList: any[] = localSaved ? JSON.parse(localSaved) : [];

        if (cleanNik && currentList.some((c: any) => c.nik === cleanNik)) {
          const dup = currentList.find((c: any) => c.nik === cleanNik);
          setNikError('NIK sudah terdaftar');
          setDuplicateChildId(dup?.id || 'demo-dup');
          setLoading(false);
          return;
        }

        let currentPosyanduId = 1;
        const cookieMatch = typeof document !== 'undefined'
          ? document.cookie.split('; ').find((row) => row.startsWith('sg_dev_session='))
          : null;
        if (cookieMatch) {
          try {
            const val = decodeURIComponent(cookieMatch.split('=')[1]);
            const session = JSON.parse(val);
            if (session.posyandu_id) currentPosyanduId = Number(session.posyandu_id);
          } catch {}
        }

        const generatedId = crypto.randomUUID();
        const localChild = {
          id: generatedId,
          desa_id: 1,
          posyandu_id: currentPosyanduId,
          nama: nama.trim(),
          nik: cleanNik ? cleanNik : null,
          no_kk: noKk.trim() ? noKk.trim() : null,
          nama_ibu: namaIbu.trim(),
          tgl_lahir: tglLahir,
          jenis_kelamin: jenisKelamin,
        };

        currentList.unshift(localChild);
        localStorage.setItem('sg_local_anak', JSON.stringify(currentList));

        // Redirect ke layar ukur balita ini
        router.push(`/kader/ukur/${generatedId}`);
        return;
      }
    } catch (err: any) {
      setGeneralError('Terjadi kesalahan teknis saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      <div>
        {/* Top Header: Back button, title, and fixed sync badge */}
        <header className="flex items-center justify-between pb-3 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/kader/anak')}
              className="w-11 h-11 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-700 hover:border-berry transition-colors cursor-pointer"
              title="Kembali ke Daftar Balita"
              aria-label="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <span className="text-[12px] font-bold text-slateTeal uppercase tracking-wider block">
                Formulir Pendaftaran
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
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
            <div className="p-3.5 rounded-2xl bg-red-50 border border-status-red/40 flex items-start gap-2.5 text-red-900 text-[14px]">
              <AlertCircle size={18} className="text-status-red flex-shrink-0 mt-0.5" />
              <span className="font-semibold leading-snug">{generalError}</span>
            </div>
          )}

          {/* 1. Nama Balita */}
          <div>
            <label className="block text-[14px] font-bold text-slate-700 mb-1.5">
              Nama Lengkap Balita <span className="text-status-red">*</span>
            </label>
            <input
              id="input-nama-anak"
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Muhammad Faris"
              className="w-full min-h-[56px] px-4 text-[16px] font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-berry focus:outline-none transition-colors"
            />
          </div>

          {/* 2. Nama Ibu */}
          <div>
            <label className="block text-[14px] font-bold text-slate-700 mb-1.5">
              Nama Ibu Kandung <span className="text-status-red">*</span>
            </label>
            <input
              id="input-nama-ibu"
              type="text"
              required
              value={namaIbu}
              onChange={handleNamaIbuChange}
              placeholder="Contoh: Siti Fatimah"
              className="w-full min-h-[56px] px-4 text-[16px] font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-berry focus:outline-none transition-colors"
            />
          </div>

          {/* 3. Tanggal Lahir (Date Picker) */}
          <div>
            <label className="block text-[14px] font-bold text-slate-700 mb-1.5">
              Tanggal Lahir <span className="text-status-red">*</span>
            </label>
            <div className="relative">
              <input
                id="input-tgl-lahir"
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={tglLahir}
                onChange={(e) => setTglLahir(e.target.value)}
                className="w-full min-h-[56px] px-4 text-[16px] font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-berry focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 4. Jenis Kelamin (Two Big Picture Toggle Buttons L and P) */}
          <div>
            <label className="block text-[14px] font-bold text-slate-700 mb-1.5">
              Jenis Kelamin <span className="text-status-red">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Laki-laki Button */}
              <button
                type="button"
                id="btn-gender-l"
                onClick={() => setJenisKelamin('L')}
                className={`min-h-[76px] p-3 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  jenisKelamin === 'L'
                    ? 'bg-berry-light border-berry shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-3xl">👦</span>
                <div className="text-left">
                  <span className={`block text-[16px] font-extrabold ${jenisKelamin === 'L' ? 'text-berry' : 'text-slate-800'}`}>
                    Laki-laki
                  </span>
                  <span className="text-[12px] text-slate-500 font-semibold">Kode L</span>
                </div>
              </button>

              {/* Perempuan Button */}
              <button
                type="button"
                id="btn-gender-p"
                onClick={() => setJenisKelamin('P')}
                className={`min-h-[76px] p-3 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  jenisKelamin === 'P'
                    ? 'bg-berry-light border-berry shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-3xl">👧</span>
                <div className="text-left">
                  <span className={`block text-[16px] font-extrabold ${jenisKelamin === 'P' ? 'text-berry' : 'text-slate-800'}`}>
                    Perempuan
                  </span>
                  <span className="text-[12px] text-slate-500 font-semibold">Kode P</span>
                </div>
              </button>
            </div>
          </div>

          {/* 5. NIK (Optional, 16 Digits, Number Pad) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[14px] font-bold text-slate-700">
                NIK Balita <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              {nik && (
                <span className={`text-[12px] font-bold ${nik.length === 16 ? 'text-status-green' : 'text-slateTeal'}`}>
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
              className={`w-full min-h-[56px] px-4 text-[18px] tracking-wider font-bold text-slate-900 bg-white border-2 rounded-2xl focus:outline-none transition-colors ${
                nikError ? 'border-status-red' : 'border-slate-200 focus:border-berry'
              }`}
            />

            {/* Helper Text jika NIK kosong */}
            {!nik && (
              <p className="text-[13px] text-slateTeal font-medium mt-1.5 leading-snug">
                Belum punya NIK? Tidak apa-apa, cukup isi nama ibu.
              </p>
            )}

            {/* NIK Error Message */}
            {nikError && (
              <div className="mt-2 p-3 rounded-xl bg-red-50 border border-status-red/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-red-900 text-[13px] font-semibold">
                  <AlertCircle size={16} className="text-status-red flex-shrink-0" />
                  <span>{nikError}</span>
                </div>

                {/* Tombol Buka Anak jika NIK sudah ada */}
                {duplicateChildId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/kader/ukur/${duplicateChildId}`)}
                    className="text-[12px] font-bold bg-white text-status-red px-3 py-1.5 rounded-full border border-status-red/30 hover:bg-red-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Buka Balita</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 6. Nomor KK (Optional) */}
          <div>
            <label className="block text-[14px] font-bold text-slate-700 mb-1.5">
              Nomor Kartu Keluarga (KK) <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <input
              id="input-no-kk"
              type="text"
              inputMode="numeric"
              maxLength={16}
              value={noKk}
              onChange={(e) => setNoKk(e.target.value.replace(/\D/g, ''))}
              placeholder="16 digit nomor KK keluarga"
              className="w-full min-h-[56px] px-4 text-[16px] font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-berry focus:outline-none transition-colors"
            />
          </div>

          {/* 7. Consent (Persetujuan Orang Tua) */}
          <div className="mt-2 p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex flex-col gap-3">
            <label
              htmlFor="checkbox-consent"
              className="flex items-start gap-3 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id="checkbox-consent"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="w-6 h-6 mt-0.5 rounded-lg border-2 border-slate-300 text-berry focus:ring-berry cursor-pointer accent-berry flex-shrink-0"
              />
              <span className="text-[14px] text-slate-800 font-semibold leading-relaxed">
                Orang tua sudah setuju datanya dicatat untuk pemantauan tumbuh kembang anak <span className="text-status-red">*</span>
              </span>
            </label>

            {/* Nama orang tua yang setuju */}
            <div>
              <label className="block text-[12px] font-bold text-slate-600 mb-1">
                Nama Orang Tua yang Memberi Persetujuan <span className="text-status-red">*</span>
              </label>
              <input
                id="input-consent-diberikan-oleh"
                type="text"
                value={diberikanOleh}
                onChange={(e) => setDiberikanOleh(e.target.value)}
                placeholder="Nama ayah / ibu balita"
                className="w-full min-h-[48px] px-3.5 text-[15px] font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-berry focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-3">
            <Button
              id="btn-simpan-balita"
              type="submit"
              variant="primary"
              loading={loading}
              icon={<Check size={20} />}
            >
              Simpan & Lanjut Ukur Balita
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
