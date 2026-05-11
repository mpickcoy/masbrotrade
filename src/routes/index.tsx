import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      title: "Equity Curve Live",
      desc: "Lihat pertumbuhan modalmu lewat grafik equity yang update real-time setiap trade.",
    },
    {
      icon: Wallet,
      title: "Manajemen Modal",
      desc: "Catat modal awal, top-up, dan withdraw. Saldo selalu sinkron dengan akumulasi P/L.",
    },
    {
      icon: Flame,
      title: "Streak Profit",
      desc: "Lacak hari profit beruntun untuk menjaga konsistensi dan motivasi tetap tinggi.",
    },
    {
      icon: Target,
      title: "Target Harian",
      desc: "Set target profit per hari dan progress bar otomatis menampilkan pencapaianmu.",
    },
    {
      icon: AlertTriangle,
      title: "Max Loss Limit",
      desc: "Batasi kerugian harian. Aplikasi ingatkan saat kamu mendekati batas — proteksi modal.",
    },
    {
      icon: CalendarDays,
      title: "Heatmap Kalender",
      desc: "Visual kalender hari profit/loss seperti GitHub. Pola trading-mu langsung terlihat.",
    },
    {
      icon: BarChart3,
      title: "P/L Harian & Mingguan",
      desc: "Bar chart 7 hari & 30 hari terakhir untuk memantau performa jangka pendek.",
    },
    {
      icon: PieChart,
      title: "Win/Loss Ratio",
      desc: "Pie chart win rate, total menang, kalah, dan break-even dalam satu tampilan.",
    },
    {
      icon: Trophy,
      title: "Top Performing Pairs",
      desc: "Tahu pair mana yang paling cuan dan mana yang menguras akunmu.",
    },
    {
      icon: Zap,
      title: "Profit Factor & R:R",
      desc: "Metrik profesional: profit factor, average win/loss, dan max drawdown otomatis.",
    },
    {
      icon: Globe2,
      title: "Sesi Trading Live",
      desc: "Indikator sesi Asia, London, New York — tahu kapan pasar paling aktif.",
    },
    {
      icon: Smile,
      title: "Mood Tracker",
      desc: "Catat kondisi mental harianmu — pahami korelasi emosi dengan performa.",
    },
    {
      icon: FileSpreadsheet,
      title: "Export CSV & PDF",
      desc: "Unduh riwayat trade ke Excel atau laporan PDF siap cetak kapan saja.",
    },
    {
      icon: ShieldCheck,
      title: "Data Aman & Privat",
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

      {/* Dashboard Preview */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Activity className="size-3.5 text-primary" />
            Dashboard yang hidup
          </div>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Lihat performa dalam{" "}
            <span className="bg-gradient-to-r from-[oklch(0.85_0.18_155)] to-[oklch(0.72_0.15_230)] bg-clip-text text-transparent">
              satu layar
            </span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Profit, win rate, equity curve, streak, target harian — semuanya tersinkron otomatis tiap kali kamu catat trade.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl">
          <div className="rounded-3xl border border-border bg-card/40 p-3 shadow-2xl shadow-[oklch(0.78_0.18_155_/_0.12)] backdrop-blur sm:p-5">
            {/* Stat cards row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total P/L", value: "+$2,847", sub: "+12.4% bulan ini", color: "oklch(0.78 0.18 155)", icon: TrendingUp },
                { label: "Win Rate", value: "68.2%", sub: "47 menang / 22 kalah", color: "oklch(0.70 0.18 300)", icon: Target },
                { label: "Total Trade", value: "69", sub: "Bulan ini", color: "oklch(0.72 0.15 230)", icon: Activity },
                { label: "Streak 🔥", value: "5 hari", sub: "Profit beruntun", color: "oklch(0.78 0.16 50)", icon: Flame },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.label}
                    className="relative overflow-hidden rounded-2xl border border-border bg-background/60 p-4"
                    style={{ boxShadow: `inset 0 1px 0 ${c.color.replace(")", " / 0.2)")}` }}
                  >
                    <div
                      className="absolute -top-6 -right-6 size-20 rounded-full opacity-30 blur-2xl"
                      style={{ background: c.color }}
                    />
                    <div className="relative flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: c.color }}>
                      <Icon className="size-3" />
                      {c.label}
                    </div>
                    <div className="relative mt-2 font-display text-2xl font-bold">{c.value}</div>
                    <div className="relative mt-1 text-[10px] text-muted-foreground">{c.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Equity curve mock */}
            <div className="mt-3 rounded-2xl border border-border bg-background/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity Curve</div>
                  <div className="font-display text-lg font-bold text-[oklch(0.78_0.18_155)]">$12,847.50</div>
                </div>
                <div className="flex gap-1">
                  {["1M", "3M", "6M", "1Y"].map((p, i) => (
                    <span
                      key={p}
                      className={`rounded-md px-2 py-1 text-[10px] ${
                        i === 1 ? "bg-primary/15 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <svg viewBox="0 0 400 100" className="w-full" preserveAspectRatio="none" style={{ height: 100 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.18 155)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="oklch(0.78 0.18 155)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 L40,75 L80,68 L120,72 L160,55 L200,50 L240,42 L280,38 L320,28 L360,22 L400,15"
                  fill="none"
                  stroke="oklch(0.78 0.18 155)"
                  strokeWidth="2"
                />
                <path
                  d="M0,80 L40,75 L80,68 L120,72 L160,55 L200,50 L240,42 L280,38 L320,28 L360,22 L400,15 L400,100 L0,100 Z"
                  fill="url(#eqGrad)"
                />
              </svg>
            </div>

            {/* Bottom row: weekly bars + win/loss pie */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">P/L 7 Hari</div>
                <div className="flex h-20 items-end gap-2">
                  {[40, 65, -30, 55, 80, -20, 90].map((v, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${Math.abs(v)}%`,
                          background: v >= 0 ? "oklch(0.78 0.18 155)" : "oklch(0.65 0.22 25)",
                          opacity: 0.85,
                        }}
                      />
                      <span className="text-[9px] text-muted-foreground">{["S", "S", "R", "K", "J", "S", "M"][i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">Win / Loss Ratio</div>
                <div className="flex items-center gap-4">
                  <svg viewBox="0 0 64 64" className="size-16">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="oklch(0.65 0.22 25)" strokeWidth="8" />
                    <circle
                      cx="32" cy="32" r="28" fill="none"
                      stroke="oklch(0.78 0.18 155)" strokeWidth="8"
                      strokeDasharray={`${68 * 1.76} 176`}
                      transform="rotate(-90 32 32)"
                    />
                  </svg>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="size-2 rounded-full bg-[oklch(0.78_0.18_155)]" />
                      <span className="text-muted-foreground">Menang</span>
                      <span className="font-semibold">68%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="size-2 rounded-full bg-[oklch(0.65_0.22_25)]" />
                      <span className="text-muted-foreground">Kalah</span>
                      <span className="font-semibold">32%</span>
                    </div>
                  </div>
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

      <section className="border-t border-border/60 bg-card/30 py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Mobile App</p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Segera Hadir di Mobile</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Versi Android & iOS sedang dalam pengembangan. Sementara, kamu bisa install langsung
            sebagai PWA dari browser — buka menu browser lalu pilih "Add to Home Screen".
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ComingSoonBadge store="apple" />
            <ComingSoonBadge store="google" />
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

function ComingSoonBadge({ store }: { store: "apple" | "google" }) {
  const isApple = store === "apple";
  return (
    <div
      className="relative inline-flex h-[54px] w-[178px] cursor-not-allowed items-center gap-3 rounded-xl border border-white/15 bg-black px-4 opacity-80 transition hover:opacity-100"
      aria-disabled="true"
      title="Segera hadir"
    >
      {isApple ? (
        <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-white" aria-hidden="true">
          <path d="M16.365 1.43c0 1.14-.42 2.21-1.13 3-.78.86-2.05 1.52-3.1 1.43-.13-1.1.42-2.24 1.1-3.01.77-.87 2.06-1.5 3.13-1.42zM20.5 17.06c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.94-1-4.04-1-2.1.01-2.54 1.02-4.08 1-1.73-.02-3.05-1.77-4.04-3.33C-.07 16.71-.36 11.6 2.18 8.94c1.46-1.53 3.39-2.42 5.21-2.42 1.86 0 3.03 1.02 4.57 1.02 1.49 0 2.4-1.02 4.55-1.02 1.62 0 3.34.88 4.57 2.4-4.02 2.2-3.36 7.94.42 8.14z"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden="true">
          <path fill="#00d4ff" d="M3.6 1.85c-.36.38-.57.97-.57 1.74v16.82c0 .77.21 1.36.57 1.74l.07.06L13.05 12l-9.38-9.21z"/>
          <path fill="#00ffa3" d="M16.2 15.16 13.05 12l3.15-3.16.08.04 3.72 2.12c1.06.6 1.06 1.6 0 2.2l-3.72 2.12z"/>
          <path fill="#ff4d6d" d="m16.28 15.2-3.23-3.2-9.45 9.45c.35.37.92.41 1.57.04l11.11-6.29z"/>
          <path fill="#ffd24d" d="M16.28 8.8 5.17 2.51c-.65-.37-1.22-.33-1.57.04L13.05 12l3.23-3.2z"/>
        </svg>
      )}
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[9px] uppercase tracking-wide text-white/70">
          {isApple ? "Download on the" : "Get it on"}
        </span>
        <span className="font-display text-base font-semibold text-white">
          {isApple ? "App Store" : "Google Play"}
        </span>
      </div>
      <span className="absolute -right-2 -top-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
        Soon
      </span>
    </div>
  );
}
