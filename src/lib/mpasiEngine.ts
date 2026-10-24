import { MpasiMenu, MpasiLog, RingkasanPengasuh, StatusGizi } from '@/types/database';
import { db } from './db';
import { syncEngine } from './syncEngine';
import { TEST_QUALITY_MEASUREMENTS } from './kualitas-config';

/**
 * Standard Indonesian MPASI menus categorized by WHO & Kemenkes ILP guidelines
 */
export const DEFAULT_MPASI_MENUS: MpasiMenu[] = [
  // 1. Makanan Pokok (Karbohidrat)
  {
    id: 'mp-1',
    nama: 'Bubur Beras / Nasi Tim',
    kelompok: 'Makanan Pokok',
    ikon: 'Utensils',
    usia_min_bulan: 6,
  },
  {
    id: 'mp-2',
    nama: 'Kentang Halus / Puree',
    kelompok: 'Makanan Pokok',
    ikon: 'CircleDot',
    usia_min_bulan: 6,
  },
  {
    id: 'mp-3',
    nama: 'Ubi Manis Kukus',
    kelompok: 'Makanan Pokok',
    ikon: 'Sparkles',
    usia_min_bulan: 6,
  },
  {
    id: 'mp-4',
    nama: 'Oatmeal / Bubur Gandum',
    kelompok: 'Makanan Pokok',
    ikon: 'Wheat',
    usia_min_bulan: 9,
  },

  // 2. Lauk Hewani (Protein Hewani - Kunci Cegah Stunting)
  {
    id: 'lh-1',
    nama: 'Telur Ayam (Rebus / Orak-arik)',
    kelompok: 'Lauk Hewani',
    ikon: 'Egg',
    usia_min_bulan: 6,
  },
  {
    id: 'lh-2',
    nama: 'Daging Ayam Cincang Halus',
    kelompok: 'Lauk Hewani',
    ikon: 'Drumstick',
    usia_min_bulan: 6,
  },
  {
    id: 'lh-3',
    nama: 'Ikan Kembung / Lele / Salmon',
    kelompok: 'Lauk Hewani',
    ikon: 'Fish',
    usia_min_bulan: 6,
  },
  {
    id: 'lh-4',
    nama: 'Hati Ayam Masak Matang',
    kelompok: 'Lauk Hewani',
    ikon: 'Heart',
    usia_min_bulan: 6,
  },
  {
    id: 'lh-5',
    nama: 'Daging Sapi Cincang',
    kelompok: 'Lauk Hewani',
    ikon: 'Beef',
    usia_min_bulan: 8,
  },

  // 3. Lauk Nabati (Protein Nabati)
  {
    id: 'ln-1',
    nama: 'Tahu Halus / Kukus',
    kelompok: 'Lauk Nabati',
    ikon: 'Square',
    usia_min_bulan: 6,
  },
  {
    id: 'ln-2',
    nama: 'Tempe Kukus Halus',
    kelompok: 'Lauk Nabati',
    ikon: 'Layers',
    usia_min_bulan: 6,
  },
  {
    id: 'ln-3',
    nama: 'Kacang Merah Halus',
    kelompok: 'Lauk Nabati',
    ikon: 'CircleDot',
    usia_min_bulan: 9,
  },

  // 4. Sayur & Buah (Vitamin & Serat)
  {
    id: 'sb-1',
    nama: 'Wortel Kukus Halus',
    kelompok: 'Sayur & Buah',
    ikon: 'Carrot',
    usia_min_bulan: 6,
  },
  {
    id: 'sb-2',
    nama: 'Bayam / Sayur Hijau',
    kelompok: 'Sayur & Buah',
    ikon: 'Leaf',
    usia_min_bulan: 6,
  },
  {
    id: 'sb-3',
    nama: 'Labu Kuning Kukus',
    kelompok: 'Sayur & Buah',
    ikon: 'Sun',
    usia_min_bulan: 6,
  },
  {
    id: 'sb-4',
    nama: 'Pisang Ambon / Kerok',
    kelompok: 'Sayur & Buah',
    ikon: 'Smile',
    usia_min_bulan: 6,
  },
  {
    id: 'sb-5',
    nama: 'Pepaya Matang Halus',
    kelompok: 'Sayur & Buah',
    ikon: 'Apple',
    usia_min_bulan: 6,
  },
  {
    id: 'sb-6',
    nama: 'Alpukat Lumat',
    kelompok: 'Sayur & Buah',
    ikon: 'Sparkles',
    usia_min_bulan: 6,
  },

  // 5. Lemak Tambahan
  {
    id: 'lt-1',
    nama: 'Minyak Kelapa / Santan',
    kelompok: 'Lemak Tambahan',
    ikon: 'Droplets',
    usia_min_bulan: 6,
  },
  {
    id: 'lt-2',
    nama: 'Mentega / Margarin',
    kelompok: 'Lemak Tambahan',
    ikon: 'Box',
    usia_min_bulan: 6,
  },
];

