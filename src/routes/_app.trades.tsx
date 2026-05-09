// src/routes/_app.trades.tsx
// Ganti SELURUH isi file ini

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTrades, useProfile } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { exportCSV, exportPDF } from "@/lib/export";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download, FileText, FileSpreadsheet, ArrowUpRight, ArrowDownRight, ChevronDown, Share2 } from "lucide-react";
import { SharePnlCard } from "@/components/SharePnlCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trades")({ component: Trades });

// ─── Filter options ───────────────────────────────────────────────────────────
type PeriodFilter = "all" | "today" | "week" | "month";

function filterByPeriod(trades: ReturnType<typeof useTrades>["data"], period: PeriodFilter) {
  if (!trades) return [];
  if (period === "all") return trades;
  const now   = new Date();
  const start = new Date();
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return trades.filter((t) => new Date(t.traded_at) >= start);
}

// ─── Component ────────────────────────────────────────────────────────────────
function Trades() {
  const { data: trades = [] } = useTrades();
  const { data: profile }     = useProfile();
  const qc                    = useQueryClient();
  const currency              = profile?.currency ?? "USD";

  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const filtered  = filterByPeriod(trades, period);
  const totalPnl  = filtered.reduce((s, t) => s + Number(t.pnl), 0);
  const wins      = filtered.filter((t) => Number(t.pnl) > 0).length;
  const winRate   = filtered.length ? ((wins / filtered.length) * 100).toFixed(1) : "0";

  const handleExportCSV = () => {
    if (!filtered.length) return toast.error("Tidak ada data untuk diekspor.");
    setExporting(true);
    try {
      exportCSV(filtered, currency);
      toast.success(`✅ CSV berhasil diunduh (${filtered.length} trade)`);
    } catch {
      toast.error("Gagal mengekspor CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (!filtered.length) return toast.error("Tidak ada data untuk diekspor.");
    setExporting(true);
    try {
      exportPDF(filtered, currency, profile?.display_name);
      toast.success("✅ Laporan PDF dibuka di tab baru — klik 'Cetak / Simpan PDF'");
    } catch {
      toast.error("Gagal membuat PDF.");
    } finally {
      setExporting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus trade ini?")) return;
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trade dihapus");
    qc.invalidateQueries({ queryKey: ["trades"] });
  };

  const PERIODS: { value: PeriodFilter; label: string }[] = [
    { value: "all",   label: "Semua" },
    { value: "today", label: "Hari ini" },
    { value: "week",  label: "Minggu ini" },
    { value: "month", label: "Bulan ini" },
  ];

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Riwayat Trade</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} trade{period !== "all" && ` · ${PERIODS.find((p) => p.value === period)?.label}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} disabled={filtered.length === 0} className="gap-2">
          <Share2 className="size-4" />
          Bagikan
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={exporting || filtered.length === 0} className="gap-2">
              <Download className="size-4" />
              Ekspor
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="size-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">Ekspor CSV</div>
                <div className="text-xs text-muted-foreground">Buka di Excel / Google Sheets</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
              <FileText className="size-4 text-red-400" />
              <div>
                <div className="text-sm font-medium">Ekspor PDF</div>
                <div className="text-xs text-muted-foreground">Laporan siap cetak / simpan</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Filter Period ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              period === p.value
                ? "bg-primary text-primary-foreground"
                : "border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Summary Bar ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total P/L</div>
            <div className={`font-display text-lg font-bold mt-0.5 ${totalPnl >= 0 ? "text-success" : "text-loss"}`}>
              {fmtMoney(totalPnl, currency)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</div>
            <div className="font-display text-lg font-bold mt-0.5 text-success">{winRate}%</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Menang/Kalah</div>
            <div className="font-display text-lg font-bold mt-0.5">
              <span className="text-success">{wins}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-loss">{filtered.length - wins}</span>
            </div>
          </Card>
        </div>
      )}

      {/* ── Trade List ── */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          {trades.length === 0
            ? "Belum ada trade. Gunakan asisten AI di Dashboard."
            : "Tidak ada trade di periode ini."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Icon */}
                  <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                    Number(t.pnl) >= 0 ? "bg-success/15" : "bg-loss/15"
                  }`}>
                    {Number(t.pnl) >= 0
                      ? <ArrowUpRight className="size-4 text-success" />
                      : <ArrowDownRight className="size-4 text-loss" />
                    }
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{t.pair}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase ${
                        t.side === "long"
                          ? "bg-success/15 text-success"
                          : "bg-loss/15 text-loss"
                      }`}>
                        {t.side}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(t.traded_at).toLocaleString("id-ID")}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      {t.entry_price != null && (
                        <div><span className="text-muted-foreground">Entry:</span> {t.entry_price}</div>
                      )}
                      {t.exit_price != null && (
                        <div><span className="text-muted-foreground">Exit:</span> {t.exit_price}</div>
                      )}
                      {t.lot_size != null && (
                        <div><span className="text-muted-foreground">Lot:</span> {t.lot_size}</div>
                      )}
                    </div>
                    {t.notes && (
                      <div className="mt-2 text-xs italic text-muted-foreground">"{t.notes}"</div>
                    )}
                  </div>
                </div>

                {/* P/L + Delete */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className={`font-display text-lg font-bold ${
                    Number(t.pnl) >= 0 ? "text-success" : "text-loss"
                  }`}>
                    {Number(t.pnl) >= 0 ? "+" : ""}{fmtMoney(Number(t.pnl), currency)}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(t.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-loss">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Bottom export hint ── */}
      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground pb-2">
          {filtered.length} trade · Gunakan tombol <strong>Ekspor</strong> di atas untuk unduh CSV atau PDF
        </p>
      )}
    </div>
  );
}
