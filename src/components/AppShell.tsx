import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/queries";
import { LogOut } from "lucide-react";

export function AppShell() {
  const { user, loading, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const loc = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#050810", color: "#5a6585", fontFamily: "'DM Mono',monospace", fontSize: ".8rem" }}>
        Memuat...
      </div>
    );
  }

  const initials = (profile?.display_name ?? user.email ?? "MB").slice(0, 2).toUpperCase();
  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Trader";

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: "▦" },
    { to: "/trades",    label: "Jurnal",     icon: "◈" },
    { to: "/capital",   label: "Modal",      icon: "⬡" },
  ] as const;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#050810", color: "#e8edf8", position: "relative" }}>

      {/* ── Animated background mesh ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 60% at 10% 15%,rgba(0,255,163,.07) 0%,transparent 60%), radial-gradient(ellipse 60% 50% at 85% 10%,rgba(162,89,255,.08) 0%,transparent 55%), radial-gradient(ellipse 50% 40% at 60% 90%,rgba(0,207,255,.06) 0%,transparent 55%)",
      }} />

      {/* ════════ DESKTOP SIDEBAR ════════ */}
      <aside className="app-sidebar" style={{
        width: 220, flexShrink: 0,
        background: "rgba(8,13,24,.92)",
        borderRight: "1px solid rgba(255,255,255,.06)",
        display: "flex", flexDirection: "column",
        padding: "28px 0",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, height: "100vh",
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-.4px", padding: "0 24px 24px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#00ffa3", boxShadow: "0 0 12px #00ffa3", animation: "blink 2s ease-in-out infinite", flexShrink: 0, display: "inline-block" }} />
          TradeJournal
        </div>

        {/* Nav items */}
        <nav style={{ padding: "18px 0", flex: 1 }}>
          {nav.map(n => {
            const active = loc.pathname === n.to;
            return (
              <Link key={n.to} to={n.to} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 24px", cursor: "pointer",
                  fontSize: ".76rem", letterSpacing: ".05em", textTransform: "uppercase",
                  color: active ? "#00ffa3" : "#5a6585",
                  background: active ? "linear-gradient(90deg,rgba(0,255,163,.08),transparent)" : "transparent",
                  transition: "all .2s", position: "relative",
                }}>
                  {active && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "#00ffa3", borderRadius: "0 2px 2px 0", boxShadow: "0 0 10px #00ffa3" }} />}
                  <span style={{ fontSize: "1rem", width: 18, textAlign: "center" }}>{n.icon}</span>
                  <span>{n.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User chip + logout */}
        <div style={{ padding: "18px 20px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#00ffa3,#00cfff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 700, color: "#000" }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".72rem", color: "#e8edf8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
              <div style={{ fontSize: ".62rem", color: "#5a6585" }}>Pro Trader</div>
            </div>
            <button
              onClick={() => signOut().then(() => navigate({ to: "/login" }))}
              title="Keluar"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#5a6585", padding: 4, display: "flex", alignItems: "center", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ff4d6d")}
              onMouseLeave={e => (e.currentTarget.style.color = "#5a6585")}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════ MOBILE DRAWER OVERLAY ════════ */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)" }}
        />
      )}

      {/* ════════ MOBILE DRAWER ════════ */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 101,
        width: 260, background: "rgba(8,13,24,.98)",
        borderRight: "1px solid rgba(255,255,255,.06)",
        display: "flex", flexDirection: "column", padding: "28px 0",
        backdropFilter: "blur(24px)",
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .3s cubic-bezier(.4,0,.2,1)",
      }}>
        <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.06)", color: "#5a6585", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-.4px", padding: "0 24px 22px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#00ffa3", boxShadow: "0 0 12px #00ffa3", display: "inline-block" }} />
          TradeJournal
        </div>
        <nav style={{ padding: "16px 0", flex: 1 }}>
          {nav.map(n => {
            const active = loc.pathname === n.to;
            return (
              <Link key={n.to} to={n.to} onClick={() => setDrawerOpen(false)} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 24px", cursor: "pointer", fontSize: ".78rem", letterSpacing: ".05em", textTransform: "uppercase", color: active ? "#00ffa3" : "#5a6585", background: active ? "linear-gradient(90deg,rgba(0,255,163,.08),transparent)" : "transparent", position: "relative" }}>
                  {active && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "#00ffa3", borderRadius: "0 2px 2px 0", boxShadow: "0 0 10px #00ffa3" }} />}
                  <span style={{ fontSize: "1rem", width: 18, textAlign: "center" }}>{n.icon}</span>
                  {n.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "16px 20px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#00ffa3,#00cfff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 700, color: "#000", flexShrink: 0 }}>{initials}</div>
            <div>
              <div style={{ fontSize: ".72rem", color: "#e8edf8" }}>{displayName}</div>
              <div style={{ fontSize: ".62rem", color: "#5a6585" }}>Pro Trader</div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ MAIN CONTENT ════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, minWidth: 0 }}>

        {/* Mobile topbar */}
        <div className="app-mobile-topbar" style={{
          display: "none", position: "sticky", top: 0, zIndex: 80,
          height: 58, background: "rgba(5,8,16,.96)",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          backdropFilter: "blur(20px)", padding: "0 16px",
          alignItems: "center", justifyContent: "space-between",
        }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 5, width: 38, height: 38, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, cursor: "pointer", padding: 9 }}
          >
            <span style={{ display: "block", height: 2, background: "#e8edf8", borderRadius: 2 }} />
            <span style={{ display: "block", height: 2, background: "#e8edf8", borderRadius: 2 }} />
            <span style={{ display: "block", height: 2, background: "#e8edf8", borderRadius: 2 }} />
          </button>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ffa3", boxShadow: "0 0 10px #00ffa3", display: "inline-block" }} />
            TradeJournal
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#00ffa3,#00cfff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 700, color: "#000", flexShrink: 0 }}>{initials}</div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, padding: "32px 36px", overflowX: "hidden" }} className="app-main">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="app-bottom-nav" style={{
          display: "none", position: "fixed",
          bottom: 0, left: 0, right: 0, zIndex: 90,
          height: 68, background: "rgba(8,13,24,.97)",
          borderTop: "1px solid rgba(255,255,255,.06)",
          backdropFilter: "blur(24px)",
        }}>
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "space-around" }}>
            {nav.map(n => {
              const active = loc.pathname === n.to;
              return (
                <Link key={n.to} to={n.to} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, height: "100%", justifyContent: "center", color: active ? "#00ffa3" : "#5a6585", fontSize: ".54rem", letterSpacing: ".05em", textTransform: "uppercase" }}>
                  <span style={{ fontSize: "1.2rem", filter: active ? "drop-shadow(0 0 6px #00ffa3)" : "none", transform: active ? "scale(1.15)" : "scale(1)", transition: "transform .2s" }}>{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Global keyframes */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:.35;} }
        @keyframes aiPulse { 0%,100%{box-shadow:0 4px 14px rgba(0,255,163,.3);} 50%{box-shadow:0 4px 24px rgba(0,255,163,.6);} }
        @media (max-width: 768px) {
          .app-sidebar { display: none !important; }
          .app-mobile-topbar { display: flex !important; }
          .app-bottom-nav { display: block !important; }
          .app-main { padding: 16px 16px 80px !important; }
          .dash-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .dash-bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
