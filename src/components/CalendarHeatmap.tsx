// src/components/CalendarHeatmap.tsx
// Taruh file ini di: src/components/CalendarHeatmap.tsx

import { useState, useMemo } from "react";
import { useTrades, useProfile } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const DAYS_ID   = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayData {
  date:       string;   // "YYYY-MM-DD"
  totalPnl:   number;
  tradeCount: number;
  winCount:   number;
  lossCount:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalKey(iso: string): string {
  // traded_at is ISO — convert to local YYYY-MM-DD
  return new Date(iso).toLocaleDateString("sv-SE"); // "sv-SE" gives YYYY-MM-DD
}

function getDaysInYear(year: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function todayKey(): string {
  return new Date().toLocaleDateString("sv-SE");
}

// Color scale using oklch-compatible rgb – matches app's --success / --loss palette
function getCellStyle(data: DayData | undefined, maxAbs: number): string {
  if (!data || data.tradeCount === 0) return "var(--muted)";
  const ratio = Math.min(Math.abs(data.totalPnl) / (maxAbs || 1), 1);
  if (data.totalPnl > 0) {
    // Green: dim → vivid matching --success oklch(0.78 0.18 155)
    const lightness = 0.28 + ratio * 0.52;
    return `oklch(${lightness.toFixed(2)} 0.18 155)`;
  } else {
    // Red: dim → vivid matching --loss oklch(0.66 0.22 20)
    const lightness = 0.28 + ratio * 0.40;
    return `oklch(${lightness.toFixed(2)} 0.22 20)`;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CalendarHeatmap() {
  const { data: trades = [] }  = useTrades();
  const { data: profile }      = useProfile();
  const currency               = profile?.currency ?? "USD";
  const currentYear            = new Date().getFullYear();
  const [year, setYear]        = useState(currentYear);
  const [selected, setSelected] = useState<DayData | null>(null);

  // ── Build dayMap from existing useTrades() data ───────────────────────────
  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();
    trades.forEach((t) => {
      const key = toLocalKey(t.traded_at);
      // Only include trades in selected year
      if (!key.startsWith(String(year))) return;
      const prev = map.get(key) ?? { date: key, totalPnl: 0, tradeCount: 0, winCount: 0, lossCount: 0 };
      const pnl = Number(t.pnl);
      map.set(key, {
        ...prev,
        totalPnl:   prev.totalPnl + pnl,
        tradeCount: prev.tradeCount + 1,
        winCount:   prev.winCount  + (pnl > 0 ? 1 : 0),
        lossCount:  prev.lossCount + (pnl < 0 ? 1 : 0),
      });
    });
    return map;
  }, [trades, year]);

  // ── Year-level stats ──────────────────────────────────────────────────────
  const yearStats = useMemo(() => {
    let totalPnl = 0, tradeDays = 0, winDays = 0, lossDays = 0, totalTrades = 0;
    dayMap.forEach((d) => {
      totalPnl   += d.totalPnl;
      tradeDays  += 1;
      totalTrades+= d.tradeCount;
      if (d.totalPnl > 0) winDays++;
      if (d.totalPnl < 0) lossDays++;
    });
    const winDayRate = tradeDays > 0 ? (winDays / tradeDays) * 100 : 0;
    return { totalPnl, tradeDays, winDays, lossDays, winDayRate, totalTrades };
  }, [dayMap]);

  // ── Build SVG grid ────────────────────────────────────────────────────────
  const { weeks, monthLabels, maxAbs } = useMemo(() => {
    const allDays = getDaysInYear(year);
    const maxAbs  = Math.max(...[...dayMap.values()].map((d) => Math.abs(d.totalPnl)), 1);

    // Pad start to align with correct weekday (Sun=0)
    const startPad = allDays[0].getDay();
    const padded: (Date | null)[] = [...Array(startPad).fill(null), ...allDays];

    // Chunk into weeks of 7
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

    // Month label positions
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const first = week.find(Boolean) as Date | undefined;
      if (first && first.getMonth() !== lastMonth) {
        monthLabels.push({ col, label: MONTHS_ID[first.getMonth()] });
        lastMonth = first.getMonth();
      }
    });

    return { weeks, monthLabels, maxAbs };
  }, [year, dayMap]);

  const CELL = 13;
  const GAP  = 3;
  const today = todayKey();
  const svgW  = weeks.length * (CELL + GAP);
  const svgH  = 18 + 7 * (CELL + GAP);

  return (
    <Card className="p-4 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <h2 className="font-semibold">Kalender Trading</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setYear((y) => y - 1); setSelected(null); }}
            className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="w-12 text-center text-sm font-medium">{year}</span>
          <button
            onClick={() => { setYear((y) => y + 1); setSelected(null); }}
            disabled={year >= currentYear}
            className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Year Summary Cards ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniCard
          label="P/L Tahunan"
          value={fmtMoney(yearStats.totalPnl, currency)}
          positive={yearStats.totalPnl >= 0}
          colored
        />
        <MiniCard label="Hari Trading" value={`${yearStats.tradeDays} hari`} />
        <MiniCard
          label="Win Day Rate"
          value={`${yearStats.winDayRate.toFixed(0)}%`}
          positive={yearStats.winDayRate >= 50}
          colored
        />
        <MiniCard label="Total Trade" value={`${yearStats.totalTrades}x`} />
      </div>

      {/* ── Heatmap SVG ── */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <svg
          width={svgW}
          height={svgH}
          style={{ display: "block", minWidth: svgW }}
        >
          {/* Month labels */}
          {monthLabels.map(({ col, label }) => (
            <text
              key={label}
              x={col * (CELL + GAP)}
              y={10}
              fontSize={9}
              fill="var(--muted-foreground)"
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* Day-of-week labels on odd rows */}
          {[1, 3, 5].map((dow) => (
            <text
              key={dow}
              x={-24}
              y={18 + dow * (CELL + GAP) + CELL / 2 + 3}
              fontSize={8}
              fill="var(--muted-foreground)"
              fontFamily="inherit"
            >
              {DAYS_ID[dow]}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, col) =>
            week.map((date, row) => {
              if (!date) return null;
              const key      = date.toLocaleDateString("sv-SE");
              const data     = dayMap.get(key);
              const fill     = getCellStyle(data, maxAbs);
              const isToday  = key === today;
              const isSelected = selected?.date === key;

              return (
                <g key={`${col}-${row}`}>
                  <rect
                    x={col * (CELL + GAP)}
                    y={18 + row * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={fill}
                    stroke={
                      isSelected ? "var(--primary)" :
                      isToday    ? "var(--primary)" : "none"
                    }
                    strokeWidth={isSelected || isToday ? 1.5 : 0}
                    strokeOpacity={isSelected ? 1 : 0.6}
                    style={{ cursor: "pointer", transition: "opacity 0.1s" }}
                    onClick={() =>
                      setSelected(
                        isSelected
                          ? null
                          : data ?? { date: key, totalPnl: 0, tradeCount: 0, winCount: 0, lossCount: 0 }
                      )
                    }
                  />
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Rugi</span>
        {[0.28, 0.38, 0.50, 0.62].reverse().map((l) => (
          <span
            key={l}
            className="inline-block size-2.5 rounded-sm"
            style={{ background: `oklch(${l} 0.22 20)` }}
          />
        ))}
        <span
          className="inline-block size-2.5 rounded-sm"
          style={{ background: "var(--muted)" }}
        />
        {[0.28, 0.42, 0.58, 0.72].map((l) => (
          <span
            key={l}
            className="inline-block size-2.5 rounded-sm"
            style={{ background: `oklch(${l} 0.18 155)` }}
          />
        ))}
        <span>Profit</span>
      </div>

      {/* ── Selected Day Panel ── */}
      {selected && (
        <div className="rounded-lg border bg-background/60 p-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {new Date(selected.date + "T00:00").toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>

          {selected.tradeCount === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada trade di hari ini.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">P/L</div>
                <div
                  className="mt-0.5 font-display text-base font-bold"
                  style={{ color: selected.totalPnl >= 0 ? "var(--success)" : "var(--loss)" }}
                >
                  {fmtMoney(selected.totalPnl, currency)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Trade</div>
                <div className="mt-0.5 font-display text-base font-bold">{selected.tradeCount}x</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Menang</div>
                <div className="mt-0.5 font-display text-base font-bold text-success">
                  {selected.winCount}x
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Kalah</div>
                <div className="mt-0.5 font-display text-base font-bold text-loss">
                  {selected.lossCount}x
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Win/Loss day distribution ── */}
      {yearStats.tradeDays > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3 text-success" />
              {yearStats.winDays} hari profit
            </span>
            <span className="flex items-center gap-1">
              {yearStats.lossDays} hari rugi
              <TrendingDown className="size-3 text-loss" />
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${yearStats.winDayRate}%`,
                background: "var(--success)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── MiniCard ─────────────────────────────────────────────────────────────────
function MiniCard({
  label, value, positive, colored = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  colored?: boolean;
}) {
  const color = colored
    ? positive ? "var(--success)" : "var(--loss)"
    : undefined;
  return (
    <div className="rounded-lg border bg-background/50 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className="mt-0.5 font-display text-sm font-bold"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}
