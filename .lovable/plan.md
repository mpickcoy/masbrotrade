## Tambah Section "Download App" di Footer Landing Page

Menambah area download aplikasi mobile (Android & iOS) di atas footer landing, dengan badge resmi bergaya **"Coming Soon"** (tanpa link aktif).

### Perubahan
**File:** `src/routes/index.tsx` (hanya satu file)

1. **Section baru "Download App"** ditempatkan tepat di atas `<footer>` (sebelum line 552).
   - Heading: "Segera Hadir di Mobile"
   - Subteks: "Versi Android & iOS sedang dalam pengembangan. Sementara, install via PWA langsung dari browser."
   - Dua badge resmi (style hitam):
     - **Get it on Google Play** (logo Play Store + teks)
     - **Download on the App Store** (logo Apple + teks)
   - Setiap badge punya overlay ribbon kecil "COMING SOON" di pojok, dan state `disabled` (cursor default, opacity 70%, tidak bisa diklik).
   - Layout: flex center, gap 12px, responsive (stack di mobile <480px, sejajar di desktop).

2. **Badge dibuat inline sebagai komponen kecil** dalam file yang sama (`AppStoreBadge`, `GooglePlayBadge`) menggunakan SVG inline agar:
   - Tidak perlu file asset baru
   - Crisp di semua resolusi
   - Konsisten dengan tema (border subtle, hover halus walaupun disabled)

3. **Footer existing** (line 552-560) **tidak diubah** — link Privacy & Terms tetap.

### Detail Visual
- Badge ukuran ~160×52px, background `#000`, border `1px solid rgba(255,255,255,.12)`
- Ribbon "COMING SOON" warna `--primary` (neon hijau) di pojok kanan-atas
- Section background subtle: `bg-card/30` dengan border-top tipis untuk pemisah dari section CTA di atasnya

### Yang TIDAK dilakukan
- Tidak menambah link aktif ke Play Store / App Store (karena belum ada)
- Tidak mengubah PWA manifest atau service worker
- Tidak menambah halaman/route baru
- Tidak mengubah komponen lain di luar `src/routes/index.tsx`