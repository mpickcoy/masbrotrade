import { useState, useMemo, useEffect } from "react";
import { fmtMoney } from "@/lib/format";

type Props = {
  balance: number;
  currency: string;
};

export function PositionSizeCalculator({ balance, currency }: Props) {
  const [balanceInput, setBalanceInput] = useState<string>(String(Math.max(0, Math.round(balance))));
  const [riskPct, setRiskPct] = useState<string>("1");
  const [slPips, setSlPips] = useState<string>("20");
  const [pipValue, setPipValue] = useState<string>("10");

  // sync ketika balance dari props berubah (misal user input trade baru)
  useEffect(() => {
    setBalanceInput(String(Math.max(0, Math.round(balance))));
  }, [balance]);

  const { riskAmount, lots, overRisk, valid } = useMemo(() => {
    const b = Number(balanceInput) || 0;
    const r = Number(riskPct) || 0;
    const sl = Number(slPips) || 0;
    const pv = Number(pipValue) || 0;
    const ra = (b * r) / 100;
    const denom = sl * pv;
    const l = denom > 0 ? ra / denom : 0;
    return {
      riskAmount: ra,
      lots: l,
      overRisk: r > 2,
      valid: b > 0 && r > 0 && sl > 0 && pv > 0,
    };
  }, [balanceInput, riskPct, slPips, pipValue]);

  return (
    <div className="db-psc-card">
      <style>{`
        .db-psc-card {
          background:linear-gradient(135deg,#0a1a2e,#070f1f,#03070f);
          border:1px solid rgba(0,207,255,.18);
          border-radius:18px;
          padding:20px;
          box-shadow:0 8px 32px rgba(0,207,255,.10),0 1px 0 rgba(0,207,255,.18) inset;
          margin-bottom:24px;
          animation:db-cardIn .55s ease both;
        }
        .db-psc-title {
          font-family:'Syne',sans-serif;
          font-weight:700;
          font-size:1rem;
          color:#e8edf8;
          margin-bottom:14px;
          display:flex;align-items:center;gap:8px;
        }
        .db-psc-grid {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:12px;
          margin-bottom:14px;
        }
        @media (max-width:640px){ .db-psc-grid { grid-template-columns:1fr; } }
        .db-psc-field { display:flex;flex-direction:column;gap:5px; }
        .db-psc-label {
          font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:#7a8499;
        }
        .db-psc-input {
          background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.08);
          border-radius:10px;
          padding:9px 12px;
          color:#e8edf8;
          font-size:.92rem;
          font-family:inherit;
          outline:none;
          transition:border-color .15s, background .15s;
        }
        .db-psc-input:focus { border-color:#00cfff; background:rgba(0,207,255,.06); }
        .db-psc-out {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          padding-top:12px;
          border-top:1px solid rgba(255,255,255,.06);
        }
        @media (max-width:640px){ .db-psc-out { grid-template-columns:1fr; } }
        .db-psc-out-item { display:flex;flex-direction:column;gap:4px; }
        .db-psc-out-lbl {
          font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:#7a8499;
        }
        .db-psc-out-val {
          font-family:'Syne',sans-serif;font-weight:800;font-size:1.4rem;
          letter-spacing:-.5px;color:#e8edf8;line-height:1.1;
        }
        .db-psc-out-val.warn { color:#ffb800; }
        .db-psc-out-val.danger { color:#ff4d6d; }
        .db-psc-out-val.good { color:#00ffa3; }
        .db-psc-out-sub { font-size:.7rem;color:#5a6585; }
        .db-psc-warn {
          margin-top:10px;font-size:.72rem;color:#ffb800;
          display:flex;align-items:center;gap:6px;
        }
      `}</style>

      <div className="db-psc-title">🧮 Position Size Calculator</div>

      <div className="db-psc-grid">
        <div className="db-psc-field">
          <label className="db-psc-label">Balance ({currency})</label>
          <input
            className="db-psc-input"
            type="number"
            inputMode="decimal"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            min="0"
          />
        </div>
        <div className="db-psc-field">
          <label className="db-psc-label">Risk %</label>
          <input
            className="db-psc-input"
            type="number"
            inputMode="decimal"
            value={riskPct}
            onChange={(e) => setRiskPct(e.target.value)}
            step="0.1"
            min="0"
          />
        </div>
        <div className="db-psc-field">
          <label className="db-psc-label">Stop Loss (pips)</label>
          <input
            className="db-psc-input"
            type="number"
            inputMode="decimal"
            value={slPips}
            onChange={(e) => setSlPips(e.target.value)}
            min="0"
          />
        </div>
        <div className="db-psc-field">
          <label className="db-psc-label">Pip Value / lot ({currency})</label>
          <input
            className="db-psc-input"
            type="number"
            inputMode="decimal"
            value={pipValue}
            onChange={(e) => setPipValue(e.target.value)}
            min="0"
          />
        </div>
      </div>

      <div className="db-psc-out">
        <div className="db-psc-out-item">
          <span className="db-psc-out-lbl">Risk Amount</span>
          <span className={`db-psc-out-val ${overRisk ? "danger" : "good"}`}>
            {valid ? fmtMoney(riskAmount, currency) : "—"}
          </span>
          <span className="db-psc-out-sub">
            {valid ? `${(Number(riskPct) || 0).toFixed(2)}% dari balance` : "Isi semua field"}
          </span>
        </div>
        <div className="db-psc-out-item">
          <span className="db-psc-out-lbl">Lot Size (standard)</span>
          <span className="db-psc-out-val">
            {valid ? lots.toFixed(2) : "—"}
          </span>
          <span className="db-psc-out-sub">
            {valid
              ? `${(lots * 10).toFixed(2)} mini · ${(lots * 100).toFixed(0)} micro`
              : "SL & pip value harus > 0"}
          </span>
        </div>
      </div>

      {valid && overRisk && (
        <div className="db-psc-warn">
          ⚠️ Risk &gt; 2% — pertimbangkan turunkan risk untuk money management yang lebih aman.
        </div>
      )}
    </div>
  );
}
