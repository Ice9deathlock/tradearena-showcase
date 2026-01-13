-- =============================================
-- TRADEARENA MVP DATABASE SCHEMA
-- =============================================

-- 1. ROLE SYSTEM
-- =============================================
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 2. PROFILES
-- =============================================
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    display_name text,
    avatar_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Trigger to create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    INSERT INTO public.wallet_accounts (user_id, currency, balance)
    VALUES (NEW.id, 'USD', 0);
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. INSTRUMENTS (multi-asset support)
-- =============================================
CREATE TYPE public.asset_class AS ENUM ('forex', 'indices', 'commodities', 'crypto', 'stocks');
CREATE TYPE public.quantity_type AS ENUM ('lots', 'contracts', 'shares', 'units');

CREATE TABLE public.instruments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL UNIQUE,
    name text NOT NULL,
    asset_class asset_class NOT NULL,
    tv_symbol text NOT NULL,
    base_currency text,
    quote_currency text,
    contract_size numeric NOT NULL DEFAULT 1,
    tick_size numeric NOT NULL DEFAULT 0.01,
    quantity_type quantity_type NOT NULL DEFAULT 'lots',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_instruments_asset_class ON public.instruments(asset_class);
CREATE INDEX idx_instruments_active ON public.instruments(is_active);

ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instruments are publicly readable" ON public.instruments
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage instruments" ON public.instruments
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 4. COMPETITIONS
-- =============================================
CREATE TYPE public.competition_status AS ENUM ('draft', 'upcoming', 'live', 'paused', 'ended', 'cancelled');

CREATE TABLE public.competitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    status competition_status NOT NULL DEFAULT 'draft',
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    entry_fee numeric NOT NULL DEFAULT 0,
    prize_pool numeric NOT NULL DEFAULT 0,
    winner_distribution jsonb DEFAULT '{"1": 50, "2": 30, "3": 20}'::jsonb,
    max_participants integer,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitions_status ON public.competitions(status);
CREATE INDEX idx_competitions_dates ON public.competitions(starts_at, ends_at);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Competitions are publicly readable" ON public.competitions
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage competitions" ON public.competitions
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 5. COMPETITION RULES
-- =============================================
CREATE TABLE public.competition_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL UNIQUE,
    starting_balance numeric NOT NULL DEFAULT 100000,
    max_drawdown_pct numeric NOT NULL DEFAULT 10,
    max_leverage_global integer NOT NULL DEFAULT 100,
    max_position_pct numeric NOT NULL DEFAULT 20,
    min_trades integer NOT NULL DEFAULT 5,
    allow_weekend_trading boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rules are publicly readable" ON public.competition_rules
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage rules" ON public.competition_rules
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 6. COMPETITION INSTRUMENTS (allowed instruments per competition)
-- =============================================
CREATE TABLE public.competition_instruments (
    competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    instrument_id uuid REFERENCES public.instruments(id) ON DELETE CASCADE NOT NULL,
    leverage_max_override integer,
    max_notional_override numeric,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (competition_id, instrument_id)
);

ALTER TABLE public.competition_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Competition instruments are publicly readable" ON public.competition_instruments
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage competition instruments" ON public.competition_instruments
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 7. COMPETITION PARTICIPANTS
-- =============================================
CREATE TYPE public.participant_status AS ENUM ('active', 'disqualified', 'withdrawn');

CREATE TABLE public.competition_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at timestamptz NOT NULL DEFAULT now(),
    status participant_status NOT NULL DEFAULT 'active',
    UNIQUE (competition_id, user_id)
);

CREATE INDEX idx_participants_competition ON public.competition_participants(competition_id);
CREATE INDEX idx_participants_user ON public.competition_participants(user_id);

ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own participations" ON public.competition_participants
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can join competitions" ON public.competition_participants
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage participants" ON public.competition_participants
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 8. ACCOUNTS (trading accounts per participant)
-- =============================================
CREATE TYPE public.account_status AS ENUM ('active', 'frozen', 'closed');

