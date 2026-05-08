import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";

import appCss from "../styles.css?url";

// ── PWA Service Worker Registration ─────────────────────────────────
function usePWA() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    });
  }, []);
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Halaman tidak ditemukan.</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Ke Dashboard
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TradeJournal — Jurnal Trading dengan Asisten AI" },
      { name: "description", content: "Catat trade harian dengan asisten AI. Pantau profit harian, mingguan, bulanan." },
      // ── PWA Meta ────────────────────────────────────────────────────
      { name: "theme-color", content: "#0a0f0d" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "TradeJournal" },
      // ── Open Graph ──────────────────────────────────────────────────
      { property: "og:title", content: "TradeJournal — Jurnal Trading dengan Asisten AI" },
      { name: "twitter:title", content: "TradeJournal — Jurnal Trading dengan Asisten AI" },
      { property: "og:description", content: "Catat trade harian dengan asisten AI. Pantau profit harian, mingguan, bulanan." },
      { name: "twitter:description", content: "Catat trade harian dengan asisten AI. Pantau profit harian, mingguan, bulanan." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5bc15cad-4912-4417-af07-cffbf2781c7b/id-preview-1ee85e4e--8662380e-a684-4711-a96c-714a3bebd4e8.lovable.app-1778097858282.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5bc15cad-4912-4417-af07-cffbf2781c7b/id-preview-1ee85e4e--8662380e-a684-4711-a96c-714a3bebd4e8.lovable.app-1778097858282.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // ── PWA Links ───────────────────────────────────────────────────
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      // ── Fonts ───────────────────────────────────────────────────────
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  usePWA();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
