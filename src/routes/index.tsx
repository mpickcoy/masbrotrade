import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Bot,
  LineChart,
  Wallet,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Flame,
  Target,
  CalendarDays,
  PieChart,
  Activity,
  Award,
  AlertTriangle,
  Globe2,
  Smile,
  FileSpreadsheet,
  Zap,
  Trophy,
  BarChart3,
} from "lucide-react";

const SITE_URL = "https://masbrotrade.lovable.app";
const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5bc15cad-4912-4417-af07-cffbf2781c7b/id-preview-1ee85e4e--8662380e-a684-4711-a96c-714a3bebd4e8.lovable.app-1778097858282.png";

const FAQS = [
  {
    q: "Apa itu TradeJournal?",
    a: "TradeJournal adalah aplikasi jurnal trading berbasis AI yang membantu trader mencatat transaksi, melacak modal, serta menganalisis profit harian, mingguan, dan bulanan secara otomatis.",
  },
  {
    q: "Bagaimana cara kerja asisten AI-nya?",
    a: "Cukup ketik trade Anda dengan bahasa bebas, misalnya 'Long BTC entry 65000 exit 65500 lot 0.1 profit 50'. AI akan mengekstrak pair, arah, entry, exit, lot, dan P/L lalu menyimpannya ke jurnal Anda setelah konfirmasi.",
  },
  {
    q: "Apakah TradeJournal gratis?",
    a: "Ya, TradeJournal gratis selamanya untuk fitur inti pencatatan trade, manajemen modal, dan statistik performa. Tidak diperlukan kartu kredit untuk mendaftar.",
  },
  {
    q: "Apakah data trading saya aman?",
    a: "Setiap akun terisolasi dengan Row Level Security tingkat database, sehingga hanya Anda yang dapat mengakses data trading Anda sendiri.",
  },
  {
    q: "Instrumen apa saja yang bisa dicatat?",
    a: "Anda bisa mencatat trade dari berbagai pasar — forex, crypto, saham, indeks, maupun komoditas. AI mengenali pair umum dan menyimpan format apa pun yang Anda gunakan.",
  },
];

