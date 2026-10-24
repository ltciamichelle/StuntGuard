// perlu divalidasi tenaga kesehatan
// Kalimat status tumbuh kembang untuk sisi pengasuh: ramah, tanpa menyalahkan, dan tanpa label stunting

import { StatusGizi } from '@/types/database';

export interface CaregiverStatusDetail {
  status: StatusGizi | 'none';
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  sentence: string;
}

export const CAREGIVER_STATUS_CONFIG: Record<StatusGizi | 'none', CaregiverStatusDetail> = {
  hijau: {
    status: 'hijau',
    label: 'Sesuai Jalur',
    badgeBg: 'bg-emerald-100',
    badgeBorder: 'border-emerald-300',
    badgeText: 'text-emerald-900',
    cardBg: 'bg-emerald-50/70',
    cardBorder: 'border-emerald-200',
    // perlu divalidasi tenaga kesehatan
    sentence: 'Tumbuh sesuai jalur. Terus pertahankan kebiasaan baik ya!',
  },
  kuning: {
    status: 'kuning',
    label: 'Perlu Perhatian',
    badgeBg: 'bg-amber-100',
    badgeBorder: 'border-amber-300',
    badgeText: 'text-amber-900',
    cardBg: 'bg-amber-50/70',
    cardBorder: 'border-amber-200',
    // perlu divalidasi tenaga kesehatan
    sentence:
      'Yuk, perlu perhatian lebih. Coba tambah menu protein hewani seperti telur atau ikan. Jika anak alergi, tanyakan ke petugas.',
  },
  merah: {
    status: 'merah',
    label: 'Perlu Pemeriksaan',
    badgeBg: 'bg-rose-100',
    badgeBorder: 'border-rose-300',
    badgeText: 'text-rose-900',
    cardBg: 'bg-rose-50/70',
    cardBorder: 'border-rose-200',
    // perlu divalidasi tenaga kesehatan
    sentence:
      'Sebaiknya anak diperiksa di Puskesmas dalam waktu dekat. Petugas akan membantu langkah berikutnya.',
  },
  none: {
    status: 'none',
    label: 'Belum Diukur',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-300',
    badgeText: 'text-slate-800',
    cardBg: 'bg-slate-50',
    cardBorder: 'border-slate-200',
    // perlu divalidasi tenaga kesehatan
    sentence: 'Belum ada hasil ukur terbaru.',
  },
};

/**
 * Returns the kind caregiver sentence for a given nutrition status
 */
export function getCaregiverStatusSentence(status?: StatusGizi | string | null): string {
  if (!status) return CAREGIVER_STATUS_CONFIG.none.sentence;
  const key = status.toLowerCase() as StatusGizi;
  if (key in CAREGIVER_STATUS_CONFIG) {
    return CAREGIVER_STATUS_CONFIG[key].sentence;
  }
  return CAREGIVER_STATUS_CONFIG.none.sentence;
}

/**
 * Returns full caregiver status detail (badge colors, sentence, label)
 */
export function getCaregiverStatusDetail(status?: StatusGizi | string | null): CaregiverStatusDetail {
  if (!status) return CAREGIVER_STATUS_CONFIG.none;
  const key = status.toLowerCase() as StatusGizi;
  if (key in CAREGIVER_STATUS_CONFIG) {
    return CAREGIVER_STATUS_CONFIG[key];
  }
  return CAREGIVER_STATUS_CONFIG.none;
}

export const VISUAL_GUIDE_DISCLAIMER =
  'Pita warna hanya panduan visual. Penilaian resmi dilakukan petugas.';
