import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRembukExcel, generateRembukPdf, RembukExportData } from '@/lib/rembukExport';
import { Anak, Pengukuran, TindakLanjut, Posyandu } from '@/types/database';

// Skenario data fallback untuk development / mock session jika Supabase belum terisi
const FALLBACK_POSYANDU: Posyandu[] = [
  { id: 1, desa_id: 1, nama: 'Posyandu Melati 01', dusun: 'Dusun Krajan' },
  { id: 2, desa_id: 1, nama: 'Posyandu Melati 02', dusun: 'Dusun Sidomulyo' },
  { id: 3, desa_id: 1, nama: 'Posyandu Mawar 03', dusun: 'Dusun Sukasari' },
];

const FALLBACK_CHILDREN: Anak[] = [
  { id: 'c-1', desa_id: 1, posyandu_id: 1, nama: 'Rayyan Pratama', nik: '3201124508230001', no_kk: null, nama_pengasuh: 'Siti Rahmawati', hubungan_pengasuh: 'ibu', tgl_lahir: '2025-08-15', jenis_kelamin: 'L' },
  { id: 'c-2', desa_id: 1, posyandu_id: 1, nama: 'Aisyah Putri', nik: '3201125510240002', no_kk: null, nama_pengasuh: 'Nurul Hidayah', hubungan_pengasuh: 'ibu', tgl_lahir: '2025-04-10', jenis_kelamin: 'P' },
  { id: 'c-3', desa_id: 1, posyandu_id: 2, nama: 'Muhammad Bilal', nik: '3201121203240003', no_kk: null, nama_pengasuh: 'Dewi Lestari', hubungan_pengasuh: 'ibu', tgl_lahir: '2024-11-20', jenis_kelamin: 'L' },
  { id: 'c-4', desa_id: 1, posyandu_id: 2, nama: 'Khadijah Althafunisa', nik: '3201126701250004', no_kk: null, nama_pengasuh: 'Fatimah Zahra', hubungan_pengasuh: 'ibu', tgl_lahir: '2025-01-05', jenis_kelamin: 'P' },
  { id: 'c-5', desa_id: 1, posyandu_id: 3, nama: 'Kenzo Alvaro', nik: '3201122206240005', no_kk: null, nama_pengasuh: 'Ratna Sari', hubungan_pengasuh: 'ibu', tgl_lahir: '2024-06-18', jenis_kelamin: 'L' },
  { id: 'c-6', desa_id: 1, posyandu_id: 3, nama: 'Naura Salsabila', nik: '3201124409240006', no_kk: null, nama_pengasuh: 'Indah Permata', hubungan_pengasuh: 'ibu', tgl_lahir: '2024-09-12', jenis_kelamin: 'P' },
  { id: 'c-7', desa_id: 1, posyandu_id: 1, nama: 'Fatih Ar-Rasyid', nik: '3201121511240007', no_kk: null, nama_pengasuh: 'Mega Utami', hubungan_pengasuh: 'ibu', tgl_lahir: '2024-11-15', jenis_kelamin: 'L' },
  { id: 'c-8', desa_id: 1, posyandu_id: 2, nama: 'Zahra Humaira', nik: '3201125203250008', no_kk: null, nama_pengasuh: 'Dian Anggraini', hubungan_pengasuh: 'ibu', tgl_lahir: '2025-03-22', jenis_kelamin: 'P' },
];

