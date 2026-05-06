import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMovements, useProfile } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/capital")({ component: Capital });

function Capital() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: moves = [] } = useMovements();
  const qc = useQueryClient();
  const currency = profile?.currency ?? "USD";

  const [kind, setKind] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Jumlah tidak valid");
    setBusy(true);
    const { error } = await supabase.from("capital_movements").insert({
      user_id: user.id,
      kind,
      amount: amt,
      note: note || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan");
    setAmount("");
    setNote("");
    qc.invalidateQueries({ queryKey: ["movements"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus catatan ini?")) return;
    const { error } = await supabase.from("capital_movements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["movements"] });
  };

  const totalDep = moves.filter((m) => m.kind === "deposit").reduce((s, m) => s + Number(m.amount), 0);
  const totalWd = moves.filter((m) => m.kind === "withdraw").reduce((s, m) => s + Number(m.amount), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Modal</h1>
        <p className="text-sm text-muted-foreground">Top-up & withdraw</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Modal Awal</div><div className="font-display text-lg font-bold">{fmtMoney(profile?.initial_capital ?? 0, currency)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Deposit</div><div className="font-display text-lg font-bold text-success">{fmtMoney(totalDep, currency)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Withdraw</div><div className="font-display text-lg font-bold text-loss">{fmtMoney(totalWd, currency)}</div></Card>
      </div>

      <Card className="p-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "deposit" | "withdraw")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdraw">Withdraw</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan (opsional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Menyimpan..." : "Tambah"}</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {moves.map((m) => (
          <Card key={m.id} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              {m.kind === "deposit" ? (
                <ArrowDownToLine className="size-5 text-success" />
              ) : (
                <ArrowUpFromLine className="size-5 text-loss" />
              )}
              <div>
                <div className="font-medium capitalize">{m.kind}</div>
                <div className="text-xs text-muted-foreground">{new Date(m.occurred_at).toLocaleString("id-ID")}{m.note ? ` · ${m.note}` : ""}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`font-display font-bold ${m.kind === "deposit" ? "text-success" : "text-loss"}`}>
                {m.kind === "deposit" ? "+" : "−"}{fmtMoney(Number(m.amount), currency)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 className="size-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
