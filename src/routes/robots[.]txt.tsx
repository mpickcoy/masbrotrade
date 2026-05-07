import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://masbrotrade.lovable.app";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /trades
Disallow: /capital
Disallow: /onboarding

Sitemap: ${SITE_URL}/sitemap.xml
`;
        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
