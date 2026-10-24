import { Anak, Pengukuran } from '@/types/database';
import { calculateAgeInMonths } from '@/lib/utils';

/**
 * Konfigurasi batas kualitas data antropometri StuntGuard.
 * PERHATIAN: Semua batasan di bawah ini ditandai "perlu validasi ahli gizi"
 * untuk penyesuaian klinis wilayah setempat.
 */

// Perlu validasi ahli gizi: Penurunan tinggi maksimal yang ditoleransi karena variasi pengukuran alat/posisi (cm)
export const TINGGI_TURUN_MAX_CM = 0.5;

// Perlu validasi ahli gizi: Pertambahan tinggi maksimal per 30 hari yang masuk akal secara biologis (cm)
export const TINGGI_NAIK_MAX_CM_PER_30_HARI = 5;

// Perlu validasi ahli gizi: Perubahan berat badan (naik/turun) maksimal dalam interval 60 hari (%)
// Catatan: Penurunan berat badan klinis biasa adalah sinyal gizi, bukan error data.
// Batasan ini khusus mendeteksi lonjakan/penurunan ekstrem yang tidak masuk akal.
export const BERAT_BERUBAH_MAX_PERSEN_60_HARI = 30;

// Perlu validasi ahli gizi: Batas biologis z-score WHO (Biologically Implausible Limits)
export const ZTBU_MIN = -6;
export const ZTBU_MAX = 6;
export const ZBBU_MIN = -6;
export const ZBBU_MAX = 5;

// Perlu validasi ahli gizi: Ambang deteksi pembulatan angka tinggi badan
export const PEMBULATAN_MIN_SAMPEL = 20;
export const PEMBULATAN_MAX_PERSEN = 80;

// Ambang batas kualitas posyandu (skor di bawah ini mendapat label "Perlu perhatian")
export const SKOR_PERLU_PERHATIAN = 90;

export type FlagKualitasCode =
  | 'TINGGI_TURUN'
  | 'TINGGI_NAIK_JANGGAL'
  | 'BERAT_BERUBAH_JANGGAL'
  | 'Z_DI_LUAR_BATAS'
  | 'CARA_UKUR_TIDAK_SESUAI'
  | 'DOBEL_HARI_SAMA';

export interface QualityFlag {
  code: FlagKualitasCode;
  label: string;
  suggestion: string;
  detail?: string;
}

export const FLAG_DEFINITIONS: Record<FlagKualitasCode, { label: string; suggestion: string }> = {
  TINGGI_TURUN: {
    label: 'Penurunan tinggi badan',
    suggestion: 'Ukur ulang tinggi badan.',
  },
  TINGGI_NAIK_JANGGAL: {
    label: 'Kenaikan tinggi tidak lazim',
    suggestion: 'Periksa cara ukur.',
  },
  BERAT_BERUBAH_JANGGAL: {
    label: 'Perubahan berat badan drastis',
    suggestion: 'Timbang ulang.',
  },
  Z_DI_LUAR_BATAS: {
    label: 'Z-score di luar batas biologis',
    suggestion: 'Angka mungkin salah. Ukur ulang.',
  },
  CARA_UKUR_TIDAK_SESUAI: {
    label: 'Cara ukur tidak sesuai umur',
    suggestion: 'Cek cara ukur sesuai umur.',
  },
  DOBEL_HARI_SAMA: {
    label: 'Pengukuran ganda hari sama',
    suggestion: 'Periksa data ganda.',
  },
};

/**
 * Mengevaluasi indikator kualitas data untuk satu pengukuran balita.
 */
