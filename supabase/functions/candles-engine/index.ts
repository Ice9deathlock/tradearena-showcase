import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWELVE_DATA_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Symbol mapping for Twelve Data
const SYMBOL_MAP: Record<string, string> = {
  'EURUSD': 'EUR/USD',
  'GBPUSD': 'GBP/USD',
  'USDJPY': 'USD/JPY',
  'USDCHF': 'USD/CHF',
  'AUDUSD': 'AUD/USD',
  'USDCAD': 'USD/CAD',
  'BTCUSD': 'BTC/USD',
  'ETHUSD': 'ETH/USD',
  'XAUUSD': 'XAU/USD',
  'XAGUSD': 'XAG/USD',
};

// Interval mapping
const INTERVAL_MAP: Record<string, string> = {
  '1min': '1min',
  '5min': '5min',
  '15min': '15min',
  '30min': '30min',
  '1h': '1h',
  '4h': '4h',
  '1day': '1day',
  '1week': '1week',
};

interface CandleData {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, interval, start_date, end_date, outputsize } = await req.json();

    console.log('[candles-engine] Request:', { symbol, interval, start_date, end_date });

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get instrument ID
    const { data: instrument, error: instError } = await supabase
      .from('instruments')
      .select('id')
      .eq('symbol', symbol)
      .single();

    if (instError || !instrument) {
      console.error('[candles-engine] Instrument not found:', symbol);
      return new Response(
        JSON.stringify({ error: `Instrument not found: ${symbol}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const instrumentId = instrument.id;
    const timeframe = interval || '1h';

    // Check if we have cached candles first
    let query = supabase
      .from('market_candles')
      .select('*')
      .eq('instrument_id', instrumentId)
      .eq('timeframe', timeframe)
      .order('ts_open', { ascending: true })
      .limit(500);

    if (start_date) {
      query = query.gte('ts_open', start_date);
    }
    if (end_date) {
      query = query.lte('ts_open', end_date);
    }

    const { data: cachedCandles, error: cacheError } = await query;

    if (!cacheError && cachedCandles && cachedCandles.length > 50) {
      console.log('[candles-engine] Returning cached candles:', cachedCandles.length);
      return new Response(
        JSON.stringify({
          symbol,
          interval: timeframe,
          source: 'db_cache',
          candles: cachedCandles.map(c => ({
            datetime: c.ts_open,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from Twelve Data
    if (!TWELVE_DATA_API_KEY) {
      console.error('[candles-engine] TWELVE_DATA_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          candles: generateMockCandles(symbol, timeframe, 100),
          source: 'mock',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const twelveSymbol = SYMBOL_MAP[symbol] || symbol;
    const twelveInterval = INTERVAL_MAP[timeframe] || '1h';
    const size = outputsize || 100;

    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', twelveSymbol);
    url.searchParams.set('interval', twelveInterval);
    url.searchParams.set('outputsize', size.toString());
    url.searchParams.set('apikey', TWELVE_DATA_API_KEY);

    if (start_date) {
      url.searchParams.set('start_date', start_date);
    }
    if (end_date) {
      url.searchParams.set('end_date', end_date);
    }

    console.log('[candles-engine] Fetching from Twelve Data:', url.toString().replace(TWELVE_DATA_API_KEY, '***'));

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'error' || !data.values) {
      console.error('[candles-engine] Twelve Data error:', data);
      return new Response(
        JSON.stringify({
          error: data.message || 'Failed to fetch candles',
          candles: generateMockCandles(symbol, timeframe, 100),
          source: 'mock',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candles: CandleData[] = data.values.reverse(); // Twelve Data returns newest first

    // Store candles in database for caching
    const candlesToInsert = candles.map(c => ({
      instrument_id: instrumentId,
      timeframe,
      ts_open: c.datetime,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: c.volume ? parseFloat(c.volume) : null,
      source: 'twelve_data',
    }));

    // Upsert to handle duplicates
    const { error: insertError } = await supabase
      .from('market_candles')
      .upsert(candlesToInsert, {
        onConflict: 'instrument_id,timeframe,ts_open',
        ignoreDuplicates: true,
      });

    if (insertError) {
      console.warn('[candles-engine] Failed to cache candles:', insertError);
    } else {
      console.log('[candles-engine] Cached', candlesToInsert.length, 'candles');
    }

    return new Response(
      JSON.stringify({
        symbol,
        interval: timeframe,
        source: 'twelve_data',
        candles,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[candles-engine] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate mock candles when API unavailable
function generateMockCandles(symbol: string, interval: string, count: number): CandleData[] {
  const basePrices: Record<string, number> = {
    'EURUSD': 1.08,
    'GBPUSD': 1.27,
    'USDJPY': 149.5,
    'BTCUSD': 42000,
    'ETHUSD': 2200,
    'XAUUSD': 2020,
    'XAGUSD': 23.5,
  };

  const intervalSeconds: Record<string, number> = {
    '1min': 60,
    '5min': 300,
    '15min': 900,
    '30min': 1800,
    '1h': 3600,
    '4h': 14400,
    '1day': 86400,
    '1week': 604800,
  };

  const candles: CandleData[] = [];
  let price = basePrices[symbol] || 100;
  const volatility = price * 0.001;
  const seconds = intervalSeconds[interval] || 3600;
  const now = Math.floor(Date.now() / 1000);

  for (let i = count; i >= 0; i--) {
    const time = now - (i * seconds);
    const date = new Date(time * 1000);
    const datetime = date.toISOString().replace('T', ' ').substring(0, 19);

    const change = (Math.random() - 0.5) * volatility * 2;
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;

    candles.push({
      datetime,
      open: open.toFixed(5),
      high: high.toFixed(5),
      low: low.toFixed(5),
      close: close.toFixed(5),
      volume: (Math.random() * 1000).toFixed(0),
    });

    price = close;
  }

  return candles;
}
