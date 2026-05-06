import { Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, ListOrdered, Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppShell() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Memuat...</div>;
  }

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/trades", label: "Riwayat", icon: ListOrdered },
    { to: "/capital", label: "Modal", icon: Wallet },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="font-display text-xl font-bold tracking-tight">
            Trade<span className="text-primary">Journal</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = loc.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline ml-2">Keluar</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-background/95 backdrop-blur md:hidden">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = loc.pathname === n.to;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex flex-col items-center gap-1 py-3 text-xs ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
