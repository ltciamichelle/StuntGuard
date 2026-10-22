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

export class StuntGuardDexieDB extends Dexie {
  anak_cache!: Table<Anak, string>;
  profile_cache!: Table<CachedProfile, string>;
  tindak_lanjut_cache!: Table<CachedTindakLanjut, number>;
  pengukuran_cache!: Table<CachedPengukuran, string>;
  outbox!: Table<OutboxItem, string>;

  constructor() {
    super('StuntGuardDB');
    this.version(1).stores({
      anak_cache: 'id, posyandu_id, desa_id, nik, nama',
      profile_cache: 'id, user_id, posyandu_id, desa_id',
      tindak_lanjut_cache: 'id, pengukuran_id, anak_id, posyandu_id, selesai, tgl_kunjungan_ulang',
      pengukuran_cache: 'id, anak_id, posyandu_id, tgl_ukur',
      outbox: 'id, table, status, created_at',
    });
  }
}

export const db = new StuntGuardDexieDB();

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
