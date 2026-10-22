'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card } from '@/components/ui';
import { Lock, Mail, AlertCircle, Shield, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  // Test account helper profiles for fallback/demo
  const TEST_PROFILES: Record<string, { nama: string; role: 'kader' | 'bidan'; posyandu: string }> = {
    'kader1@test.com': { nama: 'Sri Wahyuni', role: 'kader', posyandu: 'Posyandu Melati 03' },
    'kader2@test.com': { nama: 'Siti Aminah', role: 'kader', posyandu: 'Posyandu Mawar 01' },
    'bidan@test.com': { nama: 'Bdn. Endang Rahayu, S.Tr.Keb', role: 'bidan', posyandu: 'Puskesmas Pembantu Desa' },
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

      if (isRealSupabase) {
        // Real Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          // Rule 1: Show clear Indonesian errors for wrong password
          if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credentials')) {
            setErrorMessage('Email atau kata sandi salah. Silakan periksa kembali.');
          } else {
            setErrorMessage(`Gagal masuk: ${error.message}`);
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          // Rule 2: After login, read the user's row from profiles and redirect by role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const role = profile?.role || data.user.user_metadata?.role;

          if (role === 'kader') {
            router.push('/kader');
          } else if (role === 'bidan' || role === 'kpm' || role === 'kepala_desa') {
            router.push('/desa');
          } else {
            router.push('/belum-tersedia');
          }
          router.refresh();
          return;
        }
      } else {
        // Fallback test mode for predefined accounts when Supabase keys are pending
        if (password.length < 4) {
          setErrorMessage('Kata sandi salah. Minimal 4 karakter.');
          setLoading(false);
          return;
        }

        const testAccount = TEST_PROFILES[cleanEmail];
        if (testAccount) {
          const posyanduId = cleanEmail === 'kader2@test.com' ? 2 : 1;
          // Set dev session cookie
          const sessionPayload = {
            id: `dev-${cleanEmail}`,
            email: cleanEmail,
            role: testAccount.role,
            nama: testAccount.nama,
            posyandu_nama: testAccount.posyandu,
            posyandu_id: posyanduId,
            desa_id: 1,
          };
          document.cookie = `sg_dev_session=${encodeURIComponent(JSON.stringify(sessionPayload))}; path=/; max-age=86400; SameSite=Lax`;

          if (testAccount.role === 'kader') {
            router.push('/kader');
          } else {
            router.push('/desa');
          }
          router.refresh();
          return;
        } else {
          setErrorMessage('Email atau kata sandi salah. Gunakan akun uji coba terdaftar.');
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kendala jaringan saat menghubungi server. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('password123');
    setErrorMessage('');
  };

  return (
    <main className="min-h-screen px-5 py-8 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      {/* Top Brand Section */}
      <div>
        <div className="flex flex-col items-center text-center mt-6 mb-8">
          <div className="w-16 h-16 rounded-[22px] bg-berry text-white flex items-center justify-center font-extrabold text-2xl shadow-lg mb-3">
            SG
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            StuntGuard
          </h1>
          <p className="text-[14px] text-slateTeal font-semibold mt-1">
            Posyandu Integrasi Layanan Primer (ILP)
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[14px] font-bold text-slate-700 mb-2">
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
                placeholder="nama@posyandu.desa.id"
                className="w-full min-h-[56px] px-4 pl-12 text-[16px] font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-berry focus:outline-none transition-colors"
              />
              <Mail
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-bold text-slate-700 mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[56px] px-4 pl-12 text-[16px] font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-berry focus:outline-none transition-colors"
              />
              <Lock
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Error Banner in Simple Indonesian */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-status-red/40 flex items-start gap-3 text-red-900 animate-fadeIn">
              <AlertCircle size={20} className="text-status-red flex-shrink-0 mt-0.5" />
              <p className="text-[14px] font-semibold leading-snug">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Large Pill Action Button: Masuk */}
          <div className="mt-2">
            <Button
              id="btn-login-submit"
              type="submit"
              variant="primary"
              loading={loading}
            >
              Masuk
            </Button>
          </div>
        </form>

        {/* Quick Test Accounts Helper */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wider text-center mb-3">
            Akun Uji Coba Terdaftar
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSelectQuickAccount('kader1@test.com')}
              className="text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-berry text-[13px] flex items-center justify-between transition-colors cursor-pointer"
            >
              <div>
                <span className="font-bold text-slate-900 block">kader1@test.com</span>
                <span className="text-slate-500 text-[12px]">Peran: Kader (Sri Wahyuni • Posyandu Melati 03)</span>
              </div>
              <span className="text-berry font-bold text-[12px]">Gunakan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickAccount('kader2@test.com')}
              className="text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-berry text-[13px] flex items-center justify-between transition-colors cursor-pointer"
            >
              <div>
                <span className="font-bold text-slate-900 block">kader2@test.com</span>
                <span className="text-slate-500 text-[12px]">Peran: Kader (Siti Aminah • Posyandu Mawar 01)</span>
              </div>
              <span className="text-berry font-bold text-[12px]">Gunakan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectQuickAccount('bidan@test.com')}
              className="text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-slateTeal text-[13px] flex items-center justify-between transition-colors cursor-pointer"
            >
              <div>
                <span className="font-bold text-slate-900 block">bidan@test.com</span>
                <span className="text-slate-500 text-[12px]">Peran: Bidan Desa (Bdn. Endang Rahayu)</span>
              </div>
              <span className="text-slateTeal font-bold text-[12px]">Gunakan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center py-4">
        <p className="text-[12px] text-slate-400">
          StuntGuard • Versi Web Mobile Kader Posyandu
        </p>
      </footer>
    </main>
  );
}