export function evaluateMeasurementFlags(
  current: Pengukuran,
  allChildMeasurements: Pengukuran[],
  child: Anak
): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // Urutkan pengukuran anak berdasarkan tanggal ukur ascending
  const sorted = [...allChildMeasurements].sort(
    (a, b) => new Date(a.tgl_ukur).getTime() - new Date(b.tgl_ukur).getTime()
  );

  const currentIndex = sorted.findIndex((m) => m.id === current.id);
  const currentDate = new Date(current.tgl_ukur);

  // 6. DOBEL_HARI_SAMA: lebih dari satu pengukuran untuk anak yang sama pada tanggal ukur yang sama
  const sameDayCount = sorted.filter((m) => m.tgl_ukur === current.tgl_ukur).length;
  if (sameDayCount > 1) {
    flags.push({
      code: 'DOBEL_HARI_SAMA',
      ...FLAG_DEFINITIONS.DOBEL_HARI_SAMA,
      detail: `Terdapat ${sameDayCount} pengukuran tercatat pada tanggal ${current.tgl_ukur}.`,
    });
  }

  // 5. CARA_UKUR_TIDAK_SESUAI:
  // berbaring pada usia >= 24 bulan, atau berdiri pada usia < 24 bulan
  const ageInMonthsAtMeasurement = calculateAgeInMonths(child.tgl_lahir, current.tgl_ukur);
  if (ageInMonthsAtMeasurement >= 24 && current.cara_ukur === 'berbaring') {
    flags.push({
      code: 'CARA_UKUR_TIDAK_SESUAI',
      ...FLAG_DEFINITIONS.CARA_UKUR_TIDAK_SESUAI,
      detail: `Balita berusia ${ageInMonthsAtMeasurement} bulan (>= 24 bln) diukur telentang/berbaring.`,
    });
  } else if (ageInMonthsAtMeasurement < 24 && current.cara_ukur === 'berdiri') {
    flags.push({
      code: 'CARA_UKUR_TIDAK_SESUAI',
      ...FLAG_DEFINITIONS.CARA_UKUR_TIDAK_SESUAI,
      detail: `Balita berusia ${ageInMonthsAtMeasurement} bulan (< 24 bln) diukur berdiri.`,
    });
  }

  // 4. Z_DI_LUAR_BATAS: z_tbu atau z_bbu di luar batas biologis WHO
  const hasZtbuOut =
    current.z_tbu !== null &&
    current.z_tbu !== undefined &&
    (current.z_tbu < ZTBU_MIN || current.z_tbu > ZTBU_MAX);

  const hasZbbuOut =
    current.z_bbu !== null &&
    current.z_bbu !== undefined &&
    (current.z_bbu < ZBBU_MIN || current.z_bbu > ZBBU_MAX);

  if (hasZtbuOut || hasZbbuOut) {
    const detailParts: string[] = [];
    if (hasZtbuOut) detailParts.push(`TB/U (${current.z_tbu?.toFixed(1)})`);
    if (hasZbbuOut) detailParts.push(`BB/U (${current.z_bbu?.toFixed(1)})`);
    flags.push({
      code: 'Z_DI_LUAR_BATAS',
      ...FLAG_DEFINITIONS.Z_DI_LUAR_BATAS,
      detail: `Z-score ekstrem di luar batas WHO: ${detailParts.join(', ')}.`,
    });
  }

  // Perbandingan dengan pengukuran sebelumnya (Flags 1, 2, 3)
  // Cari pengukuran sebelum `current` yang tanggalnya paling dekat tapi lebih kecil
  let prevMeasurement: Pengukuran | null = null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (new Date(sorted[i].tgl_ukur).getTime() < currentDate.getTime()) {
      prevMeasurement = sorted[i];
      break;
    }
  }

  if (prevMeasurement) {
    const prevDate = new Date(prevMeasurement.tgl_ukur);
    const diffDays = Math.max(
      1,
      Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // 1. TINGGI_TURUN: tinggi sekarang lebih rendah dari pengukuran sebelumnya > 0.5 cm
    const diffHeight = current.tinggi_cm - prevMeasurement.tinggi_cm;
    if (diffHeight < -TINGGI_TURUN_MAX_CM) {
      flags.push({
        code: 'TINGGI_TURUN',
        ...FLAG_DEFINITIONS.TINGGI_TURUN,
        detail: `Tinggi berkurang ${Math.abs(diffHeight).toFixed(1)} cm dari pengukuran sebelumnya (${prevMeasurement.tinggi_cm} cm -> ${current.tinggi_cm} cm).`,
      });
    }

    // 2. TINGGI_NAIK_JANGGAL: kenaikan tinggi per 30 hari > 5 cm
    if (diffHeight > 0) {
      const heightGainPer30Days = (diffHeight / diffDays) * 30;
      if (heightGainPer30Days > TINGGI_NAIK_MAX_CM_PER_30_HARI) {
        flags.push({
          code: 'TINGGI_NAIK_JANGGAL',
          ...FLAG_DEFINITIONS.TINGGI_NAIK_JANGGAL,
          detail: `Tinggi bertambah ${diffHeight.toFixed(1)} cm dalam ${diffDays} hari (laju: ${heightGainPer30Days.toFixed(1)} cm/30 hari).`,
        });
      }
    }

    // 3. BERAT_BERUBAH_JANGGAL: berat berubah (naik/turun) > 30% dalam 60 hari
    // Catatan: Penurunan berat badan biasa klinis tidak ditandai error; hanya perubahan drastis > 30%.
    if (diffDays <= 60 && prevMeasurement.berat_kg > 0) {
      const percentChange =
        (Math.abs(current.berat_kg - prevMeasurement.berat_kg) / prevMeasurement.berat_kg) * 100;
      if (percentChange > BERAT_BERUBAH_MAX_PERSEN_60_HARI) {
        const direction = current.berat_kg > prevMeasurement.berat_kg ? 'naik' : 'turun';
        flags.push({
          code: 'BERAT_BERUBAH_JANGGAL',
          ...FLAG_DEFINITIONS.BERAT_BERUBAH_JANGGAL,
          detail: `Berat ${direction} ${percentChange.toFixed(0)}% dalam ${diffDays} hari (${prevMeasurement.berat_kg} kg -> ${current.berat_kg} kg).`,
        });
      }
    }
  }

  return flags;
}

