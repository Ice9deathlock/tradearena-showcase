-- TradeArena Seed Data
-- Sample data for development and testing

-- ============================================
-- INSTRUMENTS (US Stocks from Finage)
-- ============================================

INSERT INTO instruments (symbol, tv_symbol, name, asset_class, quote_currency, contract_size, tick_size, quantity_type) VALUES
('AAPL', 'AAPL', 'Apple Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('MSFT', 'MSFT', 'Microsoft Corporation', 'stocks', 'USD', 1, 0.01, 'shares'),
('GOOGL', 'GOOGL', 'Alphabet Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('AMZN', 'AMZN', 'Amazon.com Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('NVDA', 'NVDA', 'NVIDIA Corporation', 'stocks', 'USD', 1, 0.01, 'shares'),
('META', 'META', 'Meta Platforms Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('TSLA', 'TSLA', 'Tesla Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('JPM', 'JPM', 'JPMorgan Chase & Co.', 'stocks', 'USD', 1, 0.01, 'shares'),
('V', 'V', 'Visa Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('WMT', 'WMT', 'Walmart Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('NFLX', 'NFLX', 'Netflix Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('DIS', 'DIS', 'Walt Disney Company', 'stocks', 'USD', 1, 0.01, 'shares'),
('AMD', 'AMD', 'Advanced Micro Devices', 'stocks', 'USD', 1, 0.01, 'shares'),
('INTC', 'INTC', 'Intel Corporation', 'stocks', 'USD', 1, 0.01, 'shares'),
('BA', 'BA', 'Boeing Company', 'stocks', 'USD', 1, 0.01, 'shares'),
('CRM', 'CRM', 'Salesforce Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('ORCL', 'ORCL', 'Oracle Corporation', 'stocks', 'USD', 1, 0.01, 'shares'),
('PYPL', 'PYPL', 'PayPal Holdings Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('UBER', 'UBER', 'Uber Technologies Inc.', 'stocks', 'USD', 1, 0.01, 'shares'),
('SNAP', 'SNAP', 'Snap Inc.', 'stocks', 'USD', 1, 0.01, 'shares');

-- Forex Pairs
INSERT INTO instruments (symbol, tv_symbol, name, asset_class, base_currency, quote_currency, contract_size, tick_size, quantity_type) VALUES
('EURUSD', 'FX:EURUSD', 'Euro/US Dollar', 'forex', 'EUR', 'USD', 100000, 0.00001, 'lots'),
('GBPUSD', 'FX:GBPUSD', 'British Pound/US Dollar', 'forex', 'GBP', 'USD', 100000, 0.00001, 'lots'),
('USDJPY', 'FX:USDJPY', 'US Dollar/Japanese Yen', 'forex', 'USD', 'JPY', 100000, 0.001, 'lots'),
('AUDUSD', 'FX:AUDUSD', 'Australian Dollar/US Dollar', 'forex', 'AUD', 'USD', 100000, 0.00001, 'lots'),
('USDCAD', 'FX:USDCAD', 'US Dollar/Canadian Dollar', 'forex', 'USD', 'CAD', 100000, 0.00001, 'lots');

-- Crypto
INSERT INTO instruments (symbol, tv_symbol, name, asset_class, base_currency, quote_currency, contract_size, tick_size, quantity_type) VALUES
('BTCUSD', 'COINBASE:BTCUSD', 'Bitcoin/US Dollar', 'crypto', 'BTC', 'USD', 1, 0.01, 'units'),
('ETHUSD', 'COINBASE:ETHUSD', 'Ethereum/US Dollar', 'crypto', 'ETH', 'USD', 1, 0.01, 'units'),
('SOLUSD', 'COINBASE:SOLUSD', 'Solana/US Dollar', 'crypto', 'SOL', 'USD', 1, 0.01, 'units');

-- ============================================
-- SAMPLE COMPETITIONS
-- ============================================

-- Competition 1: Weekly Trading Challenge
INSERT INTO competitions (id, name, description, status, starts_at, ends_at, entry_fee, prize_pool, max_participants, winner_distribution)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Weekly Trading Challenge',
    'Compete against other traders in a week-long trading competition. Trade US stocks with $100,000 virtual capital.',
    'live',
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '5 days',
    25.00,
    5000.00,
    100,
    '{"1": 50, "2": 25, "3": 15, "4-10": 10}'
);

INSERT INTO competition_rules (competition_id, starting_balance, max_leverage_global, max_position_pct, max_drawdown_pct, min_trades, allow_weekend_trading)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    100000.00,
    5.00,
    25.00,
    20.00,
    10,
    FALSE
);

-- Add instruments to competition 1
INSERT INTO competition_instruments (competition_id, instrument_id)
SELECT 'c0000000-0000-0000-0000-000000000001', id FROM instruments WHERE asset_class = 'stocks';

-- Competition 2: Crypto Trading Cup
INSERT INTO competitions (id, name, description, status, starts_at, ends_at, entry_fee, prize_pool, max_participants, winner_distribution)
VALUES (
    'c0000000-0000-0000-0000-000000000002',
    'Crypto Trading Cup',
    'Trade major cryptocurrencies and prove your skills in this crypto-only competition.',
    'upcoming',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '14 days',
    50.00,
    10000.00,
    50,
    '{"1": 50, "2": 30, "3": 20}'
);

INSERT INTO competition_rules (competition_id, starting_balance, max_leverage_global, max_position_pct, max_drawdown_pct, min_trades, allow_weekend_trading)
VALUES (
    'c0000000-0000-0000-0000-000000000002',
    50000.00,
    10.00,
    50.00,
    30.00,
    5,
    TRUE
);

INSERT INTO competition_instruments (competition_id, instrument_id)
SELECT 'c0000000-0000-0000-0000-000000000002', id FROM instruments WHERE asset_class = 'crypto';

-- Competition 3: Beginner Friendly Challenge
INSERT INTO competitions (id, name, description, status, starts_at, ends_at, entry_fee, prize_pool, max_participants, winner_distribution)
VALUES (
    'c0000000-0000-0000-0000-000000000003',
    'Beginner Friendly Challenge',
    'Perfect for new traders! Low risk rules and extended time to learn.',
    'draft',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '28 days',
    10.00,
    1000.00,
    200,
    '{"1": 40, "2": 25, "3": 15, "4-5": 10, "6-10": 10}'
);

INSERT INTO competition_rules (competition_id, starting_balance, max_leverage_global, max_position_pct, max_drawdown_pct, min_trades, allow_weekend_trading)
VALUES (
    'c0000000-0000-0000-0000-000000000003',
    25000.00,
    2.00,
    10.00,
    10.00,
    20,
    FALSE
);

-- Add all instruments to competition 3
INSERT INTO competition_instruments (competition_id, instrument_id)
SELECT 'c0000000-0000-0000-0000-000000000003', id FROM instruments;

-- ============================================
-- INITIAL MARKET PRICES (for testing)
-- ============================================

INSERT INTO market_prices_latest (instrument_id, bid, ask, price, source)
SELECT id,
    CASE symbol
        WHEN 'AAPL' THEN 248.50
        WHEN 'MSFT' THEN 378.25
        WHEN 'GOOGL' THEN 138.75
        WHEN 'AMZN' THEN 178.50
        WHEN 'NVDA' THEN 498.00
        WHEN 'META' THEN 348.25
        WHEN 'TSLA' THEN 248.75
        WHEN 'JPM' THEN 168.50
        WHEN 'V' THEN 273.25
        WHEN 'WMT' THEN 163.50
        WHEN 'NFLX' THEN 478.00
        WHEN 'DIS' THEN 108.25
        WHEN 'AMD' THEN 118.50
        WHEN 'INTC' THEN 43.75
        WHEN 'BA' THEN 178.50
        WHEN 'CRM' THEN 258.25
        WHEN 'ORCL' THEN 128.50
        WHEN 'PYPL' THEN 68.25
        WHEN 'UBER' THEN 78.50
        WHEN 'SNAP' THEN 12.25
        WHEN 'BTCUSD' THEN 95000.00
        WHEN 'ETHUSD' THEN 3200.00
        WHEN 'SOLUSD' THEN 180.00
        WHEN 'EURUSD' THEN 1.0850
        WHEN 'GBPUSD' THEN 1.2650
        WHEN 'USDJPY' THEN 155.50
        WHEN 'AUDUSD' THEN 0.6450
        WHEN 'USDCAD' THEN 1.3850
        ELSE 100.00
    END as bid,
    CASE symbol
        WHEN 'AAPL' THEN 248.52
        WHEN 'MSFT' THEN 378.28
        WHEN 'GOOGL' THEN 138.78
        WHEN 'AMZN' THEN 178.53
        WHEN 'NVDA' THEN 498.05
        WHEN 'META' THEN 348.28
        WHEN 'TSLA' THEN 248.78
        WHEN 'JPM' THEN 168.53
        WHEN 'V' THEN 273.28
        WHEN 'WMT' THEN 163.53
        WHEN 'NFLX' THEN 478.05
        WHEN 'DIS' THEN 108.28
        WHEN 'AMD' THEN 118.53
        WHEN 'INTC' THEN 43.78
        WHEN 'BA' THEN 178.53
        WHEN 'CRM' THEN 258.28
        WHEN 'ORCL' THEN 128.53
        WHEN 'PYPL' THEN 68.28
        WHEN 'UBER' THEN 78.53
        WHEN 'SNAP' THEN 12.28
        WHEN 'BTCUSD' THEN 95050.00
        WHEN 'ETHUSD' THEN 3205.00
        WHEN 'SOLUSD' THEN 180.50
        WHEN 'EURUSD' THEN 1.0852
        WHEN 'GBPUSD' THEN 1.2652
        WHEN 'USDJPY' THEN 155.52
        WHEN 'AUDUSD' THEN 0.6452
        WHEN 'USDCAD' THEN 1.3852
        ELSE 100.02
    END as ask,
    CASE symbol
        WHEN 'AAPL' THEN 248.51
        WHEN 'MSFT' THEN 378.26
        WHEN 'GOOGL' THEN 138.76
        WHEN 'AMZN' THEN 178.51
        WHEN 'NVDA' THEN 498.02
        WHEN 'META' THEN 348.26
        WHEN 'TSLA' THEN 248.76
        WHEN 'JPM' THEN 168.51
        WHEN 'V' THEN 273.26
        WHEN 'WMT' THEN 163.51
        WHEN 'NFLX' THEN 478.02
        WHEN 'DIS' THEN 108.26
        WHEN 'AMD' THEN 118.51
        WHEN 'INTC' THEN 43.76
        WHEN 'BA' THEN 178.51
        WHEN 'CRM' THEN 258.26
        WHEN 'ORCL' THEN 128.51
        WHEN 'PYPL' THEN 68.26
        WHEN 'UBER' THEN 78.51
        WHEN 'SNAP' THEN 12.26
        WHEN 'BTCUSD' THEN 95025.00
        WHEN 'ETHUSD' THEN 3202.50
        WHEN 'SOLUSD' THEN 180.25
        WHEN 'EURUSD' THEN 1.0851
        WHEN 'GBPUSD' THEN 1.2651
        WHEN 'USDJPY' THEN 155.51
        WHEN 'AUDUSD' THEN 0.6451
        WHEN 'USDCAD' THEN 1.3851
        ELSE 100.01
    END as price,
    'finage'
FROM instruments;

-- ============================================
-- SAMPLE ADMIN USER (for testing)
-- Note: This requires the user to exist in auth.users first
-- Run this after creating a user through the auth system
-- ============================================

-- To make a user an admin, run:
-- INSERT INTO user_roles (user_id, role) VALUES ('<user-uuid>', 'admin');
