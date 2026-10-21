'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { Info, LogOut } from 'lucide-react';

export default function BelumTersediaPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    document.cookie = 'sg_dev_session=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col justify-center items-center max-w-[420px] mx-auto w-full text-center">
      <Card padding="lg" className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-status-yellow flex items-center justify-center mb-4">
          <Info size={32} />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">
          Fitur Belum Tersedia
        </h1>
        <p className="text-kader-body text-slate-600 mb-6 leading-relaxed">
          Akun Anda belum memiliki akses ke modul aplikasi versi ini. Silakan hubungi administrator Posyandu atau masuk menggunakan akun lain.
        </p>

        <Button
          variant="primary"
          onClick={handleLogout}
          icon={<LogOut size={18} />}
        >
          Kembali ke Halaman Masuk
        </Button>
      </Card>
    </div>
  );
}
