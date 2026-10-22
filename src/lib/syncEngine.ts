import { createClient } from '@/lib/supabase/client';
import { db, OutboxItem, OutboxTable, CachedPengukuran, CachedTindakLanjut } from './db';
import { Anak } from '@/types/database';

export interface SyncEngineState {
  state: 'tersinkron' | 'menunggu' | 'mengirim' | 'gagal';
  pendingCount: number;
  failedCount: number;
  lastSyncTime: string | null;
  failedItems: OutboxItem[];
  totalLocalCount: number;
}

type SyncListener = (state: SyncEngineState) => void;

class SyncEngine {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for browser coming back online
      window.addEventListener('online', () => {
        this.triggerSync();
      });

      window.addEventListener('offline', () => {
        this.notifyState();
      });

      // Periodic check every 30 seconds while online
      this.intervalTimer = setInterval(() => {
        if (navigator.onLine) {
          this.triggerSync();
        }
      }, 30000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.getState().then((st) => listener(st));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyState(): Promise<void> {
    const state = await this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public async getState(): Promise<SyncEngineState> {
    if (typeof window === 'undefined') {
      return {
        state: 'tersinkron',
        pendingCount: 0,
        failedCount: 0,
        lastSyncTime: null,
        failedItems: [],
        totalLocalCount: 0,
      };
    }

    const allOutbox = await db.outbox.toArray();
    const pendingItems = allOutbox.filter((item) => item.status === 'menunggu');
    const sendingItems = allOutbox.filter((item) => item.status === 'mengirim');
    const failedItems = allOutbox.filter((item) => item.status === 'gagal');

    const anakCount = await db.anak_cache.count();
    const tlCount = await db.tindak_lanjut_cache.count();
    const pengCount = await db.pengukuran_cache.count();
    const totalLocalCount = anakCount + tlCount + pengCount;

    const lastSyncTime = localStorage.getItem('sg_last_sync_time');

    let state: SyncEngineState['state'] = 'tersinkron';

    if (failedItems.length > 0) {
      state = 'gagal';
    } else if (sendingItems.length > 0) {
      state = 'mengirim';
    } else if (pendingItems.length > 0 || !navigator.onLine) {
      state = 'menunggu';
    } else {
      state = 'tersinkron';
    }

    return {
      state,
      pendingCount: pendingItems.length + sendingItems.length,
      failedCount: failedItems.length,
      lastSyncTime,
      failedItems,
      totalLocalCount,
    };
  }

  /**
   * Enqueue a new operation to the outbox
   */
  public async enqueue(table: OutboxTable, payload: any): Promise<OutboxItem> {
    const item: OutboxItem = {
      id: crypto.randomUUID(),
      table,
      payload,
      status: 'menunggu',
      attempts: 0,
      last_error: null,
      created_at: new Date().toISOString(),
    };

    await db.outbox.put(item);
    this.notifyState();

    // Trigger sync immediately if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.triggerSync();
    }

    return item;
  }

  /**
   * Retry failed items
   */
  public async retryItem(itemId: string): Promise<void> {
    const item = await db.outbox.get(itemId);
    if (item) {
      item.status = 'menunggu';
      item.last_error = null;
      await db.outbox.put(item);
      this.notifyState();
      this.triggerSync();
    }
  }

  public async retryAllFailed(): Promise<void> {
    const failed = await db.outbox.where('status').equals('gagal').toArray();
    for (const item of failed) {
      item.status = 'menunggu';
      item.last_error = null;
      await db.outbox.put(item);
    }
    this.notifyState();
    this.triggerSync();
  }

  /**
   * Main sync engine processor
   */
  public async triggerSync(): Promise<void> {
    if (this.isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notifyState();
      return;
    }

    this.isSyncing = true;
    this.notifyState();

    try {
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      const supabase = createClient();

      // Read items waiting to be sent
      const pendingItems = await db.outbox
        .where('status')
        .anyOf('menunggu', 'mengirim')
        .toArray();

      // Sort by dependency:
      // 1. anak
      // 2. consent
      // 3. pengukuran
      // 4. tindak_lanjut
      // Within each table, order by created_at ascending
      const tablePriority: Record<OutboxTable, number> = {
        anak: 1,
        consent: 2,
        pengukuran: 3,
        tindak_lanjut: 4,
      };

      pendingItems.sort((a, b) => {
        if (tablePriority[a.table] !== tablePriority[b.table]) {
          return tablePriority[a.table] - tablePriority[b.table];
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      for (const item of pendingItems) {
        // Double check network
        if (!navigator.onLine) {
          item.status = 'menunggu';
          await db.outbox.put(item);
          break;
        }

        // Mark in-flight
        item.status = 'mengirim';
        item.attempts += 1;
        await db.outbox.put(item);
        this.notifyState();

        try {
          if (!isRealSupabase) {
            // Mock / Local Demo sync success simulation
            await new Promise((resolve) => setTimeout(resolve, 300));
            await db.outbox.delete(item.id);
            localStorage.setItem('sg_last_sync_time', new Date().toISOString());
            continue;
          }

          // Real Supabase Synchronization
          if (item.table === 'anak') {
            const childPayload: Anak = item.payload;

            // Check if NIK already exists on server
            if (childPayload.nik) {
              const { data: existingChild } = await supabase
                .from('anak')
                .select('id, nama, nik')
                .eq('nik', childPayload.nik)
                .neq('id', childPayload.id)
                .maybeSingle();

              if (existingChild) {
                // Rule 7: Duplicate NIK -> mark gagal with "NIK sudah terdaftar"
                item.status = 'gagal';
                item.last_error = 'NIK sudah terdaftar';
                await db.outbox.put(item);
                continue; // Do not block other items!
              }
            }

            const { error: anakError } = await supabase
              .from('anak')
              .upsert(childPayload, { onConflict: 'id', ignoreDuplicates: true });

            if (anakError) {
              throw anakError;
            }

            // Update local anak cache
            await db.anak_cache.put(childPayload);
            await db.outbox.delete(item.id);
          } else if (item.table === 'consent') {
            const { error: consentError } = await supabase
              .from('consent')
              .upsert(item.payload, { onConflict: 'id', ignoreDuplicates: true });

            if (consentError) {
              throw consentError;
            }
            await db.outbox.delete(item.id);
          } else if (item.table === 'pengukuran') {
            // Rule: only send raw measurement fields, database trigger calculates z_tbu, z_bbu, status
            const dbPayload = {
              id: item.payload.id,
              anak_id: item.payload.anak_id,
              desa_id: item.payload.desa_id,
              posyandu_id: item.payload.posyandu_id,
              tgl_ukur: item.payload.tgl_ukur,
              berat_kg: item.payload.berat_kg,
              tinggi_cm: item.payload.tinggi_cm,
              cara_ukur: item.payload.cara_ukur,
              berat_manual: item.payload.berat_manual ?? true,
            };

            const { error: pengError } = await supabase
              .from('pengukuran')
              .upsert(dbPayload, { onConflict: 'id', ignoreDuplicates: true });

            if (pengError) {
              throw pengError;
            }

            // Read the saved row with DB-trigger-computed z_tbu, z_bbu, status
            const { data: savedRow, error: fetchErr } = await supabase
              .from('pengukuran')
              .select('*')
              .eq('id', item.payload.id)
              .single();

            if (!fetchErr && savedRow) {
              // Update local cache
              const cachedPeng: CachedPengukuran = {
                ...savedRow,
                is_offline: false,
              };
              await db.pengukuran_cache.put(cachedPeng);

              // Check if status requires an in-app alert for the kader
              if (savedRow.status === 'merah' || savedRow.status === 'kuning') {
                const child = await db.anak_cache.get(savedRow.anak_id);
                const notification = {
                  id: savedRow.id,
                  childName: child?.nama || 'Balita',
                  status: savedRow.status,
                  date: savedRow.tgl_ukur,
                  read: false,
                };
                const existingNotifs = localStorage.getItem('sg_stunting_notifications');
                const list = existingNotifs ? JSON.parse(existingNotifs) : [];
                list.unshift(notification);
                localStorage.setItem('sg_stunting_notifications', JSON.stringify(list));
              }
            }

            await db.outbox.delete(item.id);
          } else if (item.table === 'tindak_lanjut') {
            const tlPayload = item.payload;
            if (tlPayload.id && typeof tlPayload.id === 'number') {
              const { error: tlError } = await supabase
                .from('tindak_lanjut')
                .update({
                  status_rujukan: tlPayload.status_rujukan,
                  catatan: tlPayload.catatan,
                  selesai: tlPayload.selesai,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', tlPayload.id);

              if (tlError) throw tlError;
            } else {
              const { error: tlError } = await supabase
                .from('tindak_lanjut')
                .upsert(tlPayload, { onConflict: 'id', ignoreDuplicates: true });

              if (tlError) throw tlError;
            }

            await db.outbox.delete(item.id);
          }

          localStorage.setItem('sg_last_sync_time', new Date().toISOString());
        } catch (itemErr: any) {
          console.error('[SyncEngine] Error syncing item:', item.id, itemErr);
          const isNetworkError =
            !navigator.onLine ||
            itemErr?.message?.includes('Failed to fetch') ||
            itemErr?.message?.includes('NetworkError') ||
            itemErr?.name === 'TypeError';

          if (isNetworkError) {
            // Transient network error -> keep status 'menunggu' with backoff
            item.status = 'menunggu';
            item.last_error = 'Koneksi terputus saat pengiriman';
            await db.outbox.put(item);
            break; // Stop loop, wait for network reconnection
          } else {
            // Permanent error (RLS, validation, HTTP 4xx)
            item.status = 'gagal';
            item.last_error = itemErr?.message || 'Gagal menyimpan ke server';
            await db.outbox.put(item);
            // Do not break! A failed item must never block other items.
          }
        }
      }

      // Refresh server caches when online
      if (isRealSupabase && navigator.onLine) {
        await this.refreshServerCaches();
      }
    } finally {
      this.isSyncing = false;
      this.notifyState();
    }
  }

  /**
   * Refreshes local Dexie caches from Supabase
   */
  public async refreshServerCaches(): Promise<void> {
    try {
      const isRealSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (!isRealSupabase || !navigator.onLine) return;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Refresh Profile Cache
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        let posyanduNama = '';
        if (profile.posyandu_id) {
          const { data: pos } = await supabase
            .from('posyandu')
            .select('nama')
            .eq('id', profile.posyandu_id)
            .single();
          if (pos) posyanduNama = pos.nama;
        }

        await db.profile_cache.put({
          id: user.id,
          user_id: user.id,
          desa_id: profile.desa_id,
          posyandu_id: profile.posyandu_id,
          role: profile.role,
          nama: profile.nama,
          posyandu_nama: posyanduNama,
          updated_at: new Date().toISOString(),
        });
      }

      // 2. Refresh Anak Cache (RLS limits to desa/posyandu)
      let anakQuery = supabase.from('anak').select('*');
      if (profile?.posyandu_id) {
        anakQuery = anakQuery.eq('posyandu_id', profile.posyandu_id);
      }
      const { data: anakList } = await anakQuery;
      if (anakList && anakList.length > 0) {
        await db.anak_cache.bulkPut(anakList);
      }

      // 3. Refresh Tindak Lanjut Cache
      const { data: tlList } = await supabase
        .from('tindak_lanjut')
        .select('*, anak:anak_id(*), pengukuran:pengukuran_id(*)')
        .eq('selesai', false);

      if (tlList && tlList.length > 0) {
        await db.tindak_lanjut_cache.bulkPut(tlList as CachedTindakLanjut[]);
      }
    } catch (err) {
      console.warn('[SyncEngine] Cache refresh error:', err);
    }
  }
}

export const syncEngine = new SyncEngine();
