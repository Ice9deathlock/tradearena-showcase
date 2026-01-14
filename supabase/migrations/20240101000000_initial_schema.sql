-- TradeArena Database Schema
-- Initial migration for trading competition platform

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE account_status AS ENUM ('active', 'frozen', 'closed');
CREATE TYPE app_role AS ENUM ('user', 'admin');
CREATE TYPE asset_class AS ENUM ('forex', 'indices', 'commodities', 'crypto', 'stocks');
CREATE TYPE competition_status AS ENUM ('draft', 'upcoming', 'live', 'paused', 'ended', 'cancelled');
CREATE TYPE order_side AS ENUM ('buy', 'sell');
CREATE TYPE order_status AS ENUM ('pending', 'filled', 'cancelled', 'rejected');
CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop');
CREATE TYPE participant_status AS ENUM ('active', 'disqualified', 'withdrawn');
CREATE TYPE position_status AS ENUM ('open', 'closed', 'liquidated');
CREATE TYPE quantity_type AS ENUM ('lots', 'contracts', 'shares', 'units');
CREATE TYPE wallet_tx_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE wallet_tx_type AS ENUM ('deposit', 'withdrawal', 'entry_fee', 'prize', 'refund');
CREATE TYPE withdraw_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- ============================================
-- TABLES
-- ============================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, role)
);

-- Wallet Accounts
CREATE TABLE wallet_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    currency TEXT DEFAULT 'USD' NOT NULL,
    balance NUMERIC(20, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, currency)
);

-- Wallet Transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
    type wallet_tx_type NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    status wallet_tx_status DEFAULT 'pending' NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Withdrawal Requests
CREATE TABLE withdraw_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
    amount NUMERIC(20, 2) NOT NULL,
    method TEXT DEFAULT 'bank_transfer' NOT NULL,
    status withdraw_status DEFAULT 'pending' NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMPTZ
);

-- Instruments (Tradable Assets)
CREATE TABLE instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    tv_symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class asset_class NOT NULL,
    base_currency TEXT,
    quote_currency TEXT,
    contract_size NUMERIC(20, 8) DEFAULT 1 NOT NULL,
    tick_size NUMERIC(20, 8) DEFAULT 0.01 NOT NULL,
    quantity_type quantity_type DEFAULT 'shares' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Competitions
CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status competition_status DEFAULT 'draft' NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    entry_fee NUMERIC(20, 2) DEFAULT 0 NOT NULL,
    prize_pool NUMERIC(20, 2) DEFAULT 0 NOT NULL,
    max_participants INTEGER,
    winner_distribution JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Competition Rules
CREATE TABLE competition_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE UNIQUE,
    starting_balance NUMERIC(20, 2) DEFAULT 100000 NOT NULL,
    max_leverage_global NUMERIC(10, 2) DEFAULT 10 NOT NULL,
    max_position_pct NUMERIC(5, 2) DEFAULT 25 NOT NULL,
    max_drawdown_pct NUMERIC(5, 2) DEFAULT 20 NOT NULL,
    min_trades INTEGER DEFAULT 5 NOT NULL,
    allow_weekend_trading BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Competition Instruments (which instruments are allowed in a competition)
CREATE TABLE competition_instruments (
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    leverage_max_override NUMERIC(10, 2),
    max_notional_override NUMERIC(20, 2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (competition_id, instrument_id)
);

-- Competition Participants
CREATE TABLE competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status participant_status DEFAULT 'active' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(competition_id, user_id)
);

-- Trading Accounts (one per participant per competition)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES competition_participants(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(20, 2) DEFAULT 100000 NOT NULL,
    equity NUMERIC(20, 2) DEFAULT 100000 NOT NULL,
    used_margin NUMERIC(20, 2) DEFAULT 0 NOT NULL,
    peak_equity NUMERIC(20, 2) DEFAULT 100000 NOT NULL,
    max_drawdown_pct NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    status account_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES instruments(id),
    side order_side NOT NULL,
    order_type order_type DEFAULT 'market' NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    requested_price NUMERIC(20, 8),
    filled_price NUMERIC(20, 8),
    stop_loss NUMERIC(20, 8),
    take_profit NUMERIC(20, 8),
    leverage NUMERIC(10, 2) DEFAULT 1 NOT NULL,
    margin_used NUMERIC(20, 2),
    status order_status DEFAULT 'pending' NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    filled_at TIMESTAMPTZ
);

-- Positions
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES instruments(id),
    side order_side NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    entry_price NUMERIC(20, 8) NOT NULL,
    current_price NUMERIC(20, 8),
    stop_loss NUMERIC(20, 8),
    take_profit NUMERIC(20, 8),
    leverage NUMERIC(10, 2) DEFAULT 1 NOT NULL,
    margin_used NUMERIC(20, 2) NOT NULL,
    unrealized_pnl NUMERIC(20, 2) DEFAULT 0 NOT NULL,
    realized_pnl NUMERIC(20, 2) DEFAULT 0 NOT NULL,
    status position_status DEFAULT 'open' NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMPTZ
);

-- Trades (closed positions history)
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES instruments(id),
    position_id UUID REFERENCES positions(id),
    side order_side NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    entry_price NUMERIC(20, 8) NOT NULL,
    exit_price NUMERIC(20, 8) NOT NULL,
    realized_pnl NUMERIC(20, 2) NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Equity Snapshots (for charting)
CREATE TABLE equity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    balance NUMERIC(20, 2) NOT NULL,
    equity NUMERIC(20, 2) NOT NULL,
    unrealized_pnl NUMERIC(20, 2) DEFAULT 0 NOT NULL,
    max_drawdown_pct_so_far NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    ts TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Rank Snapshots (leaderboard history)
