import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function AppShell() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div style={{
        display: "flex", minHeight: "100vh", alignItems: "center",
        justifyContent: "center", background: "#050810",
        color: "#5a6585", fontFamily: "'DM Mono',monospace",
      }}>
        Memuat...
      </div>
    );
  }

  const nav = [
    { to: "/dashboard",  label: "Dashboard", icon: "▦" },
    { to: "/trades",     label: "Jurnal",    icon: "◈" },
    { to: "/statistik",  label: "Statistik", icon: "◎" },
    { to: "/capital",    label: "Modal",     icon: "⬡" },
    { to: "/chat",       label: "AI Chat",   icon: "✦" },
  ] as const;

  const initials = (user.email?.slice(0, 2) ?? "MB").toUpperCase();

  const handleLogout = () => {
    if (confirm("Yakin ingin logout dari TradeJournal?")) {
      signOut().then(() => navigate({ to: "/login" }));
    }
  };

  // Scoped CSS — NO body/html/* overrides to avoid breaking Lovable's global styles
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

    @keyframes tj-blink    { 0%,100%{opacity:1;} 50%{opacity:.35;} }
    @keyframes tj-mesh     { 0%{opacity:1;transform:scale(1);} 100%{opacity:.8;transform:scale(1.05);} }
    @keyframes tj-ai-pulse { 0%,100%{box-shadow:0 4px 18px rgba(0,255,163,.4);} 50%{box-shadow:0 4px 28px rgba(0,255,163,.7);} }

    .tj-root {
      display: flex;
      min-height: 100vh;
      background: #050810;
      color: #e8edf8;
      font-family: 'DM Mono', monospace;
      position: relative;
      overflow-x: hidden;
    }
    .tj-bg {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 80% 60% at 10% 15%, rgba(0,255,163,.07) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 85% 10%, rgba(162,89,255,.08) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 60% 90%, rgba(0,207,255,.06) 0%, transparent 55%);
      animation: tj-mesh 12s ease-in-out infinite alternate;
    }
    .tj-shell { display: flex; flex: 1; min-height: 100vh; position: relative; z-index: 1; }

    /* SIDEBAR */
    .tj-sidebar {
      width: 220px; flex-shrink: 0;
      background: rgba(8,13,24,.92);
      border-right: 1px solid rgba(255,255,255,.06);
      display: flex; flex-direction: column;
      padding: 28px 0;
      backdrop-filter: blur(20px);
      position: sticky; top: 0; height: 100vh;
      z-index: 10;
    }
    .tj-logo {
      font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.1rem;
      letter-spacing: -.4px; padding: 0 24px 24px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      display: flex; align-items: center; gap: 10px;
    }
    .tj-logo-dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: #00ffa3; box-shadow: 0 0 12px #00ffa3;
      animation: tj-blink 2s ease-in-out infinite; flex-shrink: 0;
    }
    .tj-nav { padding: 18px 0; flex: 1; }
    .tj-nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 24px; cursor: pointer; font-size: .76rem;
      letter-spacing: .05em; text-transform: uppercase;
      color: #5a6585; transition: color .2s, background .2s;
      position: relative; text-decoration: none !important;
    }
    .tj-nav-item:hover { color: #e8edf8; }
    .tj-nav-item.tj-active {
      color: #00ffa3;
      background: linear-gradient(90deg, rgba(0,255,163,.08), transparent);
    }
    .tj-nav-item.tj-active::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; background: #00ffa3; border-radius: 0 2px 2px 0;
      box-shadow: 0 0 10px #00ffa3;
    }
    .tj-nav-icon { font-size: 1rem; width: 18px; text-align: center; }
    .tj-sidebar-footer {
      padding: 18px 20px 0;
      border-top: 1px solid rgba(255,255,255,.06);
    }
    .tj-user-chip {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.06);
    }
    .tj-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #00ffa3, #00cfff);
      display: flex; align-items: center; justify-content: center;
      font-size: .7rem; font-weight: 700; color: #000;
    }
    .tj-user-name { font-size: .72rem; color: #e8edf8; }
    .tj-user-tag  { font-size: .62rem; color: #5a6585; }
    .tj-logout-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      background: rgba(255,77,109,.06);
      border: 1px solid rgba(255,77,109,.15);
      cursor: pointer; font-family: 'DM Mono', monospace;
      font-size: .72rem; color: #ff4d6d;
      letter-spacing: .04em; text-transform: uppercase;
      transition: background .2s, border-color .2s, box-shadow .2s;
      width: 100%; margin-top: 10px;
    }
    .tj-logout-btn:hover {
      background: rgba(255,77,109,.14);
      border-color: rgba(255,77,109,.35);
      box-shadow: 0 0 14px rgba(255,77,109,.12);
    }

    /* MAIN */
    .tj-main { flex: 1; overflow-y: auto; overflow-x: hidden; min-width: 0; }

    /* MOBILE TOPBAR */
    .tj-mobile-topbar {
      display: none; position: sticky; top: 0; z-index: 80; height: 58px;
      background: rgba(5,8,16,.96); border-bottom: 1px solid rgba(255,255,255,.06);
      backdrop-filter: blur(20px); padding: 0 16px;
      align-items: center; justify-content: space-between;
    }
    .tj-mobile-logo {
      font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1rem;
      display: flex; align-items: center; gap: 8px; color: #e8edf8;
    }
    .tj-mobile-avatar {
      width: 34px; height: 34px; border-radius: 10px;
      background: linear-gradient(135deg, #00ffa3, #00cfff);
      display: flex; align-items: center; justify-content: center;
      font-size: .7rem; font-weight: 700; color: #000; cursor: pointer;
    }
    .tj-hamburger {
      display: none; flex-direction: column; justify-content: center;
      gap: 5px; width: 38px; height: 38px;
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.06);
      border-radius: 10px; cursor: pointer; padding: 9px;
    }
    .tj-hamburger span { display: block; height: 2px; background: #e8edf8; border-radius: 2px; }

    /* DRAWER */
    .tj-drawer-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(0,0,0,.65); backdrop-filter: blur(4px);
      opacity: 0; pointer-events: none;
      transition: opacity .28s;
    }
    .tj-drawer-overlay.tj-open { opacity: 1; pointer-events: all; }
    .tj-drawer {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 101;
      width: 260px; background: rgba(8,13,24,.98);
      border-right: 1px solid rgba(255,255,255,.06);
      display: flex; flex-direction: column; padding: 28px 0;
      backdrop-filter: blur(24px);
      transform: translateX(-100%);
      transition: transform .3s cubic-bezier(.4,0,.2,1);
    }
    .tj-drawer.tj-open { transform: translateX(0); }
    .tj-drawer-close {
      position: absolute; top: 16px; right: 16px;
      width: 32px; height: 32px; border-radius: 8px;
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.06);
      color: #5a6585; font-size: 1.1rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .tj-drawer-logo {
      font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.1rem;
      letter-spacing: -.4px; padding: 0 24px 22px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      display: flex; align-items: center; gap: 10px; color: #e8edf8;
    }
    .tj-drawer-nav { padding: 16px 0; flex: 1; }
    .tj-drawer-footer { padding: 16px 20px 0; border-top: 1px solid rgba(255,255,255,.06); }

    /* BOTTOM NAV */
    .tj-bottom-nav {
      display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 90;
      height: 68px; background: rgba(8,13,24,.97);
      border-top: 1px solid rgba(255,255,255,.06); backdrop-filter: blur(24px);
    }
    .tj-bnav-inner {
      display: flex; height: 100%; align-items: center; justify-content: space-around;
    }
    .tj-bn-item {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      flex: 1; height: 100%; justify-content: center; cursor: pointer;
      color: #5a6585; transition: color .2s; font-size: .54rem;
      letter-spacing: .05em; text-transform: uppercase; text-decoration: none !important;
    }
    .tj-bn-item.tj-active { color: #00ffa3; }
    .tj-bn-icon { font-size: 1.2rem; }
    .tj-fab-wrap {
      position: relative; display: flex; flex-direction: column;
      align-items: center; flex: 1; height: 100%; justify-content: center;
      cursor: pointer; gap: 3px;
    }
    .tj-fab-btn {
      width: 46px; height: 46px; border-radius: 14px;
      background: linear-gradient(135deg, #00ffa3, #00cfff);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Syne', sans-serif; font-weight: 800; font-size: .72rem;
      color: #000; animation: tj-ai-pulse 3s ease-in-out infinite; margin-top: -10px;
    }
    .tj-fab-label { font-size: .54rem; color: #00ffa3; letter-spacing: .05em; text-transform: uppercase; }

    /* RESPONSIVE */
    @media (max-width: 1024px) {
      .tj-sidebar { width: 64px; }
      .tj-nav-item span:not(.tj-nav-icon) { display: none; }
      .tj-nav-item { justify-content: center; padding: 12px; }
      .tj-logo span:not(.tj-logo-dot) { display: none; }
      .tj-logo { justify-content: center; padding: 0 0 22px; }
      .tj-sidebar-footer { padding: 16px 8px 0; }
      .tj-user-chip { justify-content: center; }
      .tj-user-name, .tj-user-tag { display: none; }
      .tj-logout-btn span:last-child { display: none; }
      .tj-logout-btn { justify-content: center; }
    }
    @media (max-width: 640px) {
      .tj-sidebar { display: none; }
      .tj-mobile-topbar { display: flex; }
      .tj-hamburger { display: flex; }
      .tj-bottom-nav { display: block; }
      .tj-main { padding-bottom: 88px; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* BG mesh */}
      <div className="tj-root">
        <div className="tj-bg" />

        {/* Drawer overlay */}
        <div
          className={`tj-drawer-overlay${drawerOpen ? " tj-open" : ""}`}
          onClick={() => setDrawerOpen(false)}
        />
        {/* Drawer */}
        <div className={`tj-drawer${drawerOpen ? " tj-open" : ""}`}>
          <button className="tj-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
          <div className="tj-drawer-logo"><span className="tj-logo-dot" />TradeJournal</div>
          <nav className="tj-drawer-nav">
            {nav.map((n) => (
              <Link
                key={n.label} to={n.to}
                className={`tj-nav-item${loc.pathname === n.to ? " tj-active" : ""}`}
                style={{ fontSize: ".78rem", padding: "13px 24px" }}
                onClick={() => setDrawerOpen(false)}
              >
                <span className="tj-nav-icon">{n.icon}</span>{n.label}
              </Link>
            ))}
          </nav>
          <div className="tj-drawer-footer">
            <div className="tj-user-chip">
              <div className="tj-avatar">{initials}</div>
              <div>
                <div className="tj-user-name">{user.email?.split("@")[0]}</div>
                <div className="tj-user-tag">Pro Trader</div>
              </div>
            </div>
            <button className="tj-logout-btn" onClick={handleLogout}>
              <span>⏻</span><span>Logout</span>
            </button>
          </div>
        </div>

        <div className="tj-shell">
          {/* Sidebar desktop */}
          <aside className="tj-sidebar">
            <div className="tj-logo">
              <span className="tj-logo-dot" />
              <span>TradeJournal</span>
            </div>
            <nav className="tj-nav">
              {nav.map((n) => (
                <Link
                  key={n.label} to={n.to}
                  className={`tj-nav-item${loc.pathname === n.to ? " tj-active" : ""}`}
                >
                  <span className="tj-nav-icon">{n.icon}</span>
                  <span>{n.label}</span>
                </Link>
              ))}
            </nav>
            <div className="tj-sidebar-footer">
              <div className="tj-user-chip">
                <div className="tj-avatar">{initials}</div>
                <div>
                  <div className="tj-user-name">{user.email?.split("@")[0]}</div>
                  <div className="tj-user-tag">Pro Trader</div>
                </div>
              </div>
              <button className="tj-logout-btn" onClick={handleLogout}>
                <span>⏻</span><span>Logout</span>
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="tj-main">
            {/* Mobile topbar */}
            <div className="tj-mobile-topbar">
              <button className="tj-hamburger" onClick={() => setDrawerOpen(true)}>
                <span /><span /><span />
              </button>
              <div className="tj-mobile-logo">
                <span className="tj-logo-dot" />TradeJournal
              </div>
              <div className="tj-mobile-avatar">{initials}</div>
            </div>

            <Outlet />
          </main>
        </div>

        {/* Bottom nav mobile */}
        <nav className="tj-bottom-nav">
          <div className="tj-bnav-inner">
            {[nav[0], nav[1]].map((n) => (
              <Link
                key={n.label} to={n.to}
                className={`tj-bn-item${loc.pathname === n.to ? " tj-active" : ""}`}
              >
                <span className="tj-bn-icon">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            ))}
            <Link to="/chat" className="tj-fab-wrap" style={{ textDecoration: "none" }}>
              <div className="tj-fab-btn">AI</div>
              <span className="tj-fab-label">Catat</span>
            </Link>
            {[nav[2], nav[3]].map((n) => (
              <Link
                key={n.label} to={n.to}
                className={`tj-bn-item${loc.pathname === n.to ? " tj-active" : ""}`}
              >
                <span className="tj-bn-icon">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
