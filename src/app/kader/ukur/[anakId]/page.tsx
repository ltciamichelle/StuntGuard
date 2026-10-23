'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { calculateAgeInMonths } from '@/lib/utils';
import { Anak, CaraUkur, Pengukuran } from '@/types/database';
import {
  isOutsideSanityLimits,
  isWithinDatabaseLimits,
  calculateZScores,
  DATABASE_LIMITS,
} from '@/lib/anthropometry';
import {
  ChevronLeft,
  Scale,
  Ruler,
  TriangleAlert,
  AlertTriangle,
  RotateCcw,
  CircleCheck,
  CheckCircle2,
  Delete,
  Radio,
  HelpCircle,
  User,
} from 'lucide-react';

import { db, CachedPengukuran } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export default function MeasurementPage() {
  const params = useParams();
  const router = useRouter();
  // Support both param names for flexibility
  const childId = (params.anakId || params.id) as string;
  const supabase = createClient();

  const [child, setChild] = useState<Anak | null>(null);
  const [loadingChild, setLoadingChild] = useState(true);

  // Form states
  const [weightStr, setWeightStr] = useState<string>('');
  const [height, setHeight] = useState<number>(75.0);
  const [method, setMethod] = useState<CaraUkur>('berbaring');
  const [isHeightCustomized, setIsHeightCustomized] = useState(false);
  const [isMethodCustomized, setIsMethodCustomized] = useState(false);

  // Interaction states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSanityModal, setShowSanityModal] = useState(false);

  // Load child data
  useEffect(() => {
    async function fetchChild() {
      setLoadingChild(true);
      try {
        let foundChild: Anak | null = null;

        // 1. Check local Dexie anak_cache first (offline support)
        try {
          const cached = await db.anak_cache.get(childId);
          if (cached) {
            foundChild = cached;
          }
        } catch (dbErr) {
          console.warn('Error reading from db.anak_cache:', dbErr);
        }

        // 2. If online and not found, check Supabase
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (!foundChild && isRealSupabase && navigator.onLine) {
          const { data } = await supabase
            .from('anak')
            .select('*')
            .eq('id', childId)
            .single();

          if (data) {
            foundChild = data;
            await db.anak_cache.put(data);
          }
        }

        if (!foundChild) {
          // Check legacy localStorage
          const localSaved = localStorage.getItem('sg_local_anak');
          if (localSaved) {
            const list: Anak[] = JSON.parse(localSaved);
            const found = list.find((c) => c.id === childId);
            if (found) {
              foundChild = found;
              await db.anak_cache.put(found);
            }
          }
        }

        if (!foundChild) {
          // Fallback dummy for development
          foundChild = {
            id: childId || 'demo-anak',
            desa_id: 1,
            posyandu_id: 1,
            nama: 'Rayyan Pratama',
            nik: '3201124508230001',
            no_kk: '3201120000000001',
            nama_pengasuh: 'Siti Rahmawati',
            hubungan_pengasuh: 'ibu',
            tgl_lahir: '2025-08-15',
            jenis_kelamin: 'L',
          };
        }

        setChild(foundChild);

        // Calculate age and set dynamic defaults
        const ageInMonths = calculateAgeInMonths(foundChild.tgl_lahir);

        // Height start value depends on age:
        // 50 cm if under 12 months, 75 if under 24, otherwise 90
        if (!isHeightCustomized) {
          if (ageInMonths < 12) {
            setHeight(50.0);
          } else if (ageInMonths < 24) {
            setHeight(75.0);
          } else {
            setHeight(90.0);
          }
        }

        // Method default: berbaring if age < 24 months, otherwise berdiri
        if (!isMethodCustomized) {
          setMethod(ageInMonths < 24 ? 'berbaring' : 'berdiri');
        }
      } catch (err) {
        console.error('Error fetching child:', err);
      } finally {
        setLoadingChild(false);
      }
    }

    if (childId) {
      fetchChild();
    }
  }, [childId]);

  const ageInMonths = child ? calculateAgeInMonths(child.tgl_lahir) : 0;
  const currentWeight = parseFloat(weightStr) || 0;

  // Keypad actions for weight
  const handleKeypadPress = (val: string) => {
    setErrorMessage(null);

    if (val === 'DEL') {
      setWeightStr((prev) => prev.slice(0, -1));
      return;
    }

    if (val === 'CLEAR') {
      setWeightStr('');
      return;
    }

    if (val === '.') {
      if (!weightStr) {
        setWeightStr('0.');
        return;
      }
      if (weightStr.includes('.')) {
        return; // Only one decimal allowed
      }
      setWeightStr((prev) => prev + '.');
      return;
    }

    // Number pressed
    if (weightStr.includes('.')) {
      const parts = weightStr.split('.');
      if (parts[1] && parts[1].length >= 2) {
        return; // Max 2 decimal digits for precision
      }
    } else {
      if (weightStr.length >= 4) {
        return; // Reasonable max integer characters (e.g. 99.9)
      }
    }

    setWeightStr((prev) => (prev === '0' ? val : prev + val));
  };

  // Height controls: Step 0.1 cm
  const handleHeightAdjust = (delta: number) => {
    setIsHeightCustomized(true);
    setErrorMessage(null);
    setHeight((prev) => {
      const updated = Math.round((prev + delta) * 10) / 10;
      return Math.max(10, Math.min(200, updated));
    });
  };

  // Method toggle
  const handleMethodChange = (newMethod: CaraUkur) => {
    setIsMethodCustomized(true);
    setMethod(newMethod);
  };

  // Execute save to database / local storage
  const executeSave = async () => {
    if (!child || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    setShowSanityModal(false);

    try {
      const newMeasurementId = crypto.randomUUID();
      const weightNum = parseFloat(weightStr);
      const heightNum = height;
      const today = new Date().toISOString().split('T')[0];

      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;

      // Raw measurement payload (no z_tbu, z_bbu, status calculated here)
      const rawPayload = {
        id: newMeasurementId,
        anak_id: child.id,
        desa_id: child.desa_id || 1,
        posyandu_id: child.posyandu_id || 1,
        tgl_ukur: today,
        berat_kg: weightNum,
        tinggi_cm: heightNum,
        cara_ukur: method,
        berat_manual: true,
      };

      // Rule 6: Z-score and status are calculated only by the database trigger.
      // When a measurement is saved offline, show a neutral card:
      // "Data tersimpan di HP. Hasil warna muncul setelah data terkirim."
      const cachedPeng: CachedPengukuran = {
        ...rawPayload,
        z_tbu: null,
        z_bbu: null,
        status: null,
        is_offline: !isOnline,
      };

      // 1. Save to local Dexie cache immediately
      await db.pengukuran_cache.put(cachedPeng);

      // 2. Enqueue into Outbox (Rule 3: Every write is saved to the outbox first)
      await syncEngine.enqueue('pengukuran', rawPayload);

      // 3. Maintain legacy fallback localStorage
      try {
        const rawExisting = localStorage.getItem('sg_local_pengukuran');
        const list: Pengukuran[] = rawExisting ? JSON.parse(rawExisting) : [];
        const filtered = list.filter((p) => p.id !== newMeasurementId);
        filtered.unshift(cachedPeng);
        localStorage.setItem('sg_local_pengukuran', JSON.stringify(filtered));
      } catch {}

      // Navigate to the result screen with its id
      router.push(`/kader/hasil/${newMeasurementId}`);
    } catch (err: any) {
      console.error('Error saving measurement:', err);
      setErrorMessage('Data belum tersimpan. Coba lagi.');
      setIsSaving(false);
    }
  };

  const saveToLocalStorage = (data: Pengukuran) => {
    try {
      const existing = localStorage.getItem('sg_local_pengukuran');
      const list: Pengukuran[] = existing ? JSON.parse(existing) : [];
      // Remove any existing with same id
      const filtered = list.filter((p) => p.id !== data.id);
      filtered.unshift(data);
      localStorage.setItem('sg_local_pengukuran', JSON.stringify(filtered));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  // Main button trigger "Lihat Hasil"
  const handleLihatHasilPress = () => {
    if (isSaving) return;
    setErrorMessage(null);

    // Validate weight is entered
    if (!weightStr || isNaN(currentWeight) || currentWeight <= 0) {
      setErrorMessage('Silakan masukkan berat badan balita terlebih dahulu.');
      return;
    }

    // Sanity check:
    // If weight is outside 1 to 40 kg OR height is outside 35 to 130 cm
    if (isOutsideSanityLimits(currentWeight, height)) {
      setShowSanityModal(true);
      return;
    }

    // Passed sanity check directly -> save
    executeSave();
  };

  // Database limits check for sanity confirmation button
  const isAllowedInDatabase = isWithinDatabaseLimits(currentWeight, height);

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full select-none">
      <div className="space-y-4">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/kader/anak')}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary hover:text-primary transition-colors cursor-pointer"
              title="Kembali ke Daftar Balita"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
            <div>
              <span className="text-[14px] font-bold text-teal uppercase tracking-wider block">
                Pencatatan Antropometri
              </span>
              <h1 className="text-[20px] font-bold text-text leading-tight">
                Pengukuran Balita
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {loadingChild ? (
          <div className="py-16 text-center text-text-muted">
            <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[16px] font-medium">Menyiapkan data balita...</p>
          </div>
        ) : child ? (
          <>
            {/* Header: Child Name and Age in Months */}
            <Card padding="16" className="border border-border bg-white shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[14px] font-bold text-teal uppercase tracking-wider">
                      Balita Sasaran
                    </span>
                    <span className="text-[14px] text-text-muted">•</span>
                    <span className="text-[14px] font-semibold text-text">
                      Pengasuh: {child.nama_pengasuh || child.nama_ibu}
                    </span>
                  </div>
                  <h2 className="text-[20px] font-bold text-text truncate leading-snug">
                    {child.nama}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-selected text-primary font-bold text-[14px]">
                      {ageInMonths} Bulan
                    </span>
                    <span className="text-[14px] text-text-muted font-medium">
                      ({child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'})
                    </span>
                  </div>
                </div>

                <div className="w-14 h-14 rounded-full bg-primary-selected text-primary flex items-center justify-center font-bold flex-shrink-0 border border-primary/20">
                  <User size={28} strokeWidth={2} />
                </div>
              </div>
            </Card>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div
                id="alert-error-message"
                className="p-4 bg-red-light border-2 border-red/40 rounded-[16px] flex items-start gap-3 text-red animate-in fade-in duration-200"
              >
                <TriangleAlert className="text-red flex-shrink-0 mt-0.5" size={20} strokeWidth={2} />
                <div className="text-[14px] flex-1">
                  <p className="font-bold">{errorMessage}</p>
                  <p className="text-[12px] text-red-700 mt-0.5">
                    Angka yang sudah Anda ketik tetap aman tersimpan di layar.
                  </p>
                </div>
              </div>
            )}

            {/* Section 1: Weight (Berat Badan) */}
            <Card padding="md" className="border-2 border-slate-200/80 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slateTeal-light text-slateTeal flex items-center justify-center">
                    <Scale size={16} />
                  </div>
                  <h3 className="text-[15px] font-extrabold text-slate-900">
                    Berat Badan (BB)
                  </h3>
                </div>

                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Manual Entry
                </span>
              </div>

              {/* Big Number Display (24px+ Bold) */}
              <div
                id="weight-display"
                className="w-full bg-pageBg border-2 border-slate-200 rounded-2xl p-3.5 flex items-baseline justify-center gap-2 shadow-inner"
              >
                <span className="text-[38px] font-black tracking-tight text-slate-900 leading-none">
                  {weightStr || '0.0'}
                </span>
                <span className="text-[20px] font-bold text-slate-500">kg</span>
              </div>

              {/* Big Number Pad Input */}
              <div className="mt-3.5 grid grid-cols-3 gap-2">
                {[
                  '1', '2', '3',
                  '4', '5', '6',
                  '7', '8', '9',
                  '.', '0', 'DEL'
                ].map((key) => {
                  const isDel = key === 'DEL';
                  const isDot = key === '.';

                  return (
                    <button
                      key={key}
                      type="button"
                      id={`keypad-btn-${key}`}
                      onClick={() => handleKeypadPress(key)}
                      className={`h-13 rounded-xl font-extrabold text-[20px] flex items-center justify-center transition-all active:scale-[0.95] cursor-pointer ${
                        isDel
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                          : isDot
                          ? 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200'
                          : 'bg-white text-slate-900 hover:bg-berry-light hover:text-berry border-2 border-slate-200 active:bg-berry-light active:border-berry'
                      }`}
                      aria-label={isDel ? 'Hapus angka terakhir' : `Angka ${key}`}
                    >
                      {isDel ? <Delete size={22} className="text-slate-600" /> : key}
                    </button>
                  );
                })}
              </div>

              {/* Clear button if has value */}
              {weightStr.length > 0 && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('CLEAR')}
                    className="text-[12px] font-bold text-slate-500 hover:text-status-red transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    Reset Angka Timbangan
                  </button>
                </div>
              )}

              {/* Placeholder Button: "Tarik Data Timbangan" (Disabled with "Segera hadir") */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled
                  id="btn-tarik-timbangan"
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 text-slate-400 flex items-center justify-between cursor-not-allowed opacity-75"
                >
                  <div className="flex items-center gap-2">
                    <Radio size={16} className="text-slate-400" />
                    <span className="text-[13px] font-semibold text-slate-600">
                      Tarik Data Timbangan
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    Segera hadir
                  </span>
                </button>
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  Integrasi timbangan digital Bluetooth BLE siap rilis pada versi berikutnya.
                </p>
              </div>
            </Card>

            {/* Section 2: Height (Panjang / Tinggi Badan) */}
            <Card padding="md" className="border-2 border-slate-200/80 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-berry-light text-berry flex items-center justify-center">
                    <Ruler size={16} />
                  </div>
                  <h3 className="text-[15px] font-extrabold text-slate-900">
                    {method === 'berbaring' ? 'Panjang Badan (PB)' : 'Tinggi Badan (TB)'}
                  </h3>
                </div>

                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Step 0.1 cm
                </span>
              </div>

              {/* Big Number Display with Large (+) and (-) Buttons */}
              <div className="flex items-center justify-between gap-3 mt-1">
                {/* Minus Button */}
                <button
                  type="button"
                  id="btn-height-minus"
                  onClick={() => handleHeightAdjust(-0.1)}
                  className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 text-[26px] font-black flex items-center justify-center hover:border-berry hover:text-berry hover:bg-berry-light active:scale-90 active:bg-berry active:text-white transition-all shadow-sm cursor-pointer flex-shrink-0"
                  aria-label="Kurangi tinggi 0.1 cm"
                >
                  −
                </button>

                {/* Big Number Display (24px+ Bold) */}
                <div
                  id="height-display"
                  className="flex-1 bg-pageBg border-2 border-slate-200 rounded-2xl py-3 px-2 flex items-baseline justify-center gap-1.5 shadow-inner"
                >
                  <span className="text-[38px] font-black tracking-tight text-slate-900 leading-none">
                    {height.toFixed(1)}
                  </span>
                  <span className="text-[20px] font-bold text-slate-500">cm</span>
                </div>

                {/* Plus Button */}
                <button
                  type="button"
                  id="btn-height-plus"
                  onClick={() => handleHeightAdjust(0.1)}
                  className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 text-[26px] font-black flex items-center justify-center hover:border-berry hover:text-berry hover:bg-berry-light active:scale-90 active:bg-berry active:text-white transition-all shadow-sm cursor-pointer flex-shrink-0"
                  aria-label="Tambah tinggi 0.1 cm"
                >
                  +
                </button>
              </div>

              {/* Quick Stepper Shortcuts for Convenient Cadre Adjustment */}
              <div className="flex items-center justify-center gap-2 mt-2.5">
                {[-1.0, -0.5, +0.5, +1.0].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleHeightAdjust(step)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-bold active:scale-95 transition-all cursor-pointer"
                  >
                    {step > 0 ? `+${step.toFixed(1)}` : `${step.toFixed(1)}`}
                  </button>
                ))}
              </div>

              <div className="mt-2 text-center">
                <span className="text-[11px] text-slate-500">
                  Nilai awal otomatis disesuaikan usia ({ageInMonths} bln):{' '}
                  <strong className="text-slate-700">
                    {ageInMonths < 12 ? '50 cm' : ageInMonths < 24 ? '75 cm' : '90 cm'}
                  </strong>
                </span>
              </div>
            </Card>

            {/* Section 3: Method (Cara Ukur Toggle: Berbaring / Berdiri) */}
            <Card padding="md" className="border-2 border-slate-200/80 bg-white">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[15px] font-extrabold text-slate-900">
                  Metode Pengukuran (Cara Ukur)
                </h3>
                <span className="text-[11px] font-medium text-slate-500">
                  Standar Kemenkes RI
                </span>
              </div>

              {/* Big Picture Toggle */}
              <div className="grid grid-cols-2 gap-3">
                {/* Berbaring Card */}
                <button
                  type="button"
                  id="toggle-method-berbaring"
                  onClick={() => handleMethodChange('berbaring')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    method === 'berbaring'
                      ? 'border-berry bg-berry-light/40 shadow-sm ring-1 ring-berry/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {method === 'berbaring' && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-berry text-white flex items-center justify-center">
                      <CheckCircle2 size={14} />
                    </div>
                  )}

                  {/* Visual Illustration: Recumbent Board / Infantometer */}
                  <div className="w-full h-18 bg-white/80 rounded-xl border border-slate-200/80 flex items-center justify-center mb-2 overflow-hidden px-2">
                    <svg viewBox="0 0 100 50" className="w-full h-full max-h-14">
                      {/* Measurement board mat */}
                      <rect x="5" y="32" width="90" height="7" rx="3" fill="#CBD5E1" />
                      <line x1="5" y1="20" x2="5" y2="36" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                      <line x1="95" y1="23" x2="95" y2="36" stroke="#A72449" strokeWidth="4" strokeLinecap="round" />
                      {/* Baby lying down horizontally */}
                      <circle cx="20" cy="24" r="8" fill="#FBBF24" />
                      <rect x="27" y="22" width="42" height="9" rx="4" fill="#60A5FA" />
                      <circle cx="73" cy="26" r="3.5" fill="#F87171" />
                      {/* Measurement ticks */}
                      <line x1="20" y1="32" x2="20" y2="30" stroke="#64748B" strokeWidth="1" />
                      <line x1="40" y1="32" x2="40" y2="30" stroke="#64748B" strokeWidth="1" />
                      <line x1="60" y1="32" x2="60" y2="30" stroke="#64748B" strokeWidth="1" />
                      <line x1="80" y1="32" x2="80" y2="30" stroke="#64748B" strokeWidth="1" />
                    </svg>
                  </div>

                  <div>
                    <span className="text-[16px] font-black text-slate-900 block">
                      Berbaring
                    </span>
                    <span className="text-[12px] font-semibold text-slate-600 block mt-0.5">
                      Panjang Badan (PB)
                    </span>
                    <span className="inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      Usia &lt; 24 Bulan
                    </span>
                  </div>
                </button>

                {/* Berdiri Card */}
                <button
                  type="button"
                  id="toggle-method-berdiri"
                  onClick={() => handleMethodChange('berdiri')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    method === 'berdiri'
                      ? 'border-berry bg-berry-light/40 shadow-sm ring-1 ring-berry/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {method === 'berdiri' && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-berry text-white flex items-center justify-center">
                      <CheckCircle2 size={14} />
                    </div>
                  )}

                  {/* Visual Illustration: Standing Stadiometer Board */}
                  <div className="w-full h-18 bg-white/80 rounded-xl border border-slate-200/80 flex items-center justify-center mb-2 overflow-hidden px-2">
                    <svg viewBox="0 0 100 50" className="w-full h-full max-h-14">
                      {/* Vertical stadiometer wall & base */}
                      <rect x="25" y="5" width="6" height="42" rx="2" fill="#CBD5E1" />
                      <rect x="20" y="44" width="60" height="4" rx="2" fill="#94A3B8" />
                      {/* Slider headboard */}
                      <rect x="20" y="10" width="35" height="4" rx="1.5" fill="#A72449" />
                      {/* Child standing straight */}
                      <circle cx="48" cy="16" r="6" fill="#FBBF24" />
                      <rect x="44" y="22" width="8" height="15" rx="3" fill="#34D399" />
                      <line x1="46" y1="37" x2="46" y2="44" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="50" y1="37" x2="50" y2="44" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div>
                    <span className="text-[16px] font-black text-slate-900 block">
                      Berdiri
                    </span>
                    <span className="text-[12px] font-semibold text-slate-600 block mt-0.5">
                      Tinggi Badan (TB)
                    </span>
                    <span className="inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      Usia ≥ 24 Bulan
                    </span>
                  </div>
                </button>
              </div>

              {/* Informative Guidance note */}
              <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                <HelpCircle size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <span>
                  Otomatis diatur <strong>{ageInMonths < 24 ? 'Berbaring' : 'Berdiri'}</strong> sesuai usia balita ({ageInMonths} bulan). Kader dapat mengubah jika kondisi anak memerlukan.
                </span>
              </div>
            </Card>
          </>
        ) : (
          <Card padding="lg" className="text-center">
            <p className="text-slate-600 mb-3">Data balita tidak ditemukan.</p>
            <Button variant="secondary" onClick={() => router.push('/kader/anak')}>
              Kembali ke Daftar Balita
            </Button>
          </Card>
        )}
      </div>

      {/* Sanity Check Confirmation Dialog Modal */}
      {showSanityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            id="sanity-check-modal"
            className="w-full max-w-[380px] bg-white rounded-3xl p-5 shadow-2xl border-2 border-status-yellow/50 space-y-4"
          >
            <div className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-[19px] font-extrabold text-slate-900 leading-snug">
                Angka tidak masuk akal, ukur ulang?
              </h3>
              <p className="text-[13px] text-slate-600">
                Data antropometri yang dimasukkan berada di luar batas wajar balita umum:
              </p>
            </div>

            {/* Comparison Values */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Berat Badan:</span>
                <span className={`font-bold ${currentWeight < 1 || currentWeight > 40 ? 'text-status-red' : 'text-slate-800'}`}>
                  {currentWeight} kg{' '}
                  <span className="text-[11px] font-normal text-slate-500">(Wajar: 1 - 40 kg)</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tinggi Badan:</span>
                <span className={`font-bold ${height < 35 || height > 130 ? 'text-status-red' : 'text-slate-800'}`}>
                  {height.toFixed(1)} cm{' '}
                  <span className="text-[11px] font-normal text-slate-500">(Wajar: 35 - 130 cm)</span>
                </span>
              </div>
            </div>

            {!isAllowedInDatabase && (
              <div className="p-3 rounded-[16px] bg-red-light border border-red/30 text-red text-[14px] flex items-start gap-2">
                <TriangleAlert size={18} strokeWidth={2} className="text-red flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Peringatan Sistem:</strong> Angka ini melampaui batas absolut database (Berat: {DATABASE_LIMITS.minWeight} - {DATABASE_LIMITS.maxWeight} kg, Tinggi: {DATABASE_LIMITS.minHeight} - {DATABASE_LIMITS.maxHeight} cm). Anda harus melakukan pengukuran ulang.
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-1">
              {/* Button 1: Ukur ulang */}
              <Button
                variant="secondary"
                id="btn-sanity-ukur-ulang"
                onClick={() => setShowSanityModal(false)}
                className="w-full text-slate-800 font-bold min-h-[56px]"
              >
                Ukur Ulang
              </Button>

              {/* Button 2: Ya, sudah benar (the second only allowed inside database limits) */}
              <button
                type="button"
                id="btn-sanity-sudah-benar"
                disabled={!isAllowedInDatabase || isSaving}
                onClick={executeSave}
                className="w-full min-h-[56px] px-6 rounded-full font-bold text-[15px] inline-flex items-center justify-center gap-2 transition-all bg-berry hover:bg-berry-hover text-white shadow-md active:bg-berry-dark disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isSaving ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Ya, sudah benar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Main Action Button: "Lihat Hasil" at 56px height */}
      <footer className="pt-4 pb-2 sticky bottom-0 bg-pageBg/95 backdrop-blur-sm z-10">
        <Button
          id="btn-lihat-hasil"
          variant="primary"
          fullWidth
          loading={isSaving}
          disabled={!child || loadingChild}
          onClick={handleLihatHasilPress}
          className="min-h-[56px] text-[17px] font-bold shadow-lg"
        >
          Lihat Hasil
        </Button>
      </footer>
    </div>
  );
}
