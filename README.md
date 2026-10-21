# StuntGuard 🛡️👶

Aplikasi web *mobile-first* untuk kader Posyandu di Indonesia guna memantau tumbuh kembang balita dan mendeteksi dini stunting secara akurat dan tepat waktu.

## 🚀 Fitur Utama
- **Autentikasi & Role Routing**: Akses terproteksi untuk kader (`/kader`), tenaga desa/bidan (`/desa`), dan peran lainnya (`/belum-tersedia`).
- **Daftar Balita (`/kader/anak`)**: Pencarian instan, perhitungan otomatis usia balita dalam bulan dari tanggal lahir, dan navigasi langsung ke pengukuran.
- **Registrasi Balita Baru (`/kader/anak/baru`)**:
  - Validasi NIK 16 digit (opsional dengan panduan ramah jika belum memiliki NIK).
  - Sakelar bergambar jenis kelamin (L dan P).
  - Pencatatan persetujuan orang tua (*consent*) sesuai standar perlindungan data anak.
- **Desain Sistem "Berry Clinical Soft-UI"**:
  - Tipografi: Plus Jakarta Sans (teks kader min. 16px, angka metrik $\ge$ 24px Bold).
  - Palet warna: Berry Maroon (`#A72449`), Slate Teal (`#44636D`), latar `#FAFAFA`, status Hijau/Kuning/Merah.
  - Tombol pil penuh kontras tinggi (tinggi minimal 56px).
  - Lencana status sinkronisasi (*Tersinkron*).

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Backend / Database**: Supabase (`@supabase/ssr` & `@supabase/supabase-js`)
- **Icons**: Lucide React

## 📦 Menjalankan Secara Lokal
```bash
# 1. Pasang dependensi
npm install

# 2. Atur konfigurasi Supabase di .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 3. Jalankan server pengembangan
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).
