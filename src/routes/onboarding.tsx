import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [capital, setCapital] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cap = parseFloat(capital);
    if (!cap || cap <= 0) return toast.error("Masukkan modal awal yang valid");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ initial_capital: cap, currency, onboarded: true })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Selamat datang!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">Set Modal Awal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sekali set, bisa top-up/withdraw kapan saja</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="cap">Modal Awal</Label>
            <Input id="cap" type="number" step="0.01" required value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="1000" />
          </div>
          <div className="space-y-2">
            <Label>Mata Uang</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="IDR">IDR</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="SGD">SGD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Menyimpan..." : "Mulai Trading"}</Button>
        </form>
      </div>
    </div>
  );
}
