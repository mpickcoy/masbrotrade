// src/lib/export.ts
// Zero dependency — tidak perlu install library apapun

import type { Trade } from "./queries";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtUSD(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency, maximumFractionDigits: 2,
  }).format(n);
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function exportCSV(trades: Trade[], currency = "USD") {
  const headers = ["No","Tanggal","Pair","Side","Entry","Exit","Lot","P/L","Notes"];

  const rows = trades.map((t, i) => [
    i + 1,
    `"${fmtDate(t.traded_at)}"`,
    t.pair,
    t.side.toUpperCase(),
    t.entry_price ?? "",
    t.exit_price  ?? "",
    t.lot_size    ?? "",
    Number(t.pnl).toFixed(2),
    `"${(t.notes ?? "").replace(/"/g, "'")}"`,
  ]);

  // Summary row
  const totalPnl  = trades.reduce((s, t) => s + Number(t.pnl), 0);
  const wins      = trades.filter((t) => Number(t.pnl) > 0).length;
  const winRate   = trades.length ? ((wins / trades.length) * 100).toFixed(1) : "0";

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.join(",")),
    "",
    `"Total P/L","${fmtUSD(totalPnl, currency)}"`,
    `"Total Trade","${trades.length}"`,
    `"Win Rate","${winRate}%"`,
    `"Menang","${wins}"`,
    `"Kalah","${trades.length - wins}"`,
    `"Diekspor pada","${fmtDate(new Date().toISOString())}"`,
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `TradeJournal_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export (print window) ────────────────────────────────────────────────
export function exportPDF(trades: Trade[], currency = "USD", displayName?: string | null) {
  const totalPnl   = trades.reduce((s, t) => s + Number(t.pnl), 0);
  const wins       = trades.filter((t) => Number(t.pnl) > 0);
  const losses     = trades.filter((t) => Number(t.pnl) < 0);
  const winRate    = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : "0";
  const totalProfit = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const totalLoss   = losses.reduce((s, t) => s + Number(t.pnl), 0);
  const profitFactor = totalLoss !== 0
    ? Math.abs(totalProfit / totalLoss).toFixed(2) : "∞";

  const green  = "#16a34a";
  const red    = "#dc2626";
  const now    = fmtDate(new Date().toISOString());
  const name   = displayName ?? "Trader";

  const tableRows = trades
    .map((t, i) => {
      const pnl     = Number(t.pnl);
      const color   = pnl >= 0 ? green : red;
      const sideBg  = t.side === "long" ? "#dcfce7" : "#fee2e2";
      const sideFg  = t.side === "long" ? green : red;
      return `
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:8px 6px;color:#6b7280;font-size:12px">${i + 1}</td>
          <td style="padding:8px 6px;font-size:12px">${fmtDate(t.traded_at)}</td>
          <td style="padding:8px 6px;font-weight:600;font-size:12px">${t.pair}</td>
          <td style="padding:8px 6px">
            <span style="background:${sideBg};color:${sideFg};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase">
              ${t.side}
            </span>
          </td>
          <td style="padding:8px 6px;font-size:12px">${t.entry_price ?? "—"}</td>
          <td style="padding:8px 6px;font-size:12px">${t.exit_price  ?? "—"}</td>
          <td style="padding:8px 6px;font-size:12px">${t.lot_size    ?? "—"}</td>
          <td style="padding:8px 6px;font-weight:700;color:${color};font-size:12px">
            ${pnl >= 0 ? "+" : ""}${fmtUSD(pnl, currency)}
          </td>
          <td style="padding:8px 6px;color:#6b7280;font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${t.notes ?? ""}
          </td>
        </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>TradeJournal — Laporan ${new Date().toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #111827; background: #fff; padding: 32px 40px; }
    @media print {
      body { padding: 16px 20px; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Print button (hidden on print) -->
  <div class="no-print" style="text-align:right;margin-bottom:16px">
    <button onclick="window.print()" style="background:#111827;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
      🖨️ Cetak / Simpan PDF
    </button>
  </div>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #111827">
    <div>
      <div style="font-size:24px;font-weight:700;letter-spacing:-0.5px">
        Trade<span style="color:${green}">Journal</span>
      </div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">Laporan Riwayat Trading</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;font-weight:600">${name}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">Diekspor: ${now}</div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:28px">
    ${[
      ["Total Trade",   trades.length + " trade",            "#f9fafb", "#111827"],
      ["Total P/L",     (totalPnl >= 0 ? "+" : "") + fmtUSD(totalPnl, currency), "#f9fafb", totalPnl >= 0 ? green : red],
      ["Win Rate",      winRate + "%",                       "#f0fdf4", green],
      ["Menang",        wins.length + " trade",              "#f0fdf4", green],
      ["Kalah",         losses.length + " trade",            "#fef2f2", red],
      ["Profit Factor", profitFactor,                        "#f9fafb", "#111827"],
    ].map(([label, val, bg, fg]) => `
      <div style="background:${bg};border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">${label}</div>
        <div style="font-size:15px;font-weight:700;color:${fg};margin-top:3px">${val}</div>
      </div>
    `).join("")}
  </div>

  <!-- Table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead>
      <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
        ${["No","Tanggal","Pair","Side","Entry","Exit","Lot","P/L","Notes"]
          .map((h) => `<th style="padding:9px 6px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">${h}</th>`)
          .join("")}
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <!-- Total row -->
    <tfoot>
      <tr style="background:#f9fafb;border-top:2px solid #111827">
        <td colspan="7" style="padding:10px 6px;font-weight:700;font-size:12px">TOTAL</td>
        <td style="padding:10px 6px;font-weight:800;font-size:14px;color:${totalPnl >= 0 ? green : red}">
          ${totalPnl >= 0 ? "+" : ""}${fmtUSD(totalPnl, currency)}
        </td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <!-- Footer -->
  <div style="border-top:1px solid #e5e7eb;padding-top:12px;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af">
    <span>TradeJournal · masbrotrade.lovable.app</span>
    <span>Total ${trades.length} trade · Win Rate ${winRate}% · Profit Factor ${profitFactor}</span>
  </div>

</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
