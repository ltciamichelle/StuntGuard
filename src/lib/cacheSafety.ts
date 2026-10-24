import { db } from './db';

export const CACHED_USER_ID_KEY = 'sg_cached_user_id';

export function getCachedUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CACHED_USER_ID_KEY);
}

export function setCachedUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHED_USER_ID_KEY, userId);
}

/**
 * Delete all local data:
 * - Dexie tables: anak_cache, profile_cache, tindak_lanjut_cache, outbox, pengukuran_cache, pengasuh_anak_cache, mpasi_log_cache
 * - Service worker caches holding user data
 * - LocalStorage keys holding user data
 */
export async function clearAllLocalUserData(): Promise<void> {
  // 1. Clear IndexedDB caches
  try {
    await Promise.all([
      db.anak_cache.clear(),
      db.profile_cache.clear(),
      db.tindak_lanjut_cache.clear(),
      db.outbox.clear(),
      db.pengukuran_cache.clear(),
      db.pengasuh_anak_cache.clear(),
      db.mpasi_log_cache.clear(),
    ]);
  } catch (err) {
    console.warn('[CacheSafety] Error clearing IndexedDB tables:', err);
  }

  // 2. Clear service worker caches that hold user data
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        if (
          name.includes('user') ||
          name.includes('data') ||
          name.includes('api') ||
          name.includes('stuntguard') ||
          name.includes('runtime')
        ) {
          await window.caches.delete(name);
        }
      }
    } catch (err) {
      console.warn('[CacheSafety] Error clearing service worker caches:', err);
    }
  }

  // 3. Clear localStorage user-specific data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sg_local_anak');
    localStorage.removeItem('sg_local_pengukuran');
    localStorage.removeItem('sg_local_tindak_lanjut');
    localStorage.removeItem('sg_tindak_lanjut');
    localStorage.removeItem('sg_stunting_notifications');
    localStorage.removeItem('sg_selected_child_id');
    localStorage.removeItem('sg_last_sync_time');
    localStorage.removeItem('sg_mpasi_logs_store');
    localStorage.removeItem('sg_keluarga_onboarding_done');
    localStorage.removeItem('sg_pengasuh_links');
    localStorage.removeItem('sg_tautan_tokens');
  }
}

/**
 * On app start and after every login, if the user id is different from the cached one,
 * delete all local data first.
 */
export async function verifyAndEnforceCacheSafety(currentUserId: string): Promise<boolean> {
  if (!currentUserId) return false;

  const previousUserId = getCachedUserId();

  if (previousUserId !== currentUserId) {
    console.warn(
      `[CacheSafety] User switched from "${previousUserId}" to "${currentUserId}". Deleting all local data immediately.`
    );
    await clearAllLocalUserData();
  }

  setCachedUserId(currentUserId);
  return true;
}

/**
 * Check if outbox has unsent items
 */
export async function getUnsentOutboxCount(): Promise<number> {
  try {
    return await db.outbox.where('status').anyOf('menunggu', 'mengirim').count();
  } catch {
    return 0;
  }
}
