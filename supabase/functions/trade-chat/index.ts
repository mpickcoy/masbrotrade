import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Anda adalah asisten jurnal trading. Tugas Anda HANYA membantu user mencatat:
1. Trade baru (pair, side long/short, entry price, exit price, lot size, profit/loss nominal, catatan)
2. Deposit modal (top-up)
3. Withdraw modal

Aturan:
- Bahasa Indonesia, ramah dan singkat.
- Untuk TRADE: minimum diperlukan pair, side, dan pnl (profit/loss nominal). Field lain opsional. Jika user hanya menyebut profit tanpa side/pair, tanyakan balik.
- Untuk DEPOSIT/WITHDRAW: butuh amount (positif).
- Setelah data lengkap, panggil tool yang tepat (save_trade / save_deposit / save_withdraw).
- Jika user bertanya hal di luar ini, arahkan kembali ke pencatatan.
- Side "buy"/"beli" = long, "sell"/"jual" = short.
- Jika pnl tidak disebut tapi entry, exit, lot disebut, hitung sendiri (untuk forex: (exit-entry)*lot*100000 untuk pair major; untuk crypto: (exit-entry)*lot). Jika ragu, tanyakan pnl ke user.`;

const tools = [
  {
    type: "function",
    function: {
      name: "save_trade",
      description: "Simpan satu trade ke jurnal user.",
      parameters: {
        type: "object",
        properties: {
          pair: { type: "string", description: "Mis. BTC/USDT, EUR/USD, XAU/USD" },
          side: { type: "string", enum: ["long", "short"] },
          pnl: { type: "number", description: "Profit (positif) atau loss (negatif) dalam mata uang akun" },
          entry_price: { type: "number" },
          exit_price: { type: "number" },
          lot_size: { type: "number" },
          notes: { type: "string" },
          traded_at: { type: "string", description: "ISO 8601 datetime; kosongkan jika sekarang" },
        },
        required: ["pair", "side", "pnl"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_deposit",
      description: "Catat top-up modal.",
      parameters: {
        type: "object",
        properties: { amount: { type: "number" }, note: { type: "string" } },
        required: ["amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_withdraw",
      description: "Catat penarikan modal.",
      parameters: {
        type: "object",
        properties: { amount: { type: "number" }, note: { type: "string" } },
        required: ["amount"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM }, ...messages],
        tools,
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Coba lagi sebentar." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Kredit AI habis. Tambahkan di Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const msg = data.choices?.[0]?.message ?? {};
    return new Response(
      JSON.stringify({
        content: msg.content ?? "",
        tool_calls: (msg.tool_calls ?? []).map((tc: any) => ({
          id: tc.id,
          name: tc.function?.name,
          args: JSON.parse(tc.function?.arguments ?? "{}"),
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
