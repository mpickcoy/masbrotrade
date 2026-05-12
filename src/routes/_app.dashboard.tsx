import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useProfile, useTrades, useMovements, useUpdateProfile } from "@/lib/queries";
import { computeStats, equityCurve } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";
import { AiChat } from "@/components/AiChat";
import { SharePnlCard } from "@/components/SharePnlCard";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: profile, isLoading: loadingProfile, isError: errorProfile } = useProfile();
  const { data: trades = [], isLoading: loadingTrades, isError: errorTrades } = useTrades();
  const { data: moves = [], isLoading: loadingMoves } = useMovements();
  const { mutate: updateProfile } = useUpdateProfile();
  const isLoading = loadingProfile || loadingTrades || loadingMoves;
  const isError = errorProfile || errorTrades;
  const [activeTab, setActiveTab] = useState("3M");
  const [aiInput, setAiInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [editTarget, setEditTarget] = useState(false);
  const dailyTarget = profile?.daily_target ?? 0;
  const saveTarget = () => {
    const v = Number(targetInput);
    if (!v || v <= 0) {
      toast.error("Masukkan nilai target yang valid (> 0)");
      return;
    }
    updateProfile({ daily_target: v });
    setEditTarget(false);
    setTargetInput("");
    toast.success("🎯 Target harian berhasil disimpan!");
  };
  const [shareOpen, setShareOpen] = useState(false);
  const [mood, setMood] = useState<string>(() => {
    const today = new Date().toLocaleDateString("sv-SE");
    const saved = typeof window !== "undefined" ? localStorage.getItem("mood_" + today) : null;
    return saved ?? "";
  });
  const navigate = useNavigate();
  const currency = profile?.currency ?? "USD";

  const stats = useMemo(
    () => computeStats(profile?.initial_capital ?? 0, trades, moves),
    [profile, trades, moves]
  );
  const curve = useMemo(
    () => equityCurve(profile?.initial_capital ?? 0, trades, moves),
    [profile, trades, moves]
  );

  const filteredCurve = useMemo(() => {
    if (curve.length <= 1) return curve;
    if (activeTab === "1Y") return curve;
    const now = new Date();
    const cutoff = new Date(now);
    if (activeTab === "1M") cutoff.setMonth(now.getMonth() - 1);
    else if (activeTab === "3M") cutoff.setMonth(now.getMonth() - 3);
    else if (activeTab === "6M") cutoff.setMonth(now.getMonth() - 6);
    cutoff.setHours(0, 0, 0, 0);
    return curve.filter((point, i) => {
      if (i === 0) return true;
      const pointDate = new Date(point.date);
      if (isNaN(pointDate.getTime())) return true;
      return pointDate >= cutoff;
    });
  }, [curve, activeTab]);

  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    navigate({ to: "/chat", search: { q: aiInput.trim() } });
    setAiInput("");
  };

  const streak = useMemo(() => {
    if (!trades.length) return 0;
    const sorted = [...trades].sort((a, b) => +new Date(b.traded_at) - +new Date(a.traded_at));
    const dayMap = new Map<string, number>();
    for (const t of sorted) {
      const k = new Date(t.traded_at).toLocaleDateString("sv-SE");
      dayMap.set(k, (dayMap.get(k) ?? 0) + Number(t.pnl));
    }
    const days = Array.from(dayMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    let count = 0;
    for (const [, pnl] of days) {
      if (pnl > 0) count++;
      else break;
    }
    return count;
  }, [trades]);

  const weekBars = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toLocaleDateString("sv-SE"), 0);
    }
    for (const t of trades) {
      const k = new Date(t.traded_at).toLocaleDateString("sv-SE");
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + Number(t.pnl));
    }
    return Array.from(map.entries()).map(([k, pnl]) => ({
      day: new Date(k).toLocaleDateString("id-ID", { weekday: "short" }),
      pnl,
      isToday: k === new Date().toLocaleDateString("sv-SE"),
    }));
  }, [trades]);

  const todayKey = new Date().toLocaleDateString("sv-SE");
  const hasTradeToday = trades.some(
    (t) => new Date(t.traded_at).toLocaleDateString("sv-SE") === todayKey
  );
  const hour = new Date().getHours();
  const showReminder = !hasTradeToday && hour >= 12;

  const targetProgress = dailyTarget > 0 ? Math.min((stats.daily / dailyTarget) * 100, 100) : 0;
  const targetReached = dailyTarget > 0 && stats.daily >= dailyTarget;

  const QUOTES = [
    { text: "Disiplin adalah jembatan antara tujuan dan pencapaian.", author: "Jim Rohn" },
    { text: "Trader terbaik bukan yang paling sering profit, tapi yang paling disiplin dengan loss-nya.", author: "Mark Douglas" },
    { text: "Jangan pernah risk lebih dari yang kamu siap untuk lose.", author: "Ed Seykota" },
    { text: "Pasar tidak peduli seberapa pintar kamu. Pasar hanya peduli posisi kamu.", author: "Paul Tudor Jones" },
    { text: "Bukan tentang seberapa sering kamu benar. Tapi seberapa besar kamu menang saat benar.", author: "George Soros" },
    { text: "Sabar adalah salah satu kualitas paling penting dari seorang trader.", author: "Jesse Livermore" },
    { text: "Trading bukan soal prediksi. Tapi soal manajemen probabilitas.", author: "Van K. Tharp" },
    { text: "Satu trade yang buruk tidak merusak akun. Tapi revenge trading yang merusaknya.", author: "Anonymous" },
    { text: "Ikuti sistem, bukan emosi. Emosi adalah musuh utama trader.", author: "Alexander Elder" },
    { text: "Jika kamu tidak tahu siapa dirimu di pasar, pasar adalah tempat yang mahal untuk mencari tahu.", author: "Adam Smith" },
  ];
  const todayQuote = QUOTES[new Date().getDate() % QUOTES.length];

  const MOODS = [
    { emoji: "😴", label: "Lelah", value: "tired" },
    { emoji: "😊", label: "Fokus", value: "focus" },
    { emoji: "😤", label: "Emosi", value: "emotional" },
    { emoji: "🧘", label: "Tenang", value: "calm" },
  ];
  const saveMood = (v: string) => {
    setMood(v);
    const today = new Date().toLocaleDateString("sv-SE");
    if (typeof window !== "undefined") localStorage.setItem("mood_" + today, v);
    updateProfile({ mood: `${today}|${v}` });
  };

  const computeSessions = useCallback(() => {
    const nowUTC = new Date();
    // Konversi ke WIB (UTC+7) untuk akurasi tampilan trader Indonesia
    const wibOffsetMin = 7 * 60;
    const utcMin = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes();
    const sessions = [
      { name: "Asia",     start: 0 * 60,  end: 9 * 60,  color: "#5ee7df", emoji: "🌏", timeLabel: "07:00 – 16:00 WIB" },
      { name: "London",   start: 8 * 60,  end: 17 * 60, color: "#b490f5", emoji: "🏛️", timeLabel: "15:00 – 00:00 WIB" },
      { name: "New York", start: 13 * 60, end: 22 * 60, color: "#a8f08a", emoji: "🗽", timeLabel: "20:00 – 05:00 WIB" },
    ];
    return sessions.map((s) => {
      // Cek aktif berdasarkan UTC (sesi trading pakai UTC sebagai referensi)
      const active = utcMin >= s.start && utcMin < s.end;
      const minLeft = active ? s.end - utcMin : null;
      return { ...s, active, minLeft };
    });
  }, []);
  const [tradingSessions, setTradingSessions] = useState(computeSessions);
  useEffect(() => {
    setTradingSessions(computeSessions());
    const id = setInterval(() => setTradingSessions(computeSessions()), 60_000);
    return () => clearInterval(id);
  }, [computeSessions]);

  useEffect(() => {
    if (!profile?.mood) return;
    const today = new Date().toLocaleDateString("sv-SE");
    const parts = profile.mood.split("|");
    // Guard: pastikan format "YYYY-MM-DD|value" valid
    if (parts.length < 2) return;
    const [savedDate, savedMood] = parts;
    if (savedDate === today && savedMood) setMood(savedMood);
  }, [profile?.mood]);

  const maxLossLimit = profile?.max_loss_limit ?? 0;
  const [maxLossInput, setMaxLossInput] = useState("");
  const [editMaxLoss, setEditMaxLoss] = useState(false);
  const saveMaxLoss = () => {
    const v = Math.abs(Number(maxLossInput));
    if (!v) {
      toast.error("Masukkan nilai batas loss yang valid (> 0)");
      return;
    }
    updateProfile({ max_loss_limit: v });
    setEditMaxLoss(false);
    setMaxLossInput("");
    toast.success("🛑 Batas loss harian berhasil disimpan!");
  };
  const dailyLoss = Math.min(stats.daily, 0);
  const lossUsedPct = maxLossLimit > 0 ? Math.min((Math.abs(dailyLoss) / maxLossLimit) * 100, 100) : 0;
  const maxLossHit = maxLossLimit > 0 && Math.abs(dailyLoss) >= maxLossLimit;

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const svgPath = (() => {
    // Filter out the "Start" sentinel point for display purposes,
    // keep it only as the origin baseline so graph starts correctly.
    if (filteredCurve.length < 2) return null;
    const vals = filteredCurve.map((c) => c.balance);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = filteredCurve.map((c, i) => {
      const x = (i / (filteredCurve.length - 1)) * 600;
      const y = 180 - ((c.balance - min) / range) * 160;
      return [x, y] as [number, number];
    });
    const pointsStr = pts.map(([x, y]) => `${x},${y}`).join(" ");
    const areaD = `M${pts.map(([x, y]) => `${x},${y}`).join(" L")} L600,200 L0,200 Z`;
    // Y-axis reference values (min, mid, max)
    const mid = (min + max) / 2;
    return { pointsStr, areaD, first: pts[0], last: pts[pts.length - 1], min, mid, max, pts };
  })();

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

    /* ════════════════════════════════════════════════
       LIQUID GLASS DESIGN TOKENS
    ════════════════════════════════════════════════ */
    :root {
      --glass-white:         rgba(255,255,255,0.10);
      --glass-white-md:      rgba(255,255,255,0.18);
      --glass-white-lg:      rgba(255,255,255,0.28);
      --glass-dark:          rgba(0,0,0,0.20);
      --glass-border:        rgba(255,255,255,0.20);
      --glass-border-subtle: rgba(255,255,255,0.10);
      --glass-border-bright: rgba(255,255,255,0.40);
      --blur-sm:   blur(8px);
      --blur-md:   blur(20px);
      --blur-lg:   blur(36px);
      --blur-xl:   blur(64px);
      --shadow-glass:  0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22);
      --shadow-float:  0 24px 64px rgba(0,0,0,0.50), 0 4px 16px rgba(0,0,0,0.25);
      --reflection-top: linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 55%);
      --ease-liquid: cubic-bezier(0.34,1.56,0.64,1);
      --ease-glass:  cubic-bezier(0.22,0.68,0,1.2);
      --ease-smooth: cubic-bezier(0.4,0,0.2,1);
      --dur-fast: 180ms;
      --dur-mid:  360ms;
      --dur-slow: 600ms;
      /* Trading accent palette */
      --c-profit:  #5ee7df;
      --c-loss:    #f87171;
      --c-violet:  #b490f5;
      --c-amber:   #ffd27f;
      --c-lime:    #a8f08a;
      --c-text:    #ffffff;
      --c-muted:   rgba(255,255,255,0.55);
      --c-subtle:  rgba(255,255,255,0.30);
    }

    /* ════════════════════════════════════════════════
       ANIMATED BACKGROUND BLOBS
    ════════════════════════════════════════════════ */
    .lg-scene {
      position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none;
    }
    .lg-blob {
      position:absolute; border-radius:50%; filter:blur(90px); opacity:0.45;
      animation: lg-drift var(--bd,20s) ease-in-out infinite alternate;
    }
    .lg-blob--1 { width:700px;height:700px; background:radial-gradient(circle,#5ee7df,#3b82f6); top:-220px; left:-180px; --bd:24s; }
    .lg-blob--2 { width:550px;height:550px; background:radial-gradient(circle,#b490f5,#ec4899); bottom:-200px; right:-120px; --bd:18s; animation-delay:-9s; }
    .lg-blob--3 { width:380px;height:380px; background:radial-gradient(circle,#ffd27f,#f7a8c4); top:45%; left:48%; --bd:28s; animation-delay:-14s; }
    @keyframes lg-drift {
      0%   { transform:translate(0,0) scale(1); }
      33%  { transform:translate(55px,-45px) scale(1.07); }
      66%  { transform:translate(-40px,55px) scale(0.93); }
      100% { transform:translate(28px,28px) scale(1.03); }
    }

    /* ════════════════════════════════════════════════
       BASE GLASS UTILITY
    ════════════════════════════════════════════════ */
    .glass {
      backdrop-filter: var(--blur-md);
      -webkit-backdrop-filter: var(--blur-md);
      background: var(--glass-white);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-glass);
      position: relative; overflow: hidden;
    }
    .glass::before {
      content:""; position:absolute; inset:0;
      background: var(--reflection-top);
      pointer-events:none; border-radius:inherit; z-index:1;
    }
    .glass--frosted {
      backdrop-filter: var(--blur-lg);
      -webkit-backdrop-filter: var(--blur-lg);
      background: rgba(255,255,255,0.07);
    }
    .glass--liquid {
      backdrop-filter: var(--blur-xl);
      -webkit-backdrop-filter: var(--blur-xl);
      background: rgba(255,255,255,0.055);
      border-color: rgba(255,255,255,0.15);
    }

    /* ════════════════════════════════════════════════
       KEYFRAMES
    ════════════════════════════════════════════════ */
    @keyframes lg-cardIn {
      from { opacity:0; transform:translateY(20px) scale(0.97); filter:blur(6px); }
      to   { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
    }
    @keyframes lg-pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:0.5; transform:scale(0.75); }
    }
    @keyframes lg-ripple {
      0%   { transform:scale(0); opacity:0.6; }
      100% { transform:scale(2.2); opacity:0; }
    }
    @keyframes lg-shimmer {
      0%   { background-position:-200% center; }
      100% { background-position:200% center; }
    }
    @keyframes lg-float {
      0%,100% { transform:translateY(0); }
      50%      { transform:translateY(-8px); }
    }
    @keyframes lg-glow {
      0%,100% { box-shadow: 0 0 0 0 rgba(94,231,223,0); }
      50%      { box-shadow: 0 0 28px 6px rgba(94,231,223,0.30); }
    }
    @keyframes lg-progressGrow {
      from { transform:scaleX(0); }
      to   { transform:scaleX(1); }
    }
    @keyframes lg-sesiBlink {
      0%,100% { opacity:1; } 50% { opacity:0.25; }
    }

    /* ════════════════════════════════════════════════
       LAYOUT WRAPPER
    ════════════════════════════════════════════════ */
    *, *::before, *::after { box-sizing:border-box; }

    /* CRITICAL: prevent all horizontal overflow */
    html, body { overflow-x:hidden; max-width:100vw; }
    .lg-wrap {
      position:relative; z-index:10;
      padding:16px 14px 120px;
      width:100%; max-width:100vw; overflow-x:hidden;
      font-family:'DM Mono',monospace;
      color: var(--c-text);
      box-sizing:border-box;
    }

    /* ════════════════════════════════════════════════
       TOPBAR
    ════════════════════════════════════════════════ */
    .lg-topbar {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:16px; gap:8px; min-width:0; overflow:hidden;
    }
    .lg-title {
      font-family:'Syne',sans-serif; font-weight:800;
      font-size:1.2rem; letter-spacing:-.5px; color:#fff;
      flex:1; min-width:0; overflow:hidden;
      white-space:nowrap; text-overflow:ellipsis;
    }
    .lg-title span {
      background:linear-gradient(135deg,var(--c-profit),var(--c-violet));
      -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      background-clip:text;
    }
    .lg-date-pill {
      display:flex; align-items:center; gap:6px;
      padding:8px 16px; border-radius:999px;
      font-size:.68rem; color:var(--c-muted);
    }
    .lg-share-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:8px 16px; border-radius:999px;
      font-family:'Syne',sans-serif; font-size:.72rem; font-weight:600;
      cursor:pointer; position:relative; z-index:2;
      transition:transform var(--dur-fast) var(--ease-liquid), box-shadow var(--dur-fast);
      color:#fff;
    }
    .lg-share-btn:hover { transform:translateY(-2px); box-shadow:var(--shadow-float); }
    .lg-topbar-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

    /* ════════════════════════════════════════════════
       STAT CARDS — 4 columns
    ════════════════════════════════════════════════ */
    .lg-cards {
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px; margin-bottom:16px;
      width:100%; max-width:100%;
    }
    .lg-card {
      border-radius:18px; padding:14px 14px;
      min-width:0; overflow:hidden; width:100%;
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) both;
      cursor:pointer;
      transition:transform var(--dur-mid) var(--ease-liquid), box-shadow var(--dur-mid);
    }
    .lg-card:nth-child(1){animation-delay:.06s}
    .lg-card:nth-child(2){animation-delay:.12s}
    .lg-card:nth-child(3){animation-delay:.18s}
    .lg-card:nth-child(4){animation-delay:.24s}
    .lg-card::after {
      content:""; position:absolute; inset:-1px; border-radius:inherit;
      background:linear-gradient(135deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0) 45%,rgba(255,255,255,0.06) 100%);
      opacity:0; transition:opacity var(--dur-mid); pointer-events:none; z-index:2;
    }
    .lg-card:hover { transform:translateY(-6px) scale(1.015); }
    .lg-card:hover::after { opacity:1; }
    .lg-card:hover { box-shadow:var(--shadow-float); }

    /* Card color variants */
    .lg-card--profit  { background:linear-gradient(145deg,rgba(94,231,223,0.18),rgba(59,130,246,0.10),rgba(0,0,0,0.12)); border-color:rgba(94,231,223,0.28); }
    .lg-card--winrate { background:linear-gradient(145deg,rgba(180,144,245,0.18),rgba(236,72,153,0.08),rgba(0,0,0,0.12)); border-color:rgba(180,144,245,0.28); }
    .lg-card--trades  { background:linear-gradient(145deg,rgba(168,240,138,0.14),rgba(59,130,246,0.10),rgba(0,0,0,0.12)); border-color:rgba(168,240,138,0.22); }
    .lg-card--balance { background:linear-gradient(145deg,rgba(255,210,127,0.18),rgba(247,168,196,0.08),rgba(0,0,0,0.12)); border-color:rgba(255,210,127,0.28); }

    .lg-card-orb {
      position:absolute; top:-35px; right:-35px;
      width:100px; height:100px; border-radius:50%;
      filter:blur(32px); opacity:0.45; pointer-events:none;
      transition:opacity var(--dur-mid);
    }
    .lg-card:hover .lg-card-orb { opacity:0.72; }
    .lg-card--profit  .lg-card-orb { background:var(--c-profit); }
    .lg-card--winrate .lg-card-orb { background:var(--c-violet); }
    .lg-card--trades  .lg-card-orb { background:var(--c-lime); }
    .lg-card--balance .lg-card-orb { background:var(--c-amber); }

    .lg-card-label {
      font-size:.60rem; letter-spacing:.14em; text-transform:uppercase;
      display:flex; align-items:center; gap:6px;
      margin-bottom:10px; position:relative; z-index:1;
    }
    .lg-card--profit  .lg-card-label { color:var(--c-profit); }
    .lg-card--winrate .lg-card-label { color:var(--c-violet); }
    .lg-card--trades  .lg-card-label { color:var(--c-lime); }
    .lg-card--balance .lg-card-label { color:var(--c-amber); }

    .lg-card-dot {
      width:6px; height:6px; border-radius:50%; flex-shrink:0;
      animation:lg-pulse 2.2s ease infinite;
    }
    .lg-card--profit  .lg-card-dot { background:var(--c-profit); box-shadow:0 0 8px var(--c-profit); }
    .lg-card--winrate .lg-card-dot { background:var(--c-violet); box-shadow:0 0 8px var(--c-violet); }
    .lg-card--trades  .lg-card-dot { background:var(--c-lime);   box-shadow:0 0 8px var(--c-lime); }
    .lg-card--balance .lg-card-dot { background:var(--c-amber);  box-shadow:0 0 8px var(--c-amber); }

    .lg-card-value {
      font-family:'Syne',sans-serif; font-weight:800;
      font-size:1.25rem; letter-spacing:-0.5px; line-height:1.1;
      color:#fff; margin-bottom:6px; position:relative; z-index:1;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      max-width:100%;
    }
    .lg-card-sub {
      font-size:.62rem; color:var(--c-muted);
      display:flex; align-items:center; gap:5px;
      position:relative; z-index:1;
    }
    .lg-up   { color:var(--c-profit); }
    .lg-down { color:var(--c-loss); }

    /* ════════════════════════════════════════════════
       REMINDER BANNER
    ════════════════════════════════════════════════ */
    .lg-reminder {
      border-radius:16px; padding:13px 18px; margin-bottom:16px;
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      background:rgba(255,210,127,0.09);
      border:1px solid rgba(255,210,127,0.28);
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) both;
    }
    .lg-reminder-text { font-size:.76rem; color:var(--c-amber); display:flex; align-items:center; gap:8px; }
    .lg-reminder-btn {
      border-radius:999px; padding:6px 16px;
      font-size:.68rem; font-weight:700; cursor:pointer;
      font-family:'Syne',sans-serif; white-space:nowrap;
      color:var(--c-amber); transition:transform var(--dur-fast) var(--ease-liquid);
      position:relative; z-index:2;
      background:rgba(255,210,127,0.14); border:1px solid rgba(255,210,127,0.32);
    }
    .lg-reminder-btn:hover { transform:translateY(-2px); }

    /* ════════════════════════════════════════════════
       MOOD CHECK-IN
    ════════════════════════════════════════════════ */
    .lg-mood-card {
      border-radius:16px; padding:12px 14px; margin-bottom:12px;
      display:flex; align-items:center; gap:10px;
      overflow:hidden; min-width:0; width:100%;
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .08s both;
    }
    .lg-mood-label { font-size:.70rem; color:var(--c-muted); white-space:nowrap; }
    .lg-mood-opts { display:flex; gap:6px; flex:1; min-width:0; overflow:hidden; }
    .lg-mood-btn {
      flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;
      padding:10px 6px; border-radius:14px; cursor:pointer;
      border:1px solid var(--glass-border-subtle);
      background:var(--glass-white);
      backdrop-filter:var(--blur-sm); -webkit-backdrop-filter:var(--blur-sm);
      transition:all var(--dur-mid) var(--ease-liquid);
      font-size:.62rem; color:var(--c-muted);
      position:relative;
    }
    .lg-mood-btn::before {
      content:""; position:absolute; inset:0; border-radius:inherit;
      background:var(--reflection-top); pointer-events:none; z-index:1;
    }
    .lg-mood-btn:hover { transform:translateY(-3px); background:var(--glass-white-md); color:#fff; box-shadow:var(--shadow-glass); }
    .lg-mood-btn.active {
      border-color:rgba(94,231,223,0.45);
      background:linear-gradient(135deg,rgba(94,231,223,0.20),rgba(180,144,245,0.12));
      color:var(--c-profit); box-shadow:0 4px 20px rgba(94,231,223,0.22), var(--shadow-glass);
    }
    .lg-mood-emoji { font-size:1.3rem; position:relative; z-index:2; }
    .lg-mood-warn { font-size:.63rem; color:var(--c-muted); white-space:nowrap; }

    /* ════════════════════════════════════════════════
       TARGET HARIAN
    ════════════════════════════════════════════════ */
    .lg-target-card {
      border-radius:16px; padding:14px 14px; margin-bottom:12px;
      overflow:hidden; min-width:0; width:100%;
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .10s both;
    }
    .lg-target-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .lg-target-title { font-family:'Syne',sans-serif; font-weight:700; font-size:.9rem; color:#fff; }
    .lg-target-edit {
      font-size:.65rem; color:var(--c-muted); background:none; border:none;
      cursor:pointer; padding:4px 10px; border-radius:8px;
      transition:all var(--dur-fast);
    }
    .lg-target-edit:hover { color:#fff; background:var(--glass-white); }
    .lg-target-vals { display:flex; justify-content:space-between; font-size:.68rem; color:var(--c-muted); margin-bottom:8px; }
    .lg-target-bar-bg { height:7px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden; }
    .lg-target-bar-fg {
      height:100%; border-radius:999px;
      animation:lg-progressGrow var(--dur-slow) var(--ease-liquid) both;
      transform-origin:left;
    }
    .lg-target-row { display:flex; align-items:center; gap:8px; }
    .lg-target-input {
      flex:1; background:var(--glass-white); border:1px solid var(--glass-border-subtle);
      backdrop-filter:var(--blur-sm); -webkit-backdrop-filter:var(--blur-sm);
      border-radius:10px; padding:8px 13px; color:#fff;
      font-family:'DM Mono',monospace; font-size:.78rem; outline:none;
      transition:border-color var(--dur-fast), box-shadow var(--dur-fast);
    }
    .lg-target-input:focus { border-color:rgba(94,231,223,0.50); box-shadow:0 0 0 3px rgba(94,231,223,0.12); }
    .lg-target-save {
      background:linear-gradient(135deg,rgba(94,231,223,0.5),rgba(59,130,246,0.5));
      border:1px solid rgba(94,231,223,0.40);
      box-shadow:0 4px 20px rgba(94,231,223,0.25);
      border-radius:10px; padding:8px 16px;
      color:#fff; font-weight:700; font-size:.70rem; cursor:pointer;
      font-family:'Syne',sans-serif; white-space:nowrap;
      transition:transform var(--dur-fast) var(--ease-liquid), box-shadow var(--dur-fast);
      position:relative;
    }
    .lg-target-save:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(94,231,223,0.40); }
    .lg-reached-badge {
      display:inline-flex; align-items:center; gap:5px;
      background:rgba(94,231,223,0.14); border:1px solid rgba(94,231,223,0.30);
      border-radius:999px; padding:3px 12px; font-size:.63rem; color:var(--c-profit);
      animation:lg-cardIn var(--dur-mid) ease both;
    }

    /* ════════════════════════════════════════════════
       STREAK + DAILY BARS ROW
    ════════════════════════════════════════════════ */
    .lg-extra-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; width:100%; }
    .lg-extra-row > * { min-width:0; }

    .lg-streak-card {
      border-radius:20px; padding:20px;
      display:flex; flex-direction:column; justify-content:space-between;
      background:linear-gradient(145deg,rgba(255,210,127,0.16),rgba(255,140,0,0.08),rgba(0,0,0,0.14));
      border-color:rgba(255,210,127,0.24);
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .14s both;
    }
    .lg-streak-label { font-size:.60rem; letter-spacing:.12em; text-transform:uppercase; color:var(--c-amber); display:flex; align-items:center; gap:6px; }
    .lg-streak-dot   { width:6px; height:6px; border-radius:50%; background:var(--c-amber); box-shadow:0 0 8px var(--c-amber); }
    .lg-streak-val   { font-family:'Syne',sans-serif; font-weight:800; font-size:2.6rem; letter-spacing:-2px; color:#fff; line-height:1; position:relative; z-index:1; }
    .lg-streak-fire  { font-size:1.5rem; }
    .lg-streak-sub   { font-size:.62rem; color:var(--c-muted); }

    .lg-bars-card {
      border-radius:20px; padding:20px 22px;
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .16s both;
    }
    .lg-bars-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .lg-bars-title  { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#fff; }
    .lg-bars-inner  { display:flex; align-items:flex-end; gap:7px; height:72px; }
    .lg-bar-wrap    { flex:1; display:flex; flex-direction:column; align-items:center; gap:5px; height:100%; justify-content:flex-end; }
    .lg-bar         { width:100%; border-radius:5px 5px 3px 3px; min-height:3px; transition:height .5s var(--ease-liquid); position:relative; overflow:hidden; }
    .lg-bar::after  {
      content:""; position:absolute; inset:0;
      background:linear-gradient(135deg,rgba(255,255,255,0.25),transparent 55%);
      pointer-events:none;
    }
    .lg-bar.pos  { background:linear-gradient(180deg,rgba(94,231,223,0.9),rgba(94,231,223,0.35)); box-shadow:0 4px 12px rgba(94,231,223,0.20); }
    .lg-bar.neg  { background:linear-gradient(180deg,rgba(248,113,113,0.9),rgba(248,113,113,0.35)); box-shadow:0 4px 12px rgba(248,113,113,0.20); }
    .lg-bar.zero { background:rgba(255,255,255,0.08); }
    .lg-bar-day  { font-size:.58rem; color:var(--c-subtle); white-space:nowrap; }
    .lg-bar-day.today { color:var(--c-profit); }

    /* ════════════════════════════════════════════════
       TOP PAIRS + QUOTE
    ════════════════════════════════════════════════ */
    .lg-pairs-quote-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px; }
    .lg-pairs-quote-row > * { min-width:0; }

    .lg-pairs-card { border-radius:20px; padding:20px 22px; animation:lg-cardIn var(--dur-slow) var(--ease-glass) .18s both; }
    .lg-pairs-title { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#fff; margin-bottom:14px; }
    .lg-pair-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
    .lg-pair-row:last-child { border-bottom:none; }
    .lg-pair-rank { width:22px; font-size:.68rem; }
    .lg-pair-name { flex:1; font-size:.78rem; font-weight:500; color:#fff; }
    .lg-pair-wr   { font-size:.62rem; color:var(--c-muted); margin-right:6px; }
    .lg-pair-pnl  { font-family:'Syne',sans-serif; font-weight:700; font-size:.78rem; }

    .lg-quote-card {
      border-radius:20px; padding:22px;
      background:linear-gradient(145deg,rgba(180,144,245,0.14),rgba(236,72,153,0.07),rgba(0,0,0,0.14));
      border-color:rgba(180,144,245,0.22);
      display:flex; flex-direction:column; justify-content:space-between;
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .20s both;
    }
    .lg-quote-icon   { font-size:1.6rem; margin-bottom:8px; }
    .lg-quote-text   { font-size:.78rem; line-height:1.65; color:rgba(255,255,255,0.80); font-style:italic; flex:1; }
    .lg-quote-author { font-size:.62rem; color:var(--c-violet); margin-top:12px; }

    /* ════════════════════════════════════════════════
       TRADING SESSIONS
    ════════════════════════════════════════════════ */
    .lg-sesi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
    .lg-sesi-card {
      border-radius:18px; padding:16px;
      display:flex; flex-direction:column; gap:6px;
      transition:border-color var(--dur-mid), box-shadow var(--dur-mid);
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .22s both;
    }
    .lg-sesi-card.active { animation:lg-glow 2.8s ease-in-out infinite; }
    .lg-sesi-top  { display:flex; align-items:center; justify-content:space-between; }
    .lg-sesi-name { font-family:'Syne',sans-serif; font-weight:700; font-size:.80rem; color:#fff; display:flex; align-items:center; gap:6px; }
    .lg-sesi-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .lg-sesi-dot.active { animation:lg-sesiBlink 1.4s ease-in-out infinite; }
    .lg-sesi-badge {
      font-size:.56rem; font-weight:700; padding:3px 9px; border-radius:999px;
      letter-spacing:.06em; text-transform:uppercase;
    }
    .lg-sesi-badge.live { background:rgba(94,231,223,0.18); color:var(--c-profit); border:1px solid rgba(94,231,223,0.32); }
    .lg-sesi-badge.closed { background:rgba(255,255,255,0.06); color:var(--c-subtle); border:1px solid rgba(255,255,255,0.10); }
    .lg-sesi-time { font-size:.60rem; color:var(--c-muted); }
    .lg-sesi-timeleft { font-size:.60rem; color:var(--c-profit); }

    /* ════════════════════════════════════════════════
       MAX LOSS HARIAN
    ════════════════════════════════════════════════ */
    .lg-maxloss-card {
      border-radius:20px; padding:20px 22px; margin-bottom:16px;
      transition:border-color var(--dur-mid), box-shadow var(--dur-mid);
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .24s both;
    }
    .lg-maxloss-card.hit {
      border-color:rgba(248,113,113,0.40)!important;
      box-shadow:0 0 0 1px rgba(248,113,113,0.20), 0 10px 32px rgba(248,113,113,0.16)!important;
    }
    .lg-maxloss-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .lg-maxloss-title  { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#fff; }
    .lg-maxloss-edit   { font-size:.65rem; color:var(--c-muted); background:none; border:none; cursor:pointer; padding:4px 10px; border-radius:8px; transition:all var(--dur-fast); }
    .lg-maxloss-edit:hover { color:#fff; background:var(--glass-white); }
    .lg-maxloss-alert {
      display:flex; align-items:center; gap:8px; padding:10px 14px;
      background:rgba(248,113,113,0.10); border:1px solid rgba(248,113,113,0.28);
      border-radius:13px; font-size:.75rem; color:var(--c-loss); margin-bottom:12px;
      animation:lg-cardIn var(--dur-mid) ease both;
    }
    .lg-maxloss-vals { display:flex; justify-content:space-between; font-size:.67rem; color:var(--c-muted); margin-bottom:8px; }
    .lg-maxloss-bar-bg { height:7px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden; }
    .lg-maxloss-bar-fg { height:100%; border-radius:999px; animation:lg-progressGrow var(--dur-slow) var(--ease-liquid) both; transform-origin:left; }
    .lg-maxloss-input {
      flex:1; background:var(--glass-white); border:1px solid var(--glass-border-subtle);
      backdrop-filter:var(--blur-sm); -webkit-backdrop-filter:var(--blur-sm);
      border-radius:10px; padding:8px 13px; color:#fff;
      font-family:'DM Mono',monospace; font-size:.78rem; outline:none;
      transition:border-color var(--dur-fast), box-shadow var(--dur-fast);
    }
    .lg-maxloss-input:focus { border-color:rgba(248,113,113,0.50); box-shadow:0 0 0 3px rgba(248,113,113,0.12); }
    .lg-maxloss-save {
      background:linear-gradient(135deg,rgba(248,113,113,0.50),rgba(220,38,38,0.50));
      border:1px solid rgba(248,113,113,0.40);
      box-shadow:0 4px 20px rgba(248,113,113,0.24);
      border-radius:10px; padding:8px 16px;
      color:#fff; font-weight:700; font-size:.70rem; cursor:pointer;
      font-family:'Syne',sans-serif; white-space:nowrap;
      transition:transform var(--dur-fast) var(--ease-liquid);
      position:relative;
    }
    .lg-maxloss-save:hover { transform:translateY(-2px); }

    /* ════════════════════════════════════════════════
       RR + PIE ROW
    ════════════════════════════════════════════════ */
    .lg-rr-pie-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px; }
    .lg-rr-pie-row > * { min-width:0; }

    .lg-rr-card  { border-radius:20px; padding:20px 22px; animation:lg-cardIn var(--dur-slow) var(--ease-glass) .26s both; }
    .lg-rr-title { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#fff; margin-bottom:14px; }
    .lg-rr-grid  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .lg-rr-item  { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px 14px; backdrop-filter:var(--blur-sm); -webkit-backdrop-filter:var(--blur-sm); }
    .lg-rr-lbl   { font-size:.58rem; letter-spacing:.10em; text-transform:uppercase; color:var(--c-muted); margin-bottom:6px; }
    .lg-rr-val   { font-family:'Syne',sans-serif; font-weight:800; font-size:1.25rem; letter-spacing:-.5px; }
    .lg-rr-sub   { font-size:.58rem; color:var(--c-muted); margin-top:3px; }

    .lg-pie-card  { border-radius:20px; padding:20px 22px; display:flex; flex-direction:column; animation:lg-cardIn var(--dur-slow) var(--ease-glass) .28s both; }
    .lg-pie-title { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#fff; margin-bottom:14px; }
    .lg-pie-inner { display:flex; align-items:center; gap:20px; flex:1; }
    .lg-pie-legend { display:flex; flex-direction:column; gap:10px; flex:1; }
    .lg-pie-leg   { display:flex; align-items:center; gap:8px; font-size:.72rem; }
    .lg-pie-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .lg-pie-lname { color:var(--c-muted); flex:1; }
    .lg-pie-lpct  { font-weight:500; color:#fff; }

    /* ════════════════════════════════════════════════
       AI BAR (desktop)
    ════════════════════════════════════════════════ */
    .lg-ai-bar {
      border-radius:18px; padding:14px 18px; margin-bottom:18px;
      display:flex; align-items:center; gap:12px;
      transition:border-color var(--dur-mid), box-shadow var(--dur-mid);
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .30s both;
      position:relative; z-index:2;
    }
    .lg-ai-bar:focus-within {
      border-color:rgba(94,231,223,0.40);
      box-shadow:0 0 0 3px rgba(94,231,223,0.08), var(--shadow-glass);
    }
    .lg-ai-indicator {
      width:36px; height:36px; border-radius:11px; flex-shrink:0;
      background:linear-gradient(135deg,rgba(94,231,223,0.6),rgba(59,130,246,0.6));
      border:1px solid rgba(94,231,223,0.45);
      display:flex; align-items:center; justify-content:center;
      font-size:.72rem; font-weight:700; color:#000;
      animation:lg-glow 3s ease-in-out infinite;
      position:relative; z-index:2;
    }
    .lg-ai-input {
      flex:1; min-width:0; background:transparent; border:none; outline:none;
      color:#fff; font-family:'DM Mono',monospace; font-size:.78rem;
    }
    .lg-ai-input::placeholder { color:var(--c-subtle); }
    .lg-ai-send {
      background:linear-gradient(135deg,rgba(94,231,223,0.55),rgba(59,130,246,0.55));
      border:1px solid rgba(94,231,223,0.40);
      border-radius:11px; padding:9px 18px;
      color:#fff; font-family:'Syne',sans-serif; font-weight:700;
      font-size:.70rem; cursor:pointer; letter-spacing:.04em;
      white-space:nowrap; flex-shrink:0;
      transition:transform var(--dur-fast) var(--ease-liquid), box-shadow var(--dur-fast);
      position:relative; z-index:2;
    }
    .lg-ai-send:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(94,231,223,0.38); }

    /* ════════════════════════════════════════════════
       BOTTOM GRID — equity curve + trade feed
    ════════════════════════════════════════════════ */
    .lg-bottom-grid { display:grid; grid-template-columns:1fr; gap:14px; }

    .lg-chart-card {
      border-radius:20px; padding:24px 26px;
      animation:lg-cardIn var(--dur-slow) var(--ease-glass) .32s both;
    }
    .lg-chart-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
    .lg-chart-title  { font-family:'Syne',sans-serif; font-weight:700; font-size:.92rem; color:#fff; }
    .lg-tabs { display:flex; gap:4px; padding:3px; border-radius:999px; background:rgba(255,255,255,0.06); }
    .lg-tab {
      padding:5px 13px; border-radius:999px; font-size:.64rem; letter-spacing:.06em;
      text-transform:uppercase; cursor:pointer; color:var(--c-muted);
      background:transparent; border:none;
      transition:all var(--dur-mid) var(--ease-liquid);
      font-family:'DM Mono',monospace; position:relative; z-index:2;
    }
    .lg-tab.active {
      background:rgba(94,231,223,0.22);
      border:1px solid rgba(94,231,223,0.32);
      color:var(--c-profit);
      box-shadow:0 2px 10px rgba(94,231,223,0.18);
    }
    .lg-tab:hover:not(.active) { color:#fff; }
    .lg-chart-lbl { fill:var(--c-subtle); font-size:10px; font-family:'DM Mono',monospace; }

    /* ════════════════════════════════════════════════
       LOADING SKELETONS
    ════════════════════════════════════════════════ */
    .lg-skel {
      border-radius:var(--r, 10px); background:rgba(255,255,255,0.07);
      position:relative; overflow:hidden;
    }
    .lg-skel::after {
      content:""; position:absolute; inset:0;
      background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.14) 45%,rgba(255,255,255,0.22) 50%,rgba(255,255,255,0.14) 55%,rgba(255,255,255,0) 100%);
      background-size:200% auto;
      animation:lg-shimmer 1.8s linear infinite;
    }

    /* ════════════════════════════════════════════════
       RESPONSIVE — TABLET ≤ 1024px
    ════════════════════════════════════════════════ */
    @media (min-width:900px) {
      .lg-wrap  { padding:24px 28px 120px; }
      .lg-cards { grid-template-columns:repeat(4,1fr); gap:14px; }
      .lg-card  { padding:22px 20px; border-radius:22px; }
      .lg-card-value { font-size:1.72rem; white-space:normal; }
      .lg-title { font-size:1.5rem; }
    }
    @media (max-width:1024px) {
      .lg-wrap            { padding:14px 14px 120px; overflow-x:hidden; }
      .lg-cards           { grid-template-columns:repeat(2,1fr); gap:10px; }
      .lg-extra-row       { grid-template-columns:1fr 1fr; }
      .lg-pairs-quote-row { grid-template-columns:1fr; }
      .lg-rr-pie-row      { grid-template-columns:1fr; }
      .lg-bottom-grid     { grid-template-columns:1fr; }
    }

    /* ════════════════════════════════════════════════
       RESPONSIVE — MOBILE ≤ 640px
    ════════════════════════════════════════════════ */
    @media (max-width:640px) {
      .lg-wrap    { padding:10px 10px 120px; max-width:100vw; overflow-x:hidden; }
      .lg-topbar  { margin-bottom:10px; }
      .lg-title   { font-size:.95rem; }
      .lg-date-pill { display:none; }

      .lg-cards { grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:10px; width:100%; }
      .lg-card  { padding:12px 10px; border-radius:14px; min-width:0; overflow:hidden; }
      .lg-card-label { font-size:.52rem; gap:4px; margin-bottom:5px; }
      .lg-card-value { font-size:1.1rem; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .lg-card-sub   { font-size:.54rem; }

      .lg-ai-bar { display:none; }

      .lg-reminder { flex-direction:column; align-items:flex-start; gap:8px; padding:10px 12px; margin-bottom:10px; }
      .lg-reminder-btn { width:100%; text-align:center; padding:8px; }

      .lg-mood-card  { padding:12px 12px; margin-bottom:10px; gap:8px; flex-wrap:wrap; border-radius:16px; }
      .lg-mood-label { font-size:.66rem; width:100%; }
      .lg-mood-opts  { gap:5px; flex:1; width:100%; }
      .lg-mood-btn   { padding:9px 4px; font-size:.56rem; border-radius:12px; min-width:0; }
      .lg-mood-emoji { font-size:1.1rem; }
      .lg-mood-warn  { display:none; }

      .lg-target-card { padding:13px 12px; margin-bottom:10px; border-radius:16px; }
      .lg-target-title { font-size:.82rem; }

      .lg-extra-row { grid-template-columns:1fr; gap:8px; margin-bottom:10px; }
      .lg-streak-card { padding:14px 14px; flex-direction:row; align-items:center; gap:12px; border-radius:16px; }
      .lg-streak-val  { font-size:1.8rem; }
      .lg-bars-card   { padding:12px 13px; border-radius:16px; }
      .lg-bars-inner  { height:50px; gap:4px; }
      .lg-bar-day     { font-size:.52rem; }

      .lg-pairs-quote-row { grid-template-columns:1fr; gap:8px; margin-bottom:10px; }
      .lg-pairs-card { padding:13px 13px; border-radius:16px; }
      .lg-quote-card { padding:13px 13px; border-radius:16px; }

      .lg-sesi-row {
        display:flex; gap:8px; overflow-x:auto; margin-bottom:10px;
        padding-bottom:4px; scroll-snap-type:x mandatory;
        -webkit-overflow-scrolling:touch;
      }
      .lg-sesi-card { flex:0 0 48%; scroll-snap-align:start; padding:11px 12px; border-radius:14px; }

      .lg-maxloss-card { padding:13px 12px; margin-bottom:10px; border-radius:16px; }
      .lg-rr-pie-row   { grid-template-columns:1fr; gap:8px; margin-bottom:10px; }
      .lg-rr-card  { padding:13px 13px; border-radius:16px; }
      .lg-rr-val   { font-size:1.05rem; }
      .lg-pie-card { padding:13px 13px; border-radius:16px; }

      .lg-bottom-grid { grid-template-columns:1fr; gap:8px; }
      .lg-chart-card  { padding:13px 12px; border-radius:16px; }
    }

    @media (max-width:390px) {
      .lg-wrap      { padding:10px 10px 110px; }
      .lg-card-value { font-size:1rem; }
      .lg-streak-val { font-size:1.6rem; }
      .lg-sesi-card  { flex:0 0 56%; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Animated liquid background blobs */}
      <div className="lg-scene" aria-hidden="true">
        <div className="lg-blob lg-blob--1" />
        <div className="lg-blob lg-blob--2" />
        <div className="lg-blob lg-blob--3" />
      </div>

      <div className="lg-wrap">

        {/* ── Loading skeleton ── */}
        {isLoading && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:14, width:"100%" }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass glass--frosted lg-skel" style={{ borderRadius:22, padding:"22px 20px", animationDelay:`${i*.08}s`, "--r":"22px" } as any}>
                  <div className="lg-skel" style={{ height:10, width:"50%", borderRadius:6, marginBottom:14 }} />
                  <div className="lg-skel" style={{ height:28, width:"75%", borderRadius:9, marginBottom:10 }} />
                  <div className="lg-skel" style={{ height:8, width:"40%", borderRadius:6 }} />
                </div>
              ))}
            </div>
            <div className="glass glass--frosted" style={{ borderRadius:20, height:220 }} />
          </div>
        )}

        {/* ── Error state ── */}
        {!isLoading && isError && (
          <div className="glass glass--frosted" style={{
            borderRadius:18, padding:"24px 20px", marginBottom:20,
            borderColor:"rgba(248,113,113,0.30)",
            display:"flex", alignItems:"center", gap:14,
          }}>
            <span style={{ fontSize:"1.8rem" }}>⚠️</span>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, marginBottom:4, color:"#fff" }}>Gagal memuat data</div>
              <div style={{ fontSize:".76rem", color:"rgba(248,113,113,0.80)" }}>Periksa koneksi internet Anda, lalu refresh halaman.</div>
            </div>
            <button type="button" onClick={() => window.location.reload()}
              className="glass glass--frosted"
              style={{ marginLeft:"auto", borderRadius:10, padding:"8px 18px", color:"#f87171", fontWeight:700, fontSize:".75rem", cursor:"pointer", whiteSpace:"nowrap", borderColor:"rgba(248,113,113,0.30)" }}>
              Refresh ↺
            </button>
          </div>
        )}

        {!isLoading && !isError && (<>

        {/* ─── TOPBAR ─── */}
        <div className="lg-topbar">
          <h1 className="lg-title">
            Halo, <span>{profile?.display_name?.split(" ")[0] ?? profile?.id?.slice(0, 6) ?? "Trader"}</span> 👋
          </h1>
          <div className="lg-topbar-right">
            <button onClick={() => setShareOpen(true)} className="glass glass--frosted lg-share-btn" type="button">
              <Share2 size={13} /> Bagikan
            </button>
            <div className="glass glass--frosted lg-date-pill">◷ &nbsp;{today}</div>
          </div>
        </div>

        {/* ─── STAT CARDS ─── */}
        <div className="lg-cards">
          {[
            { cls:"profit",  label:"Profit Bulan Ini", value:fmtMoney(stats.monthly,currency), sub: `${stats.monthly>=0?"▲":"▼"} bulan ini`, up:stats.monthly>=0 },
            { cls:"winrate", label:"Win Rate",         value:`${stats.winRate.toFixed(1)}%`,   sub:`${stats.winRate>=50?"▲":"▼"} ${stats.tradeCount} trade`, up:stats.winRate>=50 },
            { cls:"trades",  label:"Total Trade",      value:`${stats.tradeCount}`,             sub:"▲ semua waktu", up:true },
            { cls:"balance", label:"Saldo Akun",       value:fmtMoney(stats.balance,currency),  sub:`${stats.daily>=0?"▲":"▼"} ${fmtMoney(Math.abs(stats.daily),currency)} hari ini`, up:stats.daily>=0 },
          ].map((c) => (
            <div key={c.cls} className={`glass glass--frosted lg-card lg-card--${c.cls}`}
              onClick={() => navigate({ to: "/statistik" })}
              title="Lihat statistik lengkap">
              <div className="lg-card-orb" />
              <div className="lg-card-label"><span className="lg-card-dot" />{c.label}</div>
              <div className="lg-card-value">{c.value}</div>
              <div className="lg-card-sub"><span className={c.up?"lg-up":"lg-down"}>{c.sub}</span></div>
            </div>
          ))}
        </div>

        {/* ─── AI CHAT — tepat di bawah stat cards ─── */}
        <div style={{marginBottom:12,position:"relative",zIndex:2}}>
          <AiChat />
        </div>

        {/* ─── REMINDER ─── */}
        {showReminder && (
          <div className="lg-reminder">
            <div className="lg-reminder-text"><span>⚡</span><span>Belum ada trade hari ini — sudah trading?</span></div>
            <button className="glass glass--frosted lg-reminder-btn" type="button" onClick={() => navigate({ to:"/chat" })}>
              Catat Sekarang ↗
            </button>
          </div>
        )}

        {/* ─── MOOD CHECK-IN ─── */}
        <div className="glass glass--frosted lg-mood-card">
          <div className="lg-mood-label">Kondisi hari ini:</div>
          <div className="lg-mood-opts">
            {MOODS.map((m) => (
              <button key={m.value} type="button" className={`lg-mood-btn${mood===m.value?" active":""}`} onClick={() => saveMood(m.value)}>
                <span className="lg-mood-emoji">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
          {mood && (
            <div className="lg-mood-warn">
              {mood==="emotional"?"⚠️ Hati-hati saat emosi":mood==="tired"?"😴 Pertimbangkan reduce lot":mood==="focus"?"✅ Kondisi ideal!":"🧘 Good mindset"}
            </div>
          )}
        </div>

        {/* ─── TARGET HARIAN ─── */}
        <div className="glass glass--frosted lg-target-card">
          <div className="lg-target-header">
            <div className="lg-target-title">🎯 Target Harian</div>
            {dailyTarget>0 && !editTarget && (
              <button className="lg-target-edit" type="button" onClick={()=>setEditTarget(true)}>Ubah target</button>
            )}
          </div>
          {(dailyTarget===0||editTarget) ? (
            <div className="lg-target-row">
              <input className="lg-target-input" type="number" placeholder={`Target profit harian (${currency})`}
                value={targetInput} onChange={(e)=>setTargetInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&saveTarget()} />
              <button className="lg-target-save" type="button" onClick={saveTarget}>Set</button>
              {editTarget&&<button className="lg-target-edit" type="button" onClick={()=>setEditTarget(false)}>Batal</button>}
            </div>
          ) : (
            <>
              <div className="lg-target-vals">
                <span>{fmtMoney(Math.max(stats.daily,0),currency)} <span style={{color:"var(--c-subtle)"}}>/ {fmtMoney(dailyTarget,currency)}</span></span>
                {targetReached
                  ? <span className="lg-reached-badge">✓ Target Tercapai 🎉</span>
                  : <span style={{color:stats.daily<0?"var(--c-loss)":"var(--c-muted)"}}>{targetProgress.toFixed(0)}%</span>
                }
              </div>
              <div className="lg-target-bar-bg">
                <div className="lg-target-bar-fg" style={{
                  width:`${targetProgress}%`,
                  background:targetReached?"linear-gradient(90deg,var(--c-profit),var(--c-violet))":stats.daily<0?"var(--c-loss)":"linear-gradient(90deg,var(--c-profit),var(--c-violet))",
                }} />
              </div>
            </>
          )}
        </div>

        {/* ─── STREAK + DAILY BARS ─── */}
        <div className="lg-extra-row">
          <div className="glass glass--frosted lg-streak-card">
            <div className="lg-streak-label"><span className="lg-streak-dot" />Profit Streak</div>
            <div style={{display:"flex",alignItems:"baseline",gap:8,margin:"10px 0 6px",position:"relative",zIndex:1}}>
              <div className="lg-streak-val">{streak}</div>
              <div className="lg-streak-fire">{streak>=5?"🔥":streak>=3?"⚡":streak>=1?"✨":"💤"}</div>
            </div>
            <div className="lg-streak-sub">{streak===0?"Mulai streak hari ini!":streak===1?"1 hari berturut-turut":`${streak} hari berturut-turut`}</div>
          </div>
          <div className="glass glass--frosted lg-bars-card">
            <div className="lg-bars-header">
              <div className="lg-bars-title">P/L 7 Hari Terakhir</div>
              <div style={{fontSize:".66rem",color:stats.weekly>=0?"var(--c-profit)":"var(--c-loss)"}}>
                {stats.weekly>=0?"+":""}{fmtMoney(stats.weekly,currency)} minggu ini
              </div>
            </div>
            <div className="lg-bars-inner">
              {(() => {
                const maxAbs = Math.max(...weekBars.map((b)=>Math.abs(b.pnl)),1);
                return weekBars.map((b) => {
                  const heightPct = (Math.abs(b.pnl)/maxAbs)*100;
                  return (
                    <div key={b.day} className="lg-bar-wrap">
                      <div className={`lg-bar ${b.pnl>0?"pos":b.pnl<0?"neg":"zero"}`}
                        style={{height:b.pnl===0?"4px":`${Math.max(heightPct,8)}%`}}
                        title={fmtMoney(b.pnl,currency)} />
                      <div className={`lg-bar-day${b.isToday?" today":""}`}>{b.isToday?"Hari ini":b.day}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* ─── SESI TRADING ─── */}
        <div className="lg-sesi-row">
          {tradingSessions.map((s)=>(
            <div key={s.name} className={`glass glass--frosted lg-sesi-card${s.active?" active":""}`}
              style={s.active?{borderColor:`${s.color}50`,boxShadow:`0 8px 28px ${s.color}22`}:{}}>
              {s.active&&<div style={{position:"absolute",inset:0,borderRadius:"inherit",background:`radial-gradient(circle at 80% 20%,${s.color}18,transparent 60%)`,pointerEvents:"none"}}/>}
              <div className="lg-sesi-top">
                <div className="lg-sesi-name">
                  <span className={`lg-sesi-dot${s.active?" active":""}`} style={{background:s.active?s.color:"rgba(255,255,255,0.20)",boxShadow:s.active?`0 0 8px ${s.color}`:"none"}} />
                  {s.emoji} {s.name}
                </div>
                <span className={`lg-sesi-badge ${s.active?"live":"closed"}`}>{s.active?"LIVE":"Tutup"}</span>
              </div>
              <div className="lg-sesi-time" style={{color:s.active?s.color:"var(--c-muted)"}}>
                {s.timeLabel}
              </div>
              {s.active&&s.minLeft!==null&&(
                <div className="lg-sesi-timeleft" style={{color:s.color}}>⏱ Tutup dalam {Math.floor(s.minLeft/60)}j {s.minLeft%60}m</div>
              )}
            </div>
          ))}
        </div>

        {/* ─── MAX LOSS HARIAN ─── */}
        <div className={`glass glass--frosted lg-maxloss-card${maxLossHit?" hit":""}`}>
          <div className="lg-maxloss-header">
            <div className="lg-maxloss-title">🛑 Batas Loss Harian</div>
            {maxLossLimit>0&&!editMaxLoss&&(
              <button className="lg-maxloss-edit" type="button" onClick={()=>setEditMaxLoss(true)}>Ubah batas</button>
            )}
          </div>
          {maxLossHit&&(
            <div className="lg-maxloss-alert">
              <span>🚨</span><span><strong>Stop trading hari ini!</strong> Batas loss harian sudah tercapai.</span>
            </div>
          )}
          {(maxLossLimit===0||editMaxLoss) ? (
            <div className="lg-target-row">
              <input className="lg-maxloss-input" type="number" placeholder={`Maks loss per hari (${currency})`}
                value={maxLossInput} onChange={(e)=>setMaxLossInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&saveMaxLoss()} />
              <button className="lg-maxloss-save" type="button" onClick={saveMaxLoss}>Set</button>
              {editMaxLoss&&<button className="lg-maxloss-edit" type="button" onClick={()=>setEditMaxLoss(false)}>Batal</button>}
            </div>
          ) : (
            <>
              <div className="lg-maxloss-vals">
                <span>Loss hari ini: <span style={{color:dailyLoss<0?"var(--c-loss)":"var(--c-muted)"}}>
                  {fmtMoney(Math.abs(dailyLoss),currency)}
                </span> <span style={{color:"var(--c-muted)"}}>/ {fmtMoney(maxLossLimit,currency)}</span></span>
                {dailyLoss === 0
                  ? <span style={{color:"var(--c-profit)",fontSize:".64rem"}}>✓ Aman</span>
                  : <span style={{color:maxLossHit?"var(--c-loss)":lossUsedPct>70?"var(--c-amber)":"var(--c-muted)"}}>{lossUsedPct.toFixed(0)}% terpakai</span>
                }
              </div>
              <div className="lg-maxloss-bar-bg">
                <div className="lg-maxloss-bar-fg" style={{
                  width:`${lossUsedPct}%`,
                  background:maxLossHit?"var(--c-loss)":lossUsedPct>70?"linear-gradient(90deg,var(--c-amber),var(--c-loss))":"linear-gradient(90deg,var(--c-profit),var(--c-amber))",
                }} />
              </div>
            </>
          )}
        </div>

        {/* ─── AI BAR (desktop) ─── */}
        <div className="glass glass--frosted lg-ai-bar">
          <div className="lg-ai-indicator">AI</div>
          <input className="lg-ai-input" type="text" value={aiInput}
            onChange={(e)=>setAiInput(e.target.value)}
            onKeyDown={(e)=>e.key==="Enter"&&handleAiSend()}
            placeholder="Ketik trade kamu… cth: Long BTC entry 65000 exit 66000 lot 0.1" />
          <button className="lg-ai-send" type="button" onClick={handleAiSend}>CATAT ↗</button>
        </div>

        {/* ─── BOTTOM GRID — equity curve + trade feed ─── */}
        <div className="lg-bottom-grid">
          <div className="glass glass--frosted lg-chart-card">
            <div className="lg-chart-header">
              <div className="lg-chart-title">Equity Curve</div>
              <div className="lg-tabs">
                {["1M","3M","6M","1Y"].map((t)=>(
                  <button key={t} type="button" className={`lg-tab${activeTab===t?" active":""}`} onClick={()=>setActiveTab(t)}>{t}</button>
                ))}
              </div>
            </div>
            {/* Max Drawdown badge */}
            {stats.maxDrawdown > 0 && (
              <div style={{
                display:"flex", alignItems:"center", gap:8, marginBottom:12,
                padding:"6px 14px", borderRadius:10,
                background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.20)",
                fontSize:".68rem",
              }}>
                <span style={{color:"var(--c-loss)"}}>📉 Max Drawdown:</span>
                <span style={{color:"var(--c-loss)",fontWeight:700,fontFamily:"'Syne',sans-serif"}}>
                  {fmtMoney(stats.maxDrawdown, currency)}
                </span>
                <span style={{color:"rgba(248,113,113,0.55)"}}>({stats.maxDrawdownPct.toFixed(1)}%)</span>
              </div>
            )}
            <div style={{position:"relative"}}>
              {/* Y-axis labels */}
              {svgPath && (
                <div style={{
                  position:"absolute", left:0, top:0, height:190,
                  display:"flex", flexDirection:"column", justifyContent:"space-between",
                  paddingBottom:16, pointerEvents:"none", zIndex:2,
                }}>
                  <span style={{fontSize:".56rem",color:"rgba(255,255,255,0.30)",fontFamily:"'DM Mono',monospace"}}>
                    {fmtMoney(svgPath.max,currency)}
                  </span>
                  <span style={{fontSize:".56rem",color:"rgba(255,255,255,0.25)",fontFamily:"'DM Mono',monospace"}}>
                    {fmtMoney(svgPath.mid,currency)}
                  </span>
                  <span style={{fontSize:".56rem",color:"rgba(255,255,255,0.30)",fontFamily:"'DM Mono',monospace"}}>
                    {fmtMoney(svgPath.min,currency)}
                  </span>
                </div>
              )}
              <svg width="100%" height="190" viewBox="0 0 600 200" preserveAspectRatio="none"
                style={{overflow:"visible", display:"block"}}
                onMouseLeave={() => setHoverIdx(null)}>
                <defs>
                  <linearGradient id="lgAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#5ee7df" stopOpacity={0.28} />
                    <stop offset="70%"  stopColor="#5ee7df" stopOpacity={0.04} />
                    <stop offset="100%" stopColor="#5ee7df" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lgLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#5ee7df" />
                    <stop offset="100%" stopColor="#b490f5" />
                  </linearGradient>
                </defs>
                {/* subtle grid lines */}
                {[40,80,120,160].map((y)=>(
                  <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,7" />
                ))}
                {svgPath ? (<>
                  <path fill="url(#lgAreaGrad)" d={svgPath.areaD} />
                  <polyline fill="none" stroke="url(#lgLineGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" points={svgPath.pointsStr} />
                  {/* Invisible hover hit areas */}
                  {svgPath.pts.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={12} fill="transparent"
                      onMouseEnter={() => setHoverIdx(i)} style={{cursor:"crosshair"}} />
                  ))}
                  {/* Hover tooltip */}
                  {hoverIdx !== null && svgPath.pts[hoverIdx] && (() => {
                    const [hx, hy] = svgPath.pts[hoverIdx];
                    const pt = filteredCurve[hoverIdx];
                    const isLeft = hx < 200;
                    return (
                      <g>
                        <line x1={hx} y1={0} x2={hx} y2={180} stroke="rgba(255,255,255,0.15)" strokeDasharray="3,5" strokeWidth={1} />
                        <circle cx={hx} cy={hy} r={5} fill="#b490f5" style={{filter:"drop-shadow(0 0 6px #b490f5)"}} />
                        <rect x={isLeft ? hx+8 : hx-110} y={hy-36} width={104} height={32} rx={8} fill="rgba(20,20,40,0.90)"
                          stroke="rgba(180,144,245,0.40)" strokeWidth={1} />
                        <text x={isLeft ? hx+60 : hx-58} y={hy-20} textAnchor="middle"
                          fill="#b490f5" fontSize="9" fontFamily="'DM Mono',monospace">{pt?.date ?? ""}</text>
                        <text x={isLeft ? hx+60 : hx-58} y={hy-9} textAnchor="middle"
                          fill="#fff" fontSize="10" fontWeight="700" fontFamily="'Syne',sans-serif">
                          {fmtMoney(pt?.balance ?? 0, currency)}
                        </text>
                      </g>
                    );
                  })()}
                  <circle cx={svgPath.first[0]} cy={svgPath.first[1]} r="4" fill="#5ee7df" style={{filter:"drop-shadow(0 0 5px #5ee7df)"}} />
                  <circle cx={svgPath.last[0]}  cy={svgPath.last[1]}  r="5.5" fill="#b490f5" style={{filter:"drop-shadow(0 0 7px #b490f5)"}} />
                </>) : (
                  <g>
                    <text x="300" y="88" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="13">📈</text>
                    <text x="300" y="112" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="11" fontFamily="DM Mono,monospace">Belum ada data trade.</text>
                    <text x="300" y="132" textAnchor="middle" fill="rgba(255,255,255,0.14)" fontSize="10" fontFamily="DM Mono,monospace">Catat trade pertama untuk melihat equity curve.</text>
                  </g>
                )}
                {/* X-axis labels — show first and last date from actual data, not hardcoded */}
                {svgPath && filteredCurve.length >= 2 ? (<>
                  <text className="lg-chart-lbl" x="0"   y="197">{filteredCurve[0]?.date ?? "Start"}</text>
                  <text className="lg-chart-lbl" x="560" y="197" textAnchor="end">{filteredCurve[filteredCurve.length-1]?.date ?? "Now"}</text>
                </>) : (<>
                  <text className="lg-chart-lbl" x="0"   y="197">Start</text>
                  <text className="lg-chart-lbl" x="270" y="197">Mid</text>
                  <text className="lg-chart-lbl" x="560" y="197">Now</text>
                </>)}
              </svg>
            </div>
          </div>
        </div>

        </>)}
      </div>

      <SharePnlCard
        open={shareOpen} onOpenChange={setShareOpen}
        trades={trades} currency={currency}
        displayName={profile?.display_name}
        defaultPeriod="month"
        initialCapital={Number(profile?.initial_capital ?? 0)}
      />
    </>
  );
}