export interface FlaggedMeasurementItem {
  measurement: Pengukuran;
  child: Anak;
  flags: QualityFlag[];
  posyanduName?: string;
}

export interface PosyanduQualityStats {
  posyanduId: number;
  posyanduName: string;
  totalMeasurements: number;
  cleanMeasurements: number;
  flaggedMeasurements: number;
  score: number; // 0 - 100
  needsAttention: boolean;
  roundingFlag: boolean;
  roundingPercent: number;
  manualWeightPercent: number;
  manualWeightCount: number;
  coverageUnmeasuredCount: number;
  flaggedItems: FlaggedMeasurementItem[];
}

/**
 * Menghitung statistik kualitas posyandu berdasarkan data pengukuran dan anak.
 */
export function computePosyanduQualityStats(
  posyanduId: number,
  posyanduName: string,
  allMeasurements: Pengukuran[],
  allChildren: Anak[],
  selectedMonth?: string // Format 'YYYY-MM'
): PosyanduQualityStats {
  // Anak dalam posyandu ini
  const childrenInPosyandu = allChildren.filter((c) => c.posyandu_id === posyanduId);
  const childMap = new Map<string, Anak>();
  childrenInPosyandu.forEach((c) => childMap.set(c.id, c));

  // Pengukuran balita di posyandu ini
  const measurementsInPosyandu = allMeasurements.filter((m) => m.posyandu_id === posyanduId);

  // Filter berdasarkan bulan yang dipilih jika ada
  const filteredMeasurements = selectedMonth
    ? measurementsInPosyandu.filter((m) => m.tgl_ukur.startsWith(selectedMonth))
    : measurementsInPosyandu;

  // Evaluasi setiap pengukuran
  const flaggedItems: FlaggedMeasurementItem[] = [];
  let cleanCount = 0;
  let manualWeightCount = 0;

  filteredMeasurements.forEach((m) => {
    const child = childMap.get(m.anak_id) || allChildren.find((c) => c.id === m.anak_id);
    if (!child) return;

    // Kumpulkan riwayat pengukuran anak ini
    const childMeasurements = allMeasurements.filter((x) => x.anak_id === m.anak_id);
    const flags = evaluateMeasurementFlags(m, childMeasurements, child);

    if (m.berat_manual) {
      manualWeightCount++;
    }

    if (flags.length === 0) {
      cleanCount++;
    } else {
      flaggedItems.push({
        measurement: m,
        child,
        flags,
        posyanduName,
      });
    }
  });

  const totalMeasurements = filteredMeasurements.length;
  const score = totalMeasurements > 0 ? Math.round((cleanCount / totalMeasurements) * 100) : 100;
  const needsAttention = score < SKOR_PERLU_PERHATIAN;

  // Analisis Pembulatan Angka Tinggi Badan (.0 atau .5)
  // Dapat dihitung pada seluruh pengukuran di posyandu atau pada bulan berjalan
  const sampleMeasurements = measurementsInPosyandu.length >= PEMBULATAN_MIN_SAMPEL
    ? measurementsInPosyandu
    : filteredMeasurements;

  let roundedCount = 0;
  sampleMeasurements.forEach((m) => {
    // Cek apakah angka desimalnya .0 atau .5
    const roundedTinggi = Math.round(m.tinggi_cm * 10);
    if (roundedTinggi % 5 === 0) {
      roundedCount++;
    }
  });

  const roundingPercent =
    sampleMeasurements.length > 0
      ? Math.round((roundedCount / sampleMeasurements.length) * 100)
      : 0;

  const roundingFlag =
    sampleMeasurements.length >= PEMBULATAN_MIN_SAMPEL &&
    roundingPercent >= PEMBULATAN_MAX_PERSEN;

  const manualWeightPercent =
    totalMeasurements > 0 ? Math.round((manualWeightCount / totalMeasurements) * 100) : 0;

  // Cakupan Pengukuran (Coverage): Jumlah anak yang belum diukur dalam 60 hari terakhir
  const now = new Date();
  const sixtyDaysAgoTime = now.getTime() - 60 * 24 * 60 * 60 * 1000;

  let coverageUnmeasuredCount = 0;
  childrenInPosyandu.forEach((child) => {
    const childMeasures = measurementsInPosyandu.filter((m) => m.anak_id === child.id);
    if (childMeasures.length === 0) {
      coverageUnmeasuredCount++;
      return;
    }
    const latestDate = childMeasures.reduce((latest, m) => {
      const time = new Date(m.tgl_ukur).getTime();
      return time > latest ? time : latest;
    }, 0);

    if (latestDate < sixtyDaysAgoTime) {
      coverageUnmeasuredCount++;
    }
  });

  // Urutkan item bertanda: tanggal terbaru di atas
  flaggedItems.sort(
    (a, b) => new Date(b.measurement.tgl_ukur).getTime() - new Date(a.measurement.tgl_ukur).getTime()
  );

  return {
    posyanduId,
    posyanduName,
    totalMeasurements,
    cleanMeasurements: cleanCount,
    flaggedMeasurements: flaggedItems.length,
    score,
    needsAttention,
    roundingFlag,
    roundingPercent,
    manualWeightPercent,
    manualWeightCount,
    coverageUnmeasuredCount,
    flaggedItems,
  };
}

