import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Anak, Pengukuran, Posyandu } from '@/types/database';
import {
  computePosyanduQualityStats,
  PosyanduQualityStats,
  FlaggedMeasurementItem,
  TEST_QUALITY_CHILDREN,
  TEST_QUALITY_MEASUREMENTS,
} from '@/lib/kualitas-config';

// Posyandu fallback untuk dev/demo
const FALLBACK_POSYANDUS: Posyandu[] = [
  { id: 1, desa_id: 1, nama: 'Posyandu Melati 01', dusun: 'Dusun Krajan' },
  { id: 2, desa_id: 1, nama: 'Posyandu Melati 02', dusun: 'Dusun Sidomulyo' },
  { id: 3, desa_id: 1, nama: 'Posyandu Mawar 03', dusun: 'Dusun Sukasari' },
];

const FALLBACK_BASE_CHILDREN: Anak[] = [
  { id: 'c-1', desa_id: 1, posyandu_id: 1, nama: 'Rayyan Pratama', nik: '3201124508230001', no_kk: null, nama_pengasuh: 'Siti Rahmawati', hubungan_pengasuh: 'ibu', tgl_lahir: '2025-08-15', jenis_kelamin: 'L' },
  { id: 'c-2', desa_id: 1, posyandu_id: 1, nama: 'Aisyah Putri', nik: '3201125510240002', no_kk: null, nama_pengasuh: 'Nurul Hidayah', hubungan_pengasuh: 'ibu', tgl_lahir: '2025-04-10', jenis_kelamin: 'P' },
  { id: 'c-3', desa_id: 1, posyandu_id: 2, nama: 'Muhammad Bilal', nik: '3201121203240003', no_kk: null, nama_pengasuh: 'Dewi Lestari', hubungan_pengasuh: 'ibu', tgl_lahir: '2024-11-20', jenis_kelamin: 'L' },
  { id: 'c-4', desa_id: 1, posyandu_id: 2, nama: 'Khadijah Althafunisa', nik: '3201126701250004', no_kk: null, nama_pengasuh: 'Fatimah Zahra', hubungan_pengasuh: 'ibu', tgl_lahir: '2025-01-05', jenis_kelamin: 'P' },
  { id: 'c-5', desa_id: 1, posyandu_id: 3, nama: 'Kenzo Alvaro', nik: '3201122206240005', no_kk: null, nama_pengasuh: 'Ratna Sari', hubungan_pengasuh: 'ibu', tgl_lahir: '2024-06-18', jenis_kelamin: 'L' },
  { id: 'c-6', desa_id: 1, posyandu_id: 3, nama: 'Naura Salsabila', nik: '3201124409240006', no_kk: null, nama_pengasuh: 'Indah Permata', hubungan_pengasuh: 'ibu', tgl_lahir: '2024-09-12', jenis_kelamin: 'P' },
];

