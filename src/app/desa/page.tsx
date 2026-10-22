'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { calculateAgeInMonths, formatIndonesianDate } from '@/lib/utils';
import {
  Anak,
  Pengukuran,
  TindakLanjut,
  Posyandu,
  StatusRujukan,
} from '@/types/database';
import {
  Building2,
  LogOut,
  Download,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Filter,
  Clock,
  PieChart,
  ShieldAlert,
} from 'lucide-react';

interface ChildWithLatestMeasurement {
  child: Anak;
  latestMeasurement: Pengukuran | null;
  tindakLanjut: TindakLanjut | null;
  posyanduName: string;
}

const DEFAULT_POSYANDUS: Posyandu[] = [
  { id: 1, desa_id: 1, nama: 'Posyandu Melati 01', dusun: 'Dusun Krajan' },
  { id: 2, desa_id: 1, nama: 'Posyandu Melati 02', dusun: 'Dusun Sidomulyo' },
  { id: 3, desa_id: 1, nama: 'Posyandu Mawar 03', dusun: 'Dusun Sukasari' },
];

const DEFAULT_CHILDREN: Anak[] = [
  {
    id: 'c-1',
    desa_id: 1,
    posyandu_id: 1,
    nama: 'Rayyan Pratama',
    nik: '3201124508230001',
    no_kk: '3201120000000001',
    nama_ibu: 'Siti Rahmawati',
    tgl_lahir: '2025-08-15',
    jenis_kelamin: 'L',
  },
  {
    id: 'c-2',
    desa_id: 1,
    posyandu_id: 1,
    nama: 'Aisyah Putri',
    nik: '3201125510240002',
    no_kk: '3201120000000002',
    nama_ibu: 'Nurul Hidayah',
    tgl_lahir: '2025-04-10',
    jenis_kelamin: 'P',
  },
  {
    id: 'c-3',
    desa_id: 1,
    posyandu_id: 2,
    nama: 'Muhammad Bilal',
    nik: '3201121203240003',
    no_kk: '3201120000000003',
    nama_ibu: 'Dewi Lestari',
    tgl_lahir: '2024-11-20',
    jenis_kelamin: 'L',
  },
  {
    id: 'c-4',
    desa_id: 1,
    posyandu_id: 2,
    nama: 'Khadijah Althafunisa',
    nik: '3201126701250004',
    no_kk: '3201120000000004',
    nama_ibu: 'Fatimah Zahra',
    tgl_lahir: '2025-01-05',
    jenis_kelamin: 'P',
  },
  {
    id: 'c-5',
    desa_id: 1,
    posyandu_id: 3,
    nama: 'Kenzo Alvaro',
    nik: '3201122206240005',
    no_kk: '3201120000000005',
    nama_ibu: 'Ratna Sari',
    tgl_lahir: '2024-06-18',
    jenis_kelamin: 'L',
  },
  {
    id: 'c-6',
    desa_id: 1,
    posyandu_id: 3,
    nama: 'Naura Salsabila',
    nik: '3201124409240006',
    no_kk: '3201120000000006',
    nama_ibu: 'Indah Permata',
    tgl_lahir: '2024-09-12',
    jenis_kelamin: 'P',
  },
  {
    id: 'c-7',
    desa_id: 1,
    posyandu_id: 1,
    nama: 'Fatih Ar-Rasyid',
    nik: '3201121511240007',
    no_kk: '3201120000000007',
    nama_ibu: 'Mega Utami',
    tgl_lahir: '2024-11-15',
    jenis_kelamin: 'L',
  },
  {
    id: 'c-8',
    desa_id: 1,
    posyandu_id: 2,
    nama: 'Zahra Humaira',
    nik: '3201125203250008',
    no_kk: '3201120000000008',
    nama_ibu: 'Dian Anggraini',
    tgl_lahir: '2025-03-22',
    jenis_kelamin: 'P',
  },
];

