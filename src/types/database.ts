export type UserRole = 'admin' | 'kader' | 'bidan' | 'kpm' | 'kepala_desa' | 'pengasuh';
export type JenisKelamin = 'L' | 'P';
export type CaraUkur = 'berbaring' | 'berdiri';
export type StatusGizi = 'hijau' | 'kuning' | 'merah';
export type StatusRujukan = 'belum' | 'sudah' | 'ada_hasil';
export type HubunganPengasuh = 'ibu' | 'ayah' | 'nenek_kakek' | 'wali_lain';

export interface Profile {
  id: string;
  nama: string;
  role: UserRole;
  desa_id: number | null;
  posyandu_id: number | null;
}

export interface Desa {
  id: number;
  nama: string;
}

export interface Posyandu {
  id: number;
  desa_id: number;
  nama: string;
  dusun: string;
}

export interface Anak {
  id: string;
  desa_id: number;
  posyandu_id: number;
  nama: string;
  nik: string | null;
  no_kk: string | null;
  nama_pengasuh: string;
  hubungan_pengasuh: HubunganPengasuh;
  tgl_lahir: string;
  jenis_kelamin: JenisKelamin;
}

export interface PengasuhAnak {
  anak_id: string;
  user_id: string;
  hubungan: HubunganPengasuh;
}

export interface Pengukuran {
  id: string; // uuid created on device with crypto.randomUUID()
  anak_id: string;
  desa_id: number;
  posyandu_id: number;
  tgl_ukur: string;
  berat_kg: number;
  tinggi_cm: number;
  cara_ukur: CaraUkur;
  berat_manual: boolean;
  z_tbu?: number | null; // Calculated by DB trigger on insert
  z_bbu?: number | null; // Calculated by DB trigger on insert
  status?: StatusGizi | null; // Calculated by DB trigger on insert
}

export interface TindakLanjut {
  id: number;
  pengukuran_id: string;
  anak_id: string;
  desa_id: number;
  posyandu_id: number;
  tgl_kunjungan_ulang: string | null;
  status_rujukan: StatusRujukan;
  catatan: string | null;
  selesai: boolean;
  updated_at: string;
}

export interface Consent {
  id?: number;
  anak_id: string;
  diberikan_oleh: string;
  hubungan: HubunganPengasuh;
  versi_teks: string;
}

export interface MpasiMenu {
  id: string | number;
  nama: string;
  kelompok: string;
  ikon: string;
  usia_min_bulan: number;
}

export interface MpasiLog {
  id: string; // crypto.randomUUID()
  anak_id: string;
  user_id: string;
  menu_id: string | number;
  tgl: string; // YYYY-MM-DD
  created_at?: string;
}

export interface RingkasanPengasuh {
  total_poin: number;
  streak_hari: number;
  sudah_catat_hari_ini: boolean;
  tgl_kunjungan_berikutnya: string | null;
  status_terakhir: StatusGizi | string | null;
  tgl_ukur_terakhir: string | null;
}

export type KategoriArtikel = 'artikel' | 'resep';

export interface Artikel {
  id: string | number;
  judul: string;
  ringkasan: string;
  konten: string;
  kategori: KategoriArtikel;
  foto_url?: string | null;
  waktu_masak_menit?: number | null;
  perkiraan_harga_rp?: number | null;
  usia_min_bulan: number;
  usia_max_bulan: number;
  untuk_status?: StatusGizi | string | null; // e.g. 'kuning', 'merah', 'hijau', or null/empty for all
  ditinjau: boolean;
  peninjau_nama?: string | null;
  ditinjau_pada?: string | null;
  published: boolean;
  created_at?: string;
}

