'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Anak, Pengukuran } from '@/types/database';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui';

export default function SuratRujukanPage() {
  const params = useParams();
  const router = useRouter();
  const pengukuranId = (params.pengukuranId || params.id) as string;
  const supabase = createClient();

  const [pengukuran, setPengukuran] = useState<Pengukuran | null>(null);
  const [child, setChild] = useState<Anak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const isRealSupabase =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        let foundP: Pengukuran | null = null;
        let foundC: Anak | null = null;

        if (isRealSupabase) {
          const { data: pData } = await supabase
            .from('pengukuran')
            .select('*')
            .eq('id', pengukuranId)
            .single();

          if (pData) {
            foundP = pData;
            const { data: cData } = await supabase
              .from('anak')
              .select('*')
              .eq('id', pData.anak_id)
              .single();
            if (cData) foundC = cData;
          }
        }

        // LocalStorage fallback
        if (!foundP) {
          const localP = localStorage.getItem('sg_local_pengukuran');
          if (localP) {
            const list: Pengukuran[] = JSON.parse(localP);
            foundP = list.find((item) => item.id === pengukuranId) || null;
          }
        }

        if (foundP && !foundC) {
          const localC = localStorage.getItem('sg_local_anak');
          if (localC) {
            const list: Anak[] = JSON.parse(localC);
            foundC = list.find((item) => item.id === foundP?.anak_id) || null;
          }
        }

        // Fallback dummy
        if (!foundP) {
          foundP = {
            id: pengukuranId,
            anak_id: 'demo-anak',
            desa_id: 1,
            posyandu_id: 1,
            tgl_ukur: new Date().toISOString().split('T')[0],
            berat_kg: 8.4,
            tinggi_cm: 68.2,
            cara_ukur: 'berbaring',
            berat_manual: true,
            z_tbu: -3.2,
            z_bbu: -2.8,
            status: 'merah',
          };
        }

        if (!foundC) {
          foundC = {
            id: foundP.anak_id,
            desa_id: 1,
            posyandu_id: 1,
            nama: 'Rayyan Pratama',
            nik: '3201124508230001',
            no_kk: '3201120000000001',
            nama_ibu: 'Siti Rahmawati',
            tgl_lahir: '2025-08-15',
            jenis_kelamin: 'L',
          };
        }

        setPengukuran(foundP);
        setChild(foundC);
      } catch (e) {
        console.error('Error loading referral letter data:', e);
      } finally {
        setLoading(false);
      }
    }

    if (pengukuranId) {
      loadData();
    }
  }, [pengukuranId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-16 flex items-center justify-center text-slate-500">
        Menyiapkan berkas surat rujukan...
      </div>
    );
  }

  if (!pengukuran || !child) {
    return (
      <div className="min-h-screen px-4 py-8 text-center max-w-[420px] mx-auto">
        <p className="text-slate-700 font-bold mb-3">Data rujukan tidak ditemukan.</p>
        <Button variant="secondary" onClick={() => router.push('/kader')}>
          Kembali ke Beranda Kader
        </Button>
      </div>
    );
  }

  const ageInMonths = calculateAgeInMonths(child.tgl_lahir);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 flex flex-col items-center print:bg-white print:p-0">
      {/* On-screen Action Toolbar (Hidden during print) */}
      <div className="w-full max-w-[650px] mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push(`/kader/hasil/${pengukuranId}`)}
          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-berry text-[13px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Kembali ke Hasil
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-berry hover:bg-berry-hover text-white text-[13px] font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
        >
          <Printer size={16} />
          Cetak Surat Rujukan
        </button>
      </div>

      {/* Printable Sheet (Standard A4 / Letter format) */}
      <div className="w-full max-w-[650px] bg-white border border-slate-300 rounded-2xl p-7 shadow-sm text-slate-900 print:border-none print:shadow-none print:p-6 print:w-full print:max-w-none">
        {/* Letterhead (KOP Surat) */}
        <div className="border-b-2 border-slate-900 pb-3 mb-5 text-center">
          <h2 className="text-[17px] font-extrabold uppercase tracking-wide leading-tight">
            Pos Pelayanan Terpadu (Posyandu) Balita
          </h2>
          <p className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider mt-0.5">
            Sistem Deteksi Dini Pencegahan Stunting — StuntGuard
          </p>
          <div className="text-[10px] text-slate-500 mt-1">
            Wilayah Kerja Puskesmas Kecamatan / Bidan Desa
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-5">
          <h1 className="text-[18px] font-black uppercase tracking-wider underline">
            Surat Rujukan Skrining Balita
          </h1>
          <p className="text-[12px] text-slate-600 mt-0.5">
            Nomor Pengukuran: {pengukuran.id.slice(0, 8).toUpperCase()}-SG
          </p>
        </div>

        {/* Recipient */}
        <div className="mb-4 text-[13px] text-slate-800">
          <p>Kepada Yth.</p>
          <p className="font-bold">Bidan Desa / Petugas Gizi Puskesmas</p>
          <p>Di Tempat</p>
        </div>

        <p className="text-[13px] text-slate-700 leading-relaxed mb-4">
          Dengan hormat, bersama surat ini kami menghadapkan balita sasaran hasil penimbangan dan pengukuran Posyandu untuk mendapatkan pemeriksaan klinis, konfirmasi antropometri, dan penanganan gizi lebih lanjut:
        </p>

        {/* Child Identity Table */}
        <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden text-[13px]">
          <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-800 border-b border-slate-300">
            A. Identitas Balita
          </div>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-1/3 px-3 py-1.5 text-slate-600">Nama Lengkap Balita</td>
                <td className="px-3 py-1.5 font-bold text-slate-900">: {child.nama}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">NIK Balita</td>
                <td className="px-3 py-1.5">: {child.nik || '- (Belum ada NIK)'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">Tanggal Lahir / Usia</td>
                <td className="px-3 py-1.5">: {formatIndonesianDate(child.tgl_lahir)} ({ageInMonths} Bulan)</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">Jenis Kelamin</td>
                <td className="px-3 py-1.5">: {child.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 text-slate-600">Nama Ibu Kandung</td>
                <td className="px-3 py-1.5 font-semibold">: {child.nama_ibu}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Anthropometry Results Table */}
        <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden text-[13px]">
          <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-800 border-b border-slate-300">
            B. Hasil Penimbangan & Pengukuran
          </div>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-1/3 px-3 py-1.5 text-slate-600">Tanggal Pengukuran</td>
                <td className="px-3 py-1.5">: {formatIndonesianDate(pengukuran.tgl_ukur)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">Berat Badan (BB)</td>
                <td className="px-3 py-1.5 font-bold">: {pengukuran.berat_kg} kg</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">Panjang/Tinggi Badan</td>
                <td className="px-3 py-1.5 font-bold">: {pengukuran.tinggi_cm} cm ({pengukuran.cara_ukur})</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">Z-Score TB/U</td>
                <td className="px-3 py-1.5 font-bold text-rose-700">
                  : {pengukuran.z_tbu !== null && pengukuran.z_tbu !== undefined ? `${pengukuran.z_tbu} SD` : '-'} (Tinggi menurut Umur)
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">Z-Score BB/U</td>
                <td className="px-3 py-1.5 font-bold text-rose-700">
                  : {pengukuran.z_bbu !== null && pengukuran.z_bbu !== undefined ? `${pengukuran.z_bbu} SD` : '-'} (Berat menurut Umur)
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 text-slate-600">Status Skrining</td>
                <td className="px-3 py-1.5 font-black text-rose-700 uppercase">
                  : INDIKASI STUNTING / PERLUKAN RUJUKAN SEGERA
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Required Mandatory Sentence */}
        <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg text-center my-4">
          <p className="text-[13px] font-extrabold text-amber-900 tracking-wide">
            &ldquo;Hasil ini adalah skrining awal, bukan diagnosis.&rdquo;
          </p>
        </div>

        {/* Signatures */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-[12px] text-center pt-2">
          <div>
            <p className="text-slate-600">Penerima Rujukan,</p>
            <p className="font-semibold text-slate-800">Bidan Desa / Petugas Puskesmas</p>
            <div className="h-16"></div>
            <p className="font-bold underline text-slate-900">( .................................................. )</p>
            <p className="text-[11px] text-slate-500">NIP / Bidan Desa</p>
          </div>

          <div>
            <p className="text-slate-600">Kader Posyandu Pengirim,</p>
            <p className="font-semibold text-slate-800">Kader Posyandu</p>
            <div className="h-16"></div>
            <p className="font-bold underline text-slate-900">( .................................................. )</p>
            <p className="text-[11px] text-slate-500">Tanda Tangan & Nama Terang</p>
          </div>
        </div>
      </div>
    </div>
  );
}
