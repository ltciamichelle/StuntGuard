'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { calculateAgeInMonths } from '@/lib/utils';
import { Anak } from '@/types/database';
import { ArrowLeft, Scale, Activity, User, Calendar } from 'lucide-react';

export default function MeasurementPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;
  const supabase = createClient();

  const [child, setChild] = useState<Anak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChild() {
      setLoading(true);
      try {
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (isRealSupabase) {
          const { data, error } = await supabase
            .from('anak')
            .select('*')
            .eq('id', childId)
            .single();

          if (data) {
            setChild(data);
          }
        } else {
          // Check localStorage or sample
          const localSaved = localStorage.getItem('sg_local_anak');
          if (localSaved) {
            const list: Anak[] = JSON.parse(localSaved);
            const found = list.find((c) => c.id === childId);
            if (found) {
              setChild(found);
              return;
            }
          }

          // Fallback dummy
          setChild({
            id: childId,
            desa_id: 1,
            posyandu_id: 1,
            nama: 'Rayyan Pratama',
            nik: '3201124508230001',
            no_kk: '3201120000000001',
            nama_ibu: 'Siti Rahmawati',
            tgl_lahir: '2025-08-15',
            jenis_kelamin: 'L',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (childId) {
      fetchChild();
    }
  }, [childId]);

  return (
    <div className="min-h-screen px-4 py-5 flex flex-col justify-between max-w-[420px] mx-auto w-full">
      <div>
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
                Antropometri
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                Pengukuran Balita
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-berry border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat data balita...</span>
          </div>
        ) : child ? (
          <div className="flex flex-col gap-4">
            {/* Child Profile Card */}
            <Card padding="md" className="border-2 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-extrabold text-slateTeal uppercase tracking-wider">
                    Balita Sasaran
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {child.nama}
                  </h2>
                  <p className="text-[14px] text-slate-600 mt-0.5">
                    Usia: <strong>{calculateAgeInMonths(child.tgl_lahir)} Bulan</strong> ({child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'})
                  </p>
                  <p className="text-[13px] text-slate-500 mt-0.5">
                    Nama Ibu: {child.nama_ibu}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-berry-light text-berry flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  {child.jenis_kelamin === 'L' ? '👦' : '👧'}
                </div>
              </div>
            </Card>

            <Card padding="lg" className="text-center py-8">
              <Scale size={40} className="text-berry mx-auto mb-3" />
              <h3 className="text-[18px] font-extrabold text-slate-900 mb-1">
                Layar Pengukuran Siap
              </h3>
              <p className="text-kader-body text-slate-600 mb-4">
                Data balita berhasil disiapkan untuk penimbangan berat dan pengukuran tinggi badan.
              </p>
              <Button
                variant="secondary"
                onClick={() => router.push('/kader/anak')}
              >
                Kembali ke Daftar Balita
              </Button>
            </Card>
          </div>
        ) : (
          <Card padding="lg" className="text-center">
            <p className="text-slate-600">Data balita tidak ditemukan.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
