# TradingView Terminal Integration - Complete OMS Backend

## Overview

The TradeArena trading platform now includes a fully integrated TradingView Terminal with a complete OMS (Order Management System) backend connected to Supabase.

## Architecture

### Frontend Components

1. **TradingPlatform.tsx** (`src/pages/TradingPlatform.tsx`)
   - React component that loads the TradingView widget
   - Handles chart initialization and configuration
   - Manages broker connection
   - Responsive full-screen trading interface

2. **Trading Libraries**
   - Charting Library: Professional OHLC charts with technical analysis
   - UDF Datafeed: Real-time market data provider
   - Broker API: Integration layer with OMS

### Backend Integration

1. **TradeArenaBrokerOMS** (`src/integrations/tradingViewBrokerOMS.ts`)
   - Core broker API implementation
   - Connects TradingView to TradeArena backend
   - Manages orders, positions, and account state
   - Real-time P&L calculations

2. **Database Schema** (`supabase/migrations/20260113_tradingview_oms_schema.sql`)
   - `positions` - Open trading positions
   - `orders` - Pending and active orders
   - `executions` - Trade execution history
   - `user_accounts` - Trading account settings
   - `user_wallets` - Balance and equity tracking

## Features

### Trading Terminal
- ✅ Full-featured charting with 100+ technical indicators
- ✅ Multiple chart types (candlestick, OHLC, line, area, etc.)
- ✅ Drawing tools (trendlines, channels, fibonacci, etc.)
- ✅ Symbol watchlist with price monitoring
- ✅ Depth of Market (DOM) widget
- ✅ Economic calendar
- ✅ Live news feed
- ✅ Account manager widget

### Order Types
- Market Orders
- Limit Orders
- Stop Orders
- Stop-Limit Orders
- Bracket Orders (with TP/SL)
- Trailing Stop Orders

### Account Management
- Real-time balance tracking
- Equity monitoring
- P&L calculations
- Margin level tracking
- Position management
- Order history
- Trade executions
- Account summary

## Database Tables

### positions
```sql
- id (UUID) - Primary key
- user_id (UUID) - User reference
- symbol (VARCHAR) - Trading symbol
- side (VARCHAR) - BUY/SELL
- quantity (DECIMAL) - Position size
- average_price (DECIMAL) - Entry price
- current_price (DECIMAL) - Current market price
- pnl (DECIMAL) - Profit/loss
- status (VARCHAR) - open/closed
- created_at (TIMESTAMP) - Creation time
- updated_at (TIMESTAMP) - Last update
```

### orders
```sql
- id (UUID) - Primary key
- user_id (UUID) - User reference
- symbol (VARCHAR) - Trading symbol
- side (VARCHAR) - BUY/SELL
- quantity (DECIMAL) - Order quantity
- price (DECIMAL) - Order price
- order_type (VARCHAR) - MARKET/LIMIT/STOP/STOP_LIMIT
- status (VARCHAR) - pending/working/filled/cancelled/rejected
- created_at (TIMESTAMP) - Creation time
- updated_at (TIMESTAMP) - Last update
```

### executions
```sql
- id (UUID) - Primary key
- user_id (UUID) - User reference
- order_id (UUID) - Related order
- symbol (VARCHAR) - Trading symbol
- side (VARCHAR) - BUY/SELL
- quantity (DECIMAL) - Executed quantity
- price (DECIMAL) - Execution price
- commission (DECIMAL) - Trading fees
- executed_at (TIMESTAMP) - Execution time
```

### user_accounts
```sql
- id (UUID) - Primary key
- user_id (UUID) - User reference
- account_type (VARCHAR) - demo/live
- currency (VARCHAR) - USD/EUR/etc
- leverage (INT) - Leverage ratio
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### user_wallets
```sql
- id (UUID) - Primary key
- user_id (UUID) - User reference
- balance (DECIMAL) - Account balance
- equity (DECIMAL) - Current equity
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## API Methods

### TradeArenaBrokerOMS

#### accountsMetainfo()
Returns account metadata and information
```typescript
const accounts = await brokerAPI.accountsMetainfo();
// Returns array of AccountMetainfo
```

#### getAccountState(accountId)
Gets current balance, equity, and margin info
```typescript
const state = await brokerAPI.getAccountState(accountId);
// {
//   balance: number,
//   equity: number,
//   pl: number,
//   usedMargin: number,
//   freeMargin: number,
//   marginLevel: number
// }
```

#### getPositions(accountId)
Fetches all open positions
```typescript
const positions = await brokerAPI.getPositions(accountId);
// Returns array of Position objects
```

#### getOrders(accountId)
Fetches all pending/active orders
```typescript
const orders = await brokerAPI.getOrders(accountId);
// Returns array of Order objects
```

