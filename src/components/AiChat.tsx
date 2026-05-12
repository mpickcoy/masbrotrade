import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { useProfile } from "@/lib/queries";

type Msg = { role: "user" | "assistant"; content: string };
type PendingCall = { id: string; name: string; args: Record<string, any> };

const WELCOME: Msg = {
  role: "assistant",
  content: 'Halo! Ceritakan trade Anda — contoh: "long BTC entry 65000 exit 65500 lot 0.1 profit 50"',
};

const glowCSS = `
@property --ai-α {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
.ai-glow-card {
  position: relative;
  border: solid 2px #0000;
  border-radius: 20px;
  background: rgba(10, 10, 25, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: visible;
}
.ai-glow-card::before,
.ai-glow-card::after {
  --full: conic-gradient(red 0 0);
  content: "";
  position: absolute;
  inset: -2px;
  border: solid 2px #0000;
  border-radius: inherit;
  pointer-events: none;
  animation: ai-spin 4s linear infinite;
  background: conic-gradient(
    from var(--ai-α),
    #5ee7df, #b490f5, #f94144, #f9c74f, #43aa8b, #577590, #5ee7df
  ) border-box;
  mask: var(--full) no-clip subtract, var(--full) padding-box;
}
.ai-glow-card::after {
  filter: blur(10px);
  opacity: 0.65;
}
@keyframes ai-spin { to { --ai-α: 1turn; } }

.ai-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  position: relative; z-index: 2;
}
.ai-header-icon {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(135deg, rgba(94,231,223,0.6), rgba(180,144,245,0.6));
  border: 1px solid rgba(94,231,223,0.45);
  display: flex; align-items: center; justify-content: center;
  font-size: .70rem; font-weight: 800; color: #000; flex-shrink: 0;
}
.ai-header-title {
  font-family: 'Syne', sans-serif;
  font-weight: 700; font-size: .88rem; color: #fff; flex: 1;
}
.ai-header-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #5ee7df; box-shadow: 0 0 8px #5ee7df;
  animation: ai-pulse 2s ease infinite;
}
@keyframes ai-pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:0.4; transform:scale(0.7); }
}
.ai-messages {
  max-height: 280px; overflow-y: auto;
  padding: 14px 14px 10px;
  display: flex; flex-direction: column; gap: 10px;
  position: relative; z-index: 2;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.12) transparent;
}
.ai-messages::-webkit-scrollbar { width: 4px; }
.ai-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
.ai-bubble-wrap { display: flex; }
.ai-bubble-wrap.user { justify-content: flex-end; }
.ai-bubble-wrap.assistant { justify-content: flex-start; }
.ai-bubble {
  max-width: 85%; padding: 9px 13px; border-radius: 14px;
  font-size: .78rem; line-height: 1.55;
}
.ai-bubble.user {
  background: linear-gradient(135deg, rgba(94,231,223,0.35), rgba(59,130,246,0.30));
  border: 1px solid rgba(94,231,223,0.30); color: #fff; border-bottom-right-radius: 4px;
}
.ai-bubble.assistant {
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.88); border-bottom-left-radius: 4px;
}
.ai-typing {
  display: flex; align-items: center; gap: 5px; padding: 9px 13px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
  border-radius: 14px; border-bottom-left-radius: 4px; width: fit-content;
}
.ai-typing-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: rgba(94,231,223,0.70);
  animation: ai-bounce 1.2s ease infinite;
}
.ai-typing-dot:nth-child(2) { animation-delay: .2s; }
.ai-typing-dot:nth-child(3) { animation-delay: .4s; }
@keyframes ai-bounce {
  0%,80%,100% { transform:translateY(0); opacity:0.5; }
  40%          { transform:translateY(-5px); opacity:1; }
}
.ai-confirm {
  border: 1px solid rgba(94,231,223,0.28);
  background: rgba(94,231,223,0.06);
  border-radius: 14px; padding: 12px 14px;
  position: relative; z-index: 2; margin: 0 14px 4px;
}
.ai-confirm-title {
  font-size: .62rem; font-weight: 700; letter-spacing: .10em;
  text-transform: uppercase; color: #5ee7df; margin-bottom: 8px;
}
.ai-confirm-body { font-size: .78rem; color: rgba(255,255,255,0.85); line-height: 1.55; }
.ai-confirm-actions { display: flex; gap: 8px; margin-top: 10px; }
.ai-btn-confirm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(94,231,223,0.45), rgba(59,130,246,0.45));
  border: 1px solid rgba(94,231,223,0.40);
  color: #fff; font-size: .70rem; font-weight: 700;
  font-family: 'Syne', sans-serif; cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.ai-btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(94,231,223,0.30); }
.ai-btn-cancel {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.60); font-size: .70rem; font-weight: 600;
  font-family: 'Syne', sans-serif; cursor: pointer; transition: all 180ms ease;
}
.ai-btn-cancel:hover { background: rgba(255,255,255,0.10); color: #fff; }
.ai-input-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.07);
  position: relative; z-index: 2;
}
.ai-input {
  flex: 1; min-width: 0;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px; padding: 9px 14px; color: #fff;
  font-family: 'DM Mono', monospace; font-size: .78rem;
  outline: none; transition: border-color 180ms, box-shadow 180ms;
}
.ai-input::placeholder { color: rgba(255,255,255,0.30); }
.ai-input:focus { border-color: rgba(94,231,223,0.45); box-shadow: 0 0 0 3px rgba(94,231,223,0.10); }
.ai-input:disabled { opacity: 0.5; }
.ai-send {
  width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px;
  background: linear-gradient(135deg, rgba(94,231,223,0.55), rgba(59,130,246,0.55));
  border: 1px solid rgba(94,231,223,0.40);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff;
  transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms;
}
.ai-send:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(94,231,223,0.35); }
.ai-send:disabled { opacity: 0.35; cursor: not-allowed; }
`;