CREATE TABLE public.accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id uuid REFERENCES public.competition_participants(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance numeric NOT NULL DEFAULT 100000,
    equity numeric NOT NULL DEFAULT 100000,
    used_margin numeric NOT NULL DEFAULT 0,
    peak_equity numeric NOT NULL DEFAULT 100000,
    max_drawdown_pct numeric NOT NULL DEFAULT 0,
    status account_status NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_participant ON public.accounts(participant_id);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts" ON public.accounts
    FOR SELECT TO authenticated
    USING (
        participant_id IN (
            SELECT id FROM public.competition_participants WHERE user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "System can update accounts" ON public.accounts
    FOR UPDATE TO authenticated
    USING (
        participant_id IN (
            SELECT id FROM public.competition_participants WHERE user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

-- 9. MARKET DATA TABLES
-- =============================================
CREATE TABLE public.market_prices_latest (
    instrument_id uuid REFERENCES public.instruments(id) ON DELETE CASCADE NOT NULL UNIQUE,
    ts timestamptz NOT NULL DEFAULT now(),
    bid numeric NOT NULL,
    ask numeric NOT NULL,
    price numeric NOT NULL,
    source text NOT NULL DEFAULT 'tradingview',
    PRIMARY KEY (instrument_id)
);

ALTER TABLE public.market_prices_latest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prices are publicly readable" ON public.market_prices_latest
    FOR SELECT USING (true);

CREATE POLICY "System can update prices" ON public.market_prices_latest
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.market_candles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id uuid REFERENCES public.instruments(id) ON DELETE CASCADE NOT NULL,
    timeframe text NOT NULL DEFAULT '1m',
    ts_open timestamptz NOT NULL,
    open numeric NOT NULL,
    high numeric NOT NULL,
    low numeric NOT NULL,
    close numeric NOT NULL,
    volume numeric DEFAULT 0,
    source text NOT NULL DEFAULT 'tradingview',
    UNIQUE (instrument_id, timeframe, ts_open)
);

CREATE INDEX idx_candles_lookup ON public.market_candles(instrument_id, timeframe, ts_open DESC);

ALTER TABLE public.market_candles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candles are publicly readable" ON public.market_candles
    FOR SELECT USING (true);

-- 10. ORDERS
-- =============================================
CREATE TYPE public.order_side AS ENUM ('buy', 'sell');
CREATE TYPE public.order_type AS ENUM ('market', 'limit', 'stop');
CREATE TYPE public.order_status AS ENUM ('pending', 'filled', 'cancelled', 'rejected');

CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    instrument_id uuid REFERENCES public.instruments(id) NOT NULL,
    side order_side NOT NULL,
    order_type order_type NOT NULL DEFAULT 'market',
    quantity numeric NOT NULL,
    leverage integer NOT NULL DEFAULT 1,
    requested_price numeric,
    filled_price numeric,
    margin_used numeric,
    requested_at timestamptz NOT NULL DEFAULT now(),
    filled_at timestamptz,
    status order_status NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_orders_account ON public.orders(account_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_requested_at ON public.orders(requested_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM public.accounts a
            JOIN public.competition_participants cp ON a.participant_id = cp.id
            WHERE cp.user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (
        account_id IN (
            SELECT a.id FROM public.accounts a
            JOIN public.competition_participants cp ON a.participant_id = cp.id
            WHERE cp.user_id = auth.uid()
        )
    );

-- 11. POSITIONS
-- =============================================
CREATE TYPE public.position_status AS ENUM ('open', 'closed', 'liquidated');

CREATE TABLE public.positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    instrument_id uuid REFERENCES public.instruments(id) NOT NULL,
    side order_side NOT NULL,
    quantity numeric NOT NULL,
    entry_price numeric NOT NULL,
    current_price numeric,
    leverage integer NOT NULL DEFAULT 1,
    margin_used numeric NOT NULL,
    unrealized_pnl numeric NOT NULL DEFAULT 0,
    realized_pnl numeric NOT NULL DEFAULT 0,
    opened_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    status position_status NOT NULL DEFAULT 'open'
);

CREATE INDEX idx_positions_account ON public.positions(account_id);
CREATE INDEX idx_positions_status ON public.positions(status);
CREATE INDEX idx_positions_open ON public.positions(account_id, status) WHERE status = 'open';

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions" ON public.positions
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM public.accounts a
            JOIN public.competition_participants cp ON a.participant_id = cp.id
            WHERE cp.user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "System can manage positions" ON public.positions
    FOR ALL TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM public.accounts a
            JOIN public.competition_participants cp ON a.participant_id = cp.id
            WHERE cp.user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

-- 12. TRADES (closed position records)
-- =============================================
CREATE TABLE public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
    instrument_id uuid REFERENCES public.instruments(id) NOT NULL,
    side order_side NOT NULL,
    quantity numeric NOT NULL,
    entry_price numeric NOT NULL,
    exit_price numeric NOT NULL,
    realized_pnl numeric NOT NULL,
    opened_at timestamptz NOT NULL,
    closed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_account ON public.trades(account_id);
CREATE INDEX idx_trades_closed_at ON public.trades(closed_at DESC);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON public.trades
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM public.accounts a
            JOIN public.competition_participants cp ON a.participant_id = cp.id
            WHERE cp.user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

-- 13. EQUITY SNAPSHOTS
-- =============================================
CREATE TABLE public.equity_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    ts timestamptz NOT NULL DEFAULT now(),
    equity numeric NOT NULL,
    balance numeric NOT NULL,
    unrealized_pnl numeric NOT NULL DEFAULT 0,
    max_drawdown_pct_so_far numeric NOT NULL DEFAULT 0
);

CREATE INDEX idx_equity_snapshots_account_ts ON public.equity_snapshots(account_id, ts DESC);

ALTER TABLE public.equity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own equity snapshots" ON public.equity_snapshots
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM public.accounts a
            JOIN public.competition_participants cp ON a.participant_id = cp.id
            WHERE cp.user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

-- 14. RANK SNAPSHOTS (leaderboard)
-- =============================================
CREATE TABLE public.rank_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    ts timestamptz NOT NULL DEFAULT now(),
    rank integer NOT NULL,
    score numeric NOT NULL,
    profit_pct numeric NOT NULL,
    max_drawdown_pct numeric NOT NULL
);

CREATE INDEX idx_rank_snapshots_competition_ts ON public.rank_snapshots(competition_id, ts DESC);
CREATE INDEX idx_rank_snapshots_latest ON public.rank_snapshots(competition_id, ts DESC, rank);

ALTER TABLE public.rank_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rank snapshots are publicly readable" ON public.rank_snapshots
    FOR SELECT USING (true);

-- 15. DISQUALIFICATIONS
-- =============================================
CREATE TABLE public.disqualifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    reason text NOT NULL,
    triggered_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (competition_id, account_id)
);

ALTER TABLE public.disqualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disqualifications" ON public.disqualifications
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM public.accounts a
            JOIN public.competition_participants cp ON a.participant_id = cp.id
            WHERE cp.user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

-- 16. WALLET ACCOUNTS
-- =============================================
CREATE TABLE public.wallet_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    currency text NOT NULL DEFAULT 'USD',
    balance numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallet_accounts
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own wallet" ON public.wallet_accounts
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- 17. WALLET TRANSACTIONS
-- =============================================
CREATE TYPE public.wallet_tx_type AS ENUM ('deposit', 'withdrawal', 'entry_fee', 'prize', 'refund');
CREATE TYPE public.wallet_tx_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

CREATE TABLE public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_account_id uuid REFERENCES public.wallet_accounts(id) ON DELETE CASCADE NOT NULL,
    type wallet_tx_type NOT NULL,
    amount numeric NOT NULL,
    reference_type text,
    reference_id uuid,
    status wallet_tx_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_account ON public.wallet_transactions(wallet_account_id);
CREATE INDEX idx_wallet_tx_created ON public.wallet_transactions(created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
    FOR SELECT TO authenticated
    USING (
        wallet_account_id IN (
            SELECT id FROM public.wallet_accounts WHERE user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

-- 18. WITHDRAW REQUESTS
-- =============================================
CREATE TYPE public.withdraw_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

CREATE TABLE public.withdraw_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_account_id uuid REFERENCES public.wallet_accounts(id) ON DELETE CASCADE NOT NULL,
    amount numeric NOT NULL,
    method text NOT NULL DEFAULT 'bank_transfer',
    status withdraw_status NOT NULL DEFAULT 'pending',
    requested_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);

CREATE INDEX idx_withdraw_requests_wallet ON public.withdraw_requests(wallet_account_id);
CREATE INDEX idx_withdraw_requests_status ON public.withdraw_requests(status);

ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdraw requests" ON public.withdraw_requests
    FOR SELECT TO authenticated
    USING (
        wallet_account_id IN (
            SELECT id FROM public.wallet_accounts WHERE user_id = auth.uid()
        ) OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can create withdraw requests" ON public.withdraw_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        wallet_account_id IN (
            SELECT id FROM public.wallet_accounts WHERE user_id = auth.uid()
        )
    );

-- 19. UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at
    BEFORE UPDATE ON public.competitions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_accounts_updated_at
    BEFORE UPDATE ON public.wallet_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 20. SEED INSTRUMENTS (multi-asset)
-- =============================================
INSERT INTO public.instruments (symbol, name, asset_class, tv_symbol, base_currency, quote_currency, contract_size, tick_size, quantity_type) VALUES
-- Forex
('EURUSD', 'Euro / US Dollar', 'forex', 'FX:EURUSD', 'EUR', 'USD', 100000, 0.00001, 'lots'),
('GBPUSD', 'British Pound / US Dollar', 'forex', 'FX:GBPUSD', 'GBP', 'USD', 100000, 0.00001, 'lots'),
('USDJPY', 'US Dollar / Japanese Yen', 'forex', 'FX:USDJPY', 'USD', 'JPY', 100000, 0.001, 'lots'),
('AUDUSD', 'Australian Dollar / US Dollar', 'forex', 'FX:AUDUSD', 'AUD', 'USD', 100000, 0.00001, 'lots'),
('USDCAD', 'US Dollar / Canadian Dollar', 'forex', 'FX:USDCAD', 'USD', 'CAD', 100000, 0.00001, 'lots'),
-- Indices
('US500', 'S&P 500', 'indices', 'FOREXCOM:SPXUSD', NULL, 'USD', 1, 0.01, 'contracts'),
('US30', 'Dow Jones 30', 'indices', 'FOREXCOM:DJI', NULL, 'USD', 1, 1, 'contracts'),
('NAS100', 'Nasdaq 100', 'indices', 'FOREXCOM:NSXUSD', NULL, 'USD', 1, 0.01, 'contracts'),
('GER40', 'DAX 40', 'indices', 'FOREXCOM:GRXEUR', NULL, 'EUR', 1, 0.01, 'contracts'),
-- Commodities
('XAUUSD', 'Gold / US Dollar', 'commodities', 'FOREXCOM:XAUUSD', 'XAU', 'USD', 100, 0.01, 'lots'),
('XAGUSD', 'Silver / US Dollar', 'commodities', 'FOREXCOM:XAGUSD', 'XAG', 'USD', 5000, 0.001, 'lots'),
('USOIL', 'WTI Crude Oil', 'commodities', 'TVC:USOIL', NULL, 'USD', 1000, 0.01, 'contracts'),
('UKOIL', 'Brent Crude Oil', 'commodities', 'TVC:UKOIL', NULL, 'USD', 1000, 0.01, 'contracts'),
-- Crypto
('BTCUSD', 'Bitcoin / US Dollar', 'crypto', 'BITSTAMP:BTCUSD', 'BTC', 'USD', 1, 0.01, 'units'),
('ETHUSD', 'Ethereum / US Dollar', 'crypto', 'BITSTAMP:ETHUSD', 'ETH', 'USD', 1, 0.01, 'units'),
('XRPUSD', 'Ripple / US Dollar', 'crypto', 'BITSTAMP:XRPUSD', 'XRP', 'USD', 1, 0.0001, 'units'),
('SOLUSD', 'Solana / US Dollar', 'crypto', 'COINBASE:SOLUSD', 'SOL', 'USD', 1, 0.01, 'units'),
-- Stocks (CFD)
('AAPL', 'Apple Inc.', 'stocks', 'NASDAQ:AAPL', NULL, 'USD', 1, 0.01, 'shares'),
('TSLA', 'Tesla Inc.', 'stocks', 'NASDAQ:TSLA', NULL, 'USD', 1, 0.01, 'shares'),
('MSFT', 'Microsoft Corporation', 'stocks', 'NASDAQ:MSFT', NULL, 'USD', 1, 0.01, 'shares'),
('GOOGL', 'Alphabet Inc.', 'stocks', 'NASDAQ:GOOGL', NULL, 'USD', 1, 0.01, 'shares'),
('AMZN', 'Amazon.com Inc.', 'stocks', 'NASDAQ:AMZN', NULL, 'USD', 1, 0.01, 'shares'),
('NVDA', 'NVIDIA Corporation', 'stocks', 'NASDAQ:NVDA', NULL, 'USD', 1, 0.01, 'shares');