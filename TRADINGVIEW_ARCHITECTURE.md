# TradingView Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TRADEARENA TRADING APP                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    TradingViewTerminal (Main Widget)             │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │              Full-Screen Chart Area                     │   │   │
│  │  │  (Candlestick, Indicators, Drawings, Tools)            │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                           ▲                                      │   │
│  │                           │                                      │   │
│  │  ┌────────────────────────┴──────────────────────────────────┐  │   │
│  │  │                                                           │  │   │
│  │  ├─────────────────────────────────────────────────────────┤  │   │
│  │  │         Widget Bar (Top/Side Navigation)                │  │   │
│  │  │  ┌──────────┬──────────┬──────────┬──────────────────┐ │  │   │
│  │  │  │Watchlist │ Details  │  News    │  Data Window    │ │  │   │
│  │  │  └──────────┴──────────┴──────────┴──────────────────┘ │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │     Account Manager (Positions, Orders, Trades)        │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                          DATA LAYER (BELOW WIDGET)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────┐      ┌──────────────────────┐                 │
│  │   Datafeed API       │      │   Broker API         │                 │
│  ├──────────────────────┤      ├──────────────────────┤                 │
│  │ • getBars()          │      │ • accountsMetainfo() │                 │
│  │ • getQuotes()        │      │ • positions()        │                 │
│  │ • resolveSymbol()    │      │ • orders()           │                 │
│  │ • subscribe()        │      │ • placeOrder()       │                 │
│  │ • unsubscribe()      │      │ • modifyOrder()      │                 │
│  │                      │      │ • cancelOrder()      │                 │
│  │ Creates: createData  │      │ • closePosition()    │                 │
│  │ feed() in            │      │ • reversePosition()  │                 │
│  │ tradingviewDatafeed  │      │                      │                 │
│  │ .ts                  │      │ Implements:          │                 │
│  │                      │      │ TradeArenaBrokerAPI  │                 │
│  │                      │      │ in                   │                 │
│  │                      │      │ tradingviewBrokerAPI │                 │
│  │                      │      │ .ts                  │                 │
│  └──────────────────────┘      └──────────────────────┘                 │
│           ▲                              ▲                               │
│           │                              │                               │
└───────────┼──────────────────────────────┼───────────────────────────────┘
            │                              │
            │ HTTP/WebSocket               │ HTTP/Supabase
            │                              │