const STORAGE_KEY_LOGS = 'sg_mpasi_logs';
const STORAGE_KEY_HABIT_STATS = 'sg_pengasuh_habit_stats';

// In-memory fallback for non-browser environments
let inMemoryLogs: MpasiLog[] = [];
let inMemoryHabitStats: Record<string, { total_poin: number; logged_dates: string[] }> = {};

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAllStoredLogs(): MpasiLog[] {
  if (typeof window === 'undefined') return inMemoryLogs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    return raw ? JSON.parse(raw) : inMemoryLogs;
  } catch {
    return inMemoryLogs;
  }
}

export function saveAllStoredLogs(logs: MpasiLog[]): void {
  inMemoryLogs = logs;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function getStoredHabitStats(): Record<string, { total_poin: number; logged_dates: string[] }> {
  if (typeof window === 'undefined') return inMemoryHabitStats;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HABIT_STATS);
    return raw ? JSON.parse(raw) : inMemoryHabitStats;
  } catch {
    return inMemoryHabitStats;
  }
}

export function saveStoredHabitStats(stats: Record<string, { total_poin: number; logged_dates: string[] }>): void {
  inMemoryHabitStats = stats;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_HABIT_STATS, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/**
 * Get MPASI menu items filtered by child age in months
 */
export async function getMpasiMenu(childAgeMonths: number, supabaseClient?: any): Promise<MpasiMenu[]> {
  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  let allMenus: MpasiMenu[] = DEFAULT_MPASI_MENUS;

  if (isRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('mpasi_menu')
        .select('*')
        .lte('usia_min_bulan', childAgeMonths);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      // fallback
    }
  }

  // Filter default menus by child age
  return allMenus.filter((m) => m.usia_min_bulan <= childAgeMonths);
}

/**
 * Read already logged items for today for this specific child and caregiver
 */
export async function getTodayMpasiLog(
  childId: string,
  userId: string,
  supabaseClient?: any
): Promise<MpasiLog[]> {
  const todayStr = getTodayString();

  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('mpasi_log')
        .select('*')
        .eq('anak_id', childId)
        .eq('user_id', userId)
        .eq('tgl', todayStr);

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch {
      // fallback
    }
  }

  // Fallback to local logs
  const all = getAllStoredLogs();
  return all.filter((l) => l.anak_id === childId && l.user_id === userId && l.tgl === todayStr);
}

/**
 * Insert one mpasi_log row per selected menu.
 * Uses crypto.randomUUID() for ids and upserts with ignoreDuplicates.
 * If offline, enqueues to outbox.
 */