export const Route = createFileRoute("/")({
  head: () => {
    const title = "TradeJournal — Jurnal Trading Cerdas dengan Asisten AI";
    const description =
      "Catat trade cukup dengan mengetik. Asisten AI otomatis menyimpan trade dan menghitung profit harian, mingguan, dan bulanan Anda. Gratis, aman, dan cepat.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "keywords",
          content:
            "jurnal trading, trading journal, asisten AI trading, catatan trading, jurnal forex, jurnal crypto, profit harian, win rate, manajemen modal trading",
        },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "author", content: "TradeJournal" },
        { name: "theme-color", content: "#0a0f0d" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: SITE_URL },
        { property: "og:site_name", content: "TradeJournal" },
        { property: "og:locale", content: "id_ID" },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: SITE_URL + "/" }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                name: "TradeJournal",
                url: SITE_URL,
                applicationCategory: "FinanceApplication",
                operatingSystem: "Any",
                description,
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQS.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
            ],
          }),
        },
      ],
    };
  },
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .maybeSingle();
      if (!data?.onboarded) navigate({ to: "/onboarding" });
      else navigate({ to: "/dashboard" });
    })();
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Bot,
      title: "Asisten AI",
      desc: "Ketik bebas seperti chat. AI mengekstrak pair, entry, exit, lot, dan profit otomatis.",
    },
    {
      icon: LineChart,
      title: "Statistik Real-time",
      desc: "Lihat profit harian, mingguan, bulanan, win rate, dan equity curve secara live.",
    },
    {
      icon: Wallet,
      title: "Manajemen Modal",
      desc: "Catat modal awal, top-up, dan withdraw. Saldo selalu sinkron dengan akumulasi P/L.",
    },
    {
      icon: TrendingUp,
      title: "Analisis Performa",
      desc: "Pahami kekuatan strategi Anda lewat win rate, total loss, dan grafik performa.",
    },
    {
      icon: Clock,
      title: "Cepat & Ringan",
      desc: "Cukup beberapa detik untuk mencatat satu trade. Cocok dipakai langsung dari HP.",
    },
    {
      icon: ShieldCheck,
      title: "Data Aman",
      desc: "Setiap akun terisolasi dengan keamanan database tingkat enterprise.",
    },
  ];

  const steps = [
    { n: "01", title: "Daftar gratis", desc: "Buat akun email/password dalam 30 detik." },
    { n: "02", title: "Set modal awal", desc: "Masukkan modal trading Anda sebagai baseline." },
    { n: "03", title: "Chat dengan AI", desc: "Ketik trade-mu, AI catat & hitung otomatis." },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.30_0.12_155_/_0.45),_transparent_60%)]" />
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[oklch(0.78_0.18_155_/_0.18)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[oklch(0.72_0.15_230_/_0.15)] blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[400px] w-[400px] rounded-full bg-[oklch(0.65_0.20_300_/_0.12)] blur-3xl" />
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link to="/" className="font-display text-xl font-bold tracking-tight">
          Trade<span className="text-primary">Journal</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Masuk</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Daftar</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:pt-16 sm:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            Powered by AI — input trade semudah chat
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Jurnal Trading Cerdas,{" "}
            <span className="bg-gradient-to-r from-[oklch(0.85_0.18_155)] via-[oklch(0.78_0.16_180)] to-[oklch(0.72_0.15_230)] bg-clip-text text-transparent">
              Catat dengan Bicara
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Lupakan input manual yang ribet. Cukup ketik trade-mu ke asisten AI,
            biarkan TradeJournal menghitung profit harian, mingguan, dan bulanan untuk Anda.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Mulai Gratis
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Saya sudah punya akun
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Gratis selamanya · Tanpa kartu kredit
          </p>
        </div>

        {/* Mock chat preview */}
        <div className="mx-auto mt-14 max-w-2xl">
          <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-2xl shadow-[oklch(0.78_0.18_155_/_0.15)] backdrop-blur sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              AI Assistant aktif
            </div>
            <div className="space-y-3">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-2 text-sm">
                Long BTC entry 65000 exit 65500 lot 0.1 profit 50
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm">
                <div className="mb-2 font-medium text-foreground">Trade tercatat ✓</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Pair</span><span className="text-foreground">BTC/USDT</span>
                  <span>Arah</span><span className="text-foreground">Long</span>
                  <span>Entry / Exit</span><span className="text-foreground">65,000 → 65,500</span>
                  <span>P/L</span><span className="font-semibold text-[var(--success)]">+$50.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Semua yang trader butuhkan
          </h2>
          <p className="mt-3 text-muted-foreground">
            Dari input cepat hingga analisis mendalam — dalam satu aplikasi yang ringan.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur transition hover:border-primary/40 hover:bg-card"
              >
                <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">3 langkah, langsung jalan</h2>
          <p className="mt-3 text-muted-foreground">Onboarding cepat, kurva belajar nol.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur"
            >
              <div className="font-display text-3xl font-bold text-primary">{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Pertanyaan Umum</h2>
          <p className="mt-3 text-muted-foreground">Hal-hal yang sering ditanyakan trader sebelum mulai.</p>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-border bg-card/60 p-5 backdrop-blur open:bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                <span className="flex items-center gap-2">
                  <HelpCircle className="size-4 text-primary" />
                  {f.q}
                </span>
                <span className="text-muted-foreground transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[oklch(0.30_0.12_155_/_0.5)] via-card to-[oklch(0.25_0.10_230_/_0.4)] p-8 text-center sm:p-14">
          <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Siap konsisten mencatat trade?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Bergabung sekarang dan rasakan pengalaman jurnal trading paling cepat yang pernah ada.
            </p>
            <ul className="mx-auto mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Gratis selamanya</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Tanpa kartu kredit</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Setup &lt; 1 menit</li>
            </ul>
            <div className="mt-8">
              <Link to="/signup">
                <Button size="lg">
                  Buat Akun Gratis
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} TradeJournal · Dibuat untuk trader yang serius</p>
          <nav className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">Kebijakan Privasi</Link>
            <Link to="/terms" className="hover:text-foreground">Syarat & Ketentuan</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
