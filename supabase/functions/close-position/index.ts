import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceData {
  bid: number;
  ask: number;
  mid: number;
}

// Fetch price from centralized price engine
async function fetchFromPriceEngine(symbol: string): Promise<PriceData | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/price-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ symbols: [symbol], update_db: false }),
    });

    if (!response.ok) {
      console.error(`Price engine error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.prices && data.prices[symbol]) {
      const price = data.prices[symbol];
      console.log(`Price engine returned for ${symbol}: bid=${price.bid}, ask=${price.ask}`);
      return { bid: price.bid, ask: price.ask, mid: price.mid };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching from price engine for ${symbol}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = user.id;
    const { position_id, competition_id, client_price } = await req.json();

    if (!position_id || !competition_id) {
      return new Response(JSON.stringify({ error: 'position_id and competition_id are required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Close position request:', { userId, position_id, competition_id });

    // Verify user owns this position
    const { data: participant } = await supabase
      .from('competition_participants')
      .select('id')
      .eq('competition_id', competition_id)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      return new Response(JSON.stringify({ error: 'Not participating in this competition' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('id, balance, used_margin, peak_equity, max_drawdown_pct')
      .eq('participant_id', participant.id)
      .single();

    if (!account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get position
    const { data: position, error: posError } = await supabase
      .from('positions')
      .select('id, account_id, instrument_id, side, quantity, entry_price, margin_used, status, opened_at')
      .eq('id', position_id)
      .eq('account_id', account.id)
      .eq('status', 'open')
      .single();

    if (posError || !position) {
      return new Response(JSON.stringify({ error: 'Position not found or already closed' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get instrument
    const { data: instrument } = await supabase
      .from('instruments')
      .select('symbol, contract_size')
      .eq('id', position.instrument_id)
      .single();

    const contractSize = Number(instrument?.contract_size || 1);
    const symbol = instrument?.symbol || '';

    // Get close price from centralized price engine
    // Closing a BUY position = SELL at BID
    // Closing a SELL position = BUY at ASK
    let closePrice: number;
    let exitBid: number;
    let exitAsk: number;
    let priceSource: string = 'price-engine';

    const priceEngineResult = await fetchFromPriceEngine(symbol);
    
    if (priceEngineResult) {
      exitBid = priceEngineResult.bid;
      exitAsk = priceEngineResult.ask;
      closePrice = position.side === 'buy' ? exitBid : exitAsk;
      console.log(`Price engine close: side=${position.side}, bid=${exitBid}, ask=${exitAsk}, closePrice=${closePrice}`);
    } else {
      // Fallback: Use cached DB price or client price
      const { data: latestPrice } = await supabase
        .from('market_prices_latest')
        .select('price, bid, ask, ts')
        .eq('instrument_id', position.instrument_id)
        .single();

      if (latestPrice && latestPrice.bid && latestPrice.ask) {
        exitBid = latestPrice.bid;
        exitAsk = latestPrice.ask;
        closePrice = position.side === 'buy' ? exitBid : exitAsk;
        priceSource = 'db_cache';
        console.log(`Using DB cache for close: bid=${exitBid}, ask=${exitAsk}`);
      } else if (client_price && client_price > 0) {
        const spread = client_price * 0.0001;
        exitBid = client_price - spread;
        exitAsk = client_price + spread;
        closePrice = position.side === 'buy' ? exitBid : exitAsk;
        priceSource = 'client_fallback';
        console.log(`Using client price fallback: ${client_price}`);
      } else {
        // Last resort: use entry price
        closePrice = Number(position.entry_price);
        exitBid = closePrice;
        exitAsk = closePrice;
        priceSource = 'entry_fallback';
        console.warn('Using entry price as fallback for close');
      }
    }

    // Calculate P&L
    const entryPrice = Number(position.entry_price);
    const qty = Number(position.quantity);
    const priceDiff = position.side === 'buy' 
      ? closePrice - entryPrice 
      : entryPrice - closePrice;
    
    const realizedPnl = priceDiff * qty * contractSize;

    console.log('Closing position:', { 
      entry: entryPrice, 
      exit: closePrice, 
      qty, 
      contractSize, 
      pnl: realizedPnl,
      source: priceSource
    });

    // Update position to closed
    const { error: updateError } = await supabase
      .from('positions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        current_price: closePrice,
        realized_pnl: realizedPnl
      })
      .eq('id', position_id);

    if (updateError) {
      console.error('Failed to close position:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to close position' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create trade record
    await supabase.from('trades').insert({
      account_id: account.id,
      position_id: position_id,
      instrument_id: position.instrument_id,
      side: position.side,
      quantity: qty,
      entry_price: entryPrice,
      exit_price: closePrice,
      realized_pnl: realizedPnl,
      opened_at: position.opened_at || new Date().toISOString()
    });

    // Update account
    const newBalance = account.balance + realizedPnl;
    const newUsedMargin = account.used_margin - Number(position.margin_used);

    // Get remaining unrealized P&L
    const { data: openPositions } = await supabase
      .from('positions')
      .select('unrealized_pnl')
      .eq('account_id', account.id)
      .eq('status', 'open');

    const totalUnrealizedPnl = openPositions?.reduce((sum: number, p: any) => sum + Number(p.unrealized_pnl || 0), 0) || 0;
    const newEquity = newBalance + totalUnrealizedPnl;
    const newPeakEquity = Math.max(account.peak_equity, newEquity);
    const drawdown = newPeakEquity > 0 
      ? ((newPeakEquity - newEquity) / newPeakEquity) * 100 
      : 0;

    await supabase
      .from('accounts')
      .update({
        balance: newBalance,
        equity: newEquity,
        used_margin: Math.max(0, newUsedMargin),
        peak_equity: newPeakEquity,
        max_drawdown_pct: Math.max(account.max_drawdown_pct, drawdown)
      })
      .eq('id', account.id);

    // Create equity snapshot
    await supabase.from('equity_snapshots').insert({
      account_id: account.id,
      equity: newEquity,
      balance: newBalance,
      unrealized_pnl: totalUnrealizedPnl,
      max_drawdown_pct_so_far: Math.max(account.max_drawdown_pct, drawdown)
    });

    console.log('Position closed successfully:', { position_id, realized_pnl: realizedPnl, source: priceSource });

    return new Response(JSON.stringify({
      success: true,
      position_id,
      close_price: closePrice,
      realized_pnl: realizedPnl,
      new_balance: newBalance,
      symbol,
      price_source: priceSource,
      exit_bid: exitBid,
      exit_ask: exitAsk
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in close-position:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