const FALLBACK_MEASUREMENTS: Pengukuran[] = [
  { id: 'p-1', anak_id: 'c-1', desa_id: 1, posyandu_id: 1, tgl_ukur: '2026-10-15', berat_kg: 8.2, tinggi_cm: 68.5, cara_ukur: 'berbaring', berat_manual: true, z_tbu: -3.4, z_bbu: -2.9, status: 'merah' },
  { id: 'p-2', anak_id: 'c-2', desa_id: 1, posyandu_id: 1, tgl_ukur: '2026-10-18', berat_kg: 8.9, tinggi_cm: 74.0, cara_ukur: 'berbaring', berat_manual: true, z_tbu: -2.3, z_bbu: -2.1, status: 'kuning' },
  { id: 'p-3', anak_id: 'c-3', desa_id: 1, posyandu_id: 2, tgl_ukur: '2026-10-10', berat_kg: 11.8, tinggi_cm: 86.5, cara_ukur: 'berdiri', berat_manual: true, z_tbu: -0.4, z_bbu: -0.2, status: 'hijau' },
  { id: 'p-4', anak_id: 'c-4', desa_id: 1, posyandu_id: 2, tgl_ukur: '2026-10-12', berat_kg: 9.8, tinggi_cm: 77.2, cara_ukur: 'berbaring', berat_manual: true, z_tbu: 0.1, z_bbu: 0.3, status: 'hijau' },
  { id: 'p-5', anak_id: 'c-5', desa_id: 1, posyandu_id: 3, tgl_ukur: '2026-10-08', berat_kg: 9.2, tinggi_cm: 73.1, cara_ukur: 'berdiri', berat_manual: true, z_tbu: -3.1, z_bbu: -2.7, status: 'merah' },
  { id: 'p-6', anak_id: 'c-6', desa_id: 1, posyandu_id: 3, tgl_ukur: '2026-10-14', berat_kg: 10.1, tinggi_cm: 78.4, cara_ukur: 'berdiri', berat_manual: true, z_tbu: -2.2, z_bbu: -1.9, status: 'kuning' },
  { id: 'p-7', anak_id: 'c-7', desa_id: 1, posyandu_id: 1, tgl_ukur: '2026-09-15', berat_kg: 9.0, tinggi_cm: 74.0, cara_ukur: 'berbaring', berat_manual: true, z_tbu: -0.8, z_bbu: -0.5, status: 'hijau' },
];

