## Aplikasi Jurnal Trading dengan Asisten AI

Aplikasi web untuk mencatat aktivitas trading Anda. Cukup ceritakan trade Anda ke kotak chat AI, dan aplikasi otomatis menyimpan data ke jurnal serta menghitung statistik.

### Fitur Utama

1. **Autentikasi**
   - Login & sign-up dengan email/password (via Lovable Cloud)
   - Setiap user punya jurnal terpisah & aman

2. **Manajemen Modal**
   - Set modal awal saat onboarding
   - Catat top-up (deposit) & withdraw kapan saja
   - Saldo berjalan = modal awal + deposit − withdraw + akumulasi P/L

3. **Pencatatan Trade (lengkap)**
   Per trade tersimpan:
   - Pair/aset (mis. BTC/USDT, EUR/USD, XAU)
   - Tanggal & waktu
   - Arah (Long / Short)
   - Entry price, Exit price
   - Lot size / quantity
   - Profit / Loss (nominal)
   - Catatan strategi (opsional)

4. **Asisten AI (input semi-terstruktur)**
   - Kotak chat di dashboard
   - Anda ketik bebas, mis: *"Tadi long BTC entry 65000 exit 65500 lot 0.1 profit 50"*
   - AI mengekstrak data → jika ada field penting yang kurang, AI bertanya balik
   - Setelah lengkap, AI menampilkan ringkasan & meminta konfirmasi sebelum simpan
   - AI juga bisa mencatat deposit/withdraw modal lewat chat
   - Powered by Lovable AI Gateway (default: Gemini 3 Flash)

5. **Dashboard Statistik**
   - Kartu ringkasan: Modal awal, Saldo saat ini, Total P/L, Total Loss, Win rate
   - Profit Harian / Mingguan / Bulanan (toggle periode)
   - Grafik equity curve
   - Grafik P/L per periode (bar chart)

6. **Riwayat Trade**
   - Tabel semua trade dengan filter (tanggal, pair, win/loss)
   - Edit & hapus trade manual jika perlu

### Halaman

- `/login`, `/signup`
- `/onboarding` — set modal awal (sekali, untuk user baru)
- `/` (dashboard) — statistik + AI chat box + trade terbaru
- `/trades` — riwayat lengkap & filter
- `/capital` — riwayat deposit/withdraw + tombol tambah

### Detail Teknis

- **Stack**: TanStack Start + React + Tailwind + shadcn/ui + Recharts
- **Backend**: Lovable Cloud (auth + Postgres + RLS)
- **AI**: Lovable AI Gateway via server function, structured output (tool calling) untuk parsing trade
- **Tabel database**:
  - `profiles` — modal awal, mata uang
  - `trades` — semua field trade di atas, FK ke user
  - `capital_movements` — deposit/withdraw, FK ke user
  - `chat_messages` — riwayat chat AI per user
- RLS aktif di semua tabel (user hanya akses datanya sendiri)
- Statistik dihitung via SQL view atau agregasi di server function

### Desain

- Tema gelap finansial: background slate-950, accent emerald (profit) & rose (loss)
- Tipografi: display font tegas untuk angka besar, sans-serif bersih untuk body
- Mobile-first (viewport user 360px) — kartu statistik 2 kolom di mobile, grid 4 di desktop
- AI chat box prominent di dashboard, sticky di bawah pada mobile

### Yang TIDAK termasuk (bisa ditambah nanti)
- Import dari MT4/MT5/broker
- Multi-akun trading
- Analisis AI mendalam (saran strategi, pattern recognition)
- Export PDF/CSV
