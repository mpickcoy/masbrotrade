import { createFileRoute, Link } from "@tanstack/react-router";

const SITE_URL = "https://masbrotrade.lovable.app";

export const Route = createFileRoute("/privacy")({
  head: () => {
    const title = "Kebijakan Privasi — TradeJournal";
    const description =
      "Pelajari bagaimana TradeJournal mengumpulkan, menggunakan, dan melindungi data trading serta informasi pribadi Anda.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: SITE_URL + "/privacy" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: SITE_URL + "/privacy" }],
    };
  },
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Kebijakan Privasi</h1>
        <p className="mt-3 text-sm text-muted-foreground">Diperbarui: {updated}</p>

        <div className="prose prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">1. Data yang Kami Kumpulkan</h2>
            <p className="mt-2">
              Kami menyimpan email akun, data trade yang Anda input (pair, entry, exit, lot, P/L),
              pergerakan modal, serta riwayat percakapan dengan asisten AI untuk fitur jurnal Anda.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">2. Cara Kami Menggunakan Data</h2>
            <p className="mt-2">
              Data digunakan semata-mata untuk menyediakan fungsi pencatatan, statistik, serta
              membantu asisten AI memahami konteks trading Anda. Kami tidak menjual data ke pihak ketiga.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">3. Keamanan</h2>
            <p className="mt-2">
              Semua data tersimpan di database terenkripsi dengan Row Level Security. Hanya akun Anda
              yang dapat mengakses data trading Anda sendiri.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">4. Pemrosesan oleh AI</h2>
            <p className="mt-2">
              Pesan yang Anda kirim ke asisten AI diteruskan ke penyedia model bahasa untuk diproses,
              kemudian hasilnya dikembalikan ke aplikasi. Hindari mengirim informasi sensitif yang
              tidak relevan dengan trading.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">5. Hak Anda</h2>
            <p className="mt-2">
              Anda dapat mengekspor atau menghapus data trading kapan saja melalui aplikasi. Untuk
              menghapus akun secara permanen, hubungi kami melalui email dukungan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">6. Perubahan Kebijakan</h2>
            <p className="mt-2">
              Kebijakan ini dapat diperbarui sewaktu-waktu. Versi terbaru akan selalu tersedia di
              halaman ini.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
