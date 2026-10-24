'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { Info, LogOut } from 'lucide-react';
import { clearAllLocalUserData, CACHED_USER_ID_KEY } from '@/lib/cacheSafety';

export default function BelumTersediaPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    await clearAllLocalUserData();
    localStorage.removeItem(CACHED_USER_ID_KEY);
    document.cookie = 'sg_dev_session=; path=/; max-age=0';
    document.cookie = 'sg_user_role=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col justify-center items-center max-w-[480px] mx-auto w-full text-center select-none">
      <Card padding="xl" className="flex flex-col items-center border-2 border-slate-200 shadow-soft w-full">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 text-status-yellow flex items-center justify-center mb-4 shadow-xs">
          <Info size={32} />
        </div>
        <h1 className="text-[22px] font-extrabold text-slate-900 mb-2 leading-tight">
          Fitur belum tersedia
        </h1>
        <p className="text-[16px] text-slate-700 mb-6 leading-relaxed max-w-sm">
          Akun Anda belum memiliki akses ke modul aplikasi versi ini. Silakan hubungi pengelola Posyandu atau masuk menggunakan akun lain.
        </p>

        <Button
          variant="primary"
          size="kader"
          fullWidth
          onClick={handleLogout}
          icon={<LogOut size={20} />}
          className="shadow-md"
        >
          Kembali ke halaman masuk
        </Button>
      </Card>
    </div>
  );
}
