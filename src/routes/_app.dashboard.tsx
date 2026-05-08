import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useProfile, useTrades, useMovements } from "@/lib/queries";
import { computeStats, equityCurve } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";
import { AiChat } from "@/components/AiChat";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: profile }     = useProfile();
  const { data: trades = [] } = useTrades();
  const { data: moves  = [] } = useMovements();
  const [activeTab, setActiveTab] = useState("3M");
  const [aiInput, setAiInput] = useState("");
  const aiChatRef = useRef<{ sendMessage: (text: string) => void } | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [editTarget, setEditTarget] = useState(false);
  const [mood, setMood] = useState<string | null>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tj-mood-" + new Date().toLocaleDateString("sv-SE")) : null;
    return saved;
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

  // Filter curve by active tab
  const filteredCurve = useMemo(() => {
    if (curve.length <= 1) return curve;
    const now = new Date();
    const cutoff = new Date(now);
    if (activeTab === "1M") cutoff.setMonth(now.getMonth() - 1);
    else if (activeTab === "3M") cutoff.setMonth(now.getMonth() - 3);
    else if (activeTab === "6M") cutoff.setMonth(now.getMonth() - 6);
    else if (activeTab === "1Y") cutoff.setFullYear(now.getFullYear() - 1);
    // curve[0] is "Start" — always include it, filter the rest
    const filtered = curve.filter((_, i) => i === 0 || true); // keep all for Start label
    return activeTab === "1Y" ? curve : curve.slice(Math.max(0, curve.length - (
      activeTab === "1M" ? 30 : activeTab === "3M" ? 90 : activeTab === "6M" ? 180 : 365
    )));
  }, [curve, activeTab]);

  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    navigate({ to: "/chat", search: { q: aiInput.trim() } });
    setAiInput("");
  };

  // ── Streak: hitung hari profit berturut-turut ──
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

  // ── Daily bars: 7 hari terakhir ──
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

  // ── Reminder: cek apakah ada trade hari ini ──
  const todayKey = new Date().toLocaleDateString("sv-SE");
  const hasTradeToday = trades.some(
    (t) => new Date(t.traded_at).toLocaleDateString("sv-SE") === todayKey
  );
  const hour = new Date().getHours();
  const showReminder = !hasTradeToday && hour >= 12;

  // ── Target harian dari localStorage ──
  const targetKey = "tj-target-daily";
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(targetKey) ?? 0);
  });
  const saveTarget = () => {
    const v = Number(targetInput);
    if (!v || v <= 0) return;
    setDailyTarget(v);
    localStorage.setItem(targetKey, String(v));
    setEditTarget(false);
    setTargetInput("");
  };
  const targetProgress = dailyTarget > 0 ? Math.min((stats.daily / dailyTarget) * 100, 100) : 0;
  const targetReached  = dailyTarget > 0 && stats.daily >= dailyTarget;

  // ── Top 3 pair terbaik ──
  const topPairs = useMemo(() => {
    const map = new Map<string, { pnl: number; wins: number; total: number }>();
    for (const t of trades) {
      const e = map.get(t.pair) ?? { pnl: 0, wins: 0, total: 0 };
      map.set(t.pair, {
        pnl:   e.pnl + Number(t.pnl),
        wins:  e.wins + (Number(t.pnl) > 0 ? 1 : 0),
        total: e.total + 1,
      });
    }
    return Array.from(map.entries())
      .map(([pair, v]) => ({ pair, ...v, wr: Math.round((v.wins / v.total) * 100) }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);
  }, [trades]);

  // ── Motivational quote (berganti tiap hari) ──
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

  // ── Mood ──
  const MOODS = [
    { emoji: "😴", label: "Lelah",   value: "tired" },
    { emoji: "😊", label: "Fokus",   value: "focus" },
    { emoji: "😤", label: "Emosi",   value: "emotional" },
    { emoji: "🧘", label: "Tenang",  value: "calm" },
  ];
  const saveMood = (v: string) => {
    setMood(v);
    if (typeof window !== "undefined") {
      localStorage.setItem("tj-mood-" + new Date().toLocaleDateString("sv-SE"), v);
    }
  };

  // ── Sesi Trading (Asia/London/NY) ──
  const tradingSessions = useMemo(() => {
    const nowUTC = new Date();
    const utcH = nowUTC.getUTCHours();
    const utcM = nowUTC.getUTCMinutes();
    const utcMin = utcH * 60 + utcM;
    const sessions = [
      { name: "Asia",   start: 0*60,   end: 9*60,   color: "#00cfff", emoji: "🌏" },
      { name: "London", start: 8*60,   end: 17*60,  color: "#a259ff", emoji: "🏛️" },
      { name: "New York",start: 13*60, end: 22*60,  color: "#00ffa3", emoji: "🗽" },
    ];
    return sessions.map((s) => {
      const active = utcMin >= s.start && utcMin < s.end;
      const minLeft = active ? s.end - utcMin : null;
      return { ...s, active, minLeft };
    });
  }, []);

  // ── R:R Ratio Tracker ──
  const rrData = useMemo(() => {
    const tradesWithRR = trades
      .filter((t) => t.entry_price && t.exit_price && t.lot_size)
      .map((t) => {
        const entry = Number(t.entry_price);
        const exit  = Number(t.exit_price);
        const move  = Math.abs(exit - entry);
        // Approximate: assume SL = same distance as TP for simplicity if not stored
        const rr = move > 0 ? Number(t.pnl) / (Math.abs(Number(t.pnl)) || 1) : 0;
        return { ...t, rr: Number(t.pnl) > 0 ? Math.abs(exit - entry) : -Math.abs(exit - entry) };
      });
    const wins  = trades.filter((t) => Number(t.pnl) > 0);
    const losses = trades.filter((t) => Number(t.pnl) < 0);
    const avgWin  = wins.length  ? wins.reduce((s, t)  => s + Number(t.pnl), 0) / wins.length  : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length : 0;
    const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
    const profitFactor = avgLoss !== 0 ? Math.abs((wins.length * avgWin) / (losses.length * avgLoss)) : 0;
    return { rr, profitFactor, avgWin, avgLoss: Math.abs(avgLoss) };
  }, [trades]);

  // ── Win/Loss Pie ──
  const pieData = useMemo(() => {
    const wins   = trades.filter((t) => Number(t.pnl) > 0).length;
    const losses = trades.filter((t) => Number(t.pnl) < 0).length;
    const be     = trades.filter((t) => Number(t.pnl) === 0).length;
    const total  = trades.length || 1;
    return { wins, losses, be, total,
      winPct:  Math.round((wins   / total) * 100),
      lossPct: Math.round((losses / total) * 100),
      bePct:   Math.round((be     / total) * 100),
    };
  }, [trades]);

  // SVG Pie helper
  const buildPie = (segments: { pct: number; color: string }[]) => {
    const R = 54; const cx = 64; const cy = 64;
    let angle = -90;
    return segments.filter((s) => s.pct > 0).map((s) => {
      const start = (angle * Math.PI) / 180;
      angle += (s.pct / 100) * 360;
      const end = (angle * Math.PI) / 180;
      const x1 = cx + R * Math.cos(start); const y1 = cy + R * Math.sin(start);
      const x2 = cx + R * Math.cos(end);   const y2 = cy + R * Math.sin(end);
      const large = s.pct > 50 ? 1 : 0;
      return { d: `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`, color: s.color };
    });
  };

  // ── Max Loss Harian ──
  const maxLossKey = "tj-maxloss-daily";
  const [maxLossLimit, setMaxLossLimit] = useState<number>(() =>
    typeof window !== "undefined" ? Number(localStorage.getItem(maxLossKey) ?? 0) : 0
  );
  const [maxLossInput, setMaxLossInput] = useState("");
  const [editMaxLoss, setEditMaxLoss] = useState(false);
  const saveMaxLoss = () => {
    const v = Math.abs(Number(maxLossInput));
    if (!v) return;
    setMaxLossLimit(v);
    localStorage.setItem(maxLossKey, String(v));
    setEditMaxLoss(false);
    setMaxLossInput("");
  };
  const dailyLoss    = Math.min(stats.daily, 0); // negatif atau 0
  const lossUsedPct  = maxLossLimit > 0 ? Math.min((Math.abs(dailyLoss) / maxLossLimit) * 100, 100) : 0;
  const maxLossHit   = maxLossLimit > 0 && Math.abs(dailyLoss) >= maxLossLimit;

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

    @keyframes db-cardIn {
      from { opacity:0; transform:translateY(22px) rotateX(8deg); }
      to   { opacity:1; transform:translateY(0) rotateX(0); }
    }
    @keyframes db-aiPulse {
      0%,100% { box-shadow: 0 4px 14px rgba(0,255,163,.3); }
      50%      { box-shadow: 0 4px 24px rgba(0,255,163,.6); }
    }

    .db-wrap { padding: 32px 36px; overflow-x: hidden; }

    /* TOPBAR */
    .db-topbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
    .db-title  { font-family:'Syne',sans-serif; font-weight:800; font-size:1.45rem; letter-spacing:-.5px; color:#e8edf8; }
    .db-title span { color:#00ffa3; }
    .db-date   {
      display:flex; align-items:center; gap:6px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      border-radius:10px; padding:7px 14px; font-size:.7rem; color:#5a6585;
      backdrop-filter:blur(12px); white-space:nowrap;
    }

    /* STAT CARDS */
    .db-cards { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
    .db-card  {
      position:relative; border-radius:20px; padding:22px 20px;
      border:1px solid rgba(255,255,255,.08); overflow:hidden; cursor:pointer;
      transition:transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s;
      animation:db-cardIn .55s ease both;
    }
    .db-card:nth-child(1){animation-delay:.05s}
    .db-card:nth-child(2){animation-delay:.12s}
    .db-card:nth-child(3){animation-delay:.19s}
    .db-card:nth-child(4){animation-delay:.26s}
    .db-card:hover { transform:translateY(-5px) scale(1.02); }

    /* card gloss overlay — pointer-events:none so clicks pass through */
    .db-card::after {
      content:''; position:absolute; inset:0;
      background:linear-gradient(135deg,rgba(255,255,255,.04),transparent 50%);
      border-radius:inherit; pointer-events:none;
    }
    /* card orb glow — pointer-events:none */
    .db-card-orb {
      position:absolute; top:-40px; right:-40px;
      width:110px; height:110px; border-radius:50%;
      filter:blur(38px); opacity:.5;
      pointer-events:none; /* CRITICAL: must not block clicks */
      transition:opacity .3s;
    }
    .db-card:hover .db-card-orb { opacity:.8; }

    .db-card-profit  { background:linear-gradient(135deg,#0d2b22,#0a1a14,#030d08); box-shadow:0 8px 32px rgba(0,255,163,.14),0 1px 0 rgba(0,255,163,.2) inset; }
    .db-card-winrate { background:linear-gradient(135deg,#1a0f2e,#110b1e,#070412); box-shadow:0 8px 32px rgba(162,89,255,.14),0 1px 0 rgba(162,89,255,.2) inset; }
    .db-card-trades  { background:linear-gradient(135deg,#0a1f2e,#071420,#030810); box-shadow:0 8px 32px rgba(0,207,255,.12),0 1px 0 rgba(0,207,255,.18) inset; }
    .db-card-balance { background:linear-gradient(135deg,#2a1c00,#1a1200,#0d0800); box-shadow:0 8px 32px rgba(255,184,0,.12),0 1px 0 rgba(255,184,0,.18) inset; }
    .db-card-profit:hover  { box-shadow:0 18px 44px rgba(0,255,163,.28),0 1px 0 rgba(0,255,163,.3) inset; }
    .db-card-winrate:hover { box-shadow:0 18px 44px rgba(162,89,255,.28),0 1px 0 rgba(162,89,255,.3) inset; }
    .db-card-trades:hover  { box-shadow:0 18px 44px rgba(0,207,255,.24),0 1px 0 rgba(0,207,255,.28) inset; }
    .db-card-balance:hover { box-shadow:0 18px 44px rgba(255,184,0,.24),0 1px 0 rgba(255,184,0,.28) inset; }

    .db-card-profit  .db-card-orb { background:#00ffa3; }
    .db-card-winrate .db-card-orb { background:#a259ff; }
    .db-card-trades  .db-card-orb { background:#00cfff; }
    .db-card-balance .db-card-orb { background:#ffb800; }

    .db-card-label { font-size:.66rem; letter-spacing:.1em; text-transform:uppercase; margin-bottom:10px; display:flex; align-items:center; gap:7px; position:relative; z-index:1; }
    .db-card-profit  .db-card-label { color:#00ffa3; }
    .db-card-winrate .db-card-label { color:#a259ff; }
    .db-card-trades  .db-card-label { color:#00cfff; }
    .db-card-balance .db-card-label { color:#ffb800; }

    .db-card-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .db-card-profit  .db-card-dot { background:#00ffa3; box-shadow:0 0 8px #00ffa3; }
    .db-card-winrate .db-card-dot { background:#a259ff; box-shadow:0 0 8px #a259ff; }
    .db-card-trades  .db-card-dot { background:#00cfff; box-shadow:0 0 8px #00cfff; }
    .db-card-balance .db-card-dot { background:#ffb800; box-shadow:0 0 8px #ffb800; }

    .db-card-value { font-family:'Syne',sans-serif; font-weight:800; font-size:1.8rem; letter-spacing:-1px; line-height:1; margin-bottom:8px; color:#e8edf8; position:relative; z-index:1; }
    .db-card-sub   { font-size:.66rem; color:#5a6585; display:flex; align-items:center; gap:6px; flex-wrap:wrap; position:relative; z-index:1; }
    .db-badge-up   { color:#00ffa3; }
    .db-badge-down { color:#ff4d6d; }

    /* STREAK + DAILY BAR ROW */
    .db-extra-row { display:grid; grid-template-columns:200px 1fr; gap:16px; margin-bottom:24px; }

    /* STREAK CARD */
    .db-streak-card {
      border-radius:20px; padding:20px;
      background:linear-gradient(135deg,#1a0a00,#110700,#070300);
      border:1px solid rgba(255,140,0,.15);
      box-shadow:0 8px 32px rgba(255,140,0,.1);
      display:flex; flex-direction:column; justify-content:space-between;
      position:relative; overflow:hidden;
    }
    .db-streak-card::after {
      content:''; position:absolute; inset:0;
      background:linear-gradient(135deg,rgba(255,255,255,.03),transparent 55%);
      border-radius:inherit; pointer-events:none;
    }
    .db-streak-orb {
      position:absolute; top:-30px; right:-30px; width:100px; height:100px;
      border-radius:50%; background:#ff8c00; filter:blur(36px); opacity:.35;
      pointer-events:none;
    }
    .db-streak-label { font-size:.64rem; letter-spacing:.1em; text-transform:uppercase; color:#ff8c00; display:flex; align-items:center; gap:6px; position:relative; z-index:1; }
    .db-streak-dot   { width:6px; height:6px; border-radius:50%; background:#ff8c00; box-shadow:0 0 8px #ff8c00; flex-shrink:0; }
    .db-streak-val   { font-family:'Syne',sans-serif; font-weight:800; font-size:2.4rem; letter-spacing:-2px; color:#e8edf8; line-height:1; position:relative; z-index:1; }
    .db-streak-fire  { font-size:1.4rem; }
    .db-streak-sub   { font-size:.63rem; color:#5a6585; position:relative; z-index:1; }

    /* DAILY BAR CHART */
    .db-bars-card {
      border-radius:20px; padding:20px 22px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px);
    }
    .db-bars-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .db-bars-title  { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#e8edf8; }
    .db-bars-inner  { display:flex; align-items:flex-end; gap:6px; height:72px; }
    .db-bar-wrap    { flex:1; display:flex; flex-direction:column; align-items:center; gap:5px; height:100%; justify-content:flex-end; }
    .db-bar         { width:100%; border-radius:4px 4px 2px 2px; min-height:3px; transition:height .4s cubic-bezier(.34,1.4,.64,1); }
    .db-bar.pos     { background:linear-gradient(180deg,#00ffa3,rgba(0,255,163,.5)); }
    .db-bar.neg     { background:linear-gradient(180deg,#ff4d6d,rgba(255,77,109,.5)); }
    .db-bar.zero    { background:rgba(255,255,255,.08); }
    .db-bar-day     { font-size:.6rem; color:#5a6585; font-family:'DM Mono',monospace; white-space:nowrap; }
    .db-bar-day.today { color:#00ffa3; }

    /* REMINDER BANNER */
    .db-reminder {
      margin-bottom:20px; border-radius:14px; padding:13px 18px;
      background:rgba(255,184,0,.07); border:1px solid rgba(255,184,0,.2);
      display:flex; align-items:center; justify-content:space-between; gap:12px;
    }
    .db-reminder-text { font-size:.76rem; color:#ffb800; display:flex; align-items:center; gap:8px; }
    .db-reminder-btn  {
      background:rgba(255,184,0,.15); border:1px solid rgba(255,184,0,.3);
      border-radius:8px; padding:6px 14px; font-size:.68rem; font-weight:700;
      color:#ffb800; cursor:pointer; white-space:nowrap; font-family:'Syne',sans-serif;
      transition:background .2s; flex-shrink:0;
    }
    .db-reminder-btn:hover { background:rgba(255,184,0,.25); }

    /* AI BAR */
    .db-ai-bar {
      margin-bottom:24px; background:rgba(13,20,36,.75);
      border:1px solid rgba(255,255,255,.06); border-radius:16px;
      padding:14px 18px; display:flex; align-items:center; gap:12px;
      backdrop-filter:blur(20px);
      transition:border-color .3s, box-shadow .3s;
      position:relative; z-index:2;
    }
    .db-ai-bar:focus-within {
      border-color:rgba(0,255,163,.35);
      box-shadow:0 0 0 3px rgba(0,255,163,.06);
    }
    .db-ai-indicator {
      width:34px; height:34px; border-radius:10px; flex-shrink:0;
      background:linear-gradient(135deg,#00ffa3,#00cfff);
      display:flex; align-items:center; justify-content:center;
      font-size:.72rem; font-weight:700; color:#000;
      animation:db-aiPulse 3s ease-in-out infinite;
    }
    .db-ai-input {
      flex:1; min-width:0; background:transparent; border:none; outline:none;
      color:#e8edf8; font-family:'DM Mono',monospace; font-size:.78rem;
    }
    .db-ai-input::placeholder { color:#5a6585; }
    .db-ai-send {
      background:linear-gradient(135deg,#00ffa3,#00cfff);
      border:none; border-radius:9px; padding:8px 15px;
      color:#000; font-family:'Syne',sans-serif; font-weight:700;
      font-size:.7rem; cursor:pointer; letter-spacing:.04em;
      white-space:nowrap; flex-shrink:0;
      transition:opacity .2s, transform .15s;
      position:relative; z-index:2;
    }
    .db-ai-send:hover { opacity:.85; transform:scale(.97); }

    /* BOTTOM GRID */
    .db-bottom-grid { display:grid; grid-template-columns:1fr 360px; gap:16px; }

    /* CHART CARD */
    .db-chart-card {
      border-radius:20px; padding:24px 26px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px);
    }
    .db-chart-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .db-chart-title  { font-family:'Syne',sans-serif; font-weight:700; font-size:.95rem; color:#e8edf8; }
    .db-tabs { display:flex; gap:4px; }
    .db-tab {
      padding:5px 11px; border-radius:7px; font-size:.66rem; letter-spacing:.06em;
      text-transform:uppercase; cursor:pointer; color:#5a6585;
      background:transparent; border:1px solid transparent;
      transition:all .2s; font-family:'DM Mono',monospace;
      position:relative; z-index:2;
    }
    .db-tab.db-tab-active { background:rgba(0,255,163,.12); color:#00ffa3; border-color:rgba(0,255,163,.22); }
    .db-tab:hover:not(.db-tab-active) { color:#e8edf8; }
    .db-chart-grid line { stroke:rgba(255,255,255,.05); stroke-dasharray:3,6; }
    .db-chart-lbl  { fill:#5a6585; font-size:10px; font-family:'DM Mono',monospace; }
    .db-chart-dot  { fill:#00ffa3; filter:drop-shadow(0 0 5px #00ffa3); }

    /* FEED CARD */
    .db-feed-card {
      border-radius:20px; padding:24px 22px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px);
    }
    .db-feed-title { font-family:'Syne',sans-serif; font-weight:700; font-size:.95rem; margin-bottom:16px; color:#e8edf8; }
    .db-trade-item {
      display:flex; align-items:center; gap:11px; padding:11px 0;
      border-bottom:1px solid rgba(255,255,255,.04); cursor:pointer;
      transition:background .18s, padding .18s; border-radius:8px;
      position:relative; z-index:1;
    }
    .db-trade-item:last-child { border-bottom:none; }
    .db-trade-item:hover { background:rgba(255,255,255,.025); padding:11px 8px; margin:0 -8px; }
    .db-trade-dir  { width:34px; height:34px; border-radius:9px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; }
    .db-trade-dir.long  { background:rgba(0,255,163,.12); color:#00ffa3; border:1px solid rgba(0,255,163,.2); }
    .db-trade-dir.short { background:rgba(255,77,109,.12); color:#ff4d6d; border:1px solid rgba(255,77,109,.2); }
    .db-trade-info { flex:1; min-width:0; }
    .db-trade-pair { font-size:.78rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#e8edf8; }
    .db-trade-meta { font-size:.63rem; color:#5a6585; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .db-trade-pnl  { font-family:'Syne',sans-serif; font-weight:700; font-size:.85rem; flex-shrink:0; }
    .db-trade-pnl.pos { color:#00ffa3; }
    .db-trade-pnl.neg { color:#ff4d6d; }

    /* TARGET HARIAN */
    .db-target-card {
      border-radius:20px; padding:20px 22px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px); margin-bottom:24px;
    }
    .db-target-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .db-target-title  { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#e8edf8; }
    .db-target-edit   { font-size:.65rem; color:#5a6585; background:none; border:none; cursor:pointer; padding:4px 8px; border-radius:6px; transition:color .2s; }
    .db-target-edit:hover { color:#e8edf8; }
    .db-target-row    { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
    .db-target-vals   { display:flex; justify-content:space-between; font-size:.68rem; color:#5a6585; margin-bottom:6px; }
    .db-target-bar-bg { height:8px; border-radius:99px; background:rgba(255,255,255,.07); overflow:hidden; }
    .db-target-bar-fg { height:100%; border-radius:99px; transition:width .6s cubic-bezier(.34,1.4,.64,1); }
    .db-target-input  {
      flex:1; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
      border-radius:8px; padding:7px 12px; color:#e8edf8; font-family:'DM Mono',monospace;
      font-size:.78rem; outline:none;
    }
    .db-target-input:focus { border-color:rgba(0,255,163,.3); }
    .db-target-save {
      background:linear-gradient(135deg,#00ffa3,#00cfff); border:none; border-radius:8px;
      padding:7px 14px; color:#000; font-weight:700; font-size:.7rem; cursor:pointer;
      font-family:'Syne',sans-serif; white-space:nowrap;
    }
    .db-reached-badge {
      display:inline-flex; align-items:center; gap:5px;
      background:rgba(0,255,163,.1); border:1px solid rgba(0,255,163,.25);
      border-radius:20px; padding:3px 10px; font-size:.65rem; color:#00ffa3;
      font-family:'DM Mono',monospace; animation:db-cardIn .4s ease;
    }

    /* TOP 3 PAIRS + QUOTE ROW */
    .db-pairs-quote-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }

    /* TOP PAIRS */
    .db-pairs-card {
      border-radius:20px; padding:20px 22px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px);
    }
    .db-pairs-title { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#e8edf8; margin-bottom:14px; }
    .db-pair-row    { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.04); }
    .db-pair-row:last-child { border-bottom:none; }
    .db-pair-rank   { width:20px; font-size:.65rem; color:#5a6585; font-family:'DM Mono',monospace; flex-shrink:0; }
    .db-pair-name   { flex:1; font-size:.78rem; font-weight:500; color:#e8edf8; }
    .db-pair-wr     { font-size:.65rem; color:#5a6585; margin-right:8px; }
    .db-pair-pnl    { font-family:'Syne',sans-serif; font-weight:700; font-size:.78rem; flex-shrink:0; }
    .db-pair-pnl.pos { color:#00ffa3; }
    .db-pair-pnl.neg { color:#ff4d6d; }

    /* QUOTE CARD */
    .db-quote-card {
      border-radius:20px; padding:20px 22px;
      background:linear-gradient(135deg,#0d1424,#0a0f1c);
      border:1px solid rgba(162,89,255,.12);
      box-shadow:0 8px 32px rgba(162,89,255,.07);
      display:flex; flex-direction:column; justify-content:space-between;
      position:relative; overflow:hidden;
    }
    .db-quote-orb {
      position:absolute; bottom:-40px; right:-40px; width:120px; height:120px;
      border-radius:50%; background:#a259ff; filter:blur(50px); opacity:.2;
      pointer-events:none;
    }
    .db-quote-icon   { font-size:1.4rem; margin-bottom:10px; }
    .db-quote-text   { font-size:.78rem; line-height:1.6; color:#c8d0e8; font-style:italic; flex:1; position:relative; z-index:1; }
    .db-quote-author { font-size:.63rem; color:#a259ff; margin-top:12px; font-family:'DM Mono',monospace; position:relative; z-index:1; }

    /* MOOD ROW */
    .db-mood-card {
      border-radius:20px; padding:16px 22px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px); margin-bottom:24px;
      display:flex; align-items:center; gap:16px;
    }
    .db-mood-label { font-size:.72rem; color:#5a6585; white-space:nowrap; }
    .db-mood-opts  { display:flex; gap:8px; flex:1; }
    .db-mood-btn   {
      flex:1; display:flex; flex-direction:column; align-items:center; gap:3px;
      padding:8px 6px; border-radius:12px; cursor:pointer; border:1px solid transparent;
      background:rgba(255,255,255,.04); transition:all .2s; font-size:.6rem; color:#5a6585;
    }
    .db-mood-btn:hover  { background:rgba(255,255,255,.08); color:#e8edf8; }
    .db-mood-btn.active { border-color:rgba(0,255,163,.3); background:rgba(0,255,163,.08); color:#00ffa3; }
    .db-mood-emoji { font-size:1.2rem; }

    /* SESI TRADING */
    .db-sesi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
    .db-sesi-card {
      border-radius:16px; padding:14px 16px; border:1px solid rgba(255,255,255,.06);
      background:rgba(13,20,36,.75); backdrop-filter:blur(20px);
      display:flex; flex-direction:column; gap:6px; position:relative; overflow:hidden;
      transition:border-color .3s, box-shadow .3s;
    }
    .db-sesi-card.active { box-shadow:0 0 0 1px var(--sc), 0 8px 24px rgba(0,0,0,.3); }
    .db-sesi-top   { display:flex; align-items:center; justify-content:space-between; }
    .db-sesi-name  { font-family:'Syne',sans-serif; font-weight:700; font-size:.82rem; color:#e8edf8; display:flex; align-items:center; gap:6px; }
    .db-sesi-badge {
      font-size:.58rem; font-weight:700; padding:2px 8px; border-radius:20px;
      background:rgba(0,255,163,.12); color:#00ffa3; border:1px solid rgba(0,255,163,.25);
      letter-spacing:.06em; text-transform:uppercase;
    }
    .db-sesi-badge.closed { background:rgba(255,255,255,.05); color:#5a6585; border-color:rgba(255,255,255,.08); }
    .db-sesi-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .db-sesi-dot.active { animation:db-sesiBlink 1.5s ease-in-out infinite; }
    @keyframes db-sesiBlink { 0%,100%{opacity:1;} 50%{opacity:.3;} }
    .db-sesi-time { font-size:.62rem; color:#5a6585; font-family:'DM Mono',monospace; }
    .db-sesi-timeleft { font-size:.62rem; color:#00ffa3; font-family:'DM Mono',monospace; }

    /* RR + PIE ROW */
    .db-rr-pie-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }

    /* RR CARD */
    .db-rr-card {
      border-radius:20px; padding:20px 22px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px);
    }
    .db-rr-title { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#e8edf8; margin-bottom:16px; }
    .db-rr-grid  { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .db-rr-item  { background:rgba(255,255,255,.03); border-radius:12px; padding:12px 14px; }
    .db-rr-lbl   { font-size:.6rem; letter-spacing:.08em; text-transform:uppercase; color:#5a6585; margin-bottom:6px; }
    .db-rr-val   { font-family:'Syne',sans-serif; font-weight:800; font-size:1.3rem; letter-spacing:-.5px; }
    .db-rr-sub   { font-size:.6rem; color:#5a6585; margin-top:3px; }

    /* PIE CARD */
    .db-pie-card {
      border-radius:20px; padding:20px 22px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px); display:flex; flex-direction:column;
    }
    .db-pie-title  { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#e8edf8; margin-bottom:16px; }
    .db-pie-inner  { display:flex; align-items:center; gap:20px; flex:1; }
    .db-pie-legend { display:flex; flex-direction:column; gap:10px; flex:1; }
    .db-pie-leg    { display:flex; align-items:center; gap:8px; font-size:.72rem; }
    .db-pie-dot    { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .db-pie-lname  { color:#5a6585; flex:1; }
    .db-pie-lpct   { font-family:'DM Mono',monospace; font-weight:500; color:#e8edf8; }

    /* MAX LOSS CARD */
    .db-maxloss-card {
      border-radius:20px; padding:20px 22px;
      background:rgba(13,20,36,.75); border:1px solid rgba(255,255,255,.06);
      backdrop-filter:blur(20px); margin-bottom:24px;
      transition:border-color .3s, box-shadow .3s;
    }
    .db-maxloss-card.hit {
      border-color:rgba(255,77,109,.35);
      box-shadow:0 0 0 1px rgba(255,77,109,.2), 0 8px 28px rgba(255,77,109,.12);
    }
    .db-maxloss-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .db-maxloss-title  { font-family:'Syne',sans-serif; font-weight:700; font-size:.88rem; color:#e8edf8; }
    .db-maxloss-edit   { font-size:.65rem; color:#5a6585; background:none; border:none; cursor:pointer; padding:4px 8px; border-radius:6px; transition:color .2s; }
    .db-maxloss-edit:hover { color:#e8edf8; }
    .db-maxloss-alert  {
      display:flex; align-items:center; gap:8px; padding:10px 14px;
      background:rgba(255,77,109,.08); border:1px solid rgba(255,77,109,.25);
      border-radius:12px; font-size:.75rem; color:#ff4d6d; margin-bottom:12px;
      animation:db-cardIn .3s ease;
    }
    .db-maxloss-vals   { display:flex; justify-content:space-between; font-size:.68rem; color:#5a6585; margin-bottom:6px; }
    .db-maxloss-bar-bg { height:8px; border-radius:99px; background:rgba(255,255,255,.07); overflow:hidden; }
    .db-maxloss-bar-fg { height:100%; border-radius:99px; transition:width .6s cubic-bezier(.34,1.4,.64,1); }
    .db-maxloss-input {
      flex:1; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
      border-radius:8px; padding:7px 12px; color:#e8edf8; font-family:'DM Mono',monospace;
      font-size:.78rem; outline:none;
    }
    .db-maxloss-input:focus { border-color:rgba(255,77,109,.3); }
    .db-maxloss-save {
      background:linear-gradient(135deg,#ff4d6d,#ff8c69); border:none; border-radius:8px;
      padding:7px 14px; color:#fff; font-weight:700; font-size:.7rem; cursor:pointer;
      font-family:'Syne',sans-serif; white-space:nowrap;
    }

    /* RESPONSIVE additions */
    @media (max-width:1024px) {
      .db-wrap { padding:24px 20px; }
      .db-cards { grid-template-columns:repeat(2,1fr); }
      .db-extra-row { grid-template-columns:1fr 1fr; }
      .db-pairs-quote-row { grid-template-columns:1fr; }
      .db-rr-pie-row { grid-template-columns:1fr; }
      .db-bottom-grid { grid-template-columns:1fr; }
    }
    @media (max-width:640px) {
      .db-wrap { padding:16px 14px; }
      .db-topbar { margin-bottom:16px; }
      .db-date { display:none; }
      .db-title { font-size:1.1rem; }
      .db-ai-bar { display:none; }
      .db-cards { grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:14px; }
      .db-card  { padding:14px 13px; border-radius:15px; }
      .db-card-value { font-size:1.3rem; }
      .db-extra-row { grid-template-columns:1fr; gap:10px; margin-bottom:14px; }
      .db-streak-val { font-size:2rem; }
      .db-bars-inner { height:56px; }
      .db-pairs-quote-row { grid-template-columns:1fr; gap:10px; }
      .db-sesi-row { grid-template-columns:1fr; gap:8px; }
      .db-rr-pie-row { grid-template-columns:1fr; gap:10px; }
      .db-mood-opts { gap:5px; }
      .db-bottom-grid { grid-template-columns:1fr; gap:12px; }
      .db-chart-card  { padding:16px 14px; }
      .db-feed-card   { padding:16px 14px; }
    }
  `;

  // Build SVG equity curve path from filtered data
  const svgPath = (() => {
    if (filteredCurve.length < 2) return null;
    const vals = filteredCurve.map((c) => c.balance);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const range = max - min || 1;
    const pts = filteredCurve.map((c, i) => {
      const x = (i / (filteredCurve.length - 1)) * 600;
      const y = 180 - ((c.balance - min) / range) * 160;
      return [x, y] as [number, number];
    });
    const pointsStr = pts.map(([x, y]) => `${x},${y}`).join(" ");
    const areaD = `M${pts.map(([x,y]) => `${x},${y}`).join(" L")} L600,200 L0,200 Z`;
    return { pointsStr, areaD, first: pts[0], last: pts[pts.length - 1] };
  })();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="db-wrap">

        {/* Topbar */}
        <div className="db-topbar">
          <h1 className="db-title">
            Halo, <span>{profile?.display_name?.split(" ")[0] ?? profile?.id?.slice(0, 6) ?? "Trader"}</span> 👋
          </h1>
          <div className="db-date">◷ &nbsp;{today}</div>
        </div>

        {/* Stat Cards */}
        <div className="db-cards">
          <div className="db-card db-card-profit">
            <div className="db-card-orb" />
            <div className="db-card-label"><span className="db-card-dot" />Profit Bulan Ini</div>
            <div className="db-card-value">{fmtMoney(stats.monthly, currency)}</div>
            <div className="db-card-sub">
              <span className={stats.monthly >= 0 ? "db-badge-up" : "db-badge-down"}>
                {stats.monthly >= 0 ? "▲" : "▼"} bulan ini
              </span>
            </div>
          </div>

          <div className="db-card db-card-winrate">
            <div className="db-card-orb" />
            <div className="db-card-label"><span className="db-card-dot" />Win Rate</div>
            <div className="db-card-value">{stats.winRate.toFixed(1)}%</div>
            <div className="db-card-sub">
              <span className="db-badge-up">▲</span>
              <span>{stats.tradeCount} trade</span>
            </div>
          </div>

          <div className="db-card db-card-trades">
            <div className="db-card-orb" />
            <div className="db-card-label"><span className="db-card-dot" />Total Trade</div>
            <div className="db-card-value">{stats.tradeCount}</div>
            <div className="db-card-sub">
              <span className="db-badge-up">▲</span>
              <span>semua waktu</span>
            </div>
          </div>

          <div className="db-card db-card-balance">
            <div className="db-card-orb" />
            <div className="db-card-label"><span className="db-card-dot" />Saldo Akun</div>
            <div className="db-card-value">{fmtMoney(stats.balance, currency)}</div>
            <div className="db-card-sub">
              <span className={stats.daily >= 0 ? "db-badge-up" : "db-badge-down"}>
                {stats.daily >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs(stats.daily), currency)}
              </span>
              <span>hari ini</span>
            </div>
          </div>
        </div>

        {/* Reminder banner */}
        {showReminder && (
          <div className="db-reminder">
            <div className="db-reminder-text">
              <span>⚡</span>
              <span>Belum ada trade hari ini — sudah trading?</span>
            </div>
            <button className="db-reminder-btn" type="button" onClick={() => navigate({ to: "/chat" })}>
              Catat Sekarang ↗
            </button>
          </div>
        )}

        {/* Mood check-in */}
        <div className="db-mood-card">
          <div className="db-mood-label">Kondisi hari ini:</div>
          <div className="db-mood-opts">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`db-mood-btn${mood === m.value ? " active" : ""}`}
                onClick={() => saveMood(m.value)}
              >
                <span className="db-mood-emoji">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
          {mood && (
            <div style={{ fontSize:".63rem", color:"#5a6585", whiteSpace:"nowrap" }}>
              {mood === "emotional" ? "⚠️ Hati-hati trading saat emosi" :
               mood === "tired"     ? "😴 Pertimbangkan reduce lot" :
               mood === "focus"     ? "✅ Kondisi ideal!" : "🧘 Good mindset"}
            </div>
          )}
        </div>

        {/* Target Harian */}
        <div className="db-target-card">
          <div className="db-target-header">
            <div className="db-target-title">🎯 Target Harian</div>
            {dailyTarget > 0 && !editTarget && (
              <button className="db-target-edit" type="button" onClick={() => setEditTarget(true)}>
                Ubah target
              </button>
            )}
          </div>

          {(dailyTarget === 0 || editTarget) ? (
            <div className="db-target-row">
              <input
                className="db-target-input"
                type="number"
                placeholder={`Target profit harian (${currency})`}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTarget()}
              />
              <button className="db-target-save" type="button" onClick={saveTarget}>Set</button>
              {editTarget && (
                <button
                  className="db-target-edit" type="button"
                  onClick={() => setEditTarget(false)}
                  style={{ marginLeft:0 }}
                >Batal</button>
              )}
            </div>
          ) : (
            <>
              <div className="db-target-vals">
                <span>
                  {fmtMoney(Math.max(stats.daily, 0), currency)}{" "}
                  <span style={{ color:"#5a6585" }}>/ {fmtMoney(dailyTarget, currency)}</span>
                </span>
                {targetReached
                  ? <span className="db-reached-badge">✓ Target Tercapai 🎉</span>
                  : <span style={{ color: stats.daily < 0 ? "#ff4d6d" : "#5a6585" }}>
                      {targetProgress.toFixed(0)}%
                    </span>
                }
              </div>
              <div className="db-target-bar-bg">
                <div
                  className="db-target-bar-fg"
                  style={{
                    width: `${targetProgress}%`,
                    background: targetReached
                      ? "linear-gradient(90deg,#00ffa3,#00cfff)"
                      : stats.daily < 0
                      ? "#ff4d6d"
                      : "linear-gradient(90deg,#00ffa3,#00cfff)",
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Streak + Daily Bar Row */}
        <div className="db-extra-row">

          {/* Streak */}
          <div className="db-streak-card">
            <div className="db-streak-orb" />
            <div className="db-streak-label">
              <span className="db-streak-dot" />Profit Streak
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, margin:"10px 0 6px", position:"relative", zIndex:1 }}>
              <div className="db-streak-val">{streak}</div>
              <div className="db-streak-fire">{streak >= 5 ? "🔥" : streak >= 3 ? "⚡" : streak >= 1 ? "✨" : "💤"}</div>
            </div>
            <div className="db-streak-sub">
              {streak === 0
                ? "Mulai streak hari ini!"
                : streak === 1
                ? "1 hari berturut-turut"
                : `${streak} hari berturut-turut`}
            </div>
          </div>

          {/* Daily P/L 7 hari */}
          <div className="db-bars-card">
            <div className="db-bars-header">
              <div className="db-bars-title">P/L 7 Hari Terakhir</div>
              <div style={{ fontSize:".66rem", color: stats.weekly >= 0 ? "#00ffa3" : "#ff4d6d" }}>
                {stats.weekly >= 0 ? "+" : ""}{fmtMoney(stats.weekly, currency)} minggu ini
              </div>
            </div>
            <div className="db-bars-inner">
              {(() => {
                const maxAbs = Math.max(...weekBars.map((b) => Math.abs(b.pnl)), 1);
                return weekBars.map((b) => {
                  const heightPct = (Math.abs(b.pnl) / maxAbs) * 100;
                  return (
                    <div key={b.day} className="db-bar-wrap">
                      <div
                        className={`db-bar ${b.pnl > 0 ? "pos" : b.pnl < 0 ? "neg" : "zero"}`}
                        style={{ height: b.pnl === 0 ? "4px" : `${Math.max(heightPct, 8)}%` }}
                        title={fmtMoney(b.pnl, currency)}
                      />
                      <div className={`db-bar-day${b.isToday ? " today" : ""}`}>
                        {b.isToday ? "Hari ini" : b.day}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Top 3 Pair + Quote */}
        <div className="db-pairs-quote-row">

          {/* Top 3 Pair */}
          <div className="db-pairs-card">
            <div className="db-pairs-title">🏆 Top 3 Pair Terbaik</div>
            {topPairs.length === 0 ? (
              <div style={{ fontSize:".75rem", color:"#5a6585" }}>Belum ada data trade.</div>
            ) : topPairs.map((p, i) => (
              <div key={p.pair} className="db-pair-row">
                <div className="db-pair-rank">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </div>
                <div className="db-pair-name">{p.pair}</div>
                <div className="db-pair-wr">{p.wr}% WR</div>
                <div className={`db-pair-pnl ${p.pnl >= 0 ? "pos" : "neg"}`}>
                  {p.pnl >= 0 ? "+" : ""}{fmtMoney(p.pnl, currency)}
                </div>
              </div>
            ))}
          </div>

          {/* Quote harian */}
          <div className="db-quote-card">
            <div className="db-quote-orb" />
            <div className="db-quote-icon">💬</div>
            <div className="db-quote-text">"{todayQuote.text}"</div>
            <div className="db-quote-author">— {todayQuote.author}</div>
          </div>
        </div>

        {/* ── Sesi Trading ── */}
        <div className="db-sesi-row">
          {tradingSessions.map((s) => (
            <div
              key={s.name}
              className={`db-sesi-card${s.active ? " active" : ""}`}
              style={{ ["--sc" as any]: s.color }}
            >
              {s.active && (
                <div style={{
                  position:"absolute", inset:0, borderRadius:"inherit",
                  background:`radial-gradient(circle at 80% 20%, ${s.color}18, transparent 60%)`,
                  pointerEvents:"none",
                }} />
              )}
              <div className="db-sesi-top">
                <div className="db-sesi-name">
                  <span
                    className={`db-sesi-dot${s.active ? " active" : ""}`}
                    style={{ background: s.active ? s.color : "#2a3352", boxShadow: s.active ? `0 0 8px ${s.color}` : "none" }}
                  />
                  {s.emoji} {s.name}
                </div>
                <span className={`db-sesi-badge${s.active ? "" : " closed"}`}>
                  {s.active ? "LIVE" : "Tutup"}
                </span>
              </div>
              <div className="db-sesi-time" style={{ color: s.active ? s.color : "#5a6585" }}>
                {s.name === "Asia" ? "00:00 – 09:00 UTC" : s.name === "London" ? "08:00 – 17:00 UTC" : "13:00 – 22:00 UTC"}
              </div>
              {s.active && s.minLeft !== null && (
                <div className="db-sesi-timeleft" style={{ color: s.color }}>
                  ⏱ Tutup dalam {Math.floor(s.minLeft / 60)}j {s.minLeft % 60}m
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Max Loss Harian ── */}
        <div className={`db-maxloss-card${maxLossHit ? " hit" : ""}`}>
          <div className="db-maxloss-header">
            <div className="db-maxloss-title">🛑 Batas Loss Harian</div>
            {maxLossLimit > 0 && !editMaxLoss && (
              <button className="db-maxloss-edit" type="button" onClick={() => setEditMaxLoss(true)}>
                Ubah batas
              </button>
            )}
          </div>

          {maxLossHit && (
            <div className="db-maxloss-alert">
              <span>🚨</span>
              <span><strong>Stop trading hari ini!</strong> Batas loss harian sudah tercapai. Istirahat dulu.</span>
            </div>
          )}

          {(maxLossLimit === 0 || editMaxLoss) ? (
            <div className="db-target-row">
              <input
                className="db-maxloss-input"
                type="number"
                placeholder={`Maks loss per hari (${currency})`}
                value={maxLossInput}
                onChange={(e) => setMaxLossInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveMaxLoss()}
              />
              <button className="db-maxloss-save" type="button" onClick={saveMaxLoss}>Set</button>
              {editMaxLoss && (
                <button className="db-maxloss-edit" type="button" onClick={() => setEditMaxLoss(false)} style={{ marginLeft:0 }}>Batal</button>
              )}
            </div>
          ) : (
            <>
              <div className="db-maxloss-vals">
                <span>
                  Loss hari ini: <span style={{ color: dailyLoss < 0 ? "#ff4d6d" : "#5a6585" }}>
                    {fmtMoney(Math.abs(dailyLoss), currency)}
                  </span>
                  <span style={{ color:"#5a6585" }}> / {fmtMoney(maxLossLimit, currency)}</span>
                </span>
                <span style={{ color: maxLossHit ? "#ff4d6d" : lossUsedPct > 70 ? "#ffb800" : "#5a6585" }}>
                  {lossUsedPct.toFixed(0)}% terpakai
                </span>
              </div>
              <div className="db-maxloss-bar-bg">
                <div
                  className="db-maxloss-bar-fg"
                  style={{
                    width: `${lossUsedPct}%`,
                    background: maxLossHit ? "#ff4d6d"
                      : lossUsedPct > 70 ? "linear-gradient(90deg,#ffb800,#ff4d6d)"
                      : "linear-gradient(90deg,#00ffa3,#ffb800)",
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* ── R:R Ratio + Win/Loss Pie ── */}
        <div className="db-rr-pie-row">

          {/* RR Tracker */}
          <div className="db-rr-card">
            <div className="db-rr-title">⚖️ Risk/Reward Ratio</div>
            <div className="db-rr-grid">
              <div className="db-rr-item">
                <div className="db-rr-lbl">Avg R:R</div>
                <div className="db-rr-val" style={{ color: rrData.rr >= 1.5 ? "#00ffa3" : rrData.rr >= 1 ? "#ffb800" : "#ff4d6d" }}>
                  {trades.length ? `1 : ${rrData.rr.toFixed(2)}` : "–"}
                </div>
                <div className="db-rr-sub">{rrData.rr >= 1.5 ? "✓ Excellent" : rrData.rr >= 1 ? "~ OK" : "↓ Perlu diperbaiki"}</div>
              </div>
              <div className="db-rr-item">
                <div className="db-rr-lbl">Profit Factor</div>
                <div className="db-rr-val" style={{ color: rrData.profitFactor >= 1.5 ? "#00ffa3" : rrData.profitFactor >= 1 ? "#ffb800" : "#ff4d6d" }}>
                  {trades.length ? rrData.profitFactor.toFixed(2) : "–"}
                </div>
                <div className="db-rr-sub">≥ 1.5 bagus</div>
              </div>
              <div className="db-rr-item">
                <div className="db-rr-lbl">Avg Win</div>
                <div className="db-rr-val" style={{ color:"#00ffa3", fontSize:"1rem" }}>
                  {trades.length ? fmtMoney(rrData.avgWin, currency) : "–"}
                </div>
              </div>
              <div className="db-rr-item">
                <div className="db-rr-lbl">Avg Loss</div>
                <div className="db-rr-val" style={{ color:"#ff4d6d", fontSize:"1rem" }}>
                  {trades.length ? fmtMoney(rrData.avgLoss, currency) : "–"}
                </div>
              </div>
            </div>
          </div>

          {/* Win/Loss Pie */}
          <div className="db-pie-card">
            <div className="db-pie-title">📊 Win / Loss / BE</div>
            {trades.length === 0 ? (
              <div style={{ fontSize:".75rem", color:"#5a6585", flex:1, display:"flex", alignItems:"center" }}>
                Belum ada data trade.
              </div>
            ) : (
              <div className="db-pie-inner">
                <svg width="128" height="128" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="54" fill="rgba(255,255,255,.04)" />
                  {buildPie([
                    { pct: pieData.winPct,  color: "#00ffa3" },
                    { pct: pieData.lossPct, color: "#ff4d6d" },
                    { pct: pieData.bePct,   color: "#5a6585" },
                  ]).map((seg, i) => (
                    <path key={i} d={seg.d} fill={seg.color} opacity={0.85} />
                  ))}
                  <circle cx="64" cy="64" r="34" fill="#0d1424" />
                  <text x="64" y="60" textAnchor="middle" fill="#e8edf8" fontSize="14" fontWeight="800" fontFamily="Syne,sans-serif">
                    {pieData.winPct}%
                  </text>
                  <text x="64" y="75" textAnchor="middle" fill="#5a6585" fontSize="9" fontFamily="DM Mono,monospace">
                    WIN
                  </text>
                </svg>
                <div className="db-pie-legend">
                  {[
                    { label: "Profit",  pct: pieData.winPct,  count: pieData.wins,   color: "#00ffa3" },
                    { label: "Loss",    pct: pieData.lossPct, count: pieData.losses, color: "#ff4d6d" },
                    { label: "Break Even", pct: pieData.bePct, count: pieData.be,    color: "#5a6585" },
                  ].map((leg) => (
                    <div key={leg.label} className="db-pie-leg">
                      <div className="db-pie-dot" style={{ background: leg.color }} />
                      <div className="db-pie-lname">{leg.label}</div>
                      <div className="db-pie-lpct" style={{ color: leg.color }}>{leg.pct}%</div>
                      <div style={{ fontSize:".62rem", color:"#5a6585", marginLeft:4 }}>({leg.count})</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Bar */}
        <div className="db-ai-bar">
          <div className="db-ai-indicator">AI</div>
          <input
            className="db-ai-input"
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiSend()}
            placeholder="Ketik trade kamu… cth: Long BTC entry 65000 exit 66000 lot 0.1"
          />
          <button className="db-ai-send" type="button" onClick={handleAiSend}>CATAT ↗</button>
        </div>

        {/* Bottom Grid */}
        <div className="db-bottom-grid">

          {/* Equity Curve */}
          <div className="db-chart-card">
            <div className="db-chart-header">
              <div className="db-chart-title">Equity Curve</div>
              <div className="db-tabs">
                {["1M","3M","6M","1Y"].map((t) => (
                  <button
                    key={t} type="button"
                    className={`db-tab${activeTab === t ? " db-tab-active" : ""}`}
                    onClick={() => setActiveTab(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
            <svg width="100%" height="190" viewBox="0 0 600 200" preserveAspectRatio="none" style={{overflow:"visible"}}>
              <defs>
                <linearGradient id="dbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00ffa3" stopOpacity={0.24} />
                  <stop offset="75%"  stopColor="#00ffa3" stopOpacity={0.04} />
                  <stop offset="100%" stopColor="#00ffa3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <g className="db-chart-grid">
                <line x1="0" y1="40"  x2="600" y2="40"  />
                <line x1="0" y1="80"  x2="600" y2="80"  />
                <line x1="0" y1="120" x2="600" y2="120" />
                <line x1="0" y1="160" x2="600" y2="160" />
              </g>
              {svgPath ? (
                <>
                  <path fill="url(#dbAreaGrad)" d={svgPath.areaD} />
                  <polyline fill="none" stroke="#00ffa3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" points={svgPath.pointsStr} />
                  <circle className="db-chart-dot" cx={svgPath.first[0]} cy={svgPath.first[1]} r="4" />
                  <circle className="db-chart-dot" cx={svgPath.last[0]}  cy={svgPath.last[1]}  r="5" />
                </>
              ) : (
                <>
                  <path fill="url(#dbAreaGrad)" d="M0,160 C100,130 200,110 300,80 C400,50 500,35 600,15 L600,200 L0,200 Z" />
                  <polyline fill="none" stroke="#00ffa3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" points="0,160 150,120 300,80 450,45 600,15" />
                  <circle className="db-chart-dot" cx="0"   cy="160" r="4" />
                  <circle className="db-chart-dot" cx="600" cy="15"  r="5" />
                </>
              )}
              <text className="db-chart-lbl" x="0"   y="195">Start</text>
              <text className="db-chart-lbl" x="280" y="195">Mid</text>
              <text className="db-chart-lbl" x="560" y="195">Now</text>
            </svg>
          </div>

          {/* Trade Terakhir */}
          <div className="db-feed-card">
            <div className="db-feed-title">Trade Terakhir</div>
            {trades.length === 0 ? (
              <p style={{ fontSize:".78rem", color:"#5a6585" }}>
                Belum ada trade. Gunakan asisten AI di atas.
              </p>
            ) : (
              trades.slice(0, 5).map((t) => (
                <div key={t.id} className="db-trade-item">
                  <div className={`db-trade-dir ${t.side === "long" ? "long" : "short"}`}>
                    {t.side === "long" ? "L" : "S"}
                  </div>
                  <div className="db-trade-info">
                    <div className="db-trade-pair">{t.pair}</div>
                    <div className="db-trade-meta">
                      {new Date(t.traded_at).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                  <div className={`db-trade-pnl ${Number(t.pnl) >= 0 ? "pos" : "neg"}`}>
                    {Number(t.pnl) >= 0 ? "+" : ""}{fmtMoney(Number(t.pnl), currency)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AiChat — mobile sheet */}
        <div style={{ marginTop: 24, position:"relative", zIndex:2 }}>
          <AiChat />
        </div>

      </div>
    </>
  );
}
