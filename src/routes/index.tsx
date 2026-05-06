import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const { data } = await supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle();
      if (!data?.onboarded) navigate({ to: "/onboarding" });
      else navigate({ to: "/dashboard" });
    })();
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="font-display text-2xl text-muted-foreground">TradeJournal</div>
    </div>
  );
}
