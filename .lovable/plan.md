## Position Size Calculator Widget

Tambahkan widget kecil di halaman dashboard untuk menghitung ukuran lot berdasarkan modal akun, risk %, dan stop loss (pips).

### Penempatan
- File baru: `src/components/PositionSizeCalculator.tsx`
- Disisipkan di `src/routes/_app.dashboard.tsx` sebagai card di grid dashboard (sejajar dengan card Daily Target / Max Loss), menggunakan kelas `db-card` agar konsisten dengan style yang sudah ada.

### Input field
- **Account balance** — prefilled dari `stats.balance` (initial capital + total PnL + capital movements). Bisa diedit manual.
- **Risk %** — default `1` (input number, step 0.1, range 0.01–100).
- **Stop loss (pips)** — input number.
- **Pip value per lot** — input number, default `10` (USD per pip per 1 standard lot, sesuai mayoritas pair USD-quote). User bisa override untuk pair lain (JPY, gold, dll).
- Currency mengikuti `profile.currency`.

### Output (live, tanpa tombol submit)
- **Risk amount** = `balance × risk% / 100` → ditampilkan dalam `fmtMoney`.
- **Lot size** = `riskAmount / (stopLossPips × pipValuePerLot)` → ditampilkan 2 desimal (standard lots), plus konversi mini lot (×10) dan micro lot (×100) sebagai keterangan kecil.
- Validasi: jika SL = 0 atau pip value = 0 → tampilkan "—" dan pesan singkat.
- Highlight risk amount dalam warna accent jika > 2% balance (peringatan over-risk).

### Behavior
- Pure client-side, tanpa state ke database (sesuai pilihan user).
- State lokal via `useState`, tidak disimpan ke localStorage.
- Format angka pakai helper `fmtMoney` yang sudah ada di project.

### Style
- Reuse class `db-card`, `db-card-title`, `db-card-value` dari `styles.css` agar match dashboard.
- Layout grid 2 kolom untuk input (responsive: 1 kolom di mobile <640px).
- Label kecil, input compact.

### File yang diubah
- **Buat**: `src/components/PositionSizeCalculator.tsx`
- **Edit**: `src/routes/_app.dashboard.tsx` — import + render widget di dalam grid card yang sudah ada (kemungkinan dekat card Max Loss Limit agar tema "risk management" berkumpul).