#### placeOrder(accountId, preOrder, parentId?, parentType?)
Places a new order
```typescript
const result = await brokerAPI.placeOrder(accountId, {
  symbol: 'EURUSD',
  side: Side.Buy,
  qty: 1.0,
  type: OrderType.Limit,
  limitPrice: 1.0850,
});
// Returns { id, orderId, status }
```

#### modifyOrder(accountId, orderId, preOrder)
Modifies existing order
```typescript
const result = await brokerAPI.modifyOrder(accountId, orderId, newPreOrder);
// Returns { id, orderId, status }
```

#### cancelOrder(accountId, orderId)
Cancels an order
```typescript
await brokerAPI.cancelOrder(accountId, orderId);
```

#### closePosition(accountId, positionId)
Closes an open position
```typescript
await brokerAPI.closePosition(accountId, positionId);
```

#### reversePosition(accountId, positionId)
Reverses position direction (flips BUY/SELL)
```typescript
await brokerAPI.reversePosition(accountId, positionId);
```

## Usage

### Accessing the Trading Platform

Navigate to `/trading-platform` route (protected route - requires authentication)

```typescript
// In App.tsx
<Route path="/trading-platform" element={
  <ProtectedRoute>
    <TradingPlatform />
  </ProtectedRoute>
} />
```

### Configuration

The TradingPlatform component can be configured by modifying `src/pages/TradingPlatform.tsx`:

```typescript
const widget = new window.TradingView.widget({
  fullscreen: true,
  symbol: 'EURUSD',        // Default symbol
  interval: '1H',          // Default interval
  theme: 'dark',           // 'dark' or 'light'
  locale: 'en',            // Language
  // ... other settings
});
```

## Real-time Updates

All position and order updates are queried from Supabase in real-time using:

```typescript
// Subscribe to position changes
supabase
  .from('positions')
  .on('*', payload => {
    // Handle updates
  })
  .subscribe();
```

## Error Handling

The broker API includes comprehensive error handling:

```typescript
try {
  const result = await brokerAPI.placeOrder(accountId, order);
} catch (error) {
  console.error('Order placement failed:', error);
  // Handle error appropriately
}
```

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Authentication via Supabase Auth
- Protected routes ensure only authenticated users can trade

## Supported Symbols

The platform supports any symbol in the TradingView datafeed:

- Forex: EURUSD, GBPUSD, USDJPY, etc.
- Stocks: AAPL, GOOGL, MSFT, TSLA, etc.
- Crypto: BTCUSD, ETHUSD, etc.
- Commodities: Gold, Oil, etc.
- Indices: SPX, DAX, FTSE, etc.

## Deployment

### Local Development

```bash
npm install
npm run dev
```

Access at: `http://localhost:8080/trading-platform`

### Production Build

```bash
npm run build
```

## Troubleshooting

### Chart Error: Failed to load TradingView script

**Cause:** TradingView libraries not loaded correctly

**Solution:**
1. Ensure `trading_platform-master` folder is in the project root
2. Verify vite.config.ts includes proper fs.allow settings
3. Check browser console for specific errors

### Orders not appearing in TradingView

**Cause:** Supabase connection issue or RLS policy problem

**Solution:**
1. Verify Supabase client is initialized
2. Check user is authenticated
3. Confirm RLS policies are enabled
4. Check Supabase table permissions

### P&L not updating

**Cause:** Missing current_price data

**Solution:**
1. Ensure current prices are being fetched from datafeed
2. Implement price update subscription
3. Update position current_price regularly

## Next Steps

1. **Implement WebSocket integration** for real-time price updates
2. **Add risk management** - Stop loss, take profit validation
3. **Create analytics dashboard** - Trade statistics, performance metrics
4. **Implement paper trading mode** - Risk-free trading
5. **Add multi-account support** - Multiple trading accounts
6. **Connect to live brokers** - Replace demo data with real broker APIs

## File Structure

```
src/
  pages/
    TradingPlatform.tsx          # Main trading platform component
  integrations/
    tradingViewBrokerOMS.ts      # Broker API implementation
  contexts/
    AuthContext.tsx              # Authentication context

public/
  trading-platform.html          # Static HTML template

supabase/
  migrations/
    20260113_tradingview_oms_schema.sql  # Database schema

trading_platform-master/         # TradingView platform files
  charting_library/
  datafeeds/
  broker-sample/
  custom-dialogs/
```

## API Reference

See [TRADINGVIEW_QUICK_REFERENCE.md](./TRADINGVIEW_QUICK_REFERENCE.md) for detailed API reference.

## Architecture

See [TRADINGVIEW_ARCHITECTURE.md](./TRADINGVIEW_ARCHITECTURE.md) for system architecture and data flow diagrams.
