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
    // Navigate to /chat with the pre-filled message via query param
    navigate({ to: "/chat", search: { q: aiInput.trim() } });
    setAiInput("");
  };

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

    /* RESPONSIVE */
    @media (max-width:1024px) {
      .db-wrap { padding:24px 20px; }
      .db-cards { grid-template-columns:repeat(2,1fr); }
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
