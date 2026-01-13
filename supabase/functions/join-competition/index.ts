import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
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

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = user.id;
    console.log('User joining competition:', userId);

    // Parse and validate request body
    const { competition_id } = await req.json();
    
    if (!competition_id || typeof competition_id !== 'string') {
      return new Response(JSON.stringify({ error: 'competition_id is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get competition details
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('id, name, status, starts_at, ends_at, entry_fee')
      .eq('id', competition_id)
      .single();

    if (compError || !competition) {
      console.error('Competition not found:', compError);
      return new Response(JSON.stringify({ error: 'Competition not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check if competition is joinable
    if (competition.status !== 'upcoming' && competition.status !== 'live') {
      return new Response(JSON.stringify({ 
        error: `Cannot join competition with status: ${competition.status}` 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check if already joined
    const { data: existingParticipant } = await supabase
      .from('competition_participants')
      .select('id')
      .eq('competition_id', competition_id)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      return new Response(JSON.stringify({ error: 'Already joined this competition' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get competition rules for starting balance
    console.log('Fetching rules for competition:', competition_id);
    const { data: rules, error: rulesError } = await supabase
      .from('competition_rules')
      .select('starting_balance')
      .eq('competition_id', competition_id)
      .single();

    console.log('Rules result:', { rules, rulesError });

    if (rulesError || !rules) {
      console.error('Rules not found:', rulesError);
      return new Response(JSON.stringify({ error: 'Competition rules not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const startingBalance = rules.starting_balance;

    // Check wallet balance if entry fee > 0
    if (competition.entry_fee > 0) {
      const { data: wallet, error: walletError } = await supabase
        .from('wallet_accounts')
        .select('id, balance')
        .eq('user_id', userId)
        .single();

      if (walletError || !wallet) {
        console.error('Wallet not found:', walletError);
        return new Response(JSON.stringify({ error: 'Wallet not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (wallet.balance < competition.entry_fee) {
        return new Response(JSON.stringify({ 
          error: `Insufficient wallet balance. Required: $${competition.entry_fee}, Available: $${wallet.balance}` 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Deduct entry fee
      const { error: deductError } = await supabase
        .from('wallet_accounts')
        .update({ balance: wallet.balance - competition.entry_fee })
        .eq('id', wallet.id);

      if (deductError) {
        console.error('Failed to deduct entry fee:', deductError);
        return new Response(JSON.stringify({ error: 'Failed to process entry fee' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Record wallet transaction
      await supabase.from('wallet_transactions').insert({
        wallet_account_id: wallet.id,
        type: 'entry_fee',
        amount: -competition.entry_fee,
        reference_type: 'competition',
        reference_id: competition_id,
        status: 'completed'
      });
    }

    // Create participant
    const { data: participant, error: participantError } = await supabase
      .from('competition_participants')
      .insert({
        competition_id,
        user_id: userId,
        status: 'active'
      })
      .select('id')
      .single();

    if (participantError || !participant) {
      console.error('Failed to create participant:', participantError);
      return new Response(JSON.stringify({ error: 'Failed to join competition' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create trading account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({
        participant_id: participant.id,
        balance: startingBalance,
        equity: startingBalance,
        used_margin: 0,
        peak_equity: startingBalance,
        max_drawdown_pct: 0,
        status: 'active'
      })
      .select('id, balance, equity')
      .single();

    if (accountError || !account) {
      console.error('Failed to create account:', accountError);
      return new Response(JSON.stringify({ error: 'Failed to create trading account' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create initial equity snapshot
    await supabase.from('equity_snapshots').insert({
      account_id: account.id,
      equity: startingBalance,
      balance: startingBalance,
      unrealized_pnl: 0,
      max_drawdown_pct_so_far: 0
    });

    console.log('User joined successfully:', { participant_id: participant.id, account_id: account.id });

    return new Response(JSON.stringify({
      success: true,
      participant_id: participant.id,
      account_id: account.id,
      starting_balance: startingBalance,
      message: `Successfully joined ${competition.name}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in join-competition:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
