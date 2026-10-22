import { db, initWhoReferenceCache, CachedWhoReference } from './db';
import { WHO_REFERENCE_DATA, WhoReference } from './whoReferenceData';
import { JenisKelamin } from '@/types/database';

/**
 * Calculates the reference value X for a given Z-score using the WHO LMS method:
 * if L = 0 then X = M * exp(S * z)
 * otherwise X = M * (1 + L * S * z)^(1/L)
 * 
 * NOTE: This is strictly for DRAWING the reference curves.
 * The child's own Z-score and status must NEVER be calculated on the frontend.
 */
export function calculateReferenceValue(l: number, m: number, s: number, z: number): number {
  if (l === 0) {
    return m * Math.exp(s * z);
  }
  const base = 1 + l * s * z;
  if (base <= 0) return 0;
  return m * Math.pow(base, 1 / l);
}

/**
 * Calculates exact age in completed months from tgl_lahir to tgl_ukur:
 * (tgl_ukur - tgl_lahir) in days / 30.4375
 */
export function calculateAgeInMonthsExact(tglLahir: string, tglUkur: string): number {
  const birth = new Date(tglLahir).getTime();
  const measure = new Date(tglUkur).getTime();
  const diffDays = Math.max(0, (measure - birth) / (1000 * 60 * 60 * 24));
  return Math.round((diffDays / 30.4375) * 10) / 10;
}

/**
 * Load WHO Reference records for a specific indicator and child's sex.
 * Reads from Dexie IndexedDB cache for offline support, falling back to static WHO dataset.
 */
export async function loadWhoReference(
  indikator: 'tbu' | 'bbu',
  jenisKelamin: JenisKelamin
): Promise<WhoReference[]> {
  try {
    await initWhoReferenceCache();
    const rows = await db.who_reference_cache
      .where('indikator')
      .equals(indikator)
      .filter((r) => r.jenis_kelamin === jenisKelamin)
      .sortBy('umur_bulan');

    if (rows && rows.length >= 61) {
      return rows;
    }
  } catch (err) {
    console.warn('Error reading who_reference_cache, using static WHO data:', err);
  }

  // Fallback to static 244-row WHO reference data
  return WHO_REFERENCE_DATA.filter(
    (r) => r.indikator === indikator && r.jenis_kelamin === jenisKelamin
  ).sort((a, b) => a.umur_bulan - b.umur_bulan);
}

/**
 * Descriptive sentence under TB/U chart chosen from the stored z-score ranges
 * in simple, plain Indonesian (no medical jargon).
 */
export function getTbuChartSentence(zTbu: number | null | undefined): string {
  if (zTbu === null || zTbu === undefined) {
    return 'Hasil analisis tinggi badan akan muncul setelah data tersinkronisasi.';
  }
  if (zTbu < -3) {
    return 'Tinggi anak jauh di bawah rata-rata usianya, butuh rujukan dan pendampingan gizi segera.';
  }
  if (zTbu < -2) {
    return 'Tinggi anak di bawah rata-rata untuk usianya (indikasi stunting).';
  }
  if (zTbu < -1) {
    return 'Tinggi anak sedikit di bawah rata-rata untuk usianya.';
  }
  if (zTbu <= 2) {
    return 'Tinggi anak normal dan tumbuh optimal sesuai usianya.';
  }
  return 'Tinggi anak di atas rata-rata untuk usianya.';
}

/**
 * Descriptive sentence under BB/U chart chosen from the stored z-score ranges
 * in simple, plain Indonesian (no medical jargon).
 */
export function getBbuChartSentence(zBbu: number | null | undefined): string {
  if (zBbu === null || zBbu === undefined) {
    return 'Hasil analisis berat badan akan muncul setelah data tersinkronisasi.';
  }
  if (zBbu < -3) {
    return 'Berat badan anak sangat kurang dibandingkan rata-rata usianya.';
  }
  if (zBbu < -2) {
    return 'Berat badan anak kurang dibandingkan rata-rata untuk usianya.';
  }
  if (zBbu < -1) {
    return 'Berat badan anak sedikit di bawah rata-rata untuk usianya.';
  }
  if (zBbu <= 1) {
    return 'Berat badan anak normal dan berada pada jalur pertumbuhan sehat.';
  }
  return 'Berat badan anak di atas rata-rata untuk usianya.';
}
