import Dexie, { type Table } from 'dexie';
import { Anak, Pengukuran, TindakLanjut, Consent, UserRole } from '@/types/database';

export interface CachedProfile {
  id: string; // user id or dev session id
  user_id: string;
  desa_id: number | null;
  posyandu_id: number | null;
  role: UserRole;
  nama: string;
  posyandu_nama: string;
  updated_at: string;
}

export type OutboxTable = 'anak' | 'consent' | 'pengukuran' | 'tindak_lanjut';
export type OutboxStatus = 'menunggu' | 'mengirim' | 'gagal';

export interface OutboxItem {
  id: string; // crypto.randomUUID()
  table: OutboxTable;
  payload: any;
  status: OutboxStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

export interface CachedPengukuran extends Pengukuran {
  is_offline?: boolean;
}

export interface CachedTindakLanjut extends TindakLanjut {
  anak?: Anak;
  pengukuran?: Pengukuran;
  is_offline?: boolean;
}

export interface CachedWhoReference {
  id: string; // `${indikator}_${jenis_kelamin}_${umur_bulan}`
  indikator: 'tbu' | 'bbu';
  jenis_kelamin: 'L' | 'P';
  umur_bulan: number;
  l: number;
  m: number;
  s: number;
}

export interface CachedPengasuhAnak {
  anak_id: string;
  user_id: string;
  hubungan: import('@/types/database').HubunganPengasuh;
}

export class StuntGuardDexieDB extends Dexie {
  anak_cache!: Table<Anak, string>;
  profile_cache!: Table<CachedProfile, string>;
  tindak_lanjut_cache!: Table<CachedTindakLanjut, number>;
  pengukuran_cache!: Table<CachedPengukuran, string>;
  outbox!: Table<OutboxItem, string>;
  who_reference_cache!: Table<CachedWhoReference, string>;
  pengasuh_anak_cache!: Table<CachedPengasuhAnak, [string, string]>;

  constructor() {
    super('StuntGuardDB');
    this.version(2).stores({
      anak_cache: 'id, posyandu_id, desa_id, nik, nama',
      profile_cache: 'id, user_id, posyandu_id, desa_id',
      tindak_lanjut_cache: 'id, pengukuran_id, anak_id, posyandu_id, selesai, tgl_kunjungan_ulang',
      pengukuran_cache: 'id, anak_id, posyandu_id, tgl_ukur',
      outbox: 'id, table, status, created_at',
      who_reference_cache: 'id, indikator, jenis_kelamin, umur_bulan',
    });
    this.version(3).stores({
      pengasuh_anak_cache: '[anak_id+user_id], anak_id, user_id, hubungan',
    });
  }
}

export const db = new StuntGuardDexieDB();

/**
 * Initialize WHO reference cache in IndexedDB if empty
 */
export async function initWhoReferenceCache(): Promise<void> {
  try {
    const count = await db.who_reference_cache.count();
    if (count < 244) {
      const { WHO_REFERENCE_DATA } = await import('./whoReferenceData');
      await db.who_reference_cache.bulkPut(WHO_REFERENCE_DATA);
    }
  } catch (err) {
    console.warn('Gagal menginisialisasi who_reference_cache:', err);
  }
}

/**
 * Clear all local cached data (used when logging out after warning)
 */
export async function clearLocalData(): Promise<void> {
  await Promise.all([
    db.anak_cache.clear(),
    db.profile_cache.clear(),
    db.tindak_lanjut_cache.clear(),
    db.pengukuran_cache.clear(),
    db.outbox.clear(),
  ]);
  // Also clear legacy localStorage keys to be 100% clean
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sg_local_anak');
    localStorage.removeItem('sg_local_pengukuran');
    localStorage.removeItem('sg_local_tindak_lanjut');
    localStorage.removeItem('sg_tindak_lanjut');
    localStorage.removeItem('sg_stunting_notifications');
  }
}
