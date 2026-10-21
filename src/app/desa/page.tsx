'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { LogOut, Building2, Users, FileSpreadsheet, ShieldCheck } from 'lucide-react';

export default function DesaHomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Tenaga Kesehatan Desa');
  const [userRole, setUserRole] = useState<string>('Bidan Desa');
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      try {
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (isRealSupabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('nama, role')
              .eq('id', user.id)
              .single();

            if (profile?.nama) setUserName(profile.nama);
            if (profile?.role) {
              const roleLabels: Record<string, string> = {
                bidan: 'Bidan Desa',
                kpm: 'Kader Pembangunan Manusia (KPM)',
                kepala_desa: 'Kepala Desa',
              };
              setUserRole(roleLabels[profile.role] || profile.role);
            }
          }
        } else {
          const cookieMatch = document.cookie
            .split('; ')
            .find((row) => row.startsWith('sg_dev_session='));

          if (cookieMatch) {
            const val = decodeURIComponent(cookieMatch.split('=')[1]);
            const session = JSON.parse(val);
            if (session.nama) setUserName(session.nama);
            if (session.role) {
              const roleLabels: Record<string, string> = {
                bidan: 'Bidan Desa',
                kpm: 'Kader Pembangunan Manusia (KPM)',
                kepala_desa: 'Kepala Desa',
              };
              setUserRole(roleLabels[session.role] || session.role);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadProfile();
  }, []);

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
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      <div>
        <header className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slateTeal text-white flex items-center justify-center font-bold text-sm">
              <Building2 size={18} />
            </div>
            <span className="text-[13px] font-bold text-slateTeal uppercase tracking-wider">
              Dasbor Desa
            </span>
          </div>

          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <button
              id="btn-logout-desa"
              onClick={handleLogout}
              className="p-2 rounded-full text-slate-500 hover:text-berry hover:bg-slate-100 transition-colors"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="mb-6">
          <span className="text-[12px] bg-slateTeal-light text-slateTeal font-bold px-3 py-1 rounded-full inline-block mb-2">
            {userRole}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
            Selamat Datang, {userName}
          </h1>
          <p className="text-kader-body text-slate-600 mt-1">
            Dasbor terpusat monitoring data anak berisiko stunting dan bahan Rembuk Stunting Desa.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck size={24} className="text-status-green" />
              <h3 className="text-[17px] font-bold text-slate-900">
                Pusat Evaluasi Rembuk Stunting
              </h3>
            </div>
            <p className="text-[14px] text-slate-600 leading-relaxed mb-4">
              Laporan konvergensi sasaran 1000 HPK dan rekapitulasi balita status kuning dan merah untuk sidang desa.
            </p>
            <div className="bg-slateTeal-light/50 p-3 rounded-2xl text-[13px] font-semibold text-slateTeal">
              ✓ Terintegrasi langsung dengan pengukuran kader di lapangan.
            </div>
          </Card>
        </div>
      </div>

      <footer className="mt-8 pt-4 text-center border-t border-slate-100">
        <p className="text-[12px] text-slate-400">
          StuntGuard • Dasbor Koordinasi Desa & Puskesmas
        </p>
      </footer>
    </div>
  );
}