/**
 * Data pengujian dummy untuk verifikasi aturan data quality
 */
export const TEST_QUALITY_CHILDREN: Anak[] = [
  {
    id: 'c-q1',
    desa_id: 1,
    posyandu_id: 1,
    nama: 'Bima Sakti',
    nik: '3201121001250001',
    no_kk: null,
    nama_pengasuh: 'Dewi Sartika',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2025-01-10',
    jenis_kelamin: 'L',
  },
  {
    id: 'c-q2',
    desa_id: 1,
    posyandu_id: 1,
    nama: 'Arkan Fauzan',
    nik: '3201121503250002',
    no_kk: null,
    nama_pengasuh: 'Sri Wahyuni',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2025-03-15',
    jenis_kelamin: 'L',
  },
  {
    id: 'c-q3',
    desa_id: 1,
    posyandu_id: 2,
    nama: 'Cantika Kirana',
    nik: '3201120104240003',
    no_kk: null,
    nama_pengasuh: 'Halimah',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2024-04-01',
    jenis_kelamin: 'P',
  },
  {
    id: 'c-q4',
    desa_id: 1,
    posyandu_id: 2,
    nama: 'Dimas Anggara',
    nik: '3201122006250004',
    no_kk: null,
    nama_pengasuh: 'Rini Astuti',
    hubungan_pengasuh: 'ibu',
    tgl_lahir: '2025-06-20',
    jenis_kelamin: 'L',
  },
];

