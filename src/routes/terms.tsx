import { createFileRoute, Link } from "@tanstack/react-router";

const SITE_URL = "https://masbrotrade.lovable.app";

export const Route = createFileRoute("/terms")({
  head: () => {
    const title = "Syarat & Ketentuan — TradeJournal";
    const description =
      "Syarat dan ketentuan penggunaan TradeJournal, aplikasi jurnal trading berbasis AI.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: SITE_URL + "/terms" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: SITE_URL + "/terms" }],
    };
  },
  component: TermsPage,
});

function TermsPage() {
  const updated = "7 Mei 2026";
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.30_0.12_155_/_0.35),_transparent_60%)]" />
      </div>
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link to="/" className="font-display text-xl font-bold tracking-tight">
          Trade<span className="text-primary">Journal</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Syarat & Ketentuan</h1>
        <p className="mt-3 text-sm text-muted-foreground">Diperbarui: {updated}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">1. Penerimaan Syarat</h2>
            <p className="mt-2">
              Dengan membuat akun atau menggunakan TradeJournal, Anda setuju terikat dengan syarat
              dan ketentuan ini. Jika tidak setuju, mohon hentikan penggunaan layanan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">2. Layanan</h2>
            <p className="mt-2">
              TradeJournal adalah alat bantu pencatatan dan analisis trading. Kami tidak memberikan
              saran investasi, sinyal trading, maupun rekomendasi finansial.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">3. Tanggung Jawab Pengguna</h2>
            <p className="mt-2">
              Anda bertanggung jawab atas keakuratan data yang dimasukkan, keamanan kredensial akun,
              serta keputusan trading yang diambil berdasarkan informasi di aplikasi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">4. Tidak Ada Jaminan</h2>
            <p className="mt-2">
              Layanan disediakan "sebagaimana adanya" tanpa jaminan apa pun. Kami tidak bertanggung
              jawab atas kerugian finansial yang timbul akibat penggunaan aplikasi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">5. Akurasi AI</h2>
            <p className="mt-2">
              Asisten AI dapat membuat kesalahan saat mengekstrak data. Selalu verifikasi data hasil
              ekstraksi sebelum menyimpannya ke jurnal.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">6. Penghentian</h2>
            <p className="mt-2">
              Kami berhak menonaktifkan akun yang melanggar ketentuan ini, menyalahgunakan layanan,
              atau melakukan aktivitas ilegal.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">7. Perubahan</h2>
            <p className="mt-2">
              Syarat dapat diperbarui sewaktu-waktu. Penggunaan berkelanjutan setelah perubahan
              berarti Anda menerima syarat versi terbaru.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
