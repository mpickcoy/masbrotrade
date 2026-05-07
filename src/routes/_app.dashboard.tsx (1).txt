// src/routes/_app.dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useProfile, useTrades, useMovements } from "@/lib/queries";
import { computeStats, equityCurve } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";
import { AiChat } from "@/components/AiChat";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, Tooltip,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Spark({ points, color }: { points: string; color: string }) {
  return (
    <svg width="56" height="20" style={{ overflow: "visible", flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type CardVariant = "profit" | "winrate" | "trades" | "balance";
const CARD_META: Record<CardVariant, { bg: string; shadow: string; hoverShadow: string; color: string }> = {
  profit:  { bg: "linear-gradient(135deg,#0d2b22,#0a1a14,#030d08)", shadow: "0 8px 32px rgba(0,255,163,.14),0 1px 0 rgba(0,255,163,.2) inset", hoverShadow: "0 18px 44px rgba(0,255,163,.28),0 1px 0 rgba(0,255,163,.3) inset", color: "#00ffa3" },
  winrate: { bg: "linear-gradient(135deg,#1a0f2e,#110b1e,#070412)", shadow: "0 8px 32px rgba(162,89,255,.14),0 1px 0 rgba(162,89,255,.2) inset", hoverShadow: "0 18px 44px rgba(162,89,255,.28),0 1px 0 rgba(162,89,255,.3) inset", color: "#a259ff" },
  trades:  { bg: "linear-gradient(135deg,#0a1f2e,#071420,#030810)", shadow: "0 8px 32px rgba(0,207,255,.12),0 1px 0 rgba(0,207,255,.18) inset", hoverShadow: "0 18px 44px rgba(0,207,255,.24),0 1px 0 rgba(0,207,255,.28) inset", color: "#00cfff" },
  balance: { bg: "linear-gradient(135deg,#2a1c00,#1a1200,#0d0800)", shadow: "0 8px 32px rgba(255,184,0,.12),0 1px 0 rgba(255,184,0,.18) inset", hoverShadow: "0 18px 44px rgba(255,184,0,.24),0 1px 0 rgba(255,184,0,.28) inset", color: "#ffb800" },
};

function StatCard({ variant, label, value, badgeDir, badgeVal, badgeSub, sparkPoints }: {
  variant: CardVariant; label: string; value: string;
  badgeDir: "up" | "down"; badgeVal: string; badgeSub: string; sparkPoints: string;
}) {
  const m = CARD_META[variant];
  const [hov, setHov] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    const y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    ref.current.style.transform = `translateY(-5px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) scale(1.025)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ""; setHov(false); };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onMouseEnter={() => setHov(true)}
      style={{ position: "relative", borderRadius: 20, padding: "22px 20px", border: "1px solid rgba(255,255,255,.08)", overflow: "hidden", cursor: "pointer", transition: "box-shadow .3s", transformStyle: "preserve-3d", background: m.bg, boxShadow: hov ? m.hoverShadow : m.shadow }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 110, height: 110, borderRadius: "50%", background: m.color, filter: "blur(38px)", opacity: hov ? 0.8 : 0.5, pointerEvents: "none", transition: "opacity .3s" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,.04),transparent 50%)", borderRadius: "inherit", pointerEvents: "none" }} />
      <div style={{ fontSize: ".66rem", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 7, color: m.color }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, boxShadow: `0 0 8px ${m.color}`, flexShrink: 0, display: "inline-block" }} />
        {label}
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.8rem", letterSpacing: -1, lineHeight: 1, marginBottom: 8 }}>{value}</div>
      <div style={{ fontSize: ".66rem", color: "#5a6585", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Spark points={sparkPoints} color={m.color} />
        <span style={{ color: badgeDir === "up" ? "#00ffa3" : "#ff4d6d" }}>{badgeDir === "up" ? "▲" : "▼"} {badgeVal}</span>
        <span>{badgeSub}</span>
      </div>
    </div>
  );
}

function TradeItem({ pair, side, entry, exit, lot, pnl, currency }: { pair: string; side: string; entry?: number | null; exit?: number | null; lot?: number | null; pnl: number; currency: string }) {
  const isLong = side === "long";
  const isPos = pnl >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer", transition: "all .18s" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.cssText += ";background:rgba(255,255,255,.025);padding:11px 8px;margin:0 -8px;border-radius:8px;"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = ""; el.style.padding = "11px 0"; el.style.margin = "0"; el.style.borderRadius = "0"; }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 700, background: isLong ? "rgba(0,255,163,.12)" : "rgba(255,77,109,.12)", color: isLong ? "#00ffa3" : "#ff4d6d", border: isLong ? "1px solid rgba(0,255,163,.2)" : "1px solid rgba(255,77,109,.2)" }}>
        {isLong ? "L" : "S"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: ".78rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pair}</div>
        <div style={{ fontSize: ".63rem", color: "#5a6585", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {entry && exit ? `${entry.toLocaleString()} → ${exit.toLocaleString()}` : ""}
          {lot ? ` · lot ${lot}` : ""}
        </div>
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: ".85rem", flexShrink: 0, color: isPos ? "#00ffa3" : "#ff4d6d" }}>
        {isPos ? "+" : ""}{fmtMoney(pnl, currency)}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(13,20,36,.95)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "8px 14px", fontSize: ".72rem", color: "#e8edf8" }}>
      <div style={{ color: "#5a6585", marginBottom: 2 }}>{payload[0]?.payload?.date}</div>
      <div style={{ color: "#00ffa3", fontWeight: 700 }}>{Number(payload[0]?.value || 0).toLocaleString()}</div>
    </div>
  );
}

function AiBar() {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ background: "rgba(13,20,36,.75)", border: `1px solid ${focused ? "rgba(0,255,163,.35)" : "rgba(255,255,255,.06)"}`, boxShadow: focused ? "0 0 0 3px rgba(0,255,163,.06)" : "none", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(20px)", transition: "border-color .3s, box-shadow .3s", marginBottom: 16 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#00ffa3,#00cfff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 700, color: "#000", boxShadow: "0 4px 14px rgba(0,255,163,.3)", animation: "aiPulse 3s ease-in-out infinite" }}>AI</div>
      <input onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#e8edf8", fontFamily: "'DM Mono',monospace", fontSize: ".78rem" }} placeholder="Ketik trade kamu… cth: Long BTC entry 65000 exit 66000 lot 0.1" />
      <button style={{ background: "linear-gradient(135deg,#00ffa3,#00cfff)", border: "none", borderRadius: 9, padding: "8px 15px", color: "#000", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: ".7rem", cursor: "pointer", letterSpacing: ".04em", whiteSpace: "nowrap" }}>CATAT ↗</button>
    </div>
  );
}

function Dashboard() {
  const { data: profile }     = useProfile();
  const { data: trades = [] } = useTrades();
  const { data: moves  = [] } = useMovements();
  const currency = profile?.currency ?? "USD";
  const displayName = profile?.display_name ?? "Trader";

  const stats = useMemo(() => computeStats(profile?.initial_capital ?? 0, trades, moves), [profile, trades, moves]);
  const curve = useMemo(() => equityCurve(profile?.initial_capital ?? 0, trades, moves), [profile, trades, moves]);

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // weekly trade count
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyCount = trades.filter(t => new Date(t.traded_at) >= weekAgo).length;

  return (
    <div style={{ fontFamily: "'DM Mono',monospace", color: "#e8edf8" }}>
      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.45rem", letterSpacing: "-.5px", margin: 0 }}>
          Halo, <span style={{ color: "#00ffa3" }}>{displayName}</span> 👋
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(13,20,36,.75)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, padding: "7px 14px", fontSize: ".7rem", color: "#5a6585", backdropFilter: "blur(12px)", whiteSpace: "nowrap" }}>
          ◷ &nbsp;{today}
        </div>
      </div>

      {/* 4 stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}
        className="dash-stat-grid">
        <StatCard variant="profit"  label="Profit Bulan Ini" value={fmtMoney(stats.monthly, currency)} badgeDir={stats.monthly >= 0 ? "up" : "down"} badgeVal={stats.monthly >= 0 ? "+bulan ini" : "bulan ini"} badgeSub="vs bulan lalu" sparkPoints="0,18 10,12 20,14 30,7 40,10 50,3 60,6" />
        <StatCard variant="winrate" label="Win Rate"         value={`${stats.winRate.toFixed(1)}%`}    badgeDir="up"                                   badgeVal={`${stats.winRate.toFixed(1)}%`}                      badgeSub="30 hari"     sparkPoints="0,16 10,10 20,13 30,6 40,9 50,4 60,7" />
        <StatCard variant="trades"  label="Total Trade"      value={String(stats.tradeCount)}           badgeDir="up"                                   badgeVal={String(weeklyCount)}                                 badgeSub="minggu ini"  sparkPoints="0,14 10,12 20,9 30,11 40,6 50,8 60,4" />
        <StatCard variant="balance" label="Saldo Akun"       value={fmtMoney(stats.balance, currency)}  badgeDir={stats.daily >= 0 ? "up" : "down"}     badgeVal={fmtMoney(Math.abs(stats.daily), currency)}           badgeSub="hari ini"    sparkPoints="0,18 10,14 20,16 30,10 40,12 50,5 60,8" />
      </div>

      {/* Chart + Feed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}
        className="dash-bottom-grid">
        {/* Chart */}
        <div style={{ borderRadius: 20, padding: "24px 26px", background: "rgba(13,20,36,.75)", border: "1px solid rgba(255,255,255,.06)", backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: ".95rem" }}>Equity Curve</div>
          </div>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00ffa3" stopOpacity={0.24} />
                    <stop offset="75%"  stopColor="#00ffa3" stopOpacity={0.04} />
                    <stop offset="100%" stopColor="#00ffa3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#5a6585", fontSize: 10, fontFamily: "'DM Mono',monospace" }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="balance" stroke="#00ffa3" strokeWidth={2.5} fill="url(#eqGrad)" dot={false} activeDot={{ r: 5, fill: "#00ffa3" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feed */}
        <div style={{ borderRadius: 20, padding: "24px 22px", background: "rgba(13,20,36,.75)", border: "1px solid rgba(255,255,255,.06)", backdropFilter: "blur(20px)" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: ".95rem", marginBottom: 16 }}>Trade Terakhir</div>
          {trades.length === 0 ? (
            <div style={{ fontSize: ".75rem", color: "#5a6585", paddingTop: 8 }}>Belum ada trade. Gunakan AI untuk mencatat.</div>
          ) : (
            trades.slice(0, 5).map(t => (
              <TradeItem key={t.id} pair={t.pair} side={t.side} entry={t.entry_price} exit={t.exit_price} lot={t.lot_size} pnl={Number(t.pnl)} currency={currency} />
            ))
          )}
        </div>
      </div>

      {/* AI inline bar */}
      <AiBar />

      {/* Calendar Heatmap */}
      <div style={{ marginBottom: 16 }}>
        <CalendarHeatmap />
      </div>

      {/* Full AI Chat */}
      <AiChat />
    </div>
  );
}
