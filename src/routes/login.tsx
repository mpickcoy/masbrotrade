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

async function signInGoogle() {
  const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (res.error) toast.error(res.error.message ?? "Gagal masuk dengan Google");
}

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/" });
  };

  const sendReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Masukkan email kamu dulu");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setResetSent(true);
    toast.success("Link reset password dikirim ke email kamu!");
  };

  if (forgotMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold">TradeJournal</h1>
            <p className="mt-1 text-sm text-muted-foreground">Reset password</p>
          </div>
          {resetSent ? (
            <div className="rounded-2xl border bg-card p-6 text-center space-y-4">
              <div className="text-4xl">📬</div>
              <p className="font-medium">Cek email kamu!</p>
              <p className="text-sm text-muted-foreground">Link reset password sudah dikirim ke <strong>{email}</strong></p>
              <Button variant="outline" className="w-full" onClick={() => { setForgotMode(false); setResetSent(false); }}>
                Kembali ke Login
              </Button>
            </div>
          ) : (
            <form onSubmit={sendReset} className="space-y-4 rounded-2xl border bg-card p-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@kamu.com" />
              </div>
              <Button type="submit" disabled={busy} className="w-full">{busy ? "Mengirim..." : "Kirim Link Reset"}</Button>
              <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Kembali ke Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">TradeJournal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mengakses jurnal Anda</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Lupa password?
              </button>
            </div>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Memuat..." : "Masuk"}</Button>
          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun? <Link to="/signup" className="text-primary font-medium">Daftar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
