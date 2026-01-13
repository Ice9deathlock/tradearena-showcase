import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for prices - longer TTL to stay within rate limits
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_TTL = 15000; // 15 seconds - allows ~4 calls/min max

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(JSON.stringify({ error: 'symbols array required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      console.error('TWELVE_DATA_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'API key not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const prices: Record<string, number> = {};
    const symbolsToFetch: string[] = [];

    // Check cache first
    for (const symbol of symbols) {
      const cached = priceCache.get(symbol);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        prices[symbol] = cached.price;
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    if (symbolsToFetch.length > 0) {
      // Map our symbols to Twelve Data format
      const symbolMap: Record<string, string> = {
        'EURUSD': 'EUR/USD',
        'GBPUSD': 'GBP/USD',
        'USDJPY': 'USD/JPY',
        'AUDUSD': 'AUD/USD',
        'USDCHF': 'USD/CHF',
        'USDCAD': 'USD/CAD',
        'NZDUSD': 'NZD/USD',
        'BTCUSD': 'BTC/USD',
        'ETHUSD': 'ETH/USD',
        'XAUUSD': 'XAU/USD',
      };

      // Fetch each symbol (Twelve Data free tier doesn't support batch for forex)
      for (const symbol of symbolsToFetch) {
        const twelveSymbol = symbolMap[symbol];
        if (!twelveSymbol) continue;

        try {
          const response = await fetch(
            `https://api.twelvedata.com/price?symbol=${encodeURIComponent(twelveSymbol)}&apikey=${apiKey}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.price) {
              const price = parseFloat(data.price);
              prices[symbol] = price;
              priceCache.set(symbol, { price, timestamp: Date.now() });
              console.log(`Twelve Data price for ${symbol}: ${price}`);
            } else if (data.code) {
              console.error(`Twelve Data error for ${symbol}:`, data.message);
            }
          }
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
        }
      }
    }

    return new Response(JSON.stringify({ prices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-forex-price:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