┌───────────▼──────────────────────────────▼───────────────────────────────┐
│                           SUPABASE BACKEND                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │  trading_accounts│  │   positions      │  │   orders         │     │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤     │
│  │ • id             │  │ • id             │  │ • id             │     │
│  │ • balance        │  │ • account_id     │  │ • account_id     │     │
│  │ • equity         │  │ • symbol         │  │ • symbol         │     │
│  │ • margin         │  │ • units          │  │ • type           │     │
│  │ • realized_pnl   │  │ • avg_price      │  │ • side           │     │
│  └──────────────────┘  │ • unrealized_pnl │  │ • size           │     │
│                        │ • is_open        │  │ • state          │     │
│                        └──────────────────┘  │ • fill_price     │     │
│                                              └──────────────────┘     │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐                            │
│  │    candles       │  │    quotes        │                            │
│  ├──────────────────┤  ├──────────────────┤                            │
│  │ • symbol         │  │ • symbol         │                            │
│  │ • timeframe      │  │ • bid            │                            │
│  │ • open           │  │ • ask            │                            │
│  │ • high           │  │ • timestamp      │                            │
│  │ • low            │  │ • volume         │                            │
│  │ • close          │  └──────────────────┘                            │
│  │ • volume         │                                                   │
│  │ • time           │  ┌──────────────────┐                            │
│  └──────────────────┘  │ Realtime Subs    │                            │
│                        │ (WebSocket)      │                            │
│                        │ • price updates  │                            │
│                        │ • order updates  │                            │
│                        └──────────────────┘                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
TradingViewPlatform (Page)
│
└── TradingViewTerminal (Main Widget)
    │
    ├── Chart Area (TradingView Widget)
    │   ├── Drawing Toolbar
    │   ├── Chart Canvas
    │   ├── Indicators Panel
    │   ├── Legend
    │   └── Scale/Crosshair
    │
    ├── Widget Bar
    │   ├── WatchlistWidget
    │   │   ├── Symbol List
    │   │   ├── Price Display
    │   │   └── Change % & Volume
    │   │
    │   ├── DetailsWidget
    │   │   ├── Bid/Ask Prices
    │   │   ├── Daily OHLC
    │   │   ├── 52-week High/Low
    │   │   └── Market Status
    │   │
    │   ├── NewsWidget
    │   │   ├── News Feed
    │   │   ├── Economic Calendar
    │   │   └── RSS Sources
    │   │
    │   └── Data Window
    │       ├── Values Table
    │       └── Custom Columns
    │
    ├── Account Manager Panel
    │   ├── Account Stats
    │   │   ├── Balance
    │   │   ├── Equity
    │   │   ├── Margin Level
    │   │   └── Free Margin
    │   │
    │   ├── Positions Tab
    │   │   ├── Position List
    │   │   ├── P&L Display
    │   │   └── Close/Modify Buttons
    │   │
    │   ├── Orders Tab
    │   │   ├── Order List
    │   │   ├── Order Status
    │   │   ├── Modify/Cancel Buttons
    │   │   └── Fill Details
    │   │
    │   └── Trades Tab
    │       ├── Trade History
    │       ├── Entry/Exit Prices
    │       └── Duration & P&L
    │
    └── Advanced Order Ticket (Modal)
        ├── Symbol Selector
        ├── Order Type (Market/Limit/Stop)
        ├── Quantity Input
        ├── Price Inputs (Limit/Stop)
        ├── SL/TP Fields
        ├── Bracket Options
        ├── Time in Force
        ├── Preview
        └── Submit/Cancel
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ TradingView Widget Constructor                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ new TradingView.widget({                                  │   │
│ │   datafeed: createDatafeed(),     ◄──┐                   │   │
│ │   broker_factory: createBrokerFactory(accountId) ◄──┐    │   │
│ │   ...config                                        │    │   │
│ │ })                                                 │    │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                     │         │                │
└─────────────────────────────────────┼─────────┼────────────────┘
                                      │         │
                    ┌─────────────────▼─┐   ┌──▼──────────────┐
                    │ Datafeed API      │   │ Broker API      │
                    ├───────────────────┤   ├─────────────────┤
                    │ Chart Requests:   │   │ Trading:        │
                    │ 1. getBars()      │   │ 1. placeOrder() │
                    │ 2. getQuotes()    │   │ 2. getAccounts()│
                    │ 3. subscribe()    │   │ 3. getPositions│
                    │ 4. unsubscribe()  │   │ 4. getOrders()  │
                    └──────────┬────────┘   └────────┬────────┘
                               │                    │
                    ┌──────────▼────────────────────▼──────────┐
                    │      Supabase Database                   │
                    ├─────────────────────────────────────────┤
                    │ SELECT * FROM candles WHERE symbol=?    │
                    │ SELECT * FROM quotes WHERE symbol=?     │
                    │ INSERT INTO orders (...)                │
                    │ SELECT * FROM positions WHERE open=true │
                    │ UPDATE orders SET state='filled' WHERE..│
                    └─────────────────────────────────────────┘
                               ▲
                               │
                    ┌──────────┴──────────┐
                    │  Realtime Updates   │
                    │ (WebSocket/Supabase)│
                    │ • Price changes     │
                    │ • Order updates     │
                    │ • Position changes  │
                    └─────────────────────┘
```

## Integration with CFD OMS

```
┌─────────────────────────────────────────┐
│     TradingView Trading Terminal        │
│                                         │
│  User places order via Order Ticket     │
└────────────────┬────────────────────────┘
                 │
                 │ placeOrder()
                 ▼
┌─────────────────────────────────────────┐
│   Broker API (tradingviewBrokerAPI.ts)  │
│                                         │
│  async placeOrder(order) {              │
│    1. Validate order parameters         │
│    2. Call backend API                  │
│    3. Return order ID                   │
│  }                                      │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP POST /api/orders
                 ▼
