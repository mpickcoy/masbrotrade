## Fitur: Share P/L ke Sosial Media

User dapat membagikan hasil trading (P/L) ke sosial media dengan kartu gambar yang estetik, ala Spotify Wrapped / Robinhood / eToro.

### Apa yang dibangun

1. **Komponen baru `src/components/SharePnlCard.tsx`**
   - Modal/dialog dengan preview kartu share (rasio 9:16 untuk Story IG/TikTok, dan 1:1 untuk feed).
   - Toggle pilih periode: **Hari Ini · Minggu Ini · Bulan Ini · All Time**.
   - Toggle pilih gaya kartu: **Neon Dark**, **Gradient Sunset**, **Minimal Mono**, **Holographic** (4 tema estetik).
   - Toggle privacy: tampilkan nominal $ atau hanya % return (biar aman).
   - Konten kartu: logo TradeJournal, nama trader, periode, **Total P/L besar** (warna hijau/merah), Win Rate, Total Trade, Best Pair, mini equity curve (SVG), tagline "Tracked with TradeJournal".
   - Tombol: **Download PNG**, **Share** (Web Share API → IG/WA/X/Telegram), **Copy Image**, **Copy Link**.

2. **Generate gambar PNG**
   - Gunakan `html-to-image` (lib kecil, ~10KB, sudah dipakai komunitas) untuk render DOM kartu → PNG resolusi tinggi (1080×1920 / 1080×1080).
   - Web Share API Level 2 (`navigator.share({ files })`) untuk share langsung ke app sosmed di mobile; fallback ke download + tombol "Buka Instagram/WhatsApp/X" jika tidak didukung.

3. **Integrasi tombol "Share" di 2 tempat**
   - **Dashboard** (`src/routes/_app.dashboard.tsx`): tombol Share di kanan atas card Total P/L.
   - **Riwayat Trade** (`src/routes/_app.trades.tsx`): tombol Share di header, ikut filter periode aktif.

4. **Tracking watermark**
   - Footer kartu: `masbrotrade.lovable.app` + ikon kecil — supaya yang lihat bisa daftar (organic growth).

### Detail teknis

- Lib baru: `html-to-image` (`bun add html-to-image`). Tidak butuh canvas/native — pure DOM-to-PNG.
- Stats sudah tersedia via `computeStats()` di `src/lib/stats.ts`, tinggal pass + filter periode.
- Tema kartu pakai CSS variable + gradient dari `src/styles.css` (token semantik) supaya konsisten dengan brand.
- Tidak ada perubahan database, RLS, atau auth.

### Yang TIDAK diubah
- Tidak menyentuh schema DB, edge function, atau auth.
- Tidak ubah landing page atau login/signup yang sudah disetujui sebelumnya.

### Files
- create `src/components/SharePnlCard.tsx`
- edit `src/routes/_app.dashboard.tsx` (tambah trigger button + modal)
- edit `src/routes/_app.trades.tsx` (tambah trigger button + modal)
- `package.json` (tambah `html-to-image`)
