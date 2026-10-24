import { Artikel, KategoriArtikel } from '@/types/database';
import { db } from './db';
import { getStoredHabitStats, saveStoredHabitStats } from './mpasiEngine';

export const DEFAULT_ARTIKEL: Artikel[] = [
  {
    id: 'art-01',
    judul: '1 Butir Telur Tiap Hari untuk Pertumbuhan Optimal',
    ringkasan: 'Telur ayam mengandung protein hewani lengkap dan kolin yang sangat efektif mendukung pertambahan tinggi badan anak.',
    konten: `Telur merupakan salah satu sumber protein hewani terbaik yang mudah didapat, terjangkau, dan sangat kaya nutrisi.

Kandungan protein pada satu butir telur menyediakan asam amino esensial lengkap yang dibutuhkan untuk pembentukan jaringan tulang dan otot balita. Selain itu, kuning telur mengandung kolin dan zat besi yang esensial untuk perkembangan daya pikir dan daya tahan tubuh.

Tips Penyajian:
• Bayi 6-8 bulan: Rebus matang sempurna lalu lumatkan bersama bubur atau sup.
• Bayi 9-11 bulan: Sajikan sebagai telur orak-arik lembut atau dadar cincang.
• Balita 12 bulan ke atas: Sajikan rebus, dadar mini, atau campurkan ke sup sayuran.

Catatan Alergi:
Jika keluarga memiliki riwayat alergi, berikan porsi kecil terlebih dahulu dan amati selama 2-3 hari. Bila muncul ruam atau gatal, konsultasikan dengan dokter atau petugas posyandu.`,
    kategori: 'artikel',
    foto_url: null,
    waktu_masak_menit: null,
    perkiraan_harga_rp: null,
    usia_min_bulan: 6,
    usia_max_bulan: 59,
    untuk_status: 'kuning',
    ditinjau: true,
    peninjau_nama: 'dr. Siti Rahmi, Sp.A',
    ditinjau_pada: '14 September 2026',
    published: true,
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'art-02',
    judul: 'Resep Bubur Tim Telur Ayam & Ikan Kembung Segar',
    ringkasan: 'Paduan kaya protein hewani dan asam lemak omega-3 untuk mengejar kenaikan berat badan dan tinggi anak.',
    konten: `Menu lezat ini memadukan dua sumber protein hewani lokal yang sangat tinggi nutrisi: telur ayam dan ikan kembung.

Bahan-bahan (2 porsi):
• 3 sendok makan beras pulen
• 1 butir telur ayam ras segar
• 30 gram daging ikan kembung fillet, cincang halus
• 1 potong kecil tahu sutra, haluskan
• 1 tangkai daun bayam atau labu kuning parut
• 1 sendok teh minyak kelapa atau santan cair
• 350 ml air atau kaldu ceker

Langkah Memasak:
1. Rebus beras dengan air/kaldu hingga menjadi bubur lembut.
2. Masukkan fillet ikan kembung cincang dan tahu halus. Aduk rata hingga matang.
3. Masukkan kocokan telur ayam perlahan sambil diaduk lembut agar teksturnya berserat halus.
4. Tambahkan daun bayam cincang, masak 2 menit sampai layu.
5. Matikan api, tambahkan minyak kelapa atau santan, lalu aduk rata.
6. Saring atau sesuaikan tekstur sesuai usia anak, lalu sajikan hangat.`,
    kategori: 'resep',
    foto_url: null,
    waktu_masak_menit: 20,
    perkiraan_harga_rp: 4500,
    usia_min_bulan: 6,
    usia_max_bulan: 11,
    untuk_status: 'kuning',
    ditinjau: true,
    peninjau_nama: 'Fitriani, S.Gz (Ahli Gizi Puskesmas)',
    ditinjau_pada: '20 September 2026',
    published: true,
    created_at: '2026-09-02T09:00:00Z',
  },
  {
    id: 'art-03',
    judul: 'Resep Sup Bola-Bola Daging Sapi & Wortel Lembut',
    ringkasan: 'Sumber zat besi dan protein padat energi untuk balita yang membutuhkan tambahan nutrisi harian.',
    konten: `Sup bola daging berkuah hangat ini disukai anak-anak karena bentuknya yang menarik dan kuahnya yang gurih alami.

Bahan-bahan:
• 50 gram daging sapi cincang tanpa lemak
• 1/2 sendok makan tepung tapioka
• 1 butir kuning telur
• 1/2 buah wortel manis, potong dadu kecil
• 1 siung bawang putih, haluskan
• 1 batang seledri
• 400 ml air kaldu sapi gurih
• 1/2 sendok teh minyak zaitun atau minyak kelapa

Cara Membuat:
1. Campur daging cincang, tepung tapioka, bawang putih halus, dan kuning telur hingga kalis.
2. Bentuk adonan menjadi bulatan bola kecil seukuran kelereng.
3. Didihkan air kaldu, masukkan bola daging satu per satu hingga mengapung.
4. Masukkan potongan wortel dan seledri, masak hingga wortel empuk.
5. Angkat dan sajikan hangat bersama nasi tim atau kentang tumbuk.`,
    kategori: 'resep',
    foto_url: null,
    waktu_masak_menit: 25,
    perkiraan_harga_rp: 7000,
    usia_min_bulan: 9,
    usia_max_bulan: 24,
    untuk_status: 'kuning',
    ditinjau: true,
    peninjau_nama: 'Fitriani, S.Gz (Ahli Gizi Puskesmas)',
    ditinjau_pada: '22 September 2026',
    published: true,
    created_at: '2026-09-03T10:00:00Z',
  },
  {
    id: 'art-04',
    judul: 'Resep Bubur Hati Ayam Santan Gurih',
    ringkasan: 'Kaya zat besi alami untuk mencegah lemas dan mendukung metabolisme pertumbuhan optimal.',
    konten: `Hati ayam adalah salah satu bahan makanan terbaik pencegah anemia pada anak karena kandungan zat besi heme yang sangat mudah diserap tubuh.

Bahan-bahan:
• 30 gram hati ayam kampung, cuci bersih dengan air jeruk nipis
• 3 sendok makan nasi lembek
• 1 sendok makan santan segar kental
• 1 potong kecil labu siam manis parut
• 1 siung bawang merah dan 1 siung bawang putih cincang
• 250 ml air

Cara Membuat:
1. Tumis bawang merah dan bawang putih cincang dengan sedikit minyak hingga harum.
2. Masukkan hati ayam, masak hingga berubah warna dan matang merata.
3. Tambahkan air dan nasi lembek, aduk sampai menjadi bubur lembut.
4. Masukkan parutan labu siam dan santan kental, masak sebentar hingga matang dan wangi.
5. Haluskan atau saring sesuai kemampuan kunyah anak, sajikan saat hangat kuku.`,
    kategori: 'resep',
    foto_url: null,
    waktu_masak_menit: 15,
    perkiraan_harga_rp: 3500,
    usia_min_bulan: 6,
    usia_max_bulan: 18,
    untuk_status: 'merah',
    ditinjau: true,
    peninjau_nama: 'dr. Siti Rahmi, Sp.A',
    ditinjau_pada: '28 September 2026',
    published: true,
    created_at: '2026-09-04T11:00:00Z',
  },
  {
    id: 'art-05',
    judul: 'Resep Puree Pepaya Manis & Jeruk Peras',
    ringkasan: 'Selingan segar kaya vitamin C dan serat alami untuk memperlancar pencernaan bayi.',
    konten: `Selingan buah segar membantu penyerapan zat besi dari makanan utama dan menjaga pencernaan bayi tetap sehat.

Bahan-bahan:
• 50 gram pepaya matang pohon, kupas dan buang bijinya
• 1 sendok makan air perasan jeruk manis (jeruk baby)

Cara Membuat:
1. Kerok pepaya matang dengan sendok atau haluskan dengan garpu.
2. Saring menggunakan saringan kawat untuk mendapatkan tekstur lembut tanpa serat kasar.
3. Teteskan air perasan jeruk manis, aduk rata.
4. Sajikan segera kepada anak sebagai camilan sehat di antara dua waktu makan utama.`,
    kategori: 'resep',
    foto_url: null,
    waktu_masak_menit: 5,
    perkiraan_harga_rp: 2000,
    usia_min_bulan: 6,
    usia_max_bulan: 24,
    untuk_status: null,
    ditinjau: false,
    peninjau_nama: null,
    ditinjau_pada: null,
    published: true,
    created_at: '2026-09-05T08:00:00Z',
  },
  {
    id: 'art-06',
    judul: 'Mengenal Tanda Kesiapan Makan pada Bayi 6 Bulan',
    ringkasan: 'Ketahui kapan dan bagaimana memulai MP-ASI pertama dengan aman, nyaman, dan menyenangkan.',
    konten: `Pemberian Makanan Pendamping ASI (MP-ASI) dimulai tepat saat bayi berusia 6 bulan (180 hari).

Tanda-tanda bayi sudah siap menerima MP-ASI:
1. Bayi mampu duduk tegak dengan leher stabil dan kepala tegak tanpa goyah.
2. Refleks menjulurkan lidah mulai berkurang secara alami.
3. Bayi tertarik dan mencoba meraih makanan yang sedang dimakan orang tua.
4. Mampu membuka mulut lebar saat disodorkan sendok.

Langkah Awal:
Mulailah dengan porsi kecil (2-3 sendok makan) 2 kali sehari dengan tekstur semi-kental (bubur lumat yang tidak terlalu encer). Berikan dalam suasana tenang tanpa distraksi gawai atau televisi.`,
    kategori: 'artikel',
    foto_url: null,
    waktu_masak_menit: null,
    perkiraan_harga_rp: null,
    usia_min_bulan: 6,
    usia_max_bulan: 9,
    untuk_status: null,
    ditinjau: true,
    peninjau_nama: 'dr. Siti Rahmi, Sp.A',
    ditinjau_pada: '10 Oktober 2026',
    published: true,
    created_at: '2026-09-06T07:00:00Z',
  },
  {
    id: 'art-07',
    judul: 'Tips MP-ASI Responsif: Ciptakan Suasana Makan Menyenangkan',
    ringkasan: 'Makan bukan paksaan. Kenali rasa lapar dan kenyang anak agar hubungan dengan makanan selalu positif.',
    konten: `Pemberian makan responsif (responsive feeding) adalah kunci agar anak menyukai waktu makan dan mau mencoba berbagai jenis makanan baru.

Prinsip Responsive Feeding:
• Beri makan saat anak menunjukkan tanda lapar (aktif, melihat makanan, membuka mulut).
• Hentikan makan jika anak menunjukkan tanda kenyang (memalingkan wajah, menutup mulut rapat).
• Jangan pernah memaksa, memarahi, atau mengancam anak saat makan.
• Batasi waktu makan maksimal 30 menit per sesi agar anak tidak lelah dan bosan.
• Libatkan anak dalam proses makan, misalnya dengan membiarkannya memegang sendok sendiri.`,
    kategori: 'artikel',
    foto_url: null,
    waktu_masak_menit: null,
    perkiraan_harga_rp: null,
    usia_min_bulan: 6,
    usia_max_bulan: 59,
    untuk_status: null,
    ditinjau: false,
    peninjau_nama: null,
    ditinjau_pada: null,
    published: true,
    created_at: '2026-09-07T07:00:00Z',
  },
  {
    id: 'art-08',
    judul: 'Resep Nasi Tim Ikan Lele Gurih & Tahu Kuning',
    ringkasan: 'Ikan lele lokal kaya protein dan kalsium alami yang sangat mudah diolah menjadi menu lezat.',
    konten: `Ikan lele adalah pilihan ikan air tawar yang sangat bernilai gizi tinggi dengan tekstur daging yang empuk bagi anak.

Bahan-bahan (2 porsi):
• 1 centong nasi lembek
• 40 gram fillet ikan lele segar, kukus dan suwir halus
• 1 potong tahu kuning, potong kotak mini
• 1 sendok makan wortel parut
• 1 sendok teh margarin atau minyak kelapa
• 200 ml kaldu sayur

Langkah Memasak:
1. Tumis fillet lele kukus suwir bersama margarin hingga wangi.
2. Masukkan nasi lembek, kaldu sayur, tahu kuning, dan parutan wortel.
3. Masak dengan api sedang sambil diaduk perlahan hingga kuah meresap dan tekstur menjadi tim empuk.
4. Angkat dan sajikan selagi hangat.`,
    kategori: 'resep',
    foto_url: null,
    waktu_masak_menit: 20,
    perkiraan_harga_rp: 3500,
    usia_min_bulan: 9,
    usia_max_bulan: 24,
    untuk_status: 'hijau',
    ditinjau: true,
    peninjau_nama: 'Fitriani, S.Gz (Ahli Gizi Puskesmas)',
    ditinjau_pada: '12 Oktober 2026',
    published: true,
    created_at: '2026-09-08T08:00:00Z',
  },
];

