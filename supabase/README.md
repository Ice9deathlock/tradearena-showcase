# TradeArena Database Setup

This directory contains all the database schema, migrations, and seed data for the TradeArena trading competition platform.

## Database Schema Overview

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends Supabase auth) |
| `user_roles` | User roles (user/admin) |
| `wallet_accounts` | User wallet balances |
| `wallet_transactions` | Wallet transaction history |
| `withdraw_requests` | Withdrawal requests |
| `instruments` | Tradable instruments (stocks, forex, crypto) |
| `competitions` | Trading competitions |
| `competition_rules` | Rules for each competition |
| `competition_instruments` | Instruments allowed per competition |
| `competition_participants` | Users participating in competitions |
| `accounts` | Trading accounts (one per participant) |
| `orders` | Trading orders |
| `positions` | Open and closed positions |
| `trades` | Trade history |
| `equity_snapshots` | Equity history for charts |
| `rank_snapshots` | Leaderboard history |
| `disqualifications` | Disqualification records |
| `market_prices_latest` | Latest market prices |
| `market_candles` | Historical candle data |

### Enums

- `account_status`: active, frozen, closed
- `app_role`: user, admin
- `asset_class`: forex, indices, commodities, crypto, stocks
- `competition_status`: draft, upcoming, live, paused, ended, cancelled
- `order_side`: buy, sell
- `order_status`: pending, filled, cancelled, rejected
- `order_type`: market, limit, stop
- `participant_status`: active, disqualified, withdrawn
- `position_status`: open, closed, liquidated
- `quantity_type`: lots, contracts, shares, units
- `wallet_tx_status`: pending, completed, failed, cancelled
- `wallet_tx_type`: deposit, withdrawal, entry_fee, prize, refund
- `withdraw_status`: pending, approved, rejected, completed

## Setup Options

### Option 1: Use Existing Supabase Project

If you already have a Supabase project configured in `.env`:

1. Go to your Supabase Dashboard > SQL Editor
2. Run the migration file: `migrations/20240101000000_initial_schema.sql`
3. Run the seed file: `seed.sql`

### Option 2: Local Development with Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

3. Apply migrations:
   ```bash
   supabase db push
   ```

4. Seed the database:
   ```bash
   supabase db reset --seed
   ```

5. Access local services:
   - API: http://localhost:54321
   - Studio: http://localhost:54323
   - Inbucket (emails): http://localhost:54324

6. Update `.env` for local development:
   ```env
   VITE_SUPABASE_URL="http://localhost:54321"
   VITE_SUPABASE_PUBLISHABLE_KEY="<your-local-anon-key>"
   ```

### Option 3: Create New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to SQL Editor and run:
   - `migrations/20240101000000_initial_schema.sql`
   - `seed.sql`
4. Get your project credentials from Settings > API
5. Update `.env`:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   VITE_SUPABASE_PROJECT_ID="your-project-id"
   ```

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Profiles**: Anyone can view, users can update their own
- **Competitions**: Anyone can view, admins can manage
- **Participants**: Anyone can view, users can join
- **Trading Data**: Users can only see/manage their own orders, positions, trades
- **Market Data**: Anyone can view (public)
- **Wallet**: Users can only view their own wallet and transactions

## Edge Functions

The following edge functions are configured:

| Function | Description |
|----------|-------------|
| `join-competition` | Handle user joining a competition |
| `place-order` | Process trading orders |
| `close-position` | Close open positions |
| `price-engine` | Update market prices |
| `candles-engine` | Generate candle data |

## Automatic Triggers

- **New User**: Auto-creates profile, user role, and wallet account
- **New Participant**: Auto-creates trading account with competition's starting balance
- **Updates**: Auto-updates `updated_at` timestamps

## Admin Setup

To make a user an admin:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<user-uuid>', 'admin');
```

## Testing

The seed data includes:
- 20 US stock instruments
- 5 Forex pairs
- 3 Crypto pairs
- 3 sample competitions (live, upcoming, draft)
- Initial market prices for all instruments
