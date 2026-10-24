import { Anak, HubunganPengasuh } from '@/types/database';
import { db } from './db';
import { TEST_QUALITY_CHILDREN } from './kualitas-config';

export interface TautanToken {
  code: string;
  anak_id: string;
  created_at: string;
  expires_at: number; // timestamp
  used: boolean;
}

export interface PengasuhAnakLink {
  anak_id: string;
  user_id: string;
  hubungan: HubunganPengasuh;
  linked_at: string;
}

const STORAGE_KEY_TOKENS = 'sg_tautan_tokens';
const STORAGE_KEY_LINKS = 'sg_pengasuh_links';

/**
 * Generate a friendly 8-character code (e.g. SG7K9P2W)
 */
function createRandom8CharCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid 0, O, 1, I to prevent confusion
  let result = 'SG';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

let inMemoryTokens: TautanToken[] = [];
let inMemoryLinks: PengasuhAnakLink[] = [];

/**
 * Reads all stored tokens from localStorage (for dev/local simulation)
 */
export function getLocalTokens(): TautanToken[] {
  if (typeof window === 'undefined') return inMemoryTokens;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOKENS);
    return raw ? JSON.parse(raw) : inMemoryTokens;
  } catch {
    return inMemoryTokens;
  }
}

/**
 * Save tokens to localStorage
 */
export function saveLocalTokens(tokens: TautanToken[]): void {
  inMemoryTokens = tokens;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Reads all pengasuh-anak links from localStorage
 */
export function getLocalLinks(): PengasuhAnakLink[] {
  if (typeof window === 'undefined') return inMemoryLinks;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LINKS);
    return raw ? JSON.parse(raw) : inMemoryLinks;
  } catch {
    return inMemoryLinks;
  }
}

/**
 * Save pengasuh-anak links to localStorage
 */
export function saveLocalLinks(links: PengasuhAnakLink[]): void {
  inMemoryLinks = links;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LINKS, JSON.stringify(links));
  } catch {
    // Ignore
  }
}

/**
 * RPC: buat_kode_tautan(p_anak)
 * Generates an 8-character token valid for 7 days
 */
export async function buatKodeTautan(anakId: string, supabaseClient?: any): Promise<string> {
  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase) {
    try {
      const { data, error } = await supabaseClient.rpc('buat_kode_tautan', {
        p_anak: anakId,
      });
      if (!error && data) {
        const codeStr = String(data).trim().toUpperCase();
        // Save local backup token
        const tokens = getLocalTokens();
        tokens.push({
          code: codeStr,
          anak_id: anakId,
          created_at: new Date().toISOString(),
          expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
          used: false,
        });
        saveLocalTokens(tokens);
        return codeStr;
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // Fallback / Dev generation (8 characters)
  const code = createRandom8CharCode();
  const tokens = getLocalTokens();
  tokens.push({
    code,
    anak_id: anakId,
    created_at: new Date().toISOString(),
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    used: false,
  });
  saveLocalTokens(tokens);

  return code;
}

/**
 * RPC: tautkan_pengasuh(p_kode, p_hubungan)
 * Links caregiver to child using code. Returns child UUID.
 */
export async function tautkanPengasuh(
  kode: string,
  hubungan: HubunganPengasuh,
  userId: string,
  supabaseClient?: any
): Promise<{ success: boolean; anakId?: string; error?: string }> {
  const cleanCode = kode.trim().toUpperCase();

  if (!cleanCode) {
    return {
      success: false,
      error: 'Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru ke kader.',
    };
  }

  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase) {
    try {
      const { data, error } = await supabaseClient.rpc('tautkan_pengasuh', {
        p_kode: cleanCode,
        p_hubungan: hubungan,
      });

      if (!error && data) {
        const linkedAnakId = String(data);
        // Record link in local DB
        try {
          await db.pengasuh_anak_cache.put({
            anak_id: linkedAnakId,
            user_id: userId,
            hubungan,
          });
        } catch {
          // ignore
        }
        const links = getLocalLinks();
        links.push({
          anak_id: linkedAnakId,
          user_id: userId,
          hubungan,
          linked_at: new Date().toISOString(),
        });
        saveLocalLinks(links);

        return { success: true, anakId: linkedAnakId };
      }
    } catch {
      // fallback
    }
  }

  // Local/Dev check
  const tokens = getLocalTokens();
  const tokenIdx = tokens.findIndex((t) => t.code === cleanCode);

  if (tokenIdx === -1) {
    return {
      success: false,
      error: 'Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru ke kader.',
    };
  }

  const token = tokens[tokenIdx];

  // Check if expired or already used
  if (token.used || token.expires_at < Date.now()) {
    return {
      success: false,
      error: 'Kode tidak cocok atau sudah kedaluwarsa. Minta kode baru ke kader.',
    };
  }

  // Mark token as used (single use)
  tokens[tokenIdx].used = true;
  saveLocalTokens(tokens);

  // Save link
  const links = getLocalLinks();
  // Check if user already linked this child
  const existingIndex = links.findIndex(
    (l) => l.anak_id === token.anak_id && l.user_id === userId
  );
  if (existingIndex >= 0) {
    links[existingIndex].hubungan = hubungan;
  } else {
    links.push({
      anak_id: token.anak_id,
      user_id: userId,
      hubungan,
      linked_at: new Date().toISOString(),
    });
  }
  saveLocalLinks(links);

  try {
    await db.pengasuh_anak_cache.put({
      anak_id: token.anak_id,
      user_id: userId,
      hubungan,
    });
  } catch {
    // ignore
  }

  return { success: true, anakId: token.anak_id };
}

/**
 * Read linked children for a specific user.
 * RLS / isolation ensures only this user's linked children are returned.
 */
export async function getLinkedChildren(
  userId: string,
  supabaseClient?: any
): Promise<Array<{ child: Anak; hubungan: HubunganPengasuh }>> {
  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('pengasuh_anak')
        .select('hubungan, anak:anak_id (*)')
        .eq('user_id', userId);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data
          .filter((item: any) => item.anak)
          .map((item: any) => ({
            child: item.anak as Anak,
            hubungan: item.hubungan as HubunganPengasuh,
          }));
      }
    } catch {
      // Fallback to local
    }
  }

  // Local/Dev lookup
  const links = getLocalLinks().filter((l) => l.user_id === userId);
  if (links.length === 0) {
    // If not in localStorage, check IndexedDB
    try {
      const cached = await db.pengasuh_anak_cache.where('user_id').equals(userId).toArray();
      if (cached.length > 0) {
        links.push(
          ...cached.map((c) => ({
            anak_id: c.anak_id,
            user_id: c.user_id,
            hubungan: c.hubungan,
            linked_at: new Date().toISOString(),
          }))
        );
      }
    } catch {
      // ignore
    }
  }

  if (links.length === 0) {
    return [];
  }

  const results: Array<{ child: Anak; hubungan: HubunganPengasuh }> = [];

  for (const link of links) {
    // Try to find child in IndexedDB
    let foundChild: Anak | null = null;
    try {
      const cachedChild = await db.anak_cache.get(link.anak_id);
      if (cachedChild) {
        foundChild = cachedChild;
      }
    } catch {
      // ignore
    }

    // If not found in IndexedDB, look up in TEST_QUALITY_CHILDREN or fallback
    if (!foundChild) {
      foundChild =
        TEST_QUALITY_CHILDREN.find((c) => c.id === link.anak_id) || null;
    }

    if (foundChild) {
      results.push({
        child: foundChild,
        hubungan: link.hubungan,
      });
    }
  }

  return results;
}