/**
 * Storage helpers for read articles tracking
 */
const READ_ARTICLES_KEY = 'sg_artikel_dibaca_list';

interface ReadRecord {
  childId: string;
  userId: string;
  artikelId: string | number;
  readAt: string;
}

let inMemoryReadRecords: ReadRecord[] = [];

export function getReadArticlesList(): ReadRecord[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(READ_ARTICLES_KEY);
      return raw ? JSON.parse(raw) : inMemoryReadRecords;
    } catch {
      return inMemoryReadRecords;
    }
  }
  return inMemoryReadRecords;
}

export function saveReadArticlesList(list: ReadRecord[]): void {
  inMemoryReadRecords = list;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(READ_ARTICLES_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}

/**
 * Fetch articles list filtered by category, and sorted prioritizing matching child's age and status
 */
export async function getArtikelList(
  childAgeMonths?: number,
  childStatus?: string | null,
  kategoriFilter: 'semua' | 'artikel' | 'resep' = 'semua',
  supabaseClient?: any
): Promise<Artikel[]> {
  let items: Artikel[] = [];

  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase) {
    try {
      let query = supabaseClient.from('artikel').select('*').eq('published', true);
      if (kategoriFilter !== 'semua') {
        query = query.eq('kategori', kategoriFilter);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        items = data;
        // Cache to IndexedDB
        for (const item of data) {
          await db.artikel_cache.put(item);
        }
      }
    } catch {
      // fallback to cache or defaults
    }
  }

  // Fallback to IndexedDB cache
  if (items.length === 0) {
    try {
      const cached = await db.artikel_cache.toArray();
      if (cached.length > 0) {
        items = cached.filter((c) => c.published);
      }
    } catch {
      // ignore
    }
  }

  // Fallback to DEFAULT_ARTIKEL
  if (items.length === 0) {
    items = [...DEFAULT_ARTIKEL];
    // Seed into IndexedDB
    try {
      for (const item of DEFAULT_ARTIKEL) {
        await db.artikel_cache.put(item);
      }
    } catch {
      // ignore
    }
  }

  // Apply category filter if not already applied
  if (kategoriFilter !== 'semua') {
    items = items.filter((it) => it.kategori === kategoriFilter);
  }

  // SORT PRIORITY:
  // Items matching child's age (usia_min_bulan to usia_max_bulan) AND latest status (untuk_status) come first!
  const statusKey = childStatus ? childStatus.toLowerCase() : null;
  const age = typeof childAgeMonths === 'number' ? childAgeMonths : null;

  items.sort((a, b) => {
    const aAgeMatch = age !== null && age >= a.usia_min_bulan && age <= a.usia_max_bulan;
    const bAgeMatch = age !== null && age >= b.usia_min_bulan && age <= b.usia_max_bulan;

    const aStatusMatch = Boolean(statusKey && a.untuk_status && a.untuk_status.toLowerCase() === statusKey);
    const bStatusMatch = Boolean(statusKey && b.untuk_status && b.untuk_status.toLowerCase() === statusKey);

    const aUniversalStatus = !a.untuk_status;
    const bUniversalStatus = !b.untuk_status;

    // Score computation: higher is higher priority
    const scoreA = (aStatusMatch && aAgeMatch ? 100 : 0) +
      (aStatusMatch ? 50 : 0) +
      (aAgeMatch && aUniversalStatus ? 30 : 0) +
      (aAgeMatch ? 20 : 0) +
      (aUniversalStatus ? 10 : 0);

    const scoreB = (bStatusMatch && bAgeMatch ? 100 : 0) +
      (bStatusMatch ? 50 : 0) +
      (bAgeMatch && bUniversalStatus ? 30 : 0) +
      (bAgeMatch ? 20 : 0) +
      (bUniversalStatus ? 10 : 0);

    return scoreB - scoreA;
  });

  return items;
}