┌─────────────────────────────────────────┐
│    Backend Trading Engine (CFD OMS)     │
│    [C# .NET 8]                          │
│                                         │
│  1. Validate margin requirements        │
│  2. Check position limits               │
│  3. Execute matching engine             │
│  4. Update positions table              │
│  5. Calculate P&L                       │
│  6. Trigger SL/TP if needed             │
│  7. Return execution details            │
└────────────────┬────────────────────────┘
                 │
                 │ Update Supabase
                 ▼
┌─────────────────────────────────────────┐
│   Supabase Database                     │
│   (orders, positions, candles)          │
└─────────────────────────────────────────┘
                 │
                 │ Realtime subscription
                 ▼
┌─────────────────────────────────────────┐
│   TradingView Account Manager Updates   │
│   • Order status changes                │
│   • Position P&L updates                │
│   • Balance changes                     │
└─────────────────────────────────────────┘
```

## Widget Communication Flow

```
User Interaction
    │
    ├─► Click "Buy" Button ──► Order Ticket opens
    │
    ├─► Fill Order Params ──► Validation (client-side)
    │
    ├─► Click "Submit" ──► Broker API: placeOrder()
    │                      │
    │                      └─► Supabase: INSERT orders
    │                          │
    │                          └─► Realtime subscription
    │                              │
    │                              └─► Account Manager updates
    │                                  └─► Display new order
    │
    ├─► Click Symbol in Watchlist ──► Chart symbol changes
    │                                  │
    │                                  └─► Datafeed: resolveSymbol()
    │                                      │
    │                                      └─► getBars() for new symbol
    │                                          │
    │                                          └─► Chart redraws
    │
    ├─► Click Close Position ──► Broker API: closePosition()
    │                            │
    │                            └─► Create market order
    │                                │
    │                                └─► Execute & update positions
    │
    └─► Select Timeframe ──► Chart: subscription(interval)
                            │
                            └─► Stream bars at new frequency
```

## Real-time Updates Flow

```
Price Update from Market
    │
    ├─► WebSocket/Feed Server
    │
    ├─► Supabase Realtime Channel
    │   "prices:EURUSD"
    │
    ├─► Subscription Callback
    │   in Datafeed.subscribe()
    │
    ├─► onRealtimeCallback(tick)
    │   {
    │     bid: 1.0950,
    │     ask: 1.0951,
    │     time: timestamp,
    │     volume: volume
    │   }
    │
    ├─► TradingView Library Updates
    │   • Chart last bar
    │   • Bid/Ask lines
    │   • Watchlist prices
    │   • Details widget
    │
    └─► Account Manager Updates
        • Position unrealized P&L
        • Margin level recalculation
        • SL/TP trigger checks
```

## File Dependencies

```
TradingViewTerminal.tsx
├── Imports createDatafeed() from tradingviewDatafeed.ts
├── Imports createBrokerFactory() from tradingviewBrokerAPI.ts
├── Uses TradingView Widget API
└── Calls Supabase client

tradingviewBrokerAPI.ts
├── Imports supabase client
├── Queries: trading_accounts
├── Queries: positions
├── Queries: orders
├── Exports: TradeArenaBrokerAPI class
└── Exports: createBrokerFactory() function

tradingviewDatafeed.ts
├── Imports supabase client
├── Queries: candles table
├── Queries: quotes table
├── Subscribes to: prices realtime channel
└── Exports: createDatafeed() function

WatchlistWidget.tsx
├── Uses TradingView Widget API
├── Calls: supabase (implicit)
└── Props: onSymbolSelect callback

[Other Widget Components]
├── DOMWidget.tsx
├── DetailsWidget.tsx
├── NewsWidget.tsx
└── AccountManagerWidget.tsx
    └── All use TradingView Widget API

TradingViewPlatform.tsx (Page)
├── Imports TradingViewTerminal
├── Imports useUserTradingAccounts hook
├── Imports useCompetitionInstruments hook
├── Uses useAuth hook
└── Provides accountId to TradingViewTerminal
```

---

**Last Updated**: January 13, 2026
