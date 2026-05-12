import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTrades, useProfile, useMovements } from "@/lib/queries";
import { computeStats, dailyBars } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { PositionSizeCalculator } from "@/components/PositionSizeCalculator";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Target, Zap, Award, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/statistik")({ component: Statistik });

function Statistik() {
  const { data: trades = [] } = useTrades();
  const { data: profile } = useProfile();
  const { data: moves = [] } = useMovements();
  const currency = profile?.currency ?? "USD";
  const navigate = useNavigate();

  const stats = useMemo(
    () => computeStats(profile?.initial_capital ?? 0, trades, moves),
    [profile, trades, moves]
  );

  const bars = useMemo(() => dailyBars(trades, 30), [trades]);

  // Extended stats
  const extended = useMemo(() => {
    if (!trades.length) return null;
    const wins   = trades.filter((t) => Number(t.pnl) > 0);
    const losses = trades.filter((t) => Number(t.pnl) < 0);
    const avgWin  = wins.length   ? wins.reduce((s, t)   => s + Number(t.pnl), 0) / wins.length   : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length : 0;
    const profitFactor = stats.totalLoss !== 0 ? Math.abs(stats.totalProfit / stats.totalLoss) : Infinity;
    const bestTrade  = trades.reduce((a, b) => Number(a.pnl) > Number(b.pnl) ? a : b);
    const worstTrade = trades.reduce((a, b) => Number(a.pnl) < Number(b.pnl) ? a : b);
    const maxDrawdown = (() => {
      let peak = 0, dd = 0, running = 0;
      for (const t of [...trades].sort((a, b) => +new Date(a.traded_at) - +new Date(b.traded_at))) {
        running += Number(t.pnl);
        if (running > peak) peak = running;
        const cur = peak - running;
        if (cur > dd) dd = cur;
      }
      return dd;
    })();

    // Pair performance (top 5)
    const pairMap = new Map<string, { pnl: number; wins: number; total: number }>();
    for (const t of trades) {
      const e = pairMap.get(t.pair) ?? { pnl: 0, wins: 0, total: 0 };
      pairMap.set(t.pair, {
        pnl:   e.pnl   + Number(t.pnl),
        wins:  e.wins  + (Number(t.pnl) > 0 ? 1 : 0),
        total: e.total + 1,
      });
    }
    const pairPerf = Array.from(pairMap.entries())
      .map(([pair, v]) => ({ pair, ...v, wr: Math.round((v.wins / v.total) * 100) }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    // RR data
    const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

    return { avgWin, avgLoss: Math.abs(avgLoss), profitFactor, bestTrade, worstTrade, maxDrawdown, pairPerf, rr };
  }, [trades, stats]);

  // Win/Loss/BE
  const pieData = useMemo(() => {
    const wins   = trades.filter((t) => Number(t.pnl) > 0).length;
    const losses = trades.filter((t) => Number(t.pnl) < 0).length;
    const be     = trades.filter((t) => Number(t.pnl) === 0).length;
    const total  = trades.length || 1;
    return {
      wins, losses, be, total,
      winPct:  Math.round((wins   / total) * 100),
      lossPct: Math.round((losses / total) * 100),
      bePct:   Math.round((be     / total) * 100),
    };
  }, [trades]);

  // Pie builder
  const buildPie = (segments: { pct: number; color: string }[]) => {
    const R = 54, cx = 64, cy = 64;
    let angle = -90;
    return segments.filter((s) => s.pct > 0).map((s) => {
      const start = (angle * Math.PI) / 180;
      angle += (s.pct / 100) * 360;
      const end = (angle * Math.PI) / 180;
      const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
      const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
      const large = s.pct > 50 ? 1 : 0;
      return { d: `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`, color: s.color };
    });
  };

  if (!trades.length) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Statistik</h1>
        <Card className="p-10 text-center text-muted-foreground">
          Belum ada trade. Catat trade pertama kamu lewat AI Chat.
        </Card>
      </div>
    );
  }

  const StatCard = ({
    icon: Icon, label, value, sub, color,
  }: { icon: any; label: string; value: string; sub?: string; color?: string }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
          <div className="font-display text-xl font-bold" style={color ? { color } : {}}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <Icon className="size-4 text-muted-foreground mt-1" />
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Statistik</h1>
        <p className="text-sm text-muted-foreground">Analisis performa trading kamu</p>
      </div>

      {/* ── Summary grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={TrendingUp}   label="Win Rate"     value={`${stats.winRate.toFixed(1)}%`}       color={stats.winRate >= 50 ? "var(--success)" : "var(--loss)"} />
        <StatCard icon={Target}       label="Total Trade"  value={String(stats.tradeCount)}              sub={`${trades.filter(t=>Number(t.pnl)>0).length}M / ${trades.filter(t=>Number(t.pnl)<0).length}K`} />
        <StatCard icon={TrendingUp}   label="Total Profit" value={fmtMoney(stats.totalProfit, currency)} color="var(--success)" />
        <StatCard icon={TrendingDown} label="Total Loss"   value={fmtMoney(stats.totalLoss, currency)}   color="var(--loss)" />
      </div>

      {extended && (<>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Zap}           label="Profit Factor" value={isFinite(extended.profitFactor) ? extended.profitFactor.toFixed(2) : "∞"} color={extended.profitFactor >= 1.5 ? "var(--success)" : "var(--loss)"} sub="≥1.5 bagus" />
          <StatCard icon={Award}         label="Avg Win"       value={fmtMoney(extended.avgWin, currency)}  color="var(--success)" />
          <StatCard icon={AlertTriangle} label="Avg Loss"      value={fmtMoney(extended.avgLoss, currency)} color="var(--loss)" />
          <StatCard icon={TrendingDown}  label="Max Drawdown"  value={fmtMoney(extended.maxDrawdown, currency)} color="var(--loss)" />
        </div>

        {/* ── Best / Worst ── */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="size-3 text-success" /> Trade Terbaik
            </div>
            <div className="font-display text-lg font-bold text-success">+{fmtMoney(Number(extended.bestTrade.pnl), currency)}</div>
            <div className="text-xs text-muted-foreground mt-1">{extended.bestTrade.pair} · {extended.bestTrade.side.toUpperCase()}</div>
            <div className="text-xs text-muted-foreground">{new Date(extended.bestTrade.traded_at).toLocaleDateString("id-ID")}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingDown className="size-3 text-loss" /> Trade Terburuk
            </div>
            <div className="font-display text-lg font-bold text-loss">{fmtMoney(Number(extended.worstTrade.pnl), currency)}</div>
            <div className="text-xs text-muted-foreground mt-1">{extended.worstTrade.pair} · {extended.worstTrade.side.toUpperCase()}</div>
            <div className="text-xs text-muted-foreground">{new Date(extended.worstTrade.traded_at).toLocaleDateString("id-ID")}</div>
          </Card>
        </div>

        {/* ════════════════════════════════════
            DIPINDAH DARI DASHBOARD
        ════════════════════════════════════ */}

        {/* ── R:R Ratio ── */}
        <Card className="p-4">
          <div className="font-semibold mb-4 text-sm">⚖️ Risk / Reward Ratio</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                lbl: "Avg R:R",
                val: `1 : ${extended.rr.toFixed(2)}`,
                color: extended.rr >= 1.5 ? "var(--success)" : extended.rr >= 1 ? "#fbbf24" : "var(--loss)",
                sub: extended.rr >= 1.5 ? "✓ Excellent" : extended.rr >= 1 ? "~ OK" : "↓ Perlu diperbaiki",
              },
              {
                lbl: "Profit Factor",
                val: isFinite(extended.profitFactor) ? extended.profitFactor.toFixed(2) : "∞",
                color: extended.profitFactor >= 1.5 ? "var(--success)" : extended.profitFactor >= 1 ? "#fbbf24" : "var(--loss)",
                sub: "≥ 1.5 bagus",
              },
              { lbl: "Avg Win",  val: fmtMoney(extended.avgWin,  currency), color: "var(--success)", sub: "" },
              { lbl: "Avg Loss", val: fmtMoney(extended.avgLoss, currency), color: "var(--loss)",    sub: "" },
            ].map((r) => (
              <div key={r.lbl} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{r.lbl}</div>
                <div className="font-display text-xl font-bold" style={{ color: r.color }}>{r.val}</div>
                {r.sub && <div className="text-[10px] text-muted-foreground mt-1">{r.sub}</div>}
              </div>
            ))}
          </div>
        </Card>

        {/* ── Win/Loss/BE Pie ── */}
        <Card className="p-4">
          <div className="font-semibold mb-4 text-sm">📊 Win / Loss / BE</div>
          {(pieData.winPct + pieData.lossPct + pieData.bePct === 0) ? (
            <p className="text-sm text-muted-foreground">Semua trade breakeven (PnL = 0).</p>
          ) : (
            <div className="flex items-center gap-8">
              <svg width="128" height="128" viewBox="0 0 128 128" style={{flexShrink:0}}>
                <circle cx="64" cy="64" r="54" fill="rgba(255,255,255,0.04)" />
                {buildPie([
                  { pct: pieData.winPct,  color: "#5ee7df" },
                  { pct: pieData.lossPct, color: "#f87171" },
                  { pct: pieData.bePct,   color: "rgba(255,255,255,0.25)" },
                ]).map((seg, i) => (
                  <path key={i} d={seg.d} fill={seg.color} opacity={0.88} />
                ))}
                <circle cx="64" cy="64" r="34" fill="rgba(10,15,35,0.80)" />
                <text x="64" y="60" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="Syne,sans-serif">{pieData.winPct}%</text>
                <text x="64" y="75" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="DM Mono,monospace">WIN</text>
              </svg>
              <div className="flex flex-col gap-3 flex-1">
                {[
                  { label: "Profit", pct: pieData.winPct,  count: pieData.wins,   color: "#5ee7df" },
                  { label: "Loss",   pct: pieData.lossPct, count: pieData.losses, color: "#f87171" },
                  { label: "BE",     pct: pieData.bePct,   count: pieData.be,     color: "rgba(255,255,255,0.40)" },
                ].map((leg) => (
                  <div key={leg.label} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: leg.color }} />
                    <span className="text-muted-foreground flex-1">{leg.label}</span>
                    <span className="font-semibold" style={{ color: leg.color }}>{leg.pct}%</span>
                    <span className="text-[10px] text-muted-foreground">({leg.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ── Top 3 Pair Terbaik ── */}
        <Card className="p-4">
          <div className="font-semibold mb-4 text-sm">🏆 Top Pair Terbaik</div>
          {extended.pairPerf.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data pair.</p>
          ) : (
            <div className="space-y-3">
              {extended.pairPerf.map((p, i) => {
                const maxAbs = Math.abs(extended.pairPerf[0].pnl) || 1;
                const pct = Math.abs(p.pnl) / maxAbs * 100;
                const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
                return (
                  <div key={p.pair}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium flex items-center gap-1">
                        <span>{medals[i]}</span> {p.pair}
                        <span className="text-muted-foreground ml-1">· {p.wr}% WR</span>
                      </span>
                      <span className="flex items-center gap-3 text-muted-foreground">
                        <span>{p.total} trade</span>
                        <span className="font-bold" style={{ color: p.pnl >= 0 ? "var(--success)" : "var(--loss)" }}>
                          {p.pnl >= 0 ? "+" : ""}{fmtMoney(p.pnl, currency)}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: p.pnl >= 0 ? "var(--success)" : "var(--loss)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Trade Terakhir ── */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-sm">🕐 Trade Terakhir</div>
            <button
              type="button"
              onClick={() => navigate({ to: "/trades" })}
              className="text-[11px] text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
            >
              Lihat Semua →
            </button>
          </div>
          <div className="space-y-1">
            {trades.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={t.side === "long"
                    ? { background: "rgba(94,231,223,0.15)", color: "#5ee7df", border: "1px solid rgba(94,231,223,0.25)" }
                    : { background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" }
                  }
                >
                  {t.side === "long" ? "L" : "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.pair}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(t.traded_at).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" })}
                  </div>
                </div>
                <div
                  className="text-sm font-bold font-display flex-shrink-0"
                  style={{ color: Number(t.pnl) >= 0 ? "#5ee7df" : "#f87171" }}
                >
                  {Number(t.pnl) >= 0 ? "+" : ""}{fmtMoney(Number(t.pnl), currency)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Position Size Calculator ── */}
        <PositionSizeCalculator balance={stats.balance} currency={currency} />

      </>)}

      {/* ── Daily P/L bar chart — 30 days ── */}
      <Card className="p-4">
        <div className="font-semibold mb-4 text-sm">P/L Harian (30 Hari Terakhir)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={bars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: "#5a6585" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "#0d1424", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [fmtMoney(v, currency), "P/L"]}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,.1)" />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {bars.map((b, i) => (
                <Cell key={i} fill={b.pnl >= 0 ? "var(--success)" : "var(--loss)"} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Calendar heatmap ── */}
      <CalendarHeatmap />
    </div>
  );
}
