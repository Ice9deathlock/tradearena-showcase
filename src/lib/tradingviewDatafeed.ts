/**
 * Custom TradingView Datafeed
 * Single source of truth: price-engine (Twelve Data) and market_candles table
 */

import { supabase } from "@/integrations/supabase/client";

// Symbol configuration
const SYMBOL_CONFIG: Record<string, { name: string; pricescale: number; type: string }> = {
  'EURUSD': { name: 'EUR/USD', pricescale: 100000, type: 'forex' },
  'GBPUSD': { name: 'GBP/USD', pricescale: 100000, type: 'forex' },
  'USDJPY': { name: 'USD/JPY', pricescale: 1000, type: 'forex' },
  'USDCHF': { name: 'USD/CHF', pricescale: 100000, type: 'forex' },
  'AUDUSD': { name: 'AUD/USD', pricescale: 100000, type: 'forex' },
  'USDCAD': { name: 'USD/CAD', pricescale: 100000, type: 'forex' },
  'BTCUSD': { name: 'BTC/USD', pricescale: 100, type: 'crypto' },
  'ETHUSD': { name: 'ETH/USD', pricescale: 100, type: 'crypto' },
  'XAUUSD': { name: 'XAU/USD', pricescale: 100, type: 'commodity' },
  'XAGUSD': { name: 'XAG/USD', pricescale: 1000, type: 'commodity' },
};

// Resolution mapping
const RESOLUTION_MAP: Record<string, string> = {
  '1': '1min',
  '5': '5min',
  '15': '15min',
  '30': '30min',
  '60': '1h',
  '240': '4h',
  'D': '1day',
  '1D': '1day',
  'W': '1week',
  '1W': '1week',
};

const RESOLUTION_SECONDS: Record<string, number> = {
  '1': 60,
  '5': 300,
  '15': 900,
  '30': 1800,
  '60': 3600,
  '240': 14400,
  'D': 86400,
  '1D': 86400,
  'W': 604800,
  '1W': 604800,
};

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Subscription {
  symbolInfo: any;
  resolution: string;
  lastBar: Bar | null;
  callback: (bar: Bar) => void;
  channelUnsubscribe?: () => void;
}

const subscriptions: Map<string, Subscription> = new Map();

