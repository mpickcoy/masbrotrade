## Tujuan
Membuat pengunjung mudah masuk/daftar dari landing page, dan menambahkan opsi login dengan Google (Gmail) di samping email/password yang sudah ada.

## Yang akan dilakukan

### 1. Aktifkan Google OAuth (Lovable Cloud Managed)
- Jalankan `configure_social_auth` dengan provider `google`.
- Ini otomatis membuat modul `src/integrations/lovable/` dan menginstal package `@lovable.dev/cloud-auth-js`.
- Tidak perlu API key — pakai kredensial Google yang dikelola Lovable Cloud.
- Email/password tetap aktif (tidak di-disable).

### 2. Update halaman Login (`src/routes/login.tsx`)
- Tambah tombol **"Lanjutkan dengan Google"** di atas form email/password.
- Tambah pemisah "atau" antara tombol Google dan form.
- Pakai `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- Tangani error dengan toast.

### 3. Update halaman Signup (`src/routes/signup.tsx`)
- Tambah tombol **"Daftar dengan Google"** dengan flow yang sama.
- Pemisah "atau" + form email/password tetap.

### 4. Update Landing Page (`src/routes/index.tsx`)
- Pastikan navbar/hero punya tombol **"Masuk"** (link ke `/login`) dan **"Daftar Gratis"** (link ke `/signup`) yang menonjol.
- Tambah CTA "Daftar Gratis" tambahan di akhir section fitur (sebelum footer) agar pengunjung yang scroll sampai bawah langsung bisa daftar.
- Periksa apakah CTA sudah cukup mencolok — jika belum, beri styling gradient/shadow yang sama dengan hero.

## Yang TIDAK diubah
- Logika auth context (`src/lib/auth-context.tsx`) — Supabase client tetap menangani session.
- Halaman dashboard, RLS, atau database.
- Tidak menambahkan provider lain (Apple, dll) kecuali diminta.

## Catatan
- Lovable Cloud Managed Google Auth aman dipakai langsung, pengguna bisa nanti ganti ke kredensial Google sendiri lewat Cloud settings jika mau branding sendiri.
- Setelah Google login sukses, user diarahkan ke `/` (dashboard) sesuai flow yang sudah ada.