const FALLBACK_BASE_MEASUREMENTS: Pengukuran[] = [
  { id: 'p-1', anak_id: 'c-1', desa_id: 1, posyandu_id: 1, tgl_ukur: '2026-10-15', berat_kg: 8.2, tinggi_cm: 68.5, cara_ukur: 'berbaring', berat_manual: true, z_tbu: -3.4, z_bbu: -2.9, status: 'merah' },
  { id: 'p-2', anak_id: 'c-2', desa_id: 1, posyandu_id: 1, tgl_ukur: '2026-10-18', berat_kg: 8.9, tinggi_cm: 74.0, cara_ukur: 'berbaring', berat_manual: true, z_tbu: -2.3, z_bbu: -2.1, status: 'kuning' },
  { id: 'p-3', anak_id: 'c-3', desa_id: 1, posyandu_id: 2, tgl_ukur: '2026-10-10', berat_kg: 11.8, tinggi_cm: 86.5, cara_ukur: 'berdiri', berat_manual: true, z_tbu: -0.4, z_bbu: -0.2, status: 'hijau' },
  { id: 'p-4', anak_id: 'c-4', desa_id: 1, posyandu_id: 2, tgl_ukur: '2026-10-12', berat_kg: 9.8, tinggi_cm: 77.2, cara_ukur: 'berbaring', berat_manual: true, z_tbu: 0.1, z_bbu: 0.3, status: 'hijau' },
  { id: 'p-5', anak_id: 'c-5', desa_id: 1, posyandu_id: 3, tgl_ukur: '2026-10-08', berat_kg: 9.2, tinggi_cm: 73.1, cara_ukur: 'berdiri', berat_manual: true, z_tbu: -3.1, z_bbu: -2.7, status: 'merah' },
  { id: 'p-6', anak_id: 'c-6', desa_id: 1, posyandu_id: 3, tgl_ukur: '2026-10-14', berat_kg: 10.1, tinggi_cm: 78.4, cara_ukur: 'berdiri', berat_manual: true, z_tbu: -2.2, z_bbu: -1.9, status: 'kuning' },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const selectedMonth = searchParams.get('month') || new Date().toISOString().substring(0, 7);
    const posyanduIdParam = searchParams.get('posyanduId') || 'all';

    const isRealSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    let posyandus: Posyandu[] = FALLBACK_POSYANDUS;
    let children: Anak[] = [...FALLBACK_BASE_CHILDREN, ...TEST_QUALITY_CHILDREN];
    let measurements: Pengukuran[] = [...FALLBACK_BASE_MEASUREMENTS, ...TEST_QUALITY_MEASUREMENTS];

    if (isRealSupabase) {
      // Query RLS-protected Supabase Client (No service_role key!)
      const supabase = await createClient();

      // Check current user session
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch Posyandu (RLS-protected)
        const { data: posData } = await supabase.from('posyandu').select('*');
        if (posData && posData.length > 0) posyandus = posData;

        // Fetch Children (RLS-protected)
        const { data: childData } = await supabase.from('anak').select('*');
        if (childData && childData.length > 0) children = childData;

        // Fetch Measurements (RLS-protected)
        const { data: measData } = await supabase.from('pengukuran').select('*');
        if (measData && measData.length > 0) measurements = measData;
      }
    }

    // Filter Posyandu based on user query
    const targetPosyandus =
      posyanduIdParam !== 'all'
        ? posyandus.filter((p) => String(p.id) === String(posyanduIdParam))
        : posyandus;

    // Hitung statistik per posyandu di server
    const statsList: PosyanduQualityStats[] = targetPosyandus.map((p) =>
      computePosyanduQualityStats(p.id, p.nama, measurements, children, selectedMonth)
    );

    // Hitung ringkasan keseluruhan (overall)
    let totalAllMeasurements = 0;
    let totalAllClean = 0;
    let totalAllFlagged = 0;
    let totalAllCoverageUnmeasured = 0;
    const allFlaggedItems: FlaggedMeasurementItem[] = [];

    statsList.forEach((stat) => {
      totalAllMeasurements += stat.totalMeasurements;
      totalAllClean += stat.cleanMeasurements;
      totalAllFlagged += stat.flaggedMeasurements;
      totalAllCoverageUnmeasured += stat.coverageUnmeasuredCount;
      allFlaggedItems.push(...stat.flaggedItems);
    });

    const overallScore =
      totalAllMeasurements > 0 ? Math.round((totalAllClean / totalAllMeasurements) * 100) : 100;

    // Urutkan seluruh temuan flagged: tanggal terbaru di atas
    allFlaggedItems.sort(
      (a, b) =>
        new Date(b.measurement.tgl_ukur).getTime() - new Date(a.measurement.tgl_ukur).getTime()
    );

    return NextResponse.json({
      month: selectedMonth,
      posyanduId: posyanduIdParam,
      overallScore,
      totalMeasurements: totalAllMeasurements,
      cleanMeasurements: totalAllClean,
      flaggedCount: totalAllFlagged,
      coverageUnmeasuredCount: totalAllCoverageUnmeasured,
      needsAttention: overallScore < 90,
      posyanduStats: statsList,
      flaggedItems: allFlaggedItems,
    });
  } catch (error: any) {
    console.error('Error computing data quality in server:', error);
    return NextResponse.json(
      { error: 'Gagal menghitung kualitas data', details: error.message },
      { status: 500 }
    );
  }
}
