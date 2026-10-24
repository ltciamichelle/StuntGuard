'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button, ErrorState, BottomActionBar, Skeleton } from '@/components/ui';
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
  const [loadError, setLoadError] = useState(false);

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

  // Hoisted child fetch function for retry support
  const fetchChild = async () => {
    if (!childId) return;
    setLoadingChild(true);
    setLoadError(false);
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
      setLoadError(true);
    } finally {
      setLoadingChild(false);
    }
  };

  useEffect(() => {
    fetchChild();
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
    <div className="min-h-screen px-4 py-5 pb-36 max-w-[480px] mx-auto w-full select-none space-y-6">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3 border-b border-border">
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
            <span className="text-[16px] font-bold text-teal uppercase tracking-wider block">
              Pencatatan Antropometri
            </span>
            <h1 className="text-[22px] font-bold text-text leading-tight">
              Pengukuran Balita
            </h1>
          </div>
        </div>

        <SyncStatusBadge />
      </header>

      {loadingChild ? (
        <div className="space-y-6">
          <div className="p-5 rounded-[20px] border border-border bg-white shadow-card space-y-3">
            <Skeleton height="24px" width="50%" />
            <Skeleton height="32px" width="80%" />
            <Skeleton height="24px" width="40%" />
          </div>
          <div className="p-5 rounded-[20px] border border-border bg-white shadow-card space-y-4">
            <Skeleton height="28px" width="60%" />
            <Skeleton height="64px" width="100%" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} height="56px" rounded="rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ) : loadError ? (
        <ErrorState
          title="Gagal Memuat Data Balita"
          description="Data balita tidak dapat dimuat dari penyimpanan perangkat. Silakan coba lagi."
          actionText="Coba lagi"
          onAction={() => fetchChild()}
        />
      ) : child ? (
        <>
          {/* Header: Child Name and Age in Months */}
          <Card padding="16" className="border border-border bg-white shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[16px] font-bold text-teal uppercase tracking-wider">
                    Balita Sasaran
                  </span>
                  <span className="text-[16px] text-text-muted">•</span>
                  <span className="text-[16px] font-semibold text-text">
                    Pengasuh: {child.nama_pengasuh || child.nama_ibu}
                  </span>
                </div>
                <h2 className="text-[22px] font-bold text-text truncate leading-snug">
                  {child.nama}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-selected text-primary font-bold text-[16px]">
                    {ageInMonths} Bulan
                  </span>
                  <span className="text-[16px] text-text-muted font-medium">
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
              <TriangleAlert className="text-red flex-shrink-0 mt-0.5" size={24} strokeWidth={2} />
              <div className="text-[16px] flex-1">
                <p className="font-bold">{errorMessage}</p>
                <p className="text-[16px] text-red-700 mt-1">
                  Angka yang sudah Anda ketik tetap aman tersimpan di layar.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Weight (Berat Badan) */}
          <Card padding="md" className="border-2 border-slate-200/80 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-light text-teal flex items-center justify-center">
                  <Scale size={20} />
                </div>
                <h3 className="text-[18px] font-extrabold text-slate-900">
                  Berat Badan (BB)
                </h3>
              </div>

              <span className="text-[16px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                Ketik manual
              </span>
            </div>

            {/* Big Number Display */}
            <div
              id="weight-display"
              className="w-full bg-pageBg border-2 border-slate-200 rounded-2xl p-4 flex items-baseline justify-center gap-2 shadow-inner"
            >
              <span className="text-[42px] font-black tracking-tight text-slate-900 leading-none">
                {weightStr || '0.0'}
              </span>
              <span className="text-[22px] font-bold text-slate-600">kg</span>
            </div>

            {/* Big Number Pad Input (>=56px touch target) */}
            <div className="grid grid-cols-3 gap-2.5">
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
                    className={`min-h-[56px] h-14 rounded-xl font-black text-[22px] flex items-center justify-center transition-all active:scale-[0.95] cursor-pointer ${
                      isDel
                        ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300'
                        : isDot
                        ? 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200'
                        : 'bg-white text-slate-900 hover:bg-berry-light hover:text-berry border-2 border-slate-200 active:bg-berry-light active:border-berry'
                    }`}
                    aria-label={isDel ? 'Hapus angka terakhir' : `Angka ${key}`}
                  >
                    {isDel ? <Delete size={24} className="text-slate-700" /> : key}
                  </button>
                );
              })}
            </div>

            {/* Reset button if has value */}
            {weightStr.length > 0 && (
              <div className="text-right pt-1">
                <button
                  type="button"
                  onClick={() => handleKeypadPress('CLEAR')}
                  className="text-[16px] font-bold text-slate-600 hover:text-status-red transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
                >
                  <RotateCcw size={16} />
                  Reset Angka Timbangan
                </button>
              </div>
            )}

            {/* Placeholder Button: "Tarik Data Timbangan" */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                type="button"
                disabled
                id="btn-tarik-timbangan"
                className="w-full min-h-[56px] py-3 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 text-slate-400 flex items-center justify-between cursor-not-allowed opacity-75"
              >
                <div className="flex items-center gap-2.5">
                  <Radio size={20} className="text-slate-400" />
                  <span className="text-[16px] font-semibold text-slate-600">
                    Tarik Data Timbangan
                  </span>
                </div>
                <span className="text-[14px] font-extrabold px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                  Segera hadir
                </span>
              </button>
              <p className="text-[16px] text-slate-500 text-center leading-relaxed">
                Integrasi timbangan digital Bluetooth BLE siap rilis pada versi berikutnya.
              </p>
            </div>
          </Card>

          {/* Section 2: Height (Panjang / Tinggi Badan) */}
          <Card padding="md" className="border-2 border-slate-200/80 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-berry-light text-berry flex items-center justify-center">
                  <Ruler size={20} />
                </div>
                <h3 className="text-[18px] font-extrabold text-slate-900">
                  {method === 'berbaring' ? 'Panjang Badan (PB)' : 'Tinggi Badan (TB)'}
                </h3>
              </div>

              <span className="text-[16px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                Kenaikan 0.1 cm
              </span>
            </div>

            {/* Big Number Display with Large (+) and (-) Buttons */}
            <div className="flex items-center justify-between gap-3">
              {/* Minus Button */}
              <button
                type="button"
                id="btn-height-minus"
                onClick={() => handleHeightAdjust(-0.1)}
                className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-2xl bg-white border-2 border-slate-200 text-slate-800 text-[28px] font-black flex items-center justify-center hover:border-berry hover:text-berry hover:bg-berry-light active:scale-90 active:bg-berry active:text-white transition-all shadow-sm cursor-pointer flex-shrink-0"
                aria-label="Kurangi tinggi 0.1 cm"
              >
                −
              </button>

              {/* Big Number Display */}
              <div
                id="height-display"
                className="flex-1 bg-pageBg border-2 border-slate-200 rounded-2xl py-3 px-2 flex items-baseline justify-center gap-2 shadow-inner"
              >
                <span className="text-[42px] font-black tracking-tight text-slate-900 leading-none">
                  {height.toFixed(1)}
                </span>
                <span className="text-[22px] font-bold text-slate-600">cm</span>
              </div>

              {/* Plus Button */}
              <button
                type="button"
                id="btn-height-plus"
                onClick={() => handleHeightAdjust(0.1)}
                className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-2xl bg-white border-2 border-slate-200 text-slate-800 text-[28px] font-black flex items-center justify-center hover:border-berry hover:text-berry hover:bg-berry-light active:scale-90 active:bg-berry active:text-white transition-all shadow-sm cursor-pointer flex-shrink-0"
                aria-label="Tambah tinggi 0.1 cm"
              >
                +
              </button>
            </div>

            {/* Quick Stepper Shortcuts (>=48px touch target) */}
            <div className="grid grid-cols-4 gap-2">
              {[-1.0, -0.5, +0.5, +1.0].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleHeightAdjust(step)}
                  className="min-h-[48px] py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[16px] font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                >
                  {step > 0 ? `+${step.toFixed(1)}` : `${step.toFixed(1)}`}
                </button>
              ))}
            </div>

            <div className="text-center">
              <span className="text-[16px] text-slate-600 leading-relaxed block">
                Nilai awal otomatis disesuaikan usia ({ageInMonths} bln):{' '}
                <strong className="text-slate-900">
                  {ageInMonths < 12 ? '50 cm' : ageInMonths < 24 ? '75 cm' : '90 cm'}
                </strong>
              </span>
            </div>
          </Card>

          {/* Section 3: Method (Cara Ukur Toggle: Berbaring / Berdiri) */}
          <Card padding="md" className="border-2 border-slate-200/80 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-extrabold text-slate-900">
                Metode Pengukuran (Cara Ukur)
              </h3>
              <span className="text-[16px] font-semibold text-slate-600">
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
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  method === 'berbaring'
                    ? 'border-berry bg-berry-light/40 shadow-sm ring-2 ring-berry/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {method === 'berbaring' && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-berry text-white flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                )}

                <div className="w-full h-20 bg-white/80 rounded-xl border border-slate-200/80 flex items-center justify-center mb-2.5 overflow-hidden px-2">
                  <svg viewBox="0 0 100 50" className="w-full h-full max-h-16">
                    <rect x="5" y="32" width="90" height="7" rx="3" fill="#CBD5E1" />
                    <line x1="5" y1="20" x2="5" y2="36" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                    <line x1="95" y1="23" x2="95" y2="36" stroke="#A72449" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="20" cy="24" r="8" fill="#FBBF24" />
                    <rect x="27" y="22" width="42" height="9" rx="4" fill="#60A5FA" />
                    <circle cx="73" cy="26" r="3.5" fill="#F87171" />
                    <line x1="20" y1="32" x2="20" y2="30" stroke="#64748B" strokeWidth="1" />
                    <line x1="40" y1="32" x2="40" y2="30" stroke="#64748B" strokeWidth="1" />
                    <line x1="60" y1="32" x2="60" y2="30" stroke="#64748B" strokeWidth="1" />
                    <line x1="80" y1="32" x2="80" y2="30" stroke="#64748B" strokeWidth="1" />
                  </svg>
                </div>

                <div>
                  <span className="text-[18px] font-black text-slate-900 block">
                    Berbaring
                  </span>
                  <span className="text-[16px] font-semibold text-slate-700 block mt-0.5">
                    Panjang Badan (PB)
                  </span>
                  <span className="inline-block mt-1 text-[14px] font-extrabold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                    Usia &lt; 24 Bulan
                  </span>
                </div>
              </button>

              {/* Berdiri Card */}
              <button
                type="button"
                id="toggle-method-berdiri"
                onClick={() => handleMethodChange('berdiri')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  method === 'berdiri'
                    ? 'border-berry bg-berry-light/40 shadow-sm ring-2 ring-berry/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {method === 'berdiri' && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-berry text-white flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                )}

                <div className="w-full h-20 bg-white/80 rounded-xl border border-slate-200/80 flex items-center justify-center mb-2.5 overflow-hidden px-2">
                  <svg viewBox="0 0 100 50" className="w-full h-full max-h-16">
                    <rect x="25" y="5" width="6" height="42" rx="2" fill="#CBD5E1" />
                    <rect x="20" y="44" width="60" height="4" rx="2" fill="#94A3B8" />
                    <rect x="20" y="10" width="35" height="4" rx="1.5" fill="#A72449" />
                    <circle cx="48" cy="16" r="6" fill="#FBBF24" />
                    <rect x="44" y="22" width="8" height="15" rx="3" fill="#34D399" />
                    <line x1="46" y1="37" x2="46" y2="44" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="50" y1="37" x2="50" y2="44" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>

                <div>
                  <span className="text-[18px] font-black text-slate-900 block">
                    Berdiri
                  </span>
                  <span className="text-[16px] font-semibold text-slate-700 block mt-0.5">
                    Tinggi Badan (TB)
                  </span>
                  <span className="inline-block mt-1 text-[14px] font-extrabold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                    Usia ≥ 24 Bulan
                  </span>
                </div>
              </button>
            </div>

            {/* Informative Guidance note */}
            <div className="flex items-start gap-2.5 text-[16px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <HelpCircle size={20} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <span>
                Otomatis diatur <strong>{ageInMonths < 24 ? 'Berbaring' : 'Berdiri'}</strong> sesuai usia balita ({ageInMonths} bulan). Kader dapat mengubah jika kondisi anak memerlukan.
              </span>
            </div>
          </Card>
        </>
      ) : (
        <ErrorState
          title="Data Balita Tidak Ditemukan"
          description="Data balita tidak ditemukan pada sistem. Silakan periksa kembali daftar balita."
          actionText="Kembali ke Daftar Balita"
          onAction={() => router.push('/kader/anak')}
        />
      )}

      {/* Sanity Check Confirmation Dialog Modal */}
      {showSanityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            id="sanity-check-modal"
            className="w-full max-w-[420px] bg-white rounded-3xl p-6 shadow-2xl border-2 border-status-yellow/50 space-y-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-[20px] font-extrabold text-slate-900 leading-snug">
                Angka di Luar Batas Wajar, Ukur Ulang?
              </h3>
              <p className="text-[16px] text-slate-600">
                Data antropometri yang dimasukkan berada di luar batas wajar balita umum:
              </p>
            </div>

            {/* Comparison Values */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-[16px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Berat Badan:</span>
                <span className={`font-bold ${currentWeight < 1 || currentWeight > 40 ? 'text-status-red' : 'text-slate-800'}`}>
                  {currentWeight} kg{' '}
                  <span className="text-[14px] font-normal text-slate-500">(Wajar: 1 - 40 kg)</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tinggi Badan:</span>
                <span className={`font-bold ${height < 35 || height > 130 ? 'text-status-red' : 'text-slate-800'}`}>
                  {height.toFixed(1)} cm{' '}
                  <span className="text-[14px] font-normal text-slate-500">(Wajar: 35 - 130 cm)</span>
                </span>
              </div>
            </div>

            {!isAllowedInDatabase && (
              <div className="p-3.5 rounded-[16px] bg-red-light border border-red/30 text-red text-[16px] flex items-start gap-2.5">
                <TriangleAlert size={22} strokeWidth={2} className="text-red flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Peringatan Sistem:</strong> Angka ini melampaui batas mutlak database (Berat: {DATABASE_LIMITS.minWeight} - {DATABASE_LIMITS.maxWeight} kg, Tinggi: {DATABASE_LIMITS.minHeight} - {DATABASE_LIMITS.maxHeight} cm). Anda harus melakukan pengukuran ulang.
                </div>
              </div>
            )}

            {/* Action Buttons (Both >= 56px, starting with verb) */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                variant="secondary"
                size="kader"
                id="btn-sanity-ukur-ulang"
                onClick={() => setShowSanityModal(false)}
                className="w-full text-slate-800 font-bold"
              >
                Ukur Ulang
              </Button>

              <Button
                variant="primary"
                size="kader"
                id="btn-sanity-sudah-benar"
                disabled={!isAllowedInDatabase || isSaving}
                loading={isSaving}
                onClick={executeSave}
                className="w-full font-bold shadow-md"
              >
                Simpan Data Sesuai Angka Ini
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Bar: Main Action "Lihat Hasil" */}
      <BottomActionBar>
        <Button
          id="btn-lihat-hasil"
          variant="primary"
          size="kader"
          fullWidth
          loading={isSaving}
          disabled={!child || loadingChild}
          onClick={handleLihatHasilPress}
          className="shadow-lg"
        >
          Lihat Hasil
        </Button>
      </BottomActionBar>
    </div>
  );
}