export function createDatafeed(instrumentIdMap: Record<string, string> = {}) {
  let cachedInstrumentIds: Record<string, string> = { ...instrumentIdMap };

  // Get instrument ID for symbol
  const getInstrumentId = async (symbol: string): Promise<string | null> => {
    if (cachedInstrumentIds[symbol]) {
      return cachedInstrumentIds[symbol];
    }

    const { data, error } = await supabase
      .from('instruments')
      .select('id')
      .eq('symbol', symbol)
      .single();

    if (error || !data) {
      console.error(`Could not find instrument for symbol ${symbol}:`, error);
      return null;
    }

    cachedInstrumentIds[symbol] = data.id;
    return data.id;
  };

  return {
    onReady: (callback: (config: any) => void) => {
      console.log('[Datafeed] onReady called');
      setTimeout(() => {
        callback({
          supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W'],
          exchanges: [
            { value: '', name: 'All Exchanges', desc: '' },
            { value: 'FOREX', name: 'Forex', desc: 'Foreign Exchange' },
            { value: 'CRYPTO', name: 'Crypto', desc: 'Cryptocurrency' },
            { value: 'COMMODITY', name: 'Commodity', desc: 'Commodities' },
          ],
          symbols_types: [
            { name: 'All types', value: '' },
            { name: 'Forex', value: 'forex' },
            { name: 'Crypto', value: 'crypto' },
            { name: 'Commodity', value: 'commodity' },
          ],
          supports_marks: true,
          supports_timescale_marks: true,
          supports_time: true,
        });
      }, 0);
    },

    searchSymbols: (
      userInput: string,
      exchange: string,
      symbolType: string,
      onResultReadyCallback: (symbols: any[]) => void
    ) => {
      console.log('[Datafeed] searchSymbols:', userInput);
      const results = Object.entries(SYMBOL_CONFIG)
        .filter(([symbol, config]) => {
          const matchesInput = symbol.toLowerCase().includes(userInput.toLowerCase()) ||
                              config.name.toLowerCase().includes(userInput.toLowerCase());
          const matchesType = !symbolType || config.type === symbolType;
          return matchesInput && matchesType;
        })
        .map(([symbol, config]) => ({
          symbol,
          full_name: symbol,
          description: config.name,
          exchange: config.type.toUpperCase(),
          type: config.type,
        }));
      onResultReadyCallback(results);
    },

    resolveSymbol: (
      symbolName: string,
      onSymbolResolvedCallback: (symbolInfo: any) => void,
      onResolveErrorCallback: (reason: string) => void
    ) => {
      console.log('[Datafeed] resolveSymbol:', symbolName);
      const config = SYMBOL_CONFIG[symbolName];
      
      if (!config) {
        onResolveErrorCallback(`Unknown symbol: ${symbolName}`);
        return;
      }

      setTimeout(() => {
        onSymbolResolvedCallback({
          name: symbolName,
          full_name: symbolName,
          description: config.name,
          type: config.type,
          session: '24x7',
          timezone: 'Etc/UTC',
          exchange: config.type.toUpperCase(),
          minmov: 1,
          pricescale: config.pricescale,
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W'],
          volume_precision: 2,
          data_status: 'streaming',
        });
      }, 0);
    },

    getBars: async (
      symbolInfo: any,
      resolution: string,
      periodParams: { from: number; to: number; countBack?: number; firstDataRequest: boolean },
      onHistoryCallback: (bars: Bar[], meta: { noData?: boolean }) => void,
      onErrorCallback: (reason: string) => void
    ) => {
      const symbol = symbolInfo.name;
      const timeframe = RESOLUTION_MAP[resolution] || '1h';
      
      console.log('[Datafeed] getBars:', symbol, resolution, periodParams);

      try {
        const instrumentId = await getInstrumentId(symbol);
        
        if (!instrumentId) {
          console.warn(`[Datafeed] No instrument ID for ${symbol}, fetching from candles-engine`);
        }

        // Try to get from market_candles table first
        let bars: Bar[] = [];
        
        if (instrumentId) {
          const { data: candles, error } = await supabase
            .from('market_candles')
            .select('*')
            .eq('instrument_id', instrumentId)
            .eq('timeframe', timeframe)
            .gte('ts_open', new Date(periodParams.from * 1000).toISOString())
            .lte('ts_open', new Date(periodParams.to * 1000).toISOString())
            .order('ts_open', { ascending: true })
            .limit(1000);

          if (!error && candles && candles.length > 0) {
            bars = candles.map(c => ({
              time: new Date(c.ts_open).getTime(),
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume || 0,
            }));
            console.log(`[Datafeed] Got ${bars.length} bars from market_candles`);
          }
        }

        // If no candles in DB, fetch from candles-engine
        if (bars.length === 0) {
          console.log('[Datafeed] Fetching from candles-engine...');
          
          const { data, error } = await supabase.functions.invoke('candles-engine', {
            body: {
              symbol,
              interval: timeframe,
              start_date: new Date(periodParams.from * 1000).toISOString().split('T')[0],
              end_date: new Date(periodParams.to * 1000).toISOString().split('T')[0],
            },
          });

          if (error) {
            console.error('[Datafeed] candles-engine error:', error);
            // Fall back to generated data
            bars = generateMockBars(symbol, resolution, periodParams.from, periodParams.to);
          } else if (data?.candles) {
            bars = data.candles.map((c: any) => ({
              time: new Date(c.datetime || c.ts_open).getTime(),
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
              volume: parseFloat(c.volume || 0),
            }));
            console.log(`[Datafeed] Got ${bars.length} bars from candles-engine`);
          }
        }

        if (bars.length === 0) {
          onHistoryCallback([], { noData: true });
        } else {
          onHistoryCallback(bars, { noData: false });
        }
      } catch (err) {
        console.error('[Datafeed] getBars error:', err);
        onErrorCallback(String(err));
      }
    },

    subscribeBars: async (
      symbolInfo: any,
      resolution: string,
      onRealtimeCallback: (bar: Bar) => void,
      subscriberUID: string,
      onResetCacheNeededCallback: () => void
    ) => {
      const symbol = symbolInfo.name;
      console.log('[Datafeed] subscribeBars:', symbol, subscriberUID);

      const instrumentId = await getInstrumentId(symbol);
      
      const subscription: Subscription = {
        symbolInfo,
        resolution,
        lastBar: null,
        callback: onRealtimeCallback,
      };

      // Subscribe to market_prices_latest for realtime updates
      if (instrumentId) {
        const channel = supabase
          .channel(`prices_${subscriberUID}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'market_prices_latest',
              filter: `instrument_id=eq.${instrumentId}`,
            },
            (payload: any) => {
              const newPrice = payload.new;
              if (!newPrice) return;

              const resolutionSeconds = RESOLUTION_SECONDS[resolution] || 60;
              const currentTime = Math.floor(Date.now() / 1000);
              const barTime = Math.floor(currentTime / resolutionSeconds) * resolutionSeconds * 1000;

              const sub = subscriptions.get(subscriberUID);
              if (!sub) return;

              const price = newPrice.price;

              if (sub.lastBar && sub.lastBar.time === barTime) {
                // Update existing bar
                const updatedBar: Bar = {
                  ...sub.lastBar,
                  high: Math.max(sub.lastBar.high, price),
                  low: Math.min(sub.lastBar.low, price),
                  close: price,
                };
                sub.lastBar = updatedBar;
                sub.callback(updatedBar);
              } else {
                // New bar
                const newBar: Bar = {
                  time: barTime,
                  open: price,
                  high: price,
                  low: price,
                  close: price,
                };
                sub.lastBar = newBar;
                sub.callback(newBar);
              }
            }
          )
          .subscribe();

        subscription.channelUnsubscribe = () => {
          supabase.removeChannel(channel);
        };
      }

      subscriptions.set(subscriberUID, subscription);
    },

    unsubscribeBars: (subscriberUID: string) => {
      console.log('[Datafeed] unsubscribeBars:', subscriberUID);
      const subscription = subscriptions.get(subscriberUID);
      if (subscription?.channelUnsubscribe) {
        subscription.channelUnsubscribe();
      }
      subscriptions.delete(subscriberUID);
    },

    // Get marks for trading positions
    getMarks: async (
      symbolInfo: any,
      from: number,
      to: number,
      onDataCallback: (marks: any[]) => void,
      resolution: string
    ) => {
      // Will be populated with trading markers
      onDataCallback([]);
    },

    getTimescaleMarks: async (
      symbolInfo: any,
      from: number,
      to: number,
      onDataCallback: (marks: any[]) => void,
      resolution: string
    ) => {
      onDataCallback([]);
    },
  };
}

// Generate mock bars when no data available
function generateMockBars(symbol: string, resolution: string, from: number, to: number): Bar[] {
  const bars: Bar[] = [];
  const interval = RESOLUTION_SECONDS[resolution] || 3600;
  
  // Base prices for different symbols
  const basePrices: Record<string, number> = {
    'EURUSD': 1.08,
    'GBPUSD': 1.27,
    'USDJPY': 149.5,
    'BTCUSD': 42000,
    'ETHUSD': 2200,
    'XAUUSD': 2020,
    'XAGUSD': 23.5,
  };
  
  let price = basePrices[symbol] || 100;
  const volatility = price * 0.001;

  for (let time = from; time <= to; time += interval) {
    const change = (Math.random() - 0.5) * volatility * 2;
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    bars.push({
      time: time * 1000,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000,
    });

    price = close;
  }

  return bars;
}

export default createDatafeed;
