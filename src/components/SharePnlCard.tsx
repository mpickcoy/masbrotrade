import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Trade } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import animeHappy from "@/assets/anime-happy.png";
import animeSad from "@/assets/anime-sad.png";

type Period = "today" | "week" | "month" | "all";
type Theme = "neon" | "sunset" | "mono" | "holo";
type Ratio = "story" | "square";
type DisplayMode = "money" | "percent";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trades: Trade[];
  currency?: string;
  displayName?: string | null;
  defaultPeriod?: Period;
  initialCapital?: number;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "Minggu" },
  { value: "month", label: "Bulan" },
  { value: "all", label: "All Time" },
];

const THEMES: { value: Theme; label: string }[] = [
  { value: "neon", label: "Neon Dark" },
  { value: "sunset", label: "Sunset" },
  { value: "mono", label: "Mono" },
  { value: "holo", label: "Holographic" },
];

function filterByPeriod(trades: Trade[], period: Period): Trade[] {
  if (period === "all") return trades;
  const now = new Date();
  const start = new Date();
  if (period === "today") start.setHours(0, 0, 0, 0);
  else if (period === "week") {
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return trades.filter((t) => new Date(t.traded_at) >= start);
}

function themeStyle(theme: Theme): React.CSSProperties {
  switch (theme) {
    case "neon":
      return {
        background:
          "radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a14 60%), linear-gradient(135deg, #0a0a14, #1a1a2e)",
        color: "#fff",
      };
    case "sunset":
      return {
        background:
          "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 30%, #c44569 60%, #6c5ce7 100%)",
        color: "#fff",
      };
    case "mono":
      return {
        background: "linear-gradient(180deg, #fafafa 0%, #e5e5e5 100%)",
        color: "#0a0a0a",
      };
    case "holo":
      return {
        background:
          "linear-gradient(135deg, #a8edea 0%, #fed6e3 25%, #ffd1ff 50%, #c2e9fb 75%, #a1c4fd 100%)",
        color: "#0a0a14",
      };
  }
}

export function SharePnlCard({
  open,
  onOpenChange,
  trades,
  currency = "USD",
  displayName,
  defaultPeriod = "all",
  initialCapital = 0,
}: Props) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [theme, setTheme] = useState<Theme>("neon");
  const [ratio, setRatio] = useState<Ratio>("story");
  const [mode, setMode] = useState<DisplayMode>("money");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterByPeriod(trades, period), [trades, period]);

  const stats = useMemo(() => {
    const totalPnl = filtered.reduce((s, t) => s + Number(t.pnl), 0);
    const wins = filtered.filter((t) => Number(t.pnl) > 0);
    const winRate = filtered.length ? (wins.length / filtered.length) * 100 : 0;
    const byPair = new Map<string, number>();
    filtered.forEach((t) => byPair.set(t.pair, (byPair.get(t.pair) ?? 0) + Number(t.pnl)));
    let bestPair = "—";
    let bestVal = -Infinity;
    byPair.forEach((v, k) => { if (v > bestVal) { bestVal = v; bestPair = k; } });
    const sorted = [...filtered].sort((a, b) => +new Date(a.traded_at) - +new Date(b.traded_at));
    let bal = 0;
    const curve = [0, ...sorted.map((t) => (bal += Number(t.pnl)))];
    // % return: prefer initialCapital; fallback to sum of absolute pnl (return efficiency)
    const sumAbs = filtered.reduce((s, t) => s + Math.abs(Number(t.pnl)), 0);
    const denom = initialCapital > 0 ? initialCapital : sumAbs;
    const pct = denom > 0 ? (totalPnl / denom) * 100 : 0;
    const pctBasis: "capital" | "volume" | "none" =
      initialCapital > 0 ? "capital" : sumAbs > 0 ? "volume" : "none";
    return { totalPnl, winRate, bestPair: filtered.length ? bestPair : "—", count: filtered.length, curve, pct, pctBasis };
  }, [filtered, initialCapital]);

  const periodLabel = PERIODS.find((p) => p.value === period)!.label;
  const isProfit = stats.totalPnl >= 0;

  const generate = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 2.5,
      cacheBust: true,
      backgroundColor: "#000",
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await generate();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pnl-${period}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Gambar diunduh ✨");
    } catch {
      toast.error("Gagal membuat gambar");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await generate();
      if (!blob) return;
      const file = new File([blob], `pnl-${period}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "TradeJournal P/L",
          text: `${isProfit ? "📈" : "📉"} ${periodLabel} P/L — Tracked with TradeJournal`,
        });
      } else {
        await handleDownload();
        toast.info("Browser tidak mendukung share langsung — gambar diunduh");
      }
    } catch {
      // user cancelled
    } finally {
      setBusy(false);
    }
  };

  const cardW = 360;
  const cardH = ratio === "story" ? 640 : 360;

  // Sparkline
  const spark = stats.curve;
  const min = Math.min(...spark);
  const max = Math.max(...spark);
  const range = max - min || 1;
  const sparkW = cardW - 56;
  const sparkH = ratio === "story" ? 70 : 50;
  const path = spark.length > 1
    ? spark.map((v, i) => {
        const x = (i / (spark.length - 1)) * sparkW;
        const y = sparkH - ((v - min) / range) * sparkH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ")
    : `M0,${sparkH / 2} L${sparkW},${sparkH / 2}`;

  const accent = isProfit ? "#10b981" : "#ef4444";
  const ts = themeStyle(theme);
  const subtle = theme === "mono" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)";
  const border = theme === "mono" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";

  // Main value + label
  const mainLabel =
    mode === "money"
      ? `Total P/L (${currency})`
      : stats.pctBasis === "capital"
      ? "Return on Capital"
      : stats.pctBasis === "volume"
      ? "Return Efficiency"
      : "Return";

  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  const fmtMoneySigned = (n: number) => `${n >= 0 ? "+" : ""}${fmtMoney(n, currency)}`;

  const mainValue = mode === "money" ? fmtMoneySigned(stats.totalPnl) : fmtPct(stats.pct);
  const mascot = isProfit ? animeHappy : animeSad;
  const mascotSize = ratio === "story" ? 130 : 90;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Bagikan P/L
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-5 pb-5 space-y-4">
          {/* Preview card */}
          <div className="flex justify-center">
            <div
              ref={cardRef}
              style={{
                width: cardW,
                height: cardH,
                ...ts,
                position: "relative",
                overflow: "hidden",
                borderRadius: 24,
                fontFamily: "system-ui, -apple-system, sans-serif",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* glow blob */}
              <div
                style={{
                  position: "absolute",
                  width: 280,
                  height: 280,
                  borderRadius: "50%",
                  background: accent,
                  filter: "blur(80px)",
                  opacity: theme === "mono" ? 0.18 : 0.35,
                  top: -80,
                  right: -80,
                  pointerEvents: "none",
                }}
              />

              {/* header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
                  Trade<span style={{ color: accent }}>Journal</span>
                </div>
                <div style={{ fontSize: 11, color: subtle, fontWeight: 500 }}>
                  {periodLabel.toUpperCase()}
                </div>
              </div>

              {/* mascot + main */}
              <div style={{ position: "relative", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <img
                  src={mascot}
                  alt={isProfit ? "Happy" : "Sad"}
                  width={mascotSize}
                  height={mascotSize}
                  style={{ width: mascotSize, height: mascotSize, objectFit: "contain", filter: `drop-shadow(0 8px 24px ${accent}55)` }}
                  crossOrigin="anonymous"
                />

                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 12px", borderRadius: 999,
                  background: `${accent}22`, border: `1px solid ${accent}55`,
                  fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                  color: accent,
                }}>
                  {isProfit ? "PROFIT" : "LOSS"} · {mode === "money" ? "NOMINAL" : "PERSEN"}
                </div>

                <div style={{ fontSize: 11, color: subtle, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  {mainLabel}
                </div>

                <div
                  style={{
                    fontSize: ratio === "story" ? 44 : 36,
                    fontWeight: 800,
                    letterSpacing: -1.5,
                    color: accent,
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {isProfit ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                  {mainValue}
                </div>

                {/* secondary value (the other unit) */}
                <div style={{ fontSize: 12, color: subtle, fontWeight: 500 }}>
                  {mode === "money"
                    ? stats.pctBasis !== "none" ? fmtPct(stats.pct) : ""
                    : fmtMoneySigned(stats.totalPnl)}
                </div>

                {/* sparkline */}
                <svg width={sparkW} height={sparkH} style={{ marginTop: 6 }}>
                  <defs>
                    <linearGradient id={`g-${theme}-${isProfit ? "p" : "l"}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
                      <stop offset="100%" stopColor={accent} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${path} L${sparkW},${sparkH} L0,${sparkH} Z`} fill={`url(#g-${theme}-${isProfit ? "p" : "l"})`} />
                  <path d={path} fill="none" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* stats grid */}
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    padding: 14,
                    borderRadius: 14,
                    background: theme === "mono" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${border}`,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {[
                    { l: "Win Rate", v: `${stats.winRate.toFixed(0)}%` },
                    { l: "Trades", v: String(stats.count) },
                    { l: "Best", v: stats.bestPair },
                  ].map((s) => (
                    <div key={s.l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: subtle, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {s.l}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* footer */}
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 10,
                    color: subtle,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{displayName ?? "Trader"}</span>
                  <span>masbrotrade.lovable.app</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Tampilkan sebagai</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setMode("money")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    mode === "money" ? "bg-primary text-primary-foreground" : "border bg-background"
                  }`}
                >
                  Nominal ($)
                </button>
                <button
                  onClick={() => setMode("percent")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    mode === "percent" ? "bg-primary text-primary-foreground" : "border bg-background"
                  }`}
                >
                  Persen (%)
                </button>
              </div>
              {mode === "percent" && stats.pctBasis === "volume" && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  ℹ️ Modal awal belum diatur — % dihitung dari total volume P/L (efisiensi return).
                </p>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Periode</div>
              <div className="flex gap-1.5 flex-wrap">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      period === p.value ? "bg-primary text-primary-foreground" : "border bg-background"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Tema</div>
              <div className="flex gap-1.5 flex-wrap">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      theme === t.value ? "bg-primary text-primary-foreground" : "border bg-background"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Format</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setRatio("story")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    ratio === "story" ? "bg-primary text-primary-foreground" : "border bg-background"
                  }`}
                >
                  9:16 Story
                </button>
                <button
                  onClick={() => setRatio("square")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    ratio === "square" ? "bg-primary text-primary-foreground" : "border bg-background"
                  }`}
                >
                  1:1 Feed
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action footer */}
        <div className="border-t p-4 flex gap-2 bg-background">
          <Button variant="outline" className="flex-1" onClick={handleDownload} disabled={busy || stats.count === 0}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Download
          </Button>
          <Button className="flex-1" onClick={handleShare} disabled={busy || stats.count === 0}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            Bagikan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
