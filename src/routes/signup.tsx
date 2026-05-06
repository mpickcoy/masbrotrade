import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
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
  );
}
