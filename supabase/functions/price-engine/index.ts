import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CENTRALIZED PRICE ENGINE
// Single source of truth: Twelve Data ONLY
// Chart = TradingPanel = Execution = P&L

interface PriceData {
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
  source: string;
}

// Global in-memory cache with longer TTL to reduce API calls
const priceCache: Map<string, PriceData> = new Map();
const CACHE_TTL = 10000; // 10 seconds cache
const MIN_FETCH_INTERVAL = 8000; // Minimum 8 seconds between API calls per symbol
const lastFetchTime: Map<string, number> = new Map();

// Twelve Data symbol mapping (single source of truth)
const TWELVE_DATA_SYMBOL_MAP: Record<string, string> = {
  'EURUSD': 'EUR/USD',
  'GBPUSD': 'GBP/USD',
  'USDJPY': 'USD/JPY',
  'USDCHF': 'USD/CHF',
  'AUDUSD': 'AUD/USD',
  'USDCAD': 'USD/CAD',
  'NZDUSD': 'NZD/USD',
  'XAUUSD': 'XAU/USD',
  'XAGUSD': 'XAG/USD',
  'BTCUSD': 'BTC/USD',
  'ETHUSD': 'ETH/USD',
  'SOLUSD': 'SOL/USD',
  'BNBUSD': 'BNB/USD',
  'XRPUSD': 'XRP/USD',
  'US500': 'SPY',
  'US30': 'DIA',
  'US100': 'QQQ',
};

// Calculate spread based on asset type
function getSpread(symbol: string, price: number): number {
  let spreadPct = 0.00015; // 1.5 pips for major forex
  if (symbol.includes('XAU') || symbol.includes('XAG')) {
    spreadPct = 0.0003; // 3 pips for metals
  } else if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') || symbol.includes('BNB') || symbol.includes('XRP')) {
    spreadPct = 0.001; // 10 pips for crypto
  } else if (symbol.includes('US')) {
    spreadPct = 0.0002; // 2 pips for indices
  }
  return price * spreadPct;
}

// Fetch single symbol from Twelve Data
async function fetchSingleFromTwelveData(symbol: string, apiKey: string): Promise<PriceData | null> {
  const twelveSymbol = TWELVE_DATA_SYMBOL_MAP[symbol];
  if (!twelveSymbol) {
    console.log(`No Twelve Data mapping for symbol: ${symbol}`);
    return null;
  }

  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(twelveSymbol)}&apikey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Twelve Data HTTP error: ${response.status} for ${symbol}`);
      return null;
    }

    const data = await response.json();
    
    if (data.code || data.status === 'error') {
      console.error(`Twelve Data error for ${symbol}: ${data.message}`);
      return null;
    }
    
    if (data.price) {
      const price = parseFloat(data.price);
      const spread = getSpread(symbol, price);
      
      console.log(`Twelve Data price for ${symbol}: ${price}`);
      return { 
        bid: price - spread / 2, 
        ask: price + spread / 2, 
        mid: price,
        timestamp: Date.now(),
        source: 'twelve_data'
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching Twelve Data for ${symbol}:`, error);
    return null;
  }
}