CREATE TABLE rank_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score NUMERIC(20, 4) NOT NULL,
    profit_pct NUMERIC(10, 4) NOT NULL,
    max_drawdown_pct NUMERIC(5, 2) NOT NULL,
    ts TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Disqualifications
CREATE TABLE disqualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Market Prices (latest)
CREATE TABLE market_prices_latest (
    instrument_id UUID PRIMARY KEY REFERENCES instruments(id) ON DELETE CASCADE,
    bid NUMERIC(20, 8) NOT NULL,
    ask NUMERIC(20, 8) NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    source TEXT DEFAULT 'finage' NOT NULL,
    ts TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Market Candles (historical data)
CREATE TABLE market_candles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    timeframe TEXT DEFAULT '1m' NOT NULL,
    ts_open TIMESTAMPTZ NOT NULL,
    open NUMERIC(20, 8) NOT NULL,
    high NUMERIC(20, 8) NOT NULL,
    low NUMERIC(20, 8) NOT NULL,
    close NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(20, 2),
    source TEXT DEFAULT 'finage' NOT NULL,
    UNIQUE(instrument_id, timeframe, ts_open)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_wallet_accounts_user_id ON wallet_accounts(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_account_id);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_dates ON competitions(starts_at, ends_at);
CREATE INDEX idx_participants_user_id ON competition_participants(user_id);
CREATE INDEX idx_participants_competition_id ON competition_participants(competition_id);
CREATE INDEX idx_accounts_participant_id ON accounts(participant_id);
CREATE INDEX idx_orders_account_id ON orders(account_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_positions_account_id ON positions(account_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_trades_account_id ON trades(account_id);
CREATE INDEX idx_equity_snapshots_account_id ON equity_snapshots(account_id);
CREATE INDEX idx_equity_snapshots_ts ON equity_snapshots(ts);
CREATE INDEX idx_rank_snapshots_competition_id ON rank_snapshots(competition_id);
CREATE INDEX idx_market_candles_instrument_timeframe ON market_candles(instrument_id, timeframe);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(_role app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = _user_id AND role = _role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'user');

    INSERT INTO wallet_accounts (user_id, currency, balance)
    VALUES (NEW.id, 'USD', 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create trading account when joining competition
CREATE OR REPLACE FUNCTION handle_new_participant()
RETURNS TRIGGER AS $$
DECLARE
    starting_bal NUMERIC(20, 2);
BEGIN
    SELECT starting_balance INTO starting_bal
    FROM competition_rules
    WHERE competition_id = NEW.competition_id;

    IF starting_bal IS NULL THEN
        starting_bal := 100000;
    END IF;

    INSERT INTO accounts (participant_id, balance, equity, peak_equity)
    VALUES (NEW.id, starting_bal, starting_bal, starting_bal);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_participant_created
    AFTER INSERT ON competition_participants
    FOR EACH ROW EXECUTE FUNCTION handle_new_participant();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_competitions_updated_at
    BEFORE UPDATE ON competitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_wallet_accounts_updated_at
    BEFORE UPDATE ON wallet_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE disqualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_candles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (has_role('admin', auth.uid()));

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON wallet_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON wallet_transactions FOR SELECT
    USING (wallet_account_id IN (SELECT id FROM wallet_accounts WHERE user_id = auth.uid()));

-- Competition policies
CREATE POLICY "Anyone can view competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Admins can manage competitions" ON competitions FOR ALL USING (has_role('admin', auth.uid()));

CREATE POLICY "Anyone can view competition rules" ON competition_rules FOR SELECT USING (true);
CREATE POLICY "Anyone can view competition instruments" ON competition_instruments FOR SELECT USING (true);

-- Participants policies
CREATE POLICY "Anyone can view participants" ON competition_participants FOR SELECT USING (true);
CREATE POLICY "Users can join competitions" ON competition_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Account policies (participants can view their own)
CREATE POLICY "Participants can view own account" ON accounts FOR SELECT
    USING (participant_id IN (SELECT id FROM competition_participants WHERE user_id = auth.uid()));

-- Trading data policies
CREATE POLICY "Users can view own orders" ON orders FOR SELECT
    USING (account_id IN (SELECT a.id FROM accounts a JOIN competition_participants p ON a.participant_id = p.id WHERE p.user_id = auth.uid()));
CREATE POLICY "Users can create orders" ON orders FOR INSERT
    WITH CHECK (account_id IN (SELECT a.id FROM accounts a JOIN competition_participants p ON a.participant_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Users can view own positions" ON positions FOR SELECT
    USING (account_id IN (SELECT a.id FROM accounts a JOIN competition_participants p ON a.participant_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Users can view own trades" ON trades FOR SELECT
    USING (account_id IN (SELECT a.id FROM accounts a JOIN competition_participants p ON a.participant_id = p.id WHERE p.user_id = auth.uid()));

-- Public data policies
CREATE POLICY "Anyone can view instruments" ON instruments FOR SELECT USING (true);
CREATE POLICY "Anyone can view market prices" ON market_prices_latest FOR SELECT USING (true);
CREATE POLICY "Anyone can view market candles" ON market_candles FOR SELECT USING (true);

-- Leaderboard policies (public)
CREATE POLICY "Anyone can view rank snapshots" ON rank_snapshots FOR SELECT USING (true);
CREATE POLICY "Anyone can view equity snapshots" ON equity_snapshots FOR SELECT USING (true);
CREATE POLICY "Anyone can view disqualifications" ON disqualifications FOR SELECT USING (true);
