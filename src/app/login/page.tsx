'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card } from '@/components/ui';
import { Lock, Mail, TriangleAlert } from 'lucide-react';
import { verifyAndEnforceCacheSafety } from '@/lib/cacheSafety';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'masuk' | 'daftar'>('masuk');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  // Test account helper profiles for fallback/demo
  const TEST_PROFILES: Record<string, { nama: string; role: 'kader' | 'bidan' | 'pengasuh'; posyandu: string }> = {
    'kader1@test.com': { nama: 'Sri Wahyuni', role: 'kader', posyandu: 'Posyandu Melati 03' },
    'kader2@test.com': { nama: 'Siti Aminah', role: 'kader', posyandu: 'Posyandu Mawar 01' },
    'bidan@test.com': { nama: 'Bdn. Endang Rahayu, S.Tr.Keb', role: 'bidan', posyandu: 'Puskesmas Pembantu Desa' },
    'pengasuh@test.com': { nama: 'Fatimah Zahra (Pengasuh)', role: 'pengasuh', posyandu: 'Posyandu Melati 01' },
    'ayah@test.com': { nama: 'Budi Santoso (Ayah)', role: 'pengasuh', posyandu: 'Posyandu Melati 01' },
    'nenek@test.com': { nama: 'Nenek Aminah', role: 'pengasuh', posyandu: 'Posyandu Melati 01' },
    'pengasuh_baru@test.com': { nama: 'Pengasuh Baru', role: 'pengasuh', posyandu: '' },
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (authMode === 'daftar') {
        // Validation for registration
        if (!namaLengkap.trim()) {
          setErrorMessage('Nama lengkap wajib diisi.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Kata sandi minimal 6 karakter.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Ulangi kata sandi tidak cocok.');
          setLoading(false);
          return;
        }

        if (isRealSupabase) {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                nama: namaLengkap.trim(),
                role: 'pengasuh',
              },
            },
          });

          if (error) {
            if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered')) {
              setErrorMessage('Email sudah terdaftar. Silakan masuk atau gunakan email lain.');
            } else {
              setErrorMessage(`Gagal mendaftar: ${error.message}`);
            }
            setLoading(false);
            return;
          }

          if (data.user) {
            await verifyAndEnforceCacheSafety(data.user.id);
            document.cookie = 'sg_user_role=pengasuh; path=/; max-age=86400; SameSite=Lax';

            await supabase.from('profiles').upsert({
              id: data.user.id,
              nama: namaLengkap.trim(),
              role: 'pengasuh',
              desa_id: 1,
              posyandu_id: null,
            });
            router.push('/keluarga');
            router.refresh();
            return;
          }
        } else {
          // Dev fallback registration
          const sessionPayload = {
            id: `dev-${cleanEmail}`,
            email: cleanEmail,
            role: 'pengasuh',
            nama: namaLengkap.trim(),
            posyandu_nama: '',
            posyandu_id: null,
            desa_id: 1,
          };
          await verifyAndEnforceCacheSafety(sessionPayload.id);
          document.cookie = `sg_dev_session=${encodeURIComponent(JSON.stringify(sessionPayload))}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = 'sg_user_role=pengasuh; path=/; max-age=86400; SameSite=Lax';
          router.push('/keluarga');
          router.refresh();
          return;
        }
      } else {
        // Mode Masuk (Login)
        if (isRealSupabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (error) {
            if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credentials')) {
              setErrorMessage('Email atau kata sandi salah. Silakan periksa kembali.');
            } else {
              setErrorMessage(`Gagal masuk: ${error.message}`);
            }
            setLoading(false);
            return;
          }

          if (data.user) {
            await verifyAndEnforceCacheSafety(data.user.id);

            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            const role = profile?.role || data.user.user_metadata?.role || 'pengasuh';
            document.cookie = `sg_user_role=${role}; path=/; max-age=86400; SameSite=Lax`;

            if (role === 'kader') {
              router.push('/kader');
            } else if (role === 'bidan' || role === 'kpm' || role === 'kepala_desa') {
              router.push('/desa');
            } else if (role === 'pengasuh') {
              router.push('/keluarga');
            } else {
              router.push('/belum-tersedia');
            }
            router.refresh();
            return;
          }
        } else {
          if (password.length < 4) {
            setErrorMessage('Kata sandi salah. Minimal 4 karakter.');
            setLoading(false);
            return;
          }

          const testAccount = TEST_PROFILES[cleanEmail];
          if (testAccount) {
            const posyanduId = cleanEmail === 'kader2@test.com' ? 2 : 1;
            const sessionPayload = {
              id: `dev-${cleanEmail}`,
              email: cleanEmail,
              role: testAccount.role,
              nama: testAccount.nama,
              posyandu_nama: testAccount.posyandu,
              posyandu_id: posyanduId,
              desa_id: 1,
            };
            await verifyAndEnforceCacheSafety(sessionPayload.id);
            document.cookie = `sg_dev_session=${encodeURIComponent(JSON.stringify(sessionPayload))}; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `sg_user_role=${testAccount.role}; path=/; max-age=86400; SameSite=Lax`;

            if (testAccount.role === 'kader') {
              router.push('/kader');
            } else if (testAccount.role === 'pengasuh') {
              router.push('/keluarga');
            } else {
              router.push('/desa');
            }
            router.refresh();
            return;
          } else {
            setErrorMessage('Email atau kata sandi salah. Gunakan akun uji coba terdaftar atau daftar sebagai pengasuh.');
            setLoading(false);
            return;
          }
        }
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat menghubungi server. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickAccount = (accEmail: string) => {
    setAuthMode('masuk');
    setEmail(accEmail);
    setPassword('password123');
    setErrorMessage('');
  };

  return (
    <main className="min-h-screen px-4 py-6 flex flex-col justify-between max-w-[480px] mx-auto w-full">
      {/* Top Brand Section */}
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center mt-2">
          <img
            src="/logo.png"
            alt="StuntGuard Logo"
            className="w-28 h-28 object-contain drop-shadow-sm mb-1"
          />
          <h1 className="text-[24px] font-bold text-text leading-tight">
            {authMode === 'masuk' ? 'Masuk ke StuntGuard' : 'Daftar Akun Pengasuh'}
          </h1>
          <p className="text-[16px] text-teal font-bold tracking-tight mt-1">
            Posyandu Integrasi Layanan Primer (ILP)
          </p>
        </div>

        {/* Tab Switcher: Masuk vs Daftar */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-border">
          <button
            type="button"
            onClick={() => {
              setAuthMode('masuk');
              setErrorMessage('');
            }}
            className={`flex-1 min-h-[48px] rounded-xl font-bold text-[16px] transition-all cursor-pointer ${
              authMode === 'masuk'
                ? 'bg-white text-primary shadow-soft'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('daftar');
              setErrorMessage('');
            }}
            className={`flex-1 min-h-[48px] rounded-xl font-bold text-[16px] transition-all cursor-pointer ${
              authMode === 'daftar'
                ? 'bg-white text-primary shadow-soft'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Daftar Pengasuh
          </button>
        </div>

        {/* Login / Register Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {authMode === 'daftar' && (
            <div>
              <label htmlFor="register-nama" className="block text-[16px] font-bold text-text mb-2">
                Nama Lengkap Anda
              </label>
              <div className="relative">
                <input
                  id="register-nama"
                  type="text"
                  required
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full min-h-[56px] px-4 text-[16px] font-medium text-text bg-white border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-[16px] font-bold text-text mb-2">
              Alamat Email
            </label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full min-h-[56px] px-4 pl-12 text-[16px] font-medium text-text bg-white border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition-colors"
              />
              <Mail
                size={22}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-[16px] font-bold text-text mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                id="login-password"
                type="password"
                required
                autoComplete={authMode === 'masuk' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[56px] px-4 pl-12 text-[16px] font-medium text-text bg-white border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition-colors"
              />
              <Lock
                size={22}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </div>
            {authMode === 'daftar' && (
              <p className="text-[14px] text-text-muted mt-1">Minimal 6 karakter.</p>
            )}
          </div>

          {authMode === 'daftar' && (
            <div>
              <label htmlFor="register-confirm-password" className="block text-[16px] font-bold text-text mb-2">
                Ulangi Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[56px] px-4 pl-12 text-[16px] font-medium text-text bg-white border-2 border-border rounded-2xl focus:border-primary focus:outline-none transition-colors"
                />
                <Lock
                  size={22}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
              </div>
            </div>
          )}

          {/* Error Banner in Simple Indonesian */}
          {errorMessage && (
            <div role="alert" className="p-4 rounded-[16px] bg-red-light border border-red/40 flex items-start gap-3 text-red animate-fadeIn">
              <TriangleAlert size={22} strokeWidth={2} className="text-red flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[16px] font-semibold leading-snug">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Action Button: 56px */}
          <div className="pt-2">
            <Button
              id="btn-login-submit"
              type="submit"
              variant="primary"
              size="kader"
              loading={loading}
            >
              {authMode === 'masuk' ? 'Masuk' : 'Daftar Sekarang'}
            </Button>
          </div>
        </form>

        {/* Quick Test Accounts Helper */}
        <div className="pt-6 border-t border-border">
          <p className="text-[16px] font-bold text-text-muted uppercase tracking-wider text-center mb-3">
            Pilih Akun Uji Coba
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => handleSelectQuickAccount('kader1@test.com')}
              className="text-left p-3.5 rounded-2xl bg-white border border-border hover:border-primary text-[16px] flex items-center justify-between transition-colors cursor-pointer min-h-[56px]"
            >
              <div>
                <span className="font-bold text-text block text-[16px]">kader1@test.com</span>
                <span className="text-text-muted text-[16px]">Kader Sri Wahyuni • Posyandu Melati 03</span>
              </div>
              <span className="text-primary font-bold text-[16px] ml-2 flex-shrink-0">Gunakan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickAccount('bidan@test.com')}
              className="text-left p-3.5 rounded-2xl bg-white border border-border hover:border-teal text-[16px] flex items-center justify-between transition-colors cursor-pointer min-h-[56px]"
            >
              <div>
                <span className="font-bold text-text block text-[16px]">bidan@test.com</span>
                <span className="text-text-muted text-[16px]">Bidan Desa • Bdn. Endang Rahayu</span>
              </div>
              <span className="text-teal font-bold text-[16px] ml-2 flex-shrink-0">Gunakan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickAccount('pengasuh@test.com')}
              className="text-left p-3.5 rounded-2xl bg-white border border-border hover:border-primary text-[16px] flex items-center justify-between transition-colors cursor-pointer min-h-[56px]"
            >
              <div>
                <span className="font-bold text-text block text-[16px]">pengasuh@test.com</span>
                <span className="text-text-muted text-[16px]">Pengasuh • Fatimah Zahra</span>
              </div>
              <span className="text-primary font-bold text-[16px] ml-2 flex-shrink-0">Gunakan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickAccount('ayah@test.com')}
              className="text-left p-3.5 rounded-2xl bg-white border border-border hover:border-primary text-[16px] flex items-center justify-between transition-colors cursor-pointer min-h-[56px]"
            >
              <div>
                <span className="font-bold text-text block text-[16px]">ayah@test.com</span>
                <span className="text-text-muted text-[16px]">Pengasuh (Ayah) • Budi Santoso</span>
              </div>
              <span className="text-primary font-bold text-[16px] ml-2 flex-shrink-0">Gunakan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickAccount('nenek@test.com')}
              className="text-left p-3.5 rounded-2xl bg-white border border-border hover:border-primary text-[16px] flex items-center justify-between transition-colors cursor-pointer min-h-[56px]"
            >
              <div>
                <span className="font-bold text-text block text-[16px]">nenek@test.com</span>
                <span className="text-text-muted text-[16px]">Pengasuh (Nenek) • Nenek Aminah</span>
              </div>
              <span className="text-primary font-bold text-[16px] ml-2 flex-shrink-0">Gunakan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickAccount('pengasuh_baru@test.com')}
              className="text-left p-3.5 rounded-2xl bg-white border border-dashed border-border hover:border-primary text-[16px] flex items-center justify-between transition-colors cursor-pointer min-h-[56px]"
            >
              <div>
                <span className="font-bold text-text block text-[16px]">pengasuh_baru@test.com</span>
                <span className="text-text-muted text-[16px]">Pengasuh Baru (Belum Tautkan Anak)</span>
              </div>
              <span className="text-primary font-bold text-[16px] ml-2 flex-shrink-0">Gunakan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center py-4 mt-6">
        <p className="text-[16px] text-text-muted font-medium">
          StuntGuard • Deteksi Dini Stunting Posyandu
        </p>
      </footer>
    </main>
  );
}
