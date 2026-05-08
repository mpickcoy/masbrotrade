import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.2s2.69-6.2 6-6.2c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.78 3.2 14.62 2.3 12 2.3 6.86 2.3 2.7 6.46 2.7 11.6S6.86 21 12 21c6.93 0 9.3-4.86 9.3-9.32 0-.62-.07-1.1-.16-1.48H12z"/>
    </svg>
  );
}

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password minimal 6 karakter");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Akun dibuat! Silakan masuk.");
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">TradeJournal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Buat akun baru</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
              if (res.error) toast.error(res.error.message ?? "Gagal mendaftar dengan Google");
            }}
          >
            <GoogleIcon /> Daftar dengan Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> atau <div className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Memuat..." : "Daftar"}</Button>
            <p className="text-center text-sm text-muted-foreground">
              Sudah punya akun? <Link to="/login" className="text-primary font-medium">Masuk</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
