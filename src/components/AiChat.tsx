import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { useProfile } from "@/lib/queries";

type Msg = { role: "user" | "assistant"; content: string };
type PendingCall = { id: string; name: string; args: Record<string, any> };

export function AiChat() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Halo! Ceritakan trade Anda — contoh: \"long BTC entry 65000 exit 65500 lot 0.1 profit 50\"" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingCall[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("trade-chat", {
        body: { messages: next },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        if (data.content) setMessages((m) => [...m, { role: "assistant", content: data.content }]);
        if (data.tool_calls?.length) setPending(data.tool_calls);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menghubungi AI");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (call: PendingCall) => {
    if (!user) return;
    try {
      if (call.name === "save_trade") {
        const a = call.args;
        const { error } = await supabase.from("trades").insert({
          user_id: user.id,
          pair: String(a.pair),
          side: a.side === "short" ? "short" : "long",
          pnl: Number(a.pnl) || 0,
          entry_price: a.entry_price ?? null,
          exit_price: a.exit_price ?? null,
          lot_size: a.lot_size ?? null,
          notes: a.notes ?? null,
          traded_at: a.traded_at || new Date().toISOString(),
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["trades"] });
        toast.success("Trade tersimpan");
      } else if (call.name === "save_deposit" || call.name === "save_withdraw") {
        const { error } = await supabase.from("capital_movements").insert({
          user_id: user.id,
          kind: call.name === "save_deposit" ? "deposit" : "withdraw",
          amount: Number(call.args.amount),
          note: call.args.note ?? null,
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["movements"] });
        toast.success(call.name === "save_deposit" ? "Deposit tercatat" : "Withdraw tercatat");
      }
      setPending((p) => p.filter((c) => c.id !== call.id));
      setMessages((m) => [...m, { role: "assistant", content: "✓ Tersimpan ke jurnal." }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    }
  };

  const reject = (call: PendingCall) => {
    setPending((p) => p.filter((c) => c.id !== call.id));
    setMessages((m) => [...m, { role: "assistant", content: "Dibatalkan. Apa yang ingin dikoreksi?" }]);
  };

  const currency = profile?.currency ?? "USD";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-accent/30 px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-semibold">Asisten AI</h2>
      </div>
      <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {pending.map((p) => (
          <div key={p.id} className="rounded-xl border border-primary/40 bg-primary/5 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
              {p.name === "save_trade" ? "Konfirmasi Trade" : p.name === "save_deposit" ? "Konfirmasi Deposit" : "Konfirmasi Withdraw"}
            </div>
            <div className="space-y-1 text-sm">
              {p.name === "save_trade" ? (
                <>
                  <div><b>{p.args.pair}</b> · <span className="uppercase">{p.args.side}</span></div>
                  <div className={Number(p.args.pnl) >= 0 ? "text-success" : "text-loss"}>
                    P/L: {fmtMoney(Number(p.args.pnl), currency)}
                  </div>
                  {p.args.entry_price && <div className="text-xs text-muted-foreground">Entry {p.args.entry_price} → Exit {p.args.exit_price ?? "-"} · Lot {p.args.lot_size ?? "-"}</div>}
                  {p.args.notes && <div className="text-xs italic">"{p.args.notes}"</div>}
                </>
              ) : (
                <div>{fmtMoney(Number(p.args.amount), currency)} {p.args.note ? `· ${p.args.note}` : ""}</div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => confirm(p)}><Check className="size-4 mr-1" />Simpan</Button>
              <Button size="sm" variant="ghost" onClick={() => reject(p)}><X className="size-4 mr-1" />Batal</Button>
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground">AI sedang berpikir...</div>}
      </div>
      <div className="flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ceritakan trade Anda..."
          disabled={busy}
        />
        <Button onClick={send} disabled={busy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
