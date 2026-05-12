import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/lib/queries";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { Send, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/chat")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };
type PendingCall = { id: string; name: string; args: Record<string, any> };

function ChatPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const search = useSearch({ from: "/_app/chat" });

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: 'Halo! Ceritakan trade Anda — contoh: "long BTC entry 65000 exit 65500 lot 0.1 profit 50"\n\nAtau ketik "deposit 500" untuk mencatat modal masuk.' },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingCall[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currency = profile?.currency ?? "USD";

  // Pre-fill from query param (e.g. from dashboard AI bar)
  useEffect(() => {
    if (search.q) {
      setInput(search.q);
      inputRef.current?.focus();
    }
  }, [search.q]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
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
        toast.success("✅ Trade tersimpan ke jurnal!");
      } else if (call.name === "save_deposit" || call.name === "save_withdraw") {
        const { error } = await supabase.from("capital_movements").insert({
          user_id: user.id,
          kind: call.name === "save_deposit" ? "deposit" : "withdraw",
          amount: Number(call.args.amount),
          note: call.args.note ?? null,
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["movements"] });
        toast.success(call.name === "save_deposit" ? "✅ Deposit tercatat" : "✅ Withdraw tercatat");
      }
      setPending((p) => p.filter((c) => c.id !== call.id));
      setMessages((m) => [...m, { role: "assistant", content: "✓ Tersimpan ke jurnal. Ada trade lain?" }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    }
  };

  const reject = (call: PendingCall) => {
    setPending((p) => p.filter((c) => c.id !== call.id));
    setMessages((m) => [...m, { role: "assistant", content: "Dibatalkan. Apa yang ingin dikoreksi?" }]);
  };

  const QUICK = [
    "Long BTC entry 65000 exit 65500 lot 0.1",
    "Short EUR/USD entry 1.0850 exit 1.0800 lot 0.5",
    "Deposit 500",
    "Withdraw 200",
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "calc(100vh - 58px)",
      maxWidth: 720, margin: "0 auto", padding: "0 16px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "20px 0 16px", borderBottom: "1px solid rgba(255,255,255,.06)",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: "linear-gradient(135deg,#00ffa3,#00cfff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: ".75rem", fontWeight: 700, color: "#000",
          boxShadow: "0 4px 14px rgba(0,255,163,.35)",
        }}>AI</div>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#e8edf8" }}>
            Asisten Trading AI
          </div>
          <div style={{ fontSize: ".68rem", color: "#00ffa3", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ffa3", display: "inline-block", boxShadow: "0 0 6px #00ffa3" }} />
            Online · Siap mencatat trade
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Quick prompts — only when fresh */}
        {messages.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {QUICK.map((q) => (
              <button
                key={q} onClick={() => send(q)}
                style={{
                  background: "rgba(0,255,163,.07)", border: "1px solid rgba(0,255,163,.2)",
                  borderRadius: 20, padding: "6px 14px", fontSize: ".7rem",
                  color: "#00ffa3", cursor: "pointer", fontFamily: "'DM Mono',monospace",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(0,255,163,.14)"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "rgba(0,255,163,.07)"; }}
              >{q}</button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginRight: 8, marginTop: 2,
                background: "linear-gradient(135deg,#00ffa3,#00cfff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: ".6rem", fontWeight: 700, color: "#000",
              }}>AI</div>
            )}
            <div style={{
              maxWidth: "78%", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "10px 14px", fontSize: ".82rem", lineHeight: 1.6,
              background: m.role === "user"
                ? "linear-gradient(135deg,#00ffa3,#00cfff)"
                : "rgba(255,255,255,.06)",
              color: m.role === "user" ? "#000" : "#e8edf8",
              border: m.role === "assistant" ? "1px solid rgba(255,255,255,.08)" : "none",
              whiteSpace: "pre-wrap",
            }}>{m.content}</div>
          </div>
        ))}

        {/* Pending confirmations */}
        {pending.map((p) => (
          <div key={p.id} style={{
            borderRadius: 16, border: "1px solid rgba(0,255,163,.3)",
            background: "rgba(0,255,163,.05)", padding: "14px 16px", marginLeft: 36,
          }}>
            <div style={{ fontSize: ".67rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#00ffa3", marginBottom: 10 }}>
              {p.name === "save_trade" ? "⚡ Konfirmasi Trade" : p.name === "save_deposit" ? "📥 Konfirmasi Deposit" : "📤 Konfirmasi Withdraw"}
            </div>
            <div style={{ fontSize: ".82rem", display: "flex", flexDirection: "column", gap: 4 }}>
              {p.name === "save_trade" ? (
                <>
                  <div><strong>{p.args.pair}</strong> · <span style={{ textTransform: "uppercase", color: p.args.side === "long" ? "#00ffa3" : "#ff4d6d" }}>{p.args.side}</span></div>
                  <div style={{ color: Number(p.args.pnl) >= 0 ? "#00ffa3" : "#ff4d6d", fontWeight: 700 }}>
                    P/L: {Number(p.args.pnl) >= 0 ? "+" : ""}{fmtMoney(Number(p.args.pnl), currency)}
                  </div>
                  {p.args.entry_price && (
                    <div style={{ fontSize: ".72rem", color: "#5a6585" }}>
                      Entry {p.args.entry_price} → Exit {p.args.exit_price ?? "–"} · Lot {p.args.lot_size ?? "–"}
                    </div>
                  )}
                  {p.args.notes && <div style={{ fontSize: ".72rem", fontStyle: "italic", color: "#5a6585" }}>"{p.args.notes}"</div>}
                </>
              ) : (
                <div>{fmtMoney(Number(p.args.amount), currency)} {p.args.note ? `· ${p.args.note}` : ""}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button size="sm" onClick={() => confirm(p)} style={{ background: "linear-gradient(135deg,#00ffa3,#00cfff)", color: "#000", fontWeight: 700, border: "none" }}>
                <Check className="size-3.5 mr-1" />Simpan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => reject(p)} style={{ color: "#5a6585" }}>
                <X className="size-3.5 mr-1" />Batal
              </Button>
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 36 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#00ffa3",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  display: "inline-block",
                }} />
              ))}
            </div>
            <span style={{ fontSize: ".72rem", color: "#5a6585" }}>AI sedang berpikir...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 0 20px", borderTop: "1px solid rgba(255,255,255,.06)",
        display: "flex", gap: 10,
      }}>
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ceritakan trade kamu…"
          disabled={busy}
          style={{
            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
            color: "#e8edf8", fontFamily: "'DM Mono',monospace", fontSize: ".82rem",
            borderRadius: 12, flex: 1,
          }}
        />
        <Button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          style={{
            background: "linear-gradient(135deg,#00ffa3,#00cfff)",
            color: "#000", border: "none", borderRadius: 12,
            width: 44, height: 44, padding: 0, flexShrink: 0,
          }}
        >
          <Send className="size-4" />
        </Button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