/**
 * Get single article detail by ID
 */
export async function getArtikelDetail(
  id: string | number,
  supabaseClient?: any
): Promise<Artikel | null> {
  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('artikel')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        return data as Artikel;
      }
    } catch {
      // fallback
    }
  }

  // Cache or default lookup
  try {
    const cached = await db.artikel_cache.get(id);
    if (cached) return cached;
  } catch {
    // ignore
  }

  const def = DEFAULT_ARTIKEL.find((a) => String(a.id) === String(id));
  return def || null;
}

/**
 * RPC: baca_artikel(p_artikel, p_anak)
 * Called once on open. Awards 20 points only the first time.
 */
export async function bacaArtikel(
  artikelId: string | number,
  childId: string,
  userId: string,
  supabaseClient?: any
): Promise<{ firstRead: boolean; pointsAwarded: number }> {
  const isRealSupabase =
    supabaseClient &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isRealSupabase) {
    try {
      const { data, error } = await supabaseClient.rpc('baca_artikel', {
        p_artikel: artikelId,
        p_anak: childId,
      });

      if (!error && data) {
        // Assume RPC returns { first_read: boolean, points: number } or boolean
        const isFirst = typeof data === 'object' ? Boolean(data.first_read) : Boolean(data);
        return {
          firstRead: isFirst,
          pointsAwarded: isFirst ? 20 : 0,
        };
      }
    } catch {
      // Fallback to local
    }
  }

  // Local / Dev demo fallback:
  const records = getReadArticlesList();
  const alreadyRead = records.some(
    (r) => String(r.artikelId) === String(artikelId) && r.childId === childId && r.userId === userId
  );

  if (alreadyRead) {
    return { firstRead: false, pointsAwarded: 0 };
  }

  // Record read
  records.push({
    artikelId,
    childId,
    userId,
    readAt: new Date().toISOString(),
  });
  saveReadArticlesList(records);

  // Award +20 points to caregiver's habit points
  try {
    const stats = getStoredHabitStats();
    const habitKey = `${childId}:${userId}`;
    const cur = stats[habitKey] || { total_poin: 0, logged_dates: [] };
    cur.total_poin += 20;
    stats[habitKey] = cur;
    saveStoredHabitStats(stats);
  } catch {
    // ignore
  }

  return { firstRead: true, pointsAwarded: 20 };
}
