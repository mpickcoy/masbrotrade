import { createFileRoute } from "@tanstack/react-router";
import { useTrades, useProfile } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trades")({ component: Trades });

function Trades() {
  const { data: trades = [] } = useTrades();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const currency = profile?.currency ?? "USD";

  const remove = async (id: string) => {
    if (!confirm("Hapus trade ini?")) return;
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trade dihapus");
    qc.invalidateQueries({ queryKey: ["trades"] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Riwayat Trade</h1>
        <p className="text-sm text-muted-foreground">{trades.length} trade tercatat</p>
      </div>
      {trades.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Belum ada trade.</Card>
      ) : (
        <div className="space-y-2">
          {trades.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.pair}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase ${t.side === "long" ? "bg-success/15 text-success" : "bg-loss/15 text-loss"}`}>
                      {t.side}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(t.traded_at).toLocaleString("id-ID")}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    {t.entry_price != null && <div><span className="text-muted-foreground">Entry:</span> {t.entry_price}</div>}
                    {t.exit_price != null && <div><span className="text-muted-foreground">Exit:</span> {t.exit_price}</div>}
                    {t.lot_size != null && <div><span className="text-muted-foreground">Lot:</span> {t.lot_size}</div>}
                  </div>
                  {t.notes && <div className="mt-2 text-xs italic text-muted-foreground">"{t.notes}"</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`font-display text-lg font-bold ${Number(t.pnl) >= 0 ? "text-success" : "text-loss"}`}>
                    {fmtMoney(Number(t.pnl), currency)}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(t.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
