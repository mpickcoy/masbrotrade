import type { Trade, Movement } from "./queries";

export function computeStats(initialCapital: number, trades: Trade[], moves: Movement[]) {
  const totalPnl = trades.reduce((s, t) => s + Number(t.pnl), 0);
  const wins = trades.filter((t) => Number(t.pnl) > 0);
  const losses = trades.filter((t) => Number(t.pnl) < 0);
  const totalLoss = losses.reduce((s, t) => s + Number(t.pnl), 0);
  const totalProfit = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const deposits = moves.filter((m) => m.kind === "deposit").reduce((s, m) => s + Number(m.amount), 0);
  const withdraws = moves.filter((m) => m.kind === "withdraw").reduce((s, m) => s + Number(m.amount), 0);
  const balance = Number(initialCapital) + deposits - withdraws + totalPnl;
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;

  // periodic
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startDay);
  startWeek.setDate(startDay.getDate() - ((startDay.getDay() + 6) % 7)); // Monday
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumSince = (d: Date) =>
    trades.filter((t) => new Date(t.traded_at) >= d).reduce((s, t) => s + Number(t.pnl), 0);

  // ── Max Drawdown ──
  // Iterate equity curve, track peak, measure largest drop from peak
  const maxDrawdown = (() => {
    const sorted = [...trades].sort((a, b) => +new Date(a.traded_at) - +new Date(b.traded_at));
    let peak = Number(initialCapital) + deposits - withdraws;
    let running = peak;
    let maxDD = 0;
    for (const t of sorted) {
      running += Number(t.pnl);
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  })();

  const maxDrawdownPct = balance > 0 ? (maxDrawdown / (Number(initialCapital) + deposits - withdraws)) * 100 : 0;

  return {
    balance,
    totalPnl,
    totalProfit,
    totalLoss,
    winRate,
    tradeCount: trades.length,
    daily: sumSince(startDay),
    weekly: sumSince(startWeek),
    monthly: sumSince(startMonth),
    maxDrawdown,
    maxDrawdownPct,
  };
}

export function equityCurve(initialCapital: number, trades: Trade[], moves: Movement[]) {
  const events: { date: string; delta: number }[] = [
    ...trades.map((t) => ({ date: t.traded_at, delta: Number(t.pnl) })),
    ...moves.map((m) => ({ date: m.occurred_at, delta: m.kind === "deposit" ? Number(m.amount) : -Number(m.amount) })),
  ].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  let bal = Number(initialCapital);
  const points = [{ date: "Start", balance: bal }];
  for (const e of events) {
    bal += e.delta;
    points.push({
      date: new Date(e.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      balance: Number(bal.toFixed(2)),
    });
  }
  return points;
}

export function dailyBars(trades: Trade[], days = 14) {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of trades) {
    const k = new Date(t.traded_at).toISOString().slice(0, 10);
    if (map.has(k)) map.set(k, (map.get(k) || 0) + Number(t.pnl));
  }
  return Array.from(map.entries()).map(([k, v]) => ({
    day: new Date(k).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    pnl: Number(v.toFixed(2)),
  }));
}
