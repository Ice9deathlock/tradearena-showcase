import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WalletAccount {
  id: string;
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  reference_type: string | null;
  reference_id: string | null;
  competition_name?: string;
}

export const useWallet = () => {
  const { user } = useAuth();

  const { data: wallet, isLoading: walletLoading, error: walletError } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("id, balance, currency")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as WalletAccount;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["wallet-transactions", wallet?.id],
    queryFn: async () => {
      if (!wallet) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_account_id", wallet.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch competition names for transactions with reference_type = 'competition'
      const competitionIds = data
        .filter((t) => t.reference_type === "competition" && t.reference_id)
        .map((t) => t.reference_id);

      let competitionMap: Record<string, string> = {};
      if (competitionIds.length > 0) {
        const { data: competitions } = await supabase
          .from("competitions")
          .select("id, name")
          .in("id", competitionIds);

        if (competitions) {
          competitionMap = competitions.reduce((acc, c) => {
            acc[c.id] = c.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return data.map((t) => ({
        ...t,
        competition_name: t.reference_id ? competitionMap[t.reference_id] : null,
      })) as WalletTransaction[];
    },
    enabled: !!wallet,
  });

  return {
    wallet,
    transactions: transactions || [],
    isLoading: walletLoading || transactionsLoading,
    error: walletError,
  };
};