const DEFAULT_MEASUREMENTS: Pengukuran[] = [
  {
    id: 'p-1',
    anak_id: 'c-1',
    desa_id: 1,
    posyandu_id: 1,
    tgl_ukur: '2026-10-15',
    berat_kg: 8.2,
    tinggi_cm: 68.5,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -3.4,
    z_bbu: -2.9,
    status: 'merah',
  },
  {
    id: 'p-2',
    anak_id: 'c-2',
    desa_id: 1,
    posyandu_id: 1,
    tgl_ukur: '2026-10-18',
    berat_kg: 8.9,
    tinggi_cm: 74.0,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -2.3,
    z_bbu: -2.1,
    status: 'kuning',
  },
  {
    id: 'p-3',
    anak_id: 'c-3',
    desa_id: 1,
    posyandu_id: 2,
    tgl_ukur: '2026-10-10',
    berat_kg: 11.8,
    tinggi_cm: 86.5,
    cara_ukur: 'berdiri',
    berat_manual: true,
    z_tbu: -0.4,
    z_bbu: -0.2,
    status: 'hijau',
  },
  {
    id: 'p-4',
    anak_id: 'c-4',
    desa_id: 1,
    posyandu_id: 2,
    tgl_ukur: '2026-10-12',
    berat_kg: 9.8,
    tinggi_cm: 77.2,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: 0.1,
    z_bbu: 0.3,
    status: 'hijau',
  },
  {
    id: 'p-5',
    anak_id: 'c-5',
    desa_id: 1,
    posyandu_id: 3,
    tgl_ukur: '2026-10-08',
    berat_kg: 9.2,
    tinggi_cm: 73.1,
    cara_ukur: 'berdiri',
    berat_manual: true,
    z_tbu: -3.1,
    z_bbu: -2.7,
    status: 'merah',
  },
  {
    id: 'p-6',
    anak_id: 'c-6',
    desa_id: 1,
    posyandu_id: 3,
    tgl_ukur: '2026-10-14',
    berat_kg: 10.1,
    tinggi_cm: 78.4,
    cara_ukur: 'berdiri',
    berat_manual: true,
    z_tbu: -2.2,
    z_bbu: -1.9,
    status: 'kuning',
  },
  {
    id: 'p-7',
    anak_id: 'c-7',
    desa_id: 1,
    posyandu_id: 1,
    tgl_ukur: '2026-09-15',
    berat_kg: 9.0,
    tinggi_cm: 74.0,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -0.8,
    z_bbu: -0.5,
    status: 'hijau',
  },
];

const DEFAULT_TINDAK_LANJUT: TindakLanjut[] = [
  {
    id: 1,
    pengukuran_id: 'p-1',
    anak_id: 'c-1',
    desa_id: 1,
    posyandu_id: 1,
    tgl_kunjungan_ulang: '2026-10-24',
    status_rujukan: 'sudah',
    catatan: 'Telah dirujuk ke Puskesmas, evaluasi asupan gizi.',
    selesai: false,
    updated_at: '2026-10-16T08:00:00Z',
  },
  {
    id: 2,
    pengukuran_id: 'p-2',
    anak_id: 'c-2',
    desa_id: 1,
    posyandu_id: 1,
    tgl_kunjungan_ulang: '2026-10-26',
    status_rujukan: 'belum',
    catatan: 'Kader mengingatkan ibu untuk PMT protein hewani.',
    selesai: false,
    updated_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 3,
    pengukuran_id: 'p-5',
    anak_id: 'c-5',
    desa_id: 1,
    posyandu_id: 3,
    tgl_kunjungan_ulang: '2026-10-20',
    status_rujukan: 'ada_hasil',
    catatan: 'Hasil lab menunjukkan anemia ringan, diberi suplemen zat besi.',
    selesai: false,
    updated_at: '2026-10-21T09:00:00Z',
  },
  {
    id: 4,
    pengukuran_id: 'p-6',
    anak_id: 'c-6',
    desa_id: 1,
    posyandu_id: 3,
    tgl_kunjungan_ulang: '2026-10-28',
    status_rujukan: 'belum',
    catatan: 'Konseling pola makan balita dengan keluarga.',
    selesai: false,
    updated_at: '2026-10-14T11:00:00Z',
  },
];

