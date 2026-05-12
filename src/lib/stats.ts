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

  // Use peak equity as denominator (industry standard), not initial capital
  const maxDrawdownPct = (() => {
    const sorted = [...trades].sort((a, b) => +new Date(a.traded_at) - +new Date(b.traded_at));
    let peak = Number(initialCapital) + deposits - withdraws;
    let running = peak;
    let peakEver = peak;
    for (const t of sorted) {
      running += Number(t.pnl);
      if (running > peakEver) peakEver = running;
    }
    return peakEver > 0 ? (maxDrawdown / peakEver) * 100 : 0;
  })();

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
  // Aggregate all events per calendar day first → 1 point per day (no duplicate labels)
  const dayMap = new Map<string, number>();
  for (const t of trades) {
    const key = new Date(t.traded_at).toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + Number(t.pnl));
  }
  for (const m of moves) {
    const key = new Date(m.occurred_at).toISOString().slice(0, 10);
    const delta = m.kind === "deposit" ? Number(m.amount) : -Number(m.amount);
    dayMap.set(key, (dayMap.get(key) ?? 0) + delta);
  }

  const sorted = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let bal = Number(initialCapital);
  const points = [{ date: "Start", balance: bal }];
  for (const [isoDate, delta] of sorted) {
    bal += delta;
    points.push({
      date: new Date(isoDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
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