// Batch fetch multiple symbols from Twelve Data (uses 1 API credit per symbol in batch)
async function fetchBatchFromTwelveData(symbols: string[], apiKey: string): Promise<Map<string, PriceData>> {
  const results = new Map<string, PriceData>();
  
  // Map symbols to Twelve Data format
  const symbolPairs: { original: string; twelveData: string }[] = [];
  for (const symbol of symbols) {
    const twelveSymbol = TWELVE_DATA_SYMBOL_MAP[symbol];
    if (twelveSymbol) {
      symbolPairs.push({ original: symbol, twelveData: twelveSymbol });
    }
  }
  
  if (symbolPairs.length === 0) return results;
  
  // Twelve Data batch endpoint: comma-separated symbols
  const twelveSymbols = symbolPairs.map(p => p.twelveData).join(',');
  
  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(twelveSymbols)}&apikey=${apiKey}`;
    console.log(`Fetching batch from Twelve Data: ${symbolPairs.length} symbols`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Twelve Data batch HTTP error: ${response.status}`);
      return results;
    }

    const data = await response.json();
    const now = Date.now();
    
    // Handle single symbol response (not an object with symbol keys)
    if (symbolPairs.length === 1) {
      if (data.price) {
        const symbol = symbolPairs[0].original;
        const price = parseFloat(data.price);
        const spread = getSpread(symbol, price);
        results.set(symbol, {
          bid: price - spread / 2,
          ask: price + spread / 2,
          mid: price,
          timestamp: now,
          source: 'twelve_data'
        });
      }
      return results;
    }
    
    // Handle batch response (object with symbol keys)
    for (const pair of symbolPairs) {
      const priceData = data[pair.twelveData];
      if (priceData?.price) {
        const price = parseFloat(priceData.price);
        const spread = getSpread(pair.original, price);
        results.set(pair.original, {
          bid: price - spread / 2,
          ask: price + spread / 2,
          mid: price,
          timestamp: now,
          source: 'twelve_data'
        });
        console.log(`Batch: ${pair.original} = ${price}`);
      } else if (priceData?.code || priceData?.status === 'error') {
        console.error(`Twelve Data batch error for ${pair.twelveData}: ${priceData.message}`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Twelve Data batch fetch error:', error);
    return results;
  }
}

// Get price from cache or fetch
async function getPrice(symbol: string, twelveDataKey: string, supabase: any): Promise<PriceData | null> {
  const now = Date.now();
  
  // Check cache first
  const cached = priceCache.get(symbol);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log(`Cache hit for ${symbol}: ${cached.mid} (source: ${cached.source})`);
    return cached;
  }

  // Check rate limit
  const lastFetch = lastFetchTime.get(symbol) || 0;
  if (now - lastFetch < MIN_FETCH_INTERVAL) {
    if (cached) {
      console.log(`Rate limit: using stale cache for ${symbol}`);
      return cached;
    }
  }

  lastFetchTime.set(symbol, now);

  // Fetch from Twelve Data (single source of truth)
  const freshPrice = await fetchSingleFromTwelveData(symbol, twelveDataKey);
  
  if (freshPrice) {
    priceCache.set(symbol, freshPrice);
    return freshPrice;
  }
  
  // If fetch failed but we have stale cache, use it
  if (cached) {
    console.log(`Using stale cache for ${symbol}`);
    return cached;
  }
  
  // Last resort: try database
  const { data: instruments } = await supabase
    .from('instruments')
    .select('id')
    .eq('symbol', symbol)
    .single();
    
  if (instruments) {
    const { data: dbPrice } = await supabase
      .from('market_prices_latest')
      .select('bid, ask, price, ts')
      .eq('instrument_id', instruments.id)
      .single();
    
    if (dbPrice && dbPrice.bid && dbPrice.ask) {
      const priceData: PriceData = {
        bid: dbPrice.bid,
        ask: dbPrice.ask,
        mid: dbPrice.price,
        timestamp: new Date(dbPrice.ts).getTime(),
        source: 'db_cache'
      };
      priceCache.set(symbol, priceData);
      console.log(`Using database price for ${symbol}: ${dbPrice.price}`);
      return priceData;
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols, update_db } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(JSON.stringify({ error: 'symbols array required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const twelveDataKey = Deno.env.get('TWELVE_DATA_API_KEY') || '';
    
    if (!twelveDataKey) {
      console.error('TWELVE_DATA_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Twelve Data API key not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const prices: Record<string, { bid: number; ask: number; mid: number }> = {};
    const sources: Record<string, string> = {};
    const fetchedSymbols: string[] = [];

    // Determine which symbols need fresh fetch
    const now = Date.now();
    const symbolsNeedingFetch: string[] = [];
    const symbolsFromCache: string[] = [];
    
    for (const symbol of symbols) {
      const cached = priceCache.get(symbol);
      const lastFetch = lastFetchTime.get(symbol) || 0;
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        // Use cache
        prices[symbol] = { bid: cached.bid, ask: cached.ask, mid: cached.mid };
        sources[symbol] = cached.source;
        symbolsFromCache.push(symbol);
      } else if (now - lastFetch < MIN_FETCH_INTERVAL && cached) {
        // Rate limited but have stale cache
        prices[symbol] = { bid: cached.bid, ask: cached.ask, mid: cached.mid };
        sources[symbol] = cached.source;
        symbolsFromCache.push(symbol);
      } else {
        symbolsNeedingFetch.push(symbol);
      }
    }

    // Batch fetch symbols that need fresh data
    if (symbolsNeedingFetch.length > 0) {
      console.log(`Batch fetching ${symbolsNeedingFetch.length} symbols from Twelve Data`);
      
      // Update last fetch time for all symbols being fetched
      for (const symbol of symbolsNeedingFetch) {
        lastFetchTime.set(symbol, now);
      }
      
      const batchResults = await fetchBatchFromTwelveData(symbolsNeedingFetch, twelveDataKey);
      
      for (const symbol of symbolsNeedingFetch) {
        const freshPrice = batchResults.get(symbol);
        
        if (freshPrice) {
          priceCache.set(symbol, freshPrice);
          prices[symbol] = { bid: freshPrice.bid, ask: freshPrice.ask, mid: freshPrice.mid };
          sources[symbol] = freshPrice.source;
          fetchedSymbols.push(symbol);
        } else {
          // Try individual fallback to database
          const dbPrice = await getPrice(symbol, twelveDataKey, serviceSupabase);
          if (dbPrice) {
            prices[symbol] = { bid: dbPrice.bid, ask: dbPrice.ask, mid: dbPrice.mid };
            sources[symbol] = dbPrice.source;
          }
        }
      }
    }

    // Update the database with latest prices (background task)
    if (update_db && fetchedSymbols.length > 0) {
      try {
        const { data: instruments } = await serviceSupabase
          .from('instruments')
          .select('id, symbol')
          .in('symbol', fetchedSymbols);

        if (instruments) {
          for (const inst of instruments) {
            const priceData = prices[inst.symbol];
            const source = sources[inst.symbol];
            if (priceData) {
              await serviceSupabase
                .from('market_prices_latest')
                .upsert({
                  instrument_id: inst.id,
                  price: priceData.mid,
                  bid: priceData.bid,
                  ask: priceData.ask,
                  ts: new Date().toISOString(),
                  source: source || 'twelve_data'
                }, { onConflict: 'instrument_id' });
            }
          }
          console.log(`Updated database for ${instruments.length} symbols`);
        }
      } catch (dbError) {
        console.error('Error updating database:', dbError);
      }
    }

    return new Response(JSON.stringify({ 
      prices, 
      sources,
      cached_symbols: symbolsFromCache.length,
      fetched_symbols: fetchedSymbols.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in price-engine:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
