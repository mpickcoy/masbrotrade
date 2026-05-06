import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type Trade = {
  id: string;
  pair: string;
  side: "long" | "short";
  entry_price: number | null;
  exit_price: number | null;
  lot_size: number | null;
  pnl: number;
  notes: string | null;
  traded_at: string;
};
export type Movement = {
  id: string;
  kind: "deposit" | "withdraw";
  amount: number;
  note: string | null;
  occurred_at: string;
};
export type Profile = {
  id: string;
  initial_capital: number;
  currency: string;
  display_name: string | null;
  onboarded: boolean;
};

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useTrades() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["trades", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user!.id)
        .order("traded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
  });
}

export function useMovements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["movements", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Movement[]> => {
      const { data, error } = await supabase
        .from("capital_movements")
        .select("*")
        .eq("user_id", user!.id)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Movement[];
    },
  });
}
