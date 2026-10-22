import { JenisKelamin, StatusGizi } from '@/types/database';

interface Milestone {
  month: number;
  tbMedian: number;
  tbSd: number;
  bbMedian: number;
  bbSd: number;
}

const BOYS_MILESTONES: Milestone[] = [
  { month: 0, tbMedian: 49.9, tbSd: 1.9, bbMedian: 3.3, bbSd: 0.45 },
  { month: 6, tbMedian: 67.6, tbSd: 2.1, bbMedian: 7.9, bbSd: 0.85 },
  { month: 12, tbMedian: 75.7, tbSd: 2.4, bbMedian: 9.6, bbSd: 1.0 },
  { month: 24, tbMedian: 87.8, tbSd: 3.1, bbMedian: 12.2, bbSd: 1.3 },
  { month: 36, tbMedian: 96.1, tbSd: 3.6, bbMedian: 14.3, bbSd: 1.6 },
  { month: 48, tbMedian: 103.3, tbSd: 4.1, bbMedian: 16.3, bbSd: 1.9 },
  { month: 60, tbMedian: 110.0, tbSd: 4.5, bbMedian: 18.3, bbSd: 2.2 },
];

const GIRLS_MILESTONES: Milestone[] = [
  { month: 0, tbMedian: 49.1, tbSd: 1.9, bbMedian: 3.2, bbSd: 0.4 },
  { month: 6, tbMedian: 65.7, tbSd: 2.1, bbMedian: 7.3, bbSd: 0.8 },
  { month: 12, tbMedian: 74.0, tbSd: 2.4, bbMedian: 8.9, bbSd: 1.0 },
  { month: 24, tbMedian: 86.4, tbSd: 3.2, bbMedian: 11.5, bbSd: 1.3 },
  { month: 36, tbMedian: 95.1, tbSd: 3.7, bbMedian: 13.9, bbSd: 1.6 },
  { month: 48, tbMedian: 102.7, tbSd: 4.2, bbMedian: 16.1, bbSd: 2.0 },
  { month: 60, tbMedian: 109.4, tbSd: 4.6, bbMedian: 18.2, bbSd: 2.3 },
];

function interpolate(age: number, milestones: Milestone[]) {
  const clampedAge = Math.max(0, Math.min(60, age));

  for (let i = 0; i < milestones.length - 1; i++) {
    const m1 = milestones[i];
    const m2 = milestones[i + 1];
    if (clampedAge >= m1.month && clampedAge <= m2.month) {
      const ratio = (clampedAge - m1.month) / (m2.month - m1.month);
      return {
        tbMedian: m1.tbMedian + ratio * (m2.tbMedian - m1.tbMedian),
        tbSd: m1.tbSd + ratio * (m2.tbSd - m1.tbSd),
        bbMedian: m1.bbMedian + ratio * (m2.bbMedian - m1.bbMedian),
        bbSd: m1.bbSd + ratio * (m2.bbSd - m1.bbSd),
      };
    }
  }

  const last = milestones[milestones.length - 1];
  return {
    tbMedian: last.tbMedian,
    tbSd: last.tbSd,
    bbMedian: last.bbMedian,
    bbSd: last.bbSd,
  };
}

/**
 * Batas wajar (sanity check) untuk pengukuran balita:
 * Berat: 1 - 40 kg
 * Tinggi: 35 - 130 cm
 */
export const SANITY_LIMITS = {
  minWeight: 1,
  maxWeight: 40,
  minHeight: 35,
  maxHeight: 130,
};

/**
 * Batas absolut database / sistem
 */
export const DATABASE_LIMITS = {
  minWeight: 0.5,
  maxWeight: 60,
  minHeight: 20,
  maxHeight: 160,
};

export function isOutsideSanityLimits(weight: number, height: number): boolean {
  return (
    weight < SANITY_LIMITS.minWeight ||
    weight > SANITY_LIMITS.maxWeight ||
    height < SANITY_LIMITS.minHeight ||
    height > SANITY_LIMITS.maxHeight
  );
}

export function isWithinDatabaseLimits(weight: number, height: number): boolean {
  return (
    !isNaN(weight) &&
    !isNaN(height) &&
    weight >= DATABASE_LIMITS.minWeight &&
    weight <= DATABASE_LIMITS.maxWeight &&
    height >= DATABASE_LIMITS.minHeight &&
    height <= DATABASE_LIMITS.maxHeight
  );
}

/**
 * Menghitung nilai Z-Score dan Status Gizi menurut standar WHO / Kemenkes RI
 */
export function calculateZScores(
  ageInMonths: number,
  gender: JenisKelamin,
  heightCm: number,
  weightKg: number
): {
  z_tbu: number;
  z_bbu: number;
  status: StatusGizi;
} {
  const milestones = gender === 'L' ? BOYS_MILESTONES : GIRLS_MILESTONES;
  const ref = interpolate(ageInMonths, milestones);

  const z_tbu = parseFloat(((heightCm - ref.tbMedian) / ref.tbSd).toFixed(2));
  const z_bbu = parseFloat(((weightKg - ref.bbMedian) / ref.bbSd).toFixed(2));

  let status: StatusGizi = 'hijau';

  // Penentuan status gizi:
  // Merah: Indikasi stunting (TB/U < -2 SD) atau gizi buruk berat (BB/U < -3 SD)
  // Kuning: Risiko gagal tumbuh / berat stabil rendah (BB/U < -2 SD)
  // Hijau: Pertumbuhan sesuai standar
  if (z_tbu < -2 || z_bbu < -3) {
    status = 'merah';
  } else if (z_bbu < -2) {
    status = 'kuning';
  } else {
    status = 'hijau';
  }

  return {
    z_tbu,
    z_bbu,
    status,
  };
}