export const TEST_QUALITY_MEASUREMENTS: Pengukuran[] = [
  // 1. TINGGI_TURUN (Bima Sakti: turun 2.0 cm dari 74.0 cm -> 72.0 cm)
  {
    id: 'p-q1-prev',
    anak_id: 'c-q1',
    desa_id: 1,
    posyandu_id: 1,
    tgl_ukur: '2026-09-10',
    berat_kg: 9.0,
    tinggi_cm: 74.0,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -0.5,
    z_bbu: -0.2,
    status: 'hijau',
  },
  {
    id: 'p-q1',
    anak_id: 'c-q1',
    desa_id: 1,
    posyandu_id: 1,
    tgl_ukur: '2026-10-10',
    berat_kg: 9.1,
    tinggi_cm: 72.0, // TURUN 2.0 cm!
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -1.8,
    z_bbu: -0.1,
    status: 'hijau',
  },

  // 2. BERAT_BERUBAH_JANGGAL (Arkan Fauzan: 8.0 kg -> 10.8 kg dalam 30 hari = lonjakan 35%)
  {
    id: 'p-q2-prev',
    anak_id: 'c-q2',
    desa_id: 1,
    posyandu_id: 1,
    tgl_ukur: '2026-09-12',
    berat_kg: 8.0,
    tinggi_cm: 75.0,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -0.2,
    z_bbu: -0.8,
    status: 'hijau',
  },
  {
    id: 'p-q2',
    anak_id: 'c-q2',
    desa_id: 1,
    posyandu_id: 1,
    tgl_ukur: '2026-10-12',
    berat_kg: 10.8, // LONJAKAN 35%!
    tinggi_cm: 76.2,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -0.1,
    z_bbu: 1.2,
    status: 'hijau',
  },

  // 3. CARA_UKUR_TIDAK_SESUAI (Cantika Kirana: usia 30 bulan diukur berbaring)
  {
    id: 'p-q3',
    anak_id: 'c-q3',
    desa_id: 1,
    posyandu_id: 2,
    tgl_ukur: '2026-10-14',
    berat_kg: 12.5,
    tinggi_cm: 88.0,
    cara_ukur: 'berbaring', // USIA 30 BLN DIUKUR BERBARING!
    berat_manual: true,
    z_tbu: -1.2,
    z_bbu: -0.3,
    status: 'hijau',
  },

  // 4. DOBEL_HARI_SAMA (Dimas Anggara: 2 pengukuran pada hari yang sama 2026-10-16)
  {
    id: 'p-q4-a',
    anak_id: 'c-q4',
    desa_id: 1,
    posyandu_id: 2,
    tgl_ukur: '2026-10-16',
    berat_kg: 9.5,
    tinggi_cm: 76.0,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -0.4,
    z_bbu: -0.5,
    status: 'hijau',
  },
  {
    id: 'p-q4-b',
    anak_id: 'c-q4',
    desa_id: 1,
    posyandu_id: 2,
    tgl_ukur: '2026-10-16', // TANGGAL SAMA!
    berat_kg: 9.6,
    tinggi_cm: 76.5,
    cara_ukur: 'berbaring',
    berat_manual: true,
    z_tbu: -0.2,
    z_bbu: -0.4,
    status: 'hijau',
  },
];
