import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTrades, useProfile } from "@/lib/queries";
import { computeStats, dailyBars } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Target, Zap, Award, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/statistik")({ component: Statistik });

function Statistik() {
  const { data: trades = [] } = useTrades();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "USD";

  const stats = useMemo(
    () => computeStats(profile?.initial_capital ?? 0, trades, []),
    [profile, trades]
  );

  const bars = useMemo(() => dailyBars(trades, 30), [trades]);

  // Extended stats
  const extended = useMemo(() => {
    if (!trades.length) return null;
    const wins  = trades.filter((t) => Number(t.pnl) > 0);
    const losses = trades.filter((t) => Number(t.pnl) < 0);
    const avgWin  = wins.length  ? wins.reduce((s, t)   => s + Number(t.pnl), 0) / wins.length  : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length : 0;
    const profitFactor = stats.totalLoss !== 0 ? Math.abs(stats.totalProfit / stats.totalLoss) : Infinity;
    const bestTrade  = trades.reduce((a, b) => Number(a.pnl) > Number(b.pnl) ? a : b);
    const worstTrade = trades.reduce((a, b) => Number(a.pnl) < Number(b.pnl) ? a : b);
    const maxDrawdown = (() => {
      let peak = 0, dd = 0;
      let running = 0;
      for (const t of [...trades].sort((a, b) => +new Date(a.traded_at) - +new Date(b.traded_at))) {
        running += Number(t.pnl);
        if (running > peak) peak = running;
        const cur = peak - running;
        if (cur > dd) dd = cur;
      }
      return dd;
    })();

    // Pair performance
    const pairMap = new Map<string, { pnl: number; count: number }>();
    for (const t of trades) {
      const e = pairMap.get(t.pair) ?? { pnl: 0, count: 0 };
      pairMap.set(t.pair, { pnl: e.pnl + Number(t.pnl), count: e.count + 1 });
    }
    const pairPerf = Array.from(pairMap.entries())
      .map(([pair, v]) => ({ pair, ...v }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    return { avgWin, avgLoss, profitFactor, bestTrade, worstTrade, maxDrawdown, pairPerf };
  }, [trades, stats]);

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

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={TrendingUp}  label="Win Rate"      value={`${stats.winRate.toFixed(1)}%`}       color={stats.winRate >= 50 ? "var(--success)" : "var(--loss)"} />
        <StatCard icon={Target}      label="Total Trade"   value={String(stats.tradeCount)}              sub={`${trades.filter(t=>Number(t.pnl)>0).length}M / ${trades.filter(t=>Number(t.pnl)<0).length}K`} />
        <StatCard icon={TrendingUp}  label="Total Profit"  value={fmtMoney(stats.totalProfit, currency)} color="var(--success)" />
        <StatCard icon={TrendingDown} label="Total Loss"   value={fmtMoney(stats.totalLoss, currency)}   color="var(--loss)" />
      </div>

      {extended && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Zap}          label="Profit Factor"  value={isFinite(extended.profitFactor) ? extended.profitFactor.toFixed(2) : "∞"} color={extended.profitFactor >= 1.5 ? "var(--success)" : "var(--loss)"} sub="≥1.5 bagus" />
            <StatCard icon={Award}        label="Avg Win"        value={fmtMoney(extended.avgWin, currency)}  color="var(--success)" />
            <StatCard icon={AlertTriangle} label="Avg Loss"      value={fmtMoney(Math.abs(extended.avgLoss), currency)} color="var(--loss)" />
            <StatCard icon={TrendingDown} label="Max Drawdown"   value={fmtMoney(extended.maxDrawdown, currency)} color="var(--loss)" />
          </div>

          {/* Best / Worst */}
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

          {/* Pair performance */}
          {extended.pairPerf.length > 0 && (
            <Card className="p-4">
              <div className="font-semibold mb-4 text-sm">Performa per Pair</div>
              <div className="space-y-3">
                {extended.pairPerf.map((p) => {
                  const max = Math.abs(extended.pairPerf[0].pnl) || 1;
                  const pct = Math.abs(p.pnl) / max * 100;
                  return (
                    <div key={p.pair}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{p.pair}</span>
                        <span className="flex items-center gap-3 text-muted-foreground">
                          <span>{p.count} trade</span>
                          <span className="font-bold" style={{ color: p.pnl >= 0 ? "var(--success)" : "var(--loss)" }}>
                            {p.pnl >= 0 ? "+" : ""}{fmtMoney(p.pnl, currency)}
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: p.pnl >= 0 ? "var(--success)" : "var(--loss)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Daily P/L bar chart — 30 days */}
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

      {/* Calendar heatmap */}
      <CalendarHeatmap />
    </div>
  );
}