export default function DesaDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  // User & Profile State
  const [userName, setUserName] = useState<string>('Bdn. Endang Rahayu, S.Tr.Keb');
  const [userRole, setUserRole] = useState<string>('Bidan Desa');
  const [desaName, setDesaName] = useState<string>('Desa Sukamaju');
  const [loading, setLoading] = useState(true);

  // Raw Data State (Initialized with solid defaults)
  const [posyanduList, setPosyanduList] = useState<Posyandu[]>(DEFAULT_POSYANDUS);
  const [childrenList, setChildrenList] = useState<Anak[]>(DEFAULT_CHILDREN);
  const [measurementsList, setMeasurementsList] = useState<Pengukuran[]>(DEFAULT_MEASUREMENTS);
  const [tindakLanjutList, setTindakLanjutList] = useState<TindakLanjut[]>(DEFAULT_TINDAK_LANJUT);

  // Filter States
  const [selectedPosyanduId, setSelectedPosyanduId] = useState<string>('all');
  
  // Default to current month: YYYY-MM
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isRealSupabase) {
        // Load User Profile
        const { data: { user } } = await supabase.auth.getUser();
        let currentDesaId = 1;

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nama, role, desa_id')
            .eq('id', user.id)
            .single();

          if (profile) {
            if (profile.nama) setUserName(profile.nama);
            if (profile.role) {
              const roleLabels: Record<string, string> = {
                bidan: 'Bidan Desa',
                kpm: 'Kader Pembangunan Manusia (KPM)',
                kepala_desa: 'Kepala Desa',
              };
              setUserRole(roleLabels[profile.role] || profile.role);
            }
            if (profile.desa_id) currentDesaId = profile.desa_id;
          }
        }

        // Load Desa Info
        const { data: dData } = await supabase
          .from('desa')
          .select('*')
          .eq('id', currentDesaId)
          .single();

        if (dData?.nama) setDesaName(dData.nama);

        // Load Posyandu in this Desa
        const { data: posData } = await supabase
          .from('posyandu')
          .select('*')
          .eq('desa_id', currentDesaId);

        if (posData && posData.length > 0) setPosyanduList(posData);

        // Load Anak in this Desa
        const { data: anakData } = await supabase
          .from('anak')
          .select('*')
          .eq('desa_id', currentDesaId);

        if (anakData && anakData.length > 0) setChildrenList(anakData);

        // Load Pengukuran
        const { data: pData } = await supabase
          .from('pengukuran')
          .select('*')
          .eq('desa_id', currentDesaId);

        if (pData && pData.length > 0) setMeasurementsList(pData);

        // Load Tindak Lanjut
        const { data: tlData } = await supabase
          .from('tindak_lanjut')
          .select('*')
          .eq('desa_id', currentDesaId);

        if (tlData && tlData.length > 0) setTindakLanjutList(tlData);
      } else {
        // Fallback demo/mock data
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

        // Merge children from localStorage
        const localSavedAnak = localStorage.getItem('sg_local_anak');
        if (localSavedAnak) {
          try {
            const parsed = JSON.parse(localSavedAnak);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Combine unique by id
              const map = new Map<string, Anak>();
              DEFAULT_CHILDREN.forEach((c) => map.set(c.id, c));
              parsed.forEach((c) => map.set(c.id, c));
              setChildrenList(Array.from(map.values()));
            }
          } catch (e) {
            console.warn(e);
          }
        }

        // Merge measurements from localStorage
        const localSavedPengukuran = localStorage.getItem('sg_local_pengukuran');
        if (localSavedPengukuran) {
          try {
            const parsedP = JSON.parse(localSavedPengukuran);
            if (Array.isArray(parsedP) && parsedP.length > 0) {
              const pMap = new Map<string, Pengukuran>();
              DEFAULT_MEASUREMENTS.forEach((m) => pMap.set(m.id, m));
              parsedP.forEach((m) => pMap.set(m.id, m));
              setMeasurementsList(Array.from(pMap.values()));
            }
          } catch (e) {
            console.warn(e);
          }
        }

        // Merge Tindak Lanjut from localStorage
        const localSavedTL = localStorage.getItem('sg_local_tindak_lanjut');
        if (localSavedTL) {
          try {
            const parsedTL = JSON.parse(localSavedTL);
            if (Array.isArray(parsedTL) && parsedTL.length > 0) {
              const tlMap = new Map<string, TindakLanjut>();
              DEFAULT_TINDAK_LANJUT.forEach((t) => tlMap.set(t.anak_id, t));
              parsedTL.forEach((t) => tlMap.set(t.anak_id, t));
              setTindakLanjutList(Array.from(tlMap.values()));
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }
    } catch (err) {
      console.error('Error loading desa dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  // Logout handler
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

  // Posyandu map helper
  const posyanduMap = useMemo(() => {
    const map = new Map<number, string>();
    posyanduList.forEach((p) => map.set(p.id, p.nama));
    return map;
  }, [posyanduList]);

  // Tindak lanjut map helper by anak_id
  const tindakLanjutMap = useMemo(() => {
    const map = new Map<string, TindakLanjut>();
    tindakLanjutList.forEach((tl) => {
      // Store latest
      map.set(tl.anak_id, tl);
    });
    return map;
  }, [tindakLanjutList]);

  // Filter and process children with LATEST measurement inside selected month
  const processedData = useMemo(() => {
    // 1. Filter children by selected posyandu
    const filteredChildren = childrenList.filter((child) => {
      if (selectedPosyanduId === 'all') return true;
      return child.posyandu_id === parseInt(selectedPosyanduId, 10);
    });

    const measuredChildren: ChildWithLatestMeasurement[] = [];
    const unmeasuredChildren: { child: Anak; posyanduName: string; lastMeasuredDate: string | null }[] = [];

    // Helper: start and end of selected month (YYYY-MM)
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    filteredChildren.forEach((child) => {
      const pName = posyanduMap.get(child.posyandu_id) || `Posyandu ${child.posyandu_id}`;

      // Find all measurements for this child in selected month
      const childMeasurementsInMonth = measurementsList.filter((m) => {
        if (m.anak_id !== child.id) return false;
        if (!m.tgl_ukur) return false;
        const d = new Date(m.tgl_ukur);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });

      if (childMeasurementsInMonth.length > 0) {
        // Sort descending to get the LATEST measurement in this month
        childMeasurementsInMonth.sort(
          (a, b) => new Date(b.tgl_ukur).getTime() - new Date(a.tgl_ukur).getTime()
        );
        const latest = childMeasurementsInMonth[0];
        const tl = tindakLanjutMap.get(child.id) || null;

        measuredChildren.push({
          child,
          latestMeasurement: latest,
          tindakLanjut: tl,
          posyanduName: pName,
        });
      } else {
        // Find most recent measurement overall (for reference)
        const allChildMeasurements = measurementsList
          .filter((m) => m.anak_id === child.id && m.tgl_ukur)
          .sort((a, b) => new Date(b.tgl_ukur).getTime() - new Date(a.tgl_ukur).getTime());

        const lastDate = allChildMeasurements.length > 0 ? allChildMeasurements[0].tgl_ukur : null;

        unmeasuredChildren.push({
          child,
          posyanduName: pName,
          lastMeasuredDate: lastDate,
        });
      }
    });

    // Count categories
    let countHijau = 0;
    let countKuning = 0;
    let countMerah = 0;

    measuredChildren.forEach((item) => {
      const st = item.latestMeasurement?.status;
      if (st === 'hijau') countHijau++;
      else if (st === 'kuning') countKuning++;
      else if (st === 'merah') countMerah++;
    });

    // "Anak perlu perhatian": Red first, then Yellow
    const attentionChildren = measuredChildren
      .filter((item) => {
        const st = item.latestMeasurement?.status;
        return st === 'merah' || st === 'kuning';
      })
      .sort((a, b) => {
        const stA = a.latestMeasurement?.status;
        const stB = b.latestMeasurement?.status;
        // 'merah' comes first
        if (stA === 'merah' && stB !== 'merah') return -1;
        if (stA !== 'merah' && stB === 'merah') return 1;
        return 0;
      });

    return {
      filteredChildrenCount: filteredChildren.length,
      measuredChildren,
      unmeasuredChildren,
      countHijau,
      countKuning,
      countMerah,
      totalMeasured: measuredChildren.length,
      attentionChildren,
    };
  }, [childrenList, measurementsList, tindakLanjutMap, selectedPosyanduId, selectedMonth, posyanduMap]);

  // Export CSV function (UTF-8 with BOM for Excel compatibility)
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const headers = [
      'No',
      'Nama Balita',
      'NIK',
      'Nama Ibu',
      'Posyandu',
      'Usia (Bulan)',
      'Status Gizi',
      'Tinggi Badan (cm)',
      'Berat Badan (kg)',
      'Z-Score TB/U',
      'Z-Score BB/U',
      'Tanggal Ukur Terakhir',
      'Tanggal Kunjungan Ulang',
      'Status Rujukan',
      'Catatan Kasus',
    ];

    const rows = processedData.attentionChildren.map((item, index) => {
      const c = item.child;
      const m = item.latestMeasurement;
      const tl = item.tindakLanjut;
      const age = calculateAgeInMonths(c.tgl_lahir);

      const statusLabel =
        m?.status === 'merah'
          ? 'Merah (Indikasi Stunting Kritis)'
          : m?.status === 'kuning'
          ? 'Kuning (Waspada Gagal Tumbuh)'
          : 'Hijau (Normal)';

      const rujukanLabel =
        tl?.status_rujukan === 'belum'
          ? 'Belum'
          : tl?.status_rujukan === 'sudah'
          ? 'Sudah dirujuk'
          : tl?.status_rujukan === 'ada_hasil'
          ? 'Ada hasil'
          : '-';

      const rowData = [
        String(index + 1),
        `"${c.nama.replace(/"/g, '""')}"`,
        `"${c.nik || '-'}"`,
        `"${c.nama_ibu.replace(/"/g, '""')}"`,
        `"${item.posyanduName}"`,
        String(age),
        `"${statusLabel}"`,
        m?.tinggi_cm ? String(m.tinggi_cm) : '-',
        m?.berat_kg ? String(m.berat_kg) : '-',
        m?.z_tbu !== null && m?.z_tbu !== undefined ? String(m.z_tbu) : '-',
        m?.z_bbu !== null && m?.z_bbu !== undefined ? String(m.z_bbu) : '-',
        m?.tgl_ukur ? formatIndonesianDate(m.tgl_ukur) : '-',
        tl?.tgl_kunjungan_ulang ? formatIndonesianDate(tl.tgl_kunjungan_ulang) : '-',
        `"${rujukanLabel}"`,
        `"${(tl?.catatan || '-').replace(/"/g, '""')}"`,
      ];

      return rowData.join(';');
    });

    const csvContent = BOM + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const posyanduLabel =
      selectedPosyanduId === 'all'
        ? 'Semua_Posyandu'
        : (posyanduMap.get(parseInt(selectedPosyanduId, 10)) || 'Posyandu').replace(/\s+/g, '_');

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `StuntGuard_Anak_Perlu_Perhatian_${desaName.replace(/\s+/g, '_')}_${selectedMonth}_${posyanduLabel}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Status rujukan helper
  const renderStatusRujukanPill = (status: StatusRujukan | undefined | null) => {
    if (!status || status === 'belum') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          Belum
        </span>
      );
    }
    if (status === 'sudah') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          Sudah dirujuk
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        Ada hasil
      </span>
    );
  };

  // Month options (Current and past 6 months)
  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      list.push({ val, label });
    }
    return list;
  }, []);

  return (
    <div className="w-full min-h-screen bg-pageBg text-slate-900">
      {/* Top Main Navigation Bar (1280px container) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Desa Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slateTeal text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slateTeal bg-slateTeal-light px-2.5 py-0.5 rounded-full">
                  Dasbor Tingkat Desa
                </span>
                <span className="text-[12px] font-bold text-slate-400">•</span>
                <span className="text-[12px] font-semibold text-slate-500">
                  {userRole}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {desaName}
              </h1>
            </div>
          </div>

          {/* Right: Sync Status Badge & User / Logout */}
          <div className="flex items-center gap-3">
            <SyncStatusBadge />

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[13px] font-bold text-slate-800 leading-tight">
                {userName}
              </span>
              <span className="text-[11px] text-slate-500">Mode Baca Saja</span>
            </div>

            <button
              id="btn-logout-desa"
              onClick={handleLogout}
              className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:text-berry hover:bg-berry-light transition-all cursor-pointer"
              title="Keluar dari akun"
              aria-label="Keluar"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard Frame (Up to 1280px wide) */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Control Bar: Filters (Posyandu & Month) + Export Button */}
        <section className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200/80 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-2 text-slateTeal font-bold text-[14px]">
              <Filter size={18} />
              <span>Filter:</span>
            </div>

            {/* Filter 1: Posyandu Dropdown */}
            <div className="min-w-[190px] flex-1 sm:flex-initial">
              <label htmlFor="select-posyandu" className="sr-only">
                Pilih Posyandu
              </label>
              <select
                id="select-posyandu"
                value={selectedPosyanduId}
                onChange={(e) => setSelectedPosyanduId(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-2xl border-2 border-slate-200 bg-pageBg text-slate-900 font-bold text-[13px] focus:outline-none focus:border-slateTeal transition-all cursor-pointer"
              >
                <option value="all">Semua Posyandu ({posyanduList.length})</option>
                {posyanduList.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: Month Selector (default current month) */}
            <div className="min-w-[170px] flex-1 sm:flex-initial">
              <label htmlFor="select-month" className="sr-only">
                Pilih Bulan
              </label>
              <select
                id="select-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-2xl border-2 border-slate-200 bg-pageBg text-slate-900 font-bold text-[13px] focus:outline-none focus:border-slateTeal transition-all cursor-pointer"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.val} value={opt.val}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[12px] font-semibold text-slate-500 hidden lg:inline-block">
              Menampilkan data pengukuran <strong>terakhir</strong> tiap balita dalam bulan terpilih.
            </span>
          </div>

          {/* Button: Ekspor CSV (UTF-8 with BOM) */}
          <button
            type="button"
            id="btn-ekspor-csv"
            onClick={handleExportCSV}
            disabled={processedData.attentionChildren.length === 0}
            className="py-2.5 px-5 rounded-full bg-slateTeal hover:bg-slateTeal-dark text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex-shrink-0"
          >
            <Download size={18} />
            <span>Ekspor CSV</span>
          </button>
        </section>

        {/* Section 1: Three Big Summary Cards + Chart Widget */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: 3 Big Summary Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Hijau (Normal) */}
            <div
              id="card-summary-hijau"
              className="p-5 rounded-3xl bg-emerald-50/90 border-2 border-status-green/30 flex flex-col justify-between shadow-soft hover:border-status-green/60 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black uppercase tracking-wider text-emerald-800">
                  Normal
                </span>
                <div className="w-10 h-10 rounded-2xl bg-white text-status-green flex items-center justify-center shadow-xs">
                  <CheckCircle2 size={24} />
                </div>
              </div>

              <div className="my-3">
                <span className="text-[38px] font-black text-emerald-950 tracking-tight leading-none">
                  {processedData.countHijau}
                </span>
                <span className="text-[13px] font-bold text-emerald-700 ml-1.5">
                  Anak
                </span>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 text-[12px] font-semibold text-emerald-800">
                Pertumbuhan sesuai kurva ideal WHO
              </div>
            </div>

            {/* Card 2: Kuning (Waspada Gagal Tumbuh) */}
            <div
              id="card-summary-kuning"
              className="p-5 rounded-3xl bg-amber-50/90 border-2 border-status-yellow/40 flex flex-col justify-between shadow-soft hover:border-status-yellow/70 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black uppercase tracking-wider text-amber-900">
                  Waspada
                </span>
                <div className="w-10 h-10 rounded-2xl bg-white text-status-yellow flex items-center justify-center shadow-xs">
                  <AlertTriangle size={24} />
                </div>
              </div>

              <div className="my-3">
                <span className="text-[38px] font-black text-amber-950 tracking-tight leading-none">
                  {processedData.countKuning}
                </span>
                <span className="text-[13px] font-bold text-amber-800 ml-1.5">
                  Anak
                </span>
              </div>

              <div className="pt-2 border-t border-amber-200/60 text-[12px] font-semibold text-amber-900">
                Risiko gagal tumbuh (-2 SD)
              </div>
            </div>

            {/* Card 3: Merah (Indikasi Stunting Kritis) */}
            <div
              id="card-summary-merah"
              className="p-5 rounded-3xl bg-red-50/90 border-2 border-status-red/40 flex flex-col justify-between shadow-soft hover:border-status-red/70 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black uppercase tracking-wider text-red-900">
                  Kritis
                </span>
                <div className="w-10 h-10 rounded-2xl bg-white text-status-red flex items-center justify-center shadow-xs">
                  <AlertOctagon size={24} />
                </div>
              </div>

              <div className="my-3">
                <span className="text-[38px] font-black text-red-950 tracking-tight leading-none">
                  {processedData.countMerah}
                </span>
                <span className="text-[13px] font-bold text-red-800 ml-1.5">
                  Anak
                </span>
              </div>

              <div className="pt-2 border-t border-red-200/60 text-[12px] font-semibold text-red-900">
                Indikasi stunting berat (&lt; -3 SD)
              </div>
            </div>
          </div>

          {/* Right Column: Donut & Proportional Bar Chart Widget (Teal #44636D Theme) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border-2 border-slate-200/80 shadow-soft flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slateTeal-light text-slateTeal flex items-center justify-center">
                  <PieChart size={16} />
                </div>
                <h3 className="text-[15px] font-extrabold text-slate-900">
                  Proporsi Status Gizi Balita
                </h3>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slateTeal-light text-slateTeal">
                {processedData.totalMeasured} Balita Diukur
              </span>
            </div>

            {/* Donut Chart Visualization with SVG */}
            <div className="py-2 flex items-center justify-around gap-4">
              {/* Donut SVG */}
              <div className="relative w-32 h-32 flex-shrink-0">
                {processedData.totalMeasured === 0 ? (
                  <div className="w-full h-full rounded-full border-8 border-slate-100 flex items-center justify-center text-slate-400 text-[12px] font-bold">
                    0 Data
                  </div>
                ) : (
                  (() => {
                    const total = processedData.totalMeasured;
                    const r = 45;
                    const circ = 2 * Math.PI * r;

                    const pHijau = processedData.countHijau / total;
                    const pKuning = processedData.countKuning / total;
                    const pMerah = processedData.countMerah / total;

                    const lenHijau = pHijau * circ;
                    const lenKuning = pKuning * circ;
                    const lenMerah = pMerah * circ;

                    const offsetHijau = 0;
                    const offsetKuning = -lenHijau;
                    const offsetMerah = -(lenHijau + lenKuning);

                    return (
                      <>
                        <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
                          {/* Green Segment */}
                          {lenHijau > 0 && (
                            <circle
                              cx="55"
                              cy="55"
                              r={r}
                              fill="none"
                              stroke="#22C55E"
                              strokeWidth="14"
                              strokeDasharray={`${lenHijau} ${circ}`}
                              strokeDashoffset={offsetHijau}
                              className="transition-all duration-500"
                            />
                          )}
                          {/* Yellow Segment */}
                          {lenKuning > 0 && (
                            <circle
                              cx="55"
                              cy="55"
                              r={r}
                              fill="none"
                              stroke="#F2B705"
                              strokeWidth="14"
                              strokeDasharray={`${lenKuning} ${circ}`}
                              strokeDashoffset={offsetKuning}
                              className="transition-all duration-500"
                            />
                          )}
                          {/* Red Segment */}
                          {lenMerah > 0 && (
                            <circle
                              cx="55"
                              cy="55"
                              r={r}
                              fill="none"
                              stroke="#E5383B"
                              strokeWidth="14"
                              strokeDasharray={`${lenMerah} ${circ}`}
                              strokeDashoffset={offsetMerah}
                              className="transition-all duration-500"
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-[20px] font-black text-slateTeal leading-none">
                            {processedData.totalMeasured}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                            Total
                          </span>
                        </div>
                      </>
                    );
                  })()
                )}
              </div>

              {/* Legends & Percentages */}
              <div className="space-y-2 flex-1 text-[13px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-status-green" />
                    <span className="font-semibold text-slate-700">Hijau (Normal)</span>
                  </div>
                  <span className="font-black text-slate-900">
                    {processedData.totalMeasured > 0
                      ? `${Math.round((processedData.countHijau / processedData.totalMeasured) * 100)}%`
                      : '0%'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-status-yellow" />
                    <span className="font-semibold text-slate-700">Kuning (Waspada)</span>
                  </div>
                  <span className="font-black text-slate-900">
                    {processedData.totalMeasured > 0
                      ? `${Math.round((processedData.countKuning / processedData.totalMeasured) * 100)}%`
                      : '0%'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-status-red" />
                    <span className="font-semibold text-slate-700">Merah (Stunting)</span>
                  </div>
                  <span className="font-black text-slate-900">
                    {processedData.totalMeasured > 0
                      ? `${Math.round((processedData.countMerah / processedData.totalMeasured) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Coverage Metric */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-600">
              <span>
                Cakupan Penimbangan:{' '}
                <strong>
                  {processedData.filteredChildrenCount > 0
                    ? Math.round(
                        (processedData.totalMeasured / processedData.filteredChildrenCount) * 100
                      )
                    : 0}
                  %
                </strong>
              </span>
              <span className="text-slate-500">
                {processedData.totalMeasured} dari {processedData.filteredChildrenCount} balita terdaftar
              </span>
            </div>
          </div>
        </section>

        {/* Section 2: Table "Anak Perlu Perhatian" (Red first, then Yellow) */}
        <section className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-soft overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-status-red flex items-center justify-center font-bold">
                  <ShieldAlert size={18} />
                </div>
                <h2 className="text-[18px] font-black text-slate-900">
                  Anak Perlu Perhatian
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[12px] font-black bg-rose-100 text-status-red border border-rose-200">
                  {processedData.attentionChildren.length} Kasus
                </span>
              </div>
              <p className="text-[13px] text-slate-500 mt-1">
                Daftar balita dengan status Merah (Indikasi Stunting) dan Kuning (Waspada Gagal Tumbuh) yang memerlukan pendampingan intensif.
              </p>
            </div>

            <div className="text-[12px] font-semibold text-slate-500 flex items-center gap-1.5">
              <span>Prioritas:</span>
              <span className="px-2 py-0.5 rounded bg-red-50 text-status-red font-bold">
                Merah Dahulu
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">
                Kuning
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {processedData.attentionChildren.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-500">
                <CheckCircle2 size={36} className="text-status-green mx-auto mb-2" />
                <h3 className="text-[16px] font-extrabold text-slate-800">
                  Kondisi Sangat Baik!
                </h3>
                <p className="text-[13px] text-slate-500 mt-1">
                  Tidak ada balita berstatus Merah atau Kuning pada bulan dan wilayah yang dipilih.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slateTeal uppercase text-[11px] font-black tracking-wider">
                    <th className="py-3 px-4">Nama Balita</th>
                    <th className="py-3 px-4">Posyandu</th>
                    <th className="py-3 px-4">Status Gizi</th>
                    <th className="py-3 px-4">Jadwal Kunjungan Ulang</th>
                    <th className="py-3 px-4">Status Rujukan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedData.attentionChildren.map((item) => {
                    const c = item.child;
                    const m = item.latestMeasurement;
                    const tl = item.tindakLanjut;
                    const ageInMonths = calculateAgeInMonths(c.tgl_lahir);

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Nama */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">
                              {c.jenis_kelamin === 'L' ? '👦' : '👧'}
                            </span>
                            <div>
                              <span className="block text-[14px] font-extrabold text-slate-900">
                                {c.nama}
                              </span>
                              <span className="text-[11px] text-slate-500 font-normal">
                                Usia: {ageInMonths} bln • Ibu: {c.nama_ibu}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Posyandu */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {item.posyanduName}
                        </td>

                        {/* Status Gizi Badge */}
                        <td className="py-3.5 px-4">
                          <StatusBadge
                            status={m?.status || 'kuning'}
                            size="sm"
                          />
                        </td>

                        {/* Tanggal Kunjungan Ulang */}
                        <td className="py-3.5 px-4 text-slate-800 font-bold">
                          {tl?.tgl_kunjungan_ulang ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar size={14} className="text-slate-400" />
                              {formatIndonesianDate(tl.tgl_kunjungan_ulang)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">
                              Belum dijadwalkan
                            </span>
                          )}
                        </td>

                        {/* Status Rujukan */}
                        <td className="py-3.5 px-4">
                          {renderStatusRujukanPill(tl?.status_rujukan)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Section 3: Card "Anak Belum Diukur Bulan Ini" */}
        <section className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-soft p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-[17px] font-black text-slate-900 leading-snug">
                  Anak Belum Diukur Bulan Ini
                </h3>
                <p className="text-[12px] text-slate-500">
                  Balita terdaftar yang belum memiliki data penimbangan di bulan terpilih.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-[12px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-center">
              {processedData.unmeasuredChildren.length} Balita Belum Diukur
            </span>
          </div>

          {processedData.unmeasuredChildren.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-[13px]">
              <CheckCircle2 size={28} className="text-status-green mx-auto mb-2" />
              <p className="font-bold text-slate-800">Cakupan Pengukuran 100% Selesai</p>
              <p className="text-slate-500 mt-0.5">
                Semua balita pada wilayah terpilih telah ditimbang pada bulan ini.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {processedData.unmeasuredChildren.map(({ child, posyanduName, lastMeasuredDate }) => (
                <div
                  key={child.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2.5"
                >
                  <div>
                    <span className="text-[14px] font-extrabold text-slate-900 block leading-tight">
                      {child.nama}
                    </span>
                    <span className="text-[12px] text-slate-600 block mt-0.5">
                      Ibu: {child.nama_ibu} • {calculateAgeInMonths(child.tgl_lahir)} Bln
                    </span>
                    <span className="text-[11px] font-semibold text-slateTeal block mt-1">
                      {posyanduName}
                    </span>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Terakhir Ukur
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 block mt-0.5">
                      {lastMeasuredDate ? formatIndonesianDate(lastMeasuredDate) : 'Belum pernah'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center border-t border-slate-200 bg-white text-[12px] text-slate-500">
        <p className="font-semibold text-slate-700">
          StuntGuard — Dasbor Konvergensi & Monitoring Stunting Desa
        </p>
        <p className="mt-0.5 text-slate-400">
          Akses Khusus Bidan Desa, KPM, dan Kepala Desa • Hak Akses Baca Saja (Read-Only)
        </p>
      </footer>
    </div>
  );
}