export function AiChat() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const currency = profile?.currency ?? "USD";

  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingCall[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, busy]);

  // Load chat history from DB on mount
  useEffect(() => {
    if (!user || historyLoaded) return;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data && data.length > 0) {
        setMessages([WELCOME, ...data.map((r) => ({ role: r.role as Msg["role"], content: r.content }))]);
      }
      setHistoryLoaded(true);
    })();
  }, [user, historyLoaded]);

  const persist = useCallback(async (msg: Msg) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: msg.role,
      content: msg.content,
    });
  }, [user]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    persist(userMsg);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("trade-chat", {
        body: { messages: next },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        if (data.content) {
          const aiMsg: Msg = { role: "assistant", content: data.content };
          setMessages((m) => [...m, aiMsg]);
          persist(aiMsg);
        }
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
      const doneMsg: Msg = { role: "assistant", content: "✓ Tersimpan ke jurnal." };
      setMessages((m) => [...m, doneMsg]);
      persist(doneMsg);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    }
  };

  const reject = (call: PendingCall) => {
    setPending((p) => p.filter((c) => c.id !== call.id));
    const cancelMsg: Msg = { role: "assistant", content: "Dibatalkan. Apa yang ingin dikoreksi?" };
    setMessages((m) => [...m, cancelMsg]);
    persist(cancelMsg);
  };

  const confirmLabel = (name: string) =>
    name === "save_trade" ? "Konfirmasi Trade"
    : name === "save_deposit" ? "Konfirmasi Deposit"
    : "Konfirmasi Withdraw";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowCSS }} />
      <div className="ai-glow-card">
        <div className="ai-header">
          <div className="ai-header-icon">AI</div>
          <span className="ai-header-title">Asisten AI</span>
          <div className="ai-header-dot" />
        </div>

        <div ref={scrollRef} className="ai-messages">
          {messages.map((m, i) => (
            <div key={i} className={`ai-bubble-wrap ${m.role}`}>
              <div className={`ai-bubble ${m.role}`}>{m.content}</div>
            </div>
          ))}
          {busy && (
            <div className="ai-bubble-wrap assistant">
              <div className="ai-typing">
                <div className="ai-typing-dot" />
                <div className="ai-typing-dot" />
                <div className="ai-typing-dot" />
              </div>
            </div>
          )}
        </div>

        {pending.map((p) => (
          <div key={p.id} className="ai-confirm">
            <div className="ai-confirm-title">{confirmLabel(p.name)}</div>
            <div className="ai-confirm-body">
              {p.name === "save_trade" ? (
                <>
                  <div><strong>{p.args.pair}</strong> · <span style={{ textTransform: "uppercase" }}>{p.args.side}</span></div>
                  <div style={{ color: Number(p.args.pnl) >= 0 ? "#5ee7df" : "#f87171", marginTop: 2 }}>
                    P/L: {fmtMoney(Number(p.args.pnl), currency)}
                  </div>
                  {p.args.entry_price && (
                    <div style={{ fontSize: ".68rem", color: "rgba(255,255,255,0.50)", marginTop: 2 }}>
                      Entry {p.args.entry_price} → Exit {p.args.exit_price ?? "-"} · Lot {p.args.lot_size ?? "-"}
                    </div>
                  )}
                  {p.args.notes && (
                    <div style={{ fontSize: ".68rem", fontStyle: "italic", marginTop: 2, color: "rgba(255,255,255,0.55)" }}>
                      "{p.args.notes}"
                    </div>
                  )}
                </>
              ) : (
                <div>{fmtMoney(Number(p.args.amount), currency)}{p.args.note ? ` · ${p.args.note}` : ""}</div>
              )}
            </div>
            <div className="ai-confirm-actions">
              <button type="button" className="ai-btn-confirm" onClick={() => confirm(p)}>
                <Check size={13} /> Simpan
              </button>
              <button type="button" className="ai-btn-cancel" onClick={() => reject(p)}>
                <X size={13} /> Batal
              </button>
            </div>
          </div>
        ))}

        <div className="ai-input-bar">
          <input
            className="ai-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ceritakan trade Anda..."
            disabled={busy}
          />
          <button
            type="button"
            className="ai-send"
            onClick={send}
            disabled={busy || !input.trim()}
            title="Kirim"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