const FALLBACK_TINDAK_LANJUT: TindakLanjut[] = [
  { id: 1, pengukuran_id: 'p-1', anak_id: 'c-1', desa_id: 1, posyandu_id: 1, tgl_kunjungan_ulang: '2026-10-24', status_rujukan: 'sudah', catatan: 'Telah dirujuk ke Puskesmas, evaluasi asupan gizi.', selesai: false, updated_at: '2026-10-16T08:00:00Z' },
  { id: 2, pengukuran_id: 'p-2', anak_id: 'c-2', desa_id: 1, posyandu_id: 1, tgl_kunjungan_ulang: '2026-10-26', status_rujukan: 'belum', catatan: 'Kader mengingatkan pengasuh untuk PMT protein hewani.', selesai: false, updated_at: '2026-10-18T10:00:00Z' },
  { id: 3, pengukuran_id: 'p-5', anak_id: 'c-5', desa_id: 1, posyandu_id: 3, tgl_kunjungan_ulang: '2026-10-20', status_rujukan: 'ada_hasil', catatan: 'Hasil lab menunjukkan anemia ringan, diberi suplemen zat besi.', selesai: false, updated_at: '2026-10-21T09:00:00Z' },
  { id: 4, pengukuran_id: 'p-6', anak_id: 'c-6', desa_id: 1, posyandu_id: 3, tgl_kunjungan_ulang: '2026-10-28', status_rujukan: 'belum', catatan: 'Konseling pola makan balita dengan keluarga.', selesai: false, updated_at: '2026-10-14T11:00:00Z' },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();
    const posyanduIdParam = searchParams.get('posyanduId') || 'all';
    
    // Default month YYYY-MM
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = searchParams.get('month') || defaultMonth;

    // 1. Authenticate user session using Supabase server client (preserves RLS)
    const supabase = await createClient(request.cookies);
    let userRole = '';
    let userDesaId = 1;
    let desaName = 'Sukamaju';

    const isRealSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isRealSupabase) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        return NextResponse.json({ error: 'Tidak terautentikasi. Silakan masuk terlebih dahulu.' }, { status: 401 });
      }

      // Read profile to get role and desa_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, desa_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return NextResponse.json({ error: 'Profil pengguna tidak ditemukan.' }, { status: 403 });
      }

      userRole = profile.role;
      userDesaId = profile.desa_id || 1;

      // RULE: Bidan, KPM, Kepala Desa are allowed. Kader cannot export dashboard rembuk stunting.
      const allowedRoles = ['bidan', 'kpm', 'kepala_desa', 'admin'];
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Akses ditolak: Hanya Bidan, KPM, atau Kepala Desa yang berwenang mengekspor data Rembuk Stunting.' },
          { status: 403 }
        );
      }

      // Fetch desa name
      const { data: dData } = await supabase
        .from('desa')
        .select('nama')
        .eq('id', userDesaId)
        .single();

      if (dData?.nama) {
        desaName = dData.nama;
      }
    } else {
      // Mock / Dev Session fallback via cookie
      const devCookie = request.cookies.get('sg_dev_session')?.value;
      if (devCookie) {
        try {
          const session = JSON.parse(decodeURIComponent(devCookie));
          userRole = session.role || 'bidan';
          userDesaId = session.desa_id || 1;
          if (session.desa_nama) desaName = session.desa_nama;
        } catch {
          userRole = 'bidan';
        }
      } else {
        return NextResponse.json({ error: 'Sesi login tidak ditemukan.' }, { status: 401 });
      }

      // RULE: Check role in dev mode too
      const allowedRoles = ['bidan', 'kpm', 'kepala_desa', 'admin'];
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'Akses ditolak: Hanya Bidan, KPM, atau Kepala Desa yang berwenang mengekspor data Rembuk Stunting.' },
          { status: 403 }
        );
      }
    }

    // 2. Fetch data filtered by user's desa (RLS enforced)
    let posyanduList: Posyandu[] = [];
    let children: Anak[] = [];
    let measurements: Pengukuran[] = [];
    let tindakLanjutList: TindakLanjut[] = [];

    if (isRealSupabase) {
      // Posyandu in this desa
      const { data: pList } = await supabase
        .from('posyandu')
        .select('*')
        .eq('desa_id', userDesaId);
      if (pList) posyanduList = pList;

      // Children in this desa
      let cQuery = supabase.from('anak').select('*').eq('desa_id', userDesaId);
      if (posyanduIdParam !== 'all') {
        cQuery = cQuery.eq('posyandu_id', parseInt(posyanduIdParam, 10));
      }
      const { data: cList } = await cQuery;
      if (cList) children = cList;

      // Measurements in this desa
      let mQuery = supabase.from('pengukuran').select('*').eq('desa_id', userDesaId);
      if (posyanduIdParam !== 'all') {
        mQuery = mQuery.eq('posyandu_id', parseInt(posyanduIdParam, 10));
      }
      const { data: mList } = await mQuery;
      if (mList) measurements = mList;

      // Tindak lanjut in this desa
      let tlQuery = supabase.from('tindak_lanjut').select('*').eq('desa_id', userDesaId);
      if (posyanduIdParam !== 'all') {
        tlQuery = tlQuery.eq('posyandu_id', parseInt(posyanduIdParam, 10));
      }
      const { data: tlList } = await tlQuery;
      if (tlList) tindakLanjutList = tlList;
    } else {
      // Fallback data
      posyanduList = FALLBACK_POSYANDU.filter((p) => p.desa_id === userDesaId);
      
      let filteredChildren = FALLBACK_CHILDREN.filter((c) => c.desa_id === userDesaId);
      if (posyanduIdParam !== 'all') {
        const pId = parseInt(posyanduIdParam, 10);
        filteredChildren = filteredChildren.filter((c) => c.posyandu_id === pId);
      }
      children = filteredChildren;

      let filteredMeasurements = FALLBACK_MEASUREMENTS.filter((m) => m.desa_id === userDesaId);
      if (posyanduIdParam !== 'all') {
        const pId = parseInt(posyanduIdParam, 10);
        filteredMeasurements = filteredMeasurements.filter((m) => m.posyandu_id === pId);
      }
      measurements = filteredMeasurements;

      let filteredTL = FALLBACK_TINDAK_LANJUT.filter((tl) => tl.desa_id === userDesaId);
      if (posyanduIdParam !== 'all') {
        const pId = parseInt(posyanduIdParam, 10);
        filteredTL = filteredTL.filter((tl) => tl.posyandu_id === pId);
      }
      tindakLanjutList = filteredTL;
    }

    // Determine posyandu display label
    let posyanduLabel = 'Semua Posyandu';
    if (posyanduIdParam !== 'all') {
      const foundP = posyanduList.find((p) => p.id === parseInt(posyanduIdParam, 10));
      if (foundP) posyanduLabel = foundP.nama;
    }

    const exportData: RembukExportData = {
      desaName,
      selectedMonth,
      posyanduLabel,
      children,
      measurements,
      tindakLanjutList,
      posyanduList,
    };

    // Clean desa slug for file name
    const cleanDesa = desaName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'desa';

    // 3. Generate requested format
    if (format === 'pdf') {
      const pdfBuffer = await generateRembukPdf(exportData);
      const filename = `rembuk_${cleanDesa}_${selectedMonth}.pdf`;

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Default to Excel (.xlsx)
    const excelBuffer = await generateRembukExcel(exportData);
    const filename = `rembuk_${cleanDesa}_${selectedMonth}.xlsx`;

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error generating Rembuk Stunting export:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses ekspor Rembuk Stunting.' },
      { status: 500 }
    );
  }
}
