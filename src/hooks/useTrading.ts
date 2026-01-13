import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Position = Tables<"positions">;
type Order = Tables<"orders">;
type Account = Tables<"accounts">;
type Instrument = Tables<"instruments">;

export interface TradingAccount extends Account {
  competition_id: string;
  competition_name: string;
}

export interface PositionWithInstrument extends Position {
  instrument: Instrument;
}

export function useUserTradingAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-trading-accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: participations, error } = await supabase
        .from("competition_participants")
        .select(`
          id,
          competition_id,
          status,
          competitions(id, name, status),
          accounts(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      return participations?.map(p => {
        const comp = Array.isArray(p.competitions) ? p.competitions[0] : p.competitions;
        const account = Array.isArray(p.accounts) ? p.accounts[0] : p.accounts;
        return account ? {
          ...account,
          competition_id: comp?.id || p.competition_id,
          competition_name: comp?.name || "Unknown Competition"
        } : null;
      }).filter(Boolean) as TradingAccount[];
    },
    enabled: !!user,
  });
}

export function useAccountPositions(accountId: string | undefined) {
  return useQuery({
    queryKey: ["account-positions", accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("positions")
        .select(`
          *,
          instruments(*)
        `)
        .eq("account_id", accountId)
        .eq("status", "open")
        .order("opened_at", { ascending: false });

      if (error) throw error;

      return data?.map(p => ({
        ...p,
        instrument: Array.isArray(p.instruments) ? p.instruments[0] : p.instruments
      })) as PositionWithInstrument[];
    },
    enabled: !!accountId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useAccountOrders(accountId: string | undefined) {
  return useQuery({
    queryKey: ["account-orders", accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          instruments(symbol)
        `)
        .eq("account_id", accountId)
        .order("requested_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return data;
    },
    enabled: !!accountId,
  });
}

export function useCompetitionInstruments(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition-instruments", competitionId],
    queryFn: async () => {
      if (!competitionId) return [];

      const { data, error } = await supabase
        .from("competition_instruments")
        .select(`
          *,
          instruments(*)
        `)
        .eq("competition_id", competitionId);

      if (error) throw error;

      return data?.map(ci => ({
        ...ci,
        instrument: Array.isArray(ci.instruments) ? ci.instruments[0] : ci.instruments
      }));
    },
    enabled: !!competitionId,
  });
}

export function useMarketPrices(instrumentIds: string[]) {
  return useQuery({
    queryKey: ["market-prices", instrumentIds],
    queryFn: async () => {
      if (!instrumentIds.length) return [];

      const { data, error } = await supabase
        .from("market_prices_latest")
        .select("*")
        .in("instrument_id", instrumentIds);

      if (error) throw error;
      return data;
    },
    enabled: instrumentIds.length > 0,
    refetchInterval: 10000, // Reduced polling - realtime handles updates
    staleTime: 8000,
  });
}

// Full price data with bid/ask/mid for broker-grade display
export interface LivePriceData {
  bid: number;
  ask: number;
  mid: number;
}

// Fetch live prices from centralized price engine (single source of truth)
// Returns full bid/ask/mid for proper P&L calculation
export function useLivePrices(symbols: string[]) {
  return useQuery({
    queryKey: ["live-prices", symbols],
    queryFn: async (): Promise<Record<string, LivePriceData>> => {
      if (!symbols.length) return {};

      try {
        // Use centralized price engine (Twelve Data only)
        const { data, error } = await supabase.functions.invoke('price-engine', {
          body: { symbols, update_db: true }
        });
        
        if (!error && data?.prices) {
          // Return full price data for broker-grade P&L
          const prices: Record<string, LivePriceData> = {};
          for (const [symbol, priceData] of Object.entries(data.prices)) {
            const pd = priceData as { bid: number; ask: number; mid: number };
            prices[symbol] = { bid: pd.bid, ask: pd.ask, mid: pd.mid };
          }
          return prices;
        }
      } catch (e) {
        console.error('Price engine fetch error:', e);
      }

      return {};
    },
    enabled: symbols.length > 0,
    refetchInterval: 8000, // Poll every 8 seconds (respects Twelve Data rate limits)
    staleTime: 6000,
  });
}

// Calculate unrealized P&L for a position using MID price (broker standard)
export function calculateUnrealizedPnL(
  position: { side: string; quantity: number; entry_price: number },
  midPrice: number,
  contractSize: number = 1
): number {
  const qty = Number(position.quantity);
  const entry = Number(position.entry_price);
  const priceDiff = position.side === 'buy' 
    ? midPrice - entry 
    : entry - midPrice;
  return priceDiff * qty * contractSize;
}

// Calculate the close price for a position (BUY closes at BID, SELL closes at ASK)
export function getClosePrice(side: string, bid: number, ask: number): number {
  return side === 'buy' ? bid : ask;
}

interface PlaceOrderParams {
  competition_id: string;
  instrument_id: string;
  side: "buy" | "sell";
  quantity: number;
  leverage: number;
  client_price?: number; // Price from frontend display
  order_type?: "market" | "limit" | "stop";
  requested_price?: number; // For limit/stop orders
  stop_loss?: number;
  take_profit?: number;
  create_new_position?: boolean; // If true, create new position instead of netting
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PlaceOrderParams) => {
      console.log("Placing order:", params);

      const { data, error } = await supabase.functions.invoke("place-order", {
        body: params,
      });

      if (error) {
        console.error("Place order error:", error);
        throw new Error(error.message || "Failed to place order");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.disqualified) {
        toast.error(`Order filled but account disqualified: ${data.reason}`);
      } else {
        toast.success(`Order filled at $${data.filled_price?.toFixed(2) || 'N/A'}`);
      }
      queryClient.invalidateQueries({ queryKey: ["account-positions"] });
      queryClient.invalidateQueries({ queryKey: ["account-orders"] });
      queryClient.invalidateQueries({ queryKey: ["user-trading-accounts"] });
    },
    onError: (error: Error) => {
      console.error("Order mutation error:", error);
      toast.error(error.message || "Failed to place order");
    },
  });
}

export function useClosePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { competition_id: string; position_id: string; client_price?: number }) => {
      console.log("Closing position:", params);

      const { data, error } = await supabase.functions.invoke("close-position", {
        body: params,
      });

      if (error) {
        throw new Error(error.message || "Failed to close position");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(`Position closed. P&L: $${data.realized_pnl?.toFixed(2) || '0'}`);
      queryClient.invalidateQueries({ queryKey: ["account-positions"] });
      queryClient.invalidateQueries({ queryKey: ["account-orders"] });
      queryClient.invalidateQueries({ queryKey: ["user-trading-accounts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to close position");
    },
  });
}