export async function saveMpasiLog(
  childId: string,
  userId: string,
  menuIds: (string | number)[],
  supabaseClient?: any
): Promise<{ success: boolean; isOffline: boolean; addedPoints: number }> {
  const todayStr = getTodayString();
  const nowIso = new Date().toISOString();

  // Build rows
  const rows: MpasiLog[] = menuIds.map((menuId) => ({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}-${Math.random()}`,
    anak_id: childId,
    user_id: userId,
    menu_id: menuId,
    tgl: todayStr,
    created_at: nowIso,
  }));

  // Update local logs list
  const existing = getAllStoredLogs();
  // Remove existing logs for today from this user to allow full update
  const filtered = existing.filter(
    (l) => !(l.anak_id === childId && l.user_id === userId && l.tgl === todayStr)
  );
  const updatedLogs = [...filtered, ...rows];
  saveAllStoredLogs(updatedLogs);

  // Update in Dexie cache
  try {
    for (const r of rows) {
      await db.mpasi_log_cache.put(r);
    }
  } catch {
    // ignore
  }

  // Update habit points simulation (trigger simulation: 50 points on first log of the day)
  const habitKey = `${childId}_${userId}`;
  const habitStats = getStoredHabitStats();
  const currentStat = habitStats[habitKey] || { total_poin: 0, logged_dates: [] };

  let addedPoints = 0;
  if (!currentStat.logged_dates.includes(todayStr)) {
    currentStat.logged_dates.push(todayStr);
    currentStat.total_poin += 50; // 50 points per day
    addedPoints = 50;
    habitStats[habitKey] = currentStat;
    saveStoredHabitStats(habitStats);
  }

  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isRealSupabase && isOnline) {
    try {
      const { error } = await supabaseClient
        .from('mpasi_log')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

      if (!error) {
        return { success: true, isOffline: false, addedPoints };
      }
    } catch {
      // fallback to offline outbox
    }
  }

  // Offline or Supabase unavailable -> enqueue in outbox
  await syncEngine.enqueue('mpasi_log', rows);
  return { success: true, isOffline: !isOnline, addedPoints };
}

/**
 * Delete today's logged MPASI records for this child and user
 */
export async function cancelTodayMpasiLog(
  childId: string,
  userId: string,
  supabaseClient?: any
): Promise<{ success: boolean }> {
  const todayStr = getTodayString();

  // Remove from local storage
  const existing = getAllStoredLogs();
  const kept = existing.filter(
    (l) => !(l.anak_id === childId && l.user_id === userId && l.tgl === todayStr)
  );
  saveAllStoredLogs(kept);

  // Remove from habit stats dates for today
  const habitKey = `${childId}_${userId}`;
  const habitStats = getStoredHabitStats();
  if (habitStats[habitKey]) {
    habitStats[habitKey].logged_dates = habitStats[habitKey].logged_dates.filter((d) => d !== todayStr);
    saveStoredHabitStats(habitStats);
  }

  // Remove from Dexie cache
  try {
    const todayLogs = await db.mpasi_log_cache
      .where('tgl')
      .equals(todayStr)
      .and((item) => item.anak_id === childId && item.user_id === userId)
      .toArray();

    for (const item of todayLogs) {
      await db.mpasi_log_cache.delete(item.id);
    }
  } catch {
    // ignore
  }

  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase && (typeof navigator === 'undefined' || navigator.onLine)) {
    try {
      await supabaseClient
        .from('mpasi_log')
        .delete()
        .eq('anak_id', childId)
        .eq('user_id', userId)
        .eq('tgl', todayStr);
    } catch {
      // ignore
    }
  }

  return { success: true };
}

/**
 * Calculate consecutive streak in days backwards from today or yesterday
 */
export function calculateStreak(loggedDates: string[]): number {
  if (!loggedDates || loggedDates.length === 0) return 0;

  const uniqueSortedDates = Array.from(new Set(loggedDates)).sort().reverse();
  const today = getTodayString();

  // If latest logged date is neither today nor yesterday, streak is broken -> 0
  const latest = uniqueSortedDates[0];
  const dateDiffFromToday = getDateDifferenceInDays(today, latest);

  if (dateDiffFromToday > 1) {
    return 0; // Skipped a day -> resets to 0 without any penalty text
  }

  let streak = 0;
  let cursor = latest;

  for (let i = 0; i < uniqueSortedDates.length; i++) {
    const current = uniqueSortedDates[i];
    const diff = getDateDifferenceInDays(cursor, current);
    if (diff === 0) {
      streak += 1;
      cursor = getPreviousDate(current);
    } else if (diff === 1) {
      streak += 1;
      cursor = getPreviousDate(current);
    } else {
      break;
    }
  }

  return streak;
}

function getDateDifferenceInDays(d1Str: string, d2Str: string): number {
  const d1 = new Date(d1Str + 'T00:00:00');
  const d2 = new Date(d2Str + 'T00:00:00');
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 3600 * 24));
}

function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * RPC: ringkasan_pengasuh(p_anak)
 * Returns total_poin, streak_hari, sudah_catat_hari_ini, tgl_kunjungan_berikutnya, status_terakhir, tgl_ukur_terakhir
 */
export async function getRingkasanPengasuh(
  childId: string,
  userId: string,
  supabaseClient?: any
): Promise<RingkasanPengasuh> {
  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase) {
    try {
      const { data, error } = await supabaseClient.rpc('ringkasan_pengasuh', {
        p_anak: childId,
      });

      if (!error && data) {
        return {
          total_poin: Number(data.total_poin ?? 0),
          streak_hari: Number(data.streak_hari ?? 0),
          sudah_catat_hari_ini: Boolean(data.sudah_catat_hari_ini),
          tgl_kunjungan_berikutnya: data.tgl_kunjungan_berikutnya || null,
          status_terakhir: (data.status_terakhir as StatusGizi) || null,
          tgl_ukur_terakhir: data.tgl_ukur_terakhir || null,
        };
      }
    } catch {
      // fallback
    }
  }

  // Local/Dev Simulation:
  const todayStr = getTodayString();
  const habitKey = `${childId}_${userId}`;
  const habitStats = getStoredHabitStats();
  const currentStat = habitStats[habitKey] || { total_poin: 0, logged_dates: [] };

  const sudahCatatHariIni = currentStat.logged_dates.includes(todayStr);
  const streak = calculateStreak(currentStat.logged_dates);

  // Look up latest measurement status
  let latestStatus: StatusGizi | null = null;
  let latestTglUkur: string | null = null;

  try {
    const cachedPeng = await db.pengukuran_cache.where('anak_id').equals(childId).toArray();
    if (cachedPeng && cachedPeng.length > 0) {
      cachedPeng.sort((a, b) => new Date(a.tgl_ukur).getTime() - new Date(b.tgl_ukur).getTime());
      const latest = cachedPeng[cachedPeng.length - 1];
      latestStatus = latest.status || null;
      latestTglUkur = latest.tgl_ukur || null;
    }
  } catch {
    // ignore
  }

  if (!latestStatus) {
    const fallbackPeng = TEST_QUALITY_MEASUREMENTS.filter((m) => m.anak_id === childId);
    if (fallbackPeng.length > 0) {
      fallbackPeng.sort((a, b) => new Date(a.tgl_ukur).getTime() - new Date(b.tgl_ukur).getTime());
      const latest = fallbackPeng[fallbackPeng.length - 1];
      latestStatus = latest.status || null;
      latestTglUkur = latest.tgl_ukur || null;
    }
  }

  // Look up next visit date from tindak lanjut if any
  let tglKunjunganBerikutnya: string | null = null;
  try {
    const cachedTl = await db.tindak_lanjut_cache
      .where('anak_id')
      .equals(childId)
      .and((tl) => !tl.selesai && tl.tgl_kunjungan_ulang !== null)
      .toArray();

    if (cachedTl.length > 0) {
      tglKunjunganBerikutnya = cachedTl[0].tgl_kunjungan_ulang;
    }
  } catch {
    // ignore
  }

  return {
    total_poin: currentStat.total_poin,
    streak_hari: streak,
    sudah_catat_hari_ini: sudahCatatHariIni,
    tgl_kunjungan_berikutnya: tglKunjunganBerikutnya,
    status_terakhir: latestStatus,
    tgl_ukur_terakhir: latestTglUkur,
  };
}

/**
 * Helper to manually set habit points for testing or simulation
 */
export function setDevHabitStats(
  childId: string,
  userId: string,
  totalPoints: number,
  loggedDates: string[]
): void {
  const habitKey = `${childId}_${userId}`;
  const habitStats = getStoredHabitStats();
  habitStats[habitKey] = {
    total_poin: totalPoints,
    logged_dates: loggedDates,
  };
  saveStoredHabitStats(habitStats);
}
