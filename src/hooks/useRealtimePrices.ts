import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface RealtimePrice {
  instrument_id: string;
  bid: number;
  ask: number;
  price: number;
  source: string;
  ts: string;
}

// Subscribe to realtime price updates from market_prices_latest
export function useRealtimePrices(instrumentIds: string[]) {
  const [prices, setPrices] = useState<Map<string, RealtimePrice>>(new Map());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (instrumentIds.length === 0) return;

    // Initial fetch from database
    const fetchInitialPrices = async () => {
      const { data, error } = await supabase
        .from('market_prices_latest')
        .select('*')
        .in('instrument_id', instrumentIds);
      
      if (!error && data) {
        const priceMap = new Map<string, RealtimePrice>();
        data.forEach(p => priceMap.set(p.instrument_id, p));
        setPrices(priceMap);
      }
    };

    fetchInitialPrices();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('market-prices-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_prices_latest'
        },
        (payload) => {
          const newPrice = payload.new as RealtimePrice;
          if (newPrice && instrumentIds.includes(newPrice.instrument_id)) {
            setPrices(prev => {
              const updated = new Map(prev);
              updated.set(newPrice.instrument_id, newPrice);
              return updated;
            });
            // Also invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['market-prices'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instrumentIds.join(','), queryClient]);

  return prices;
}

// Subscribe to realtime position updates
export function useRealtimePositions(accountId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accountId) return;

    const channel = supabase
      .channel(`positions-${accountId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
          filter: `account_id=eq.${accountId}`
        },
        () => {
          // Invalidate positions query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['account-positions', accountId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, queryClient]);
}

// Subscribe to realtime account updates (balance, equity changes)
export function useRealtimeAccount(accountId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accountId) return;

    const channel = supabase
      .channel(`account-${accountId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'accounts',
          filter: `id=eq.${accountId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-trading-accounts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, queryClient]);
}

// Combined hook for trading page - subscribes to all relevant realtime updates
export function useTradingRealtime(accountId: string | undefined, instrumentIds: string[]) {
  useRealtimePositions(accountId);
  useRealtimeAccount(accountId);
  const prices = useRealtimePrices(instrumentIds);
  return { realtimePrices: prices };
}
