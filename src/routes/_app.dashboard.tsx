import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useProfile, useTrades, useMovements } from "@/lib/queries";
import { computeStats, equityCurve, dailyBars } from "@/lib/stats";
import { fmtMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { AiChat } from "@/components/AiChat";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";
import { ArrowDownRight, ArrowUpRight, Wallet, Target } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "profit" | "loss" | "primary" }) {
  const accentClass =
    accent === "profit" ? "text-success" : accent === "loss" ? "text-loss" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${accentClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: trades = [] } = useTrades();
  const { data: moves = [] } = useMovements();
  const currency = profile?.currency ?? "USD";
  const stats = useMemo(() => computeStats(profile?.initial_capital ?? 0, trades, moves), [profile, trades, moves]);
  const curve = useMemo(() => equityCurve(profile?.initial_capital ?? 0, trades, moves), [profile, trades, moves]);
  const bars = useMemo(() => dailyBars(trades, 14), [trades]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan performa trading Anda</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Saldo" value={fmtMoney(stats.balance, currency)} sub={`Modal ${fmtMoney(profile?.initial_capital ?? 0, currency)}`} accent="primary" />
        <StatCard label="Total P/L" value={fmtMoney(stats.totalPnl, currency)} sub={`${stats.tradeCount} trade`} accent={stats.totalPnl >= 0 ? "profit" : "loss"} />
        <StatCard label="Total Loss" value={fmtMoney(stats.totalLoss, currency)} accent="loss" />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} sub={`Profit ${fmtMoney(stats.totalProfit, currency)}`} accent="profit" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Hari ini" value={fmtMoney(stats.daily, currency)} accent={stats.daily >= 0 ? "profit" : "loss"} />
        <StatCard label="Minggu ini" value={fmtMoney(stats.weekly, currency)} accent={stats.weekly >= 0 ? "profit" : "loss"} />
        <StatCard label="Bulan ini" value={fmtMoney(stats.monthly, currency)} accent={stats.monthly >= 0 ? "profit" : "loss"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            <h2 className="font-semibold">Equity Curve</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} width={50} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="balance" stroke="var(--primary)" strokeWidth={2} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h2 className="font-semibold">P/L 14 Hari</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}>
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} width={50} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {bars.map((b, i) => (
                    <Cell key={i} fill={b.pnl >= 0 ? "var(--success)" : "var(--loss)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <AiChat />

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Trade Terbaru</h2>
        {trades.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada trade. Gunakan asisten AI di atas.</p>
        ) : (
          <div className="space-y-2">
            {trades.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border bg-background/50 p-3">
                <div className="flex items-center gap-3">
                  {Number(t.pnl) >= 0 ? (
                    <ArrowUpRight className="size-5 text-success" />
                  ) : (
                    <ArrowDownRight className="size-5 text-loss" />
                  )}
                  <div>
                    <div className="font-medium">{t.pair} <span className="text-xs text-muted-foreground uppercase">{t.side}</span></div>
                    <div className="text-xs text-muted-foreground">{new Date(t.traded_at).toLocaleString("id-ID")}</div>
                  </div>
                </div>
                <div className={`font-display font-bold ${Number(t.pnl) >= 0 ? "text-success" : "text-loss"}`}>
                  {fmtMoney(Number(t.pnl), currency)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
