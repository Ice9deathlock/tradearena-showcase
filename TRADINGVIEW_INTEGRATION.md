# TradingView Integration Guide

## Overview

This guide explains how to use the TradingView Trading Platform libraries integrated into TradeArena. You now have access to professional-grade trading UI components used by thousands of traders worldwide.

## What's Available

### 1. **TradingView Trading Terminal** (Full Platform)
The complete trading platform with all widgets integrated:

```tsx
import TradingViewTerminal from "@/components/trading/TradingViewTerminal";

<TradingViewTerminal 
  symbol="EURUSD"
  accountId={accountId}
  brokerId={accountId}
/>
```

**Features:**
- ✅ Full-screen professional chart
- ✅ Integrated Account Manager (positions, orders, trades)
- ✅ Watchlist widget with multiple lists
- ✅ Depth of Market (DOM) with level 2 pricing
- ✅ Symbol Details widget (bid/ask prices, trading hours)
- ✅ News widget with RSS feeds
- ✅ Advanced Order Ticket (brackets, trailing stops, etc.)
- ✅ Buy/Sell buttons on chart
- ✅ Multiple synchronized chart layouts
- ✅ All drawing tools and indicators
- ✅ Real-time price updates

### 2. **Individual Widgets**

#### Watchlist Widget
Displays symbols with prices and quick switching:

```tsx
import WatchlistWidget from "@/components/trading/WatchlistWidget";

<WatchlistWidget 
  defaultSymbols={["EURUSD", "GBPUSD", "XAUUSD"]}
  onSymbolSelect={(symbol) => handleSymbolChange(symbol)}
/>
```

#### Depth of Market (DOM) Widget
Shows bid/ask volume ladder with direct order placement:

```tsx
import DOMWidget from "@/components/trading/DOMWidget";

<DOMWidget symbol="EURUSD" height={400} />
```

#### Details Widget
Displays symbol information (bid/ask, daily OHLC, volume):

```tsx
import DetailsWidget from "@/components/trading/DetailsWidget";

<DetailsWidget symbol="EURUSD" />
```

#### News Widget
Shows market news and economic events:

```tsx
import NewsWidget from "@/components/trading/NewsWidget";

<NewsWidget symbol="EURUSD" height={300} />
```

#### Account Manager Widget
Displays account stats, positions, orders, trades:

```tsx
import AccountManagerWidget from "@/components/trading/AccountManagerWidget";

<AccountManagerWidget accountId={accountId} height={300} />
```

### 3. **TVChart Component**
The existing chart component (Advanced Charts):

```tsx
import TVChart from "@/components/trading/TVChart";

<TVChart 
  symbol="EURUSD"
  instrumentId={instrumentId}
  accountId={accountId}
/>
```

## Architecture

### File Structure

```
src/
├── components/trading/
│   ├── TradingViewTerminal.tsx       # Full Trading Platform widget
│   ├── TVChart.tsx                  # Advanced Charts component
│   ├── WatchlistWidget.tsx           # Watchlist widget
│   ├── DOMWidget.tsx                 # Depth of Market widget
│   ├── DetailsWidget.tsx             # Symbol Details widget
│   ├── NewsWidget.tsx                # News widget
│   ├── AccountManagerWidget.tsx      # Account Manager widget
│   └── terminal/
│       ├── TopToolbar.tsx
│       ├── LeftToolbar.tsx
│       ├── RightSidebar.tsx
│       ├── BottomPanel.tsx
│       └── QuickTradeOverlay.tsx
├── pages/
│   ├── Trading.tsx                   # Custom UI implementation
│   └── TradingViewPlatform.tsx        # Full TradingView Terminal page
├── lib/
│   ├── tradingviewDatafeed.ts         # Datafeed implementation
│   └── tradingviewBrokerAPI.ts        # Broker API implementation
└── hooks/
    └── useTrading.ts
```

### Data Flow

```
TradingViewTerminal
├── createDatafeed() → Historical candles, quotes, streaming
├── createBrokerFactory() → Order management, positions, accounts
└── Widget Constructor
    ├── Datafeed configuration
    ├── Broker API integration
    ├── Widget bar (watchlist, details, news)
    └── Chart settings
```

## Integration Steps

### Step 1: Using the Full Terminal

Replace the custom Trading page with the TradingView Terminal:

```tsx
// pages/TradingViewPlatform.tsx
import TradingViewTerminal from "@/components/trading/TradingViewTerminal";

export default function TradingPage() {
  return (
    <TradingViewTerminal 
      symbol="EURUSD"
      accountId={accountId}
      brokerId={accountId}
    />
  );
}
```

Then add route:
```tsx
// App.tsx
<Route path="/trading-tv" element={<TradingViewPlatform />} />
```

### Step 2: Broker API Integration

The `createBrokerFactory()` function connects TradingView to your backend:

```tsx
// Implemented in TradingViewTerminal.tsx
broker_factory: createBrokerFactory(accountId)
```

This automatically handles:
- ✅ Account state (balance, equity, margin)
- ✅ Positions retrieval and updates
- ✅ Order placement, modification, cancellation
- ✅ Position closing and reversals
- ✅ Real-time P&L calculations

### Step 3: Datafeed Integration

The `createDatafeed()` function provides:
- ✅ Historical candlestick data
- ✅ Real-time price quotes
- ✅ Symbol search and resolution
- ✅ Streaming updates via WebSocket/Supabase

Located in: `lib/tradingviewDatafeed.ts`

## Configuration Options

### Enable/Disable Features

In `TradingViewTerminal.tsx`, modify `disabled_features` and `enabled_features`:

```tsx
disabled_features: [
  "use_localstorage_for_settings",
  "header_fullscreen_button",
  // Add more to disable
],

enabled_features: [
  "study_templates",
  "dom_widget",
  "header_layouttoggle",
  "trading_terminal",
  "chart_trading",
  // Add more to enable
],
```

### Common Feature Toggles

```tsx
// Disable specific widgets in widgetbar
widgetbar: {
  details: false,      // Hide Details widget
  news: false,         // Hide News widget
  watchlist: false,    // Hide Watchlist widget
  datawindow: false,   // Hide Data Window
}

// Disable trading features
disabled_features: [
  "symbol_search_hot_key",
  "compare_symbol",
  "display_market_status",
  "header_chart_type",
  "header_settings",
  "header_fullscreen_button",
]
```

## Broker API Implementation

The `TradeArenaBrokerAPI` class (`lib/tradingviewBrokerAPI.ts`) provides:

### Required Methods

```typescript
// Get available accounts
accountsMetainfo(): Promise<AccountInfo[]>

// Get account state (balance, margin, equity)
getAccountState(accountId: string): Promise<AccountState>

// Get open positions
positions(accountId: string): Promise<Position[]>

// Get open orders
orders(accountId: string): Promise<Order[]>

// Place new order
placeOrder(order: OrderRequest): Promise<{ orderId: string }>

// Modify existing order
modifyOrder(orderId: string, modifications: any): Promise<boolean>

// Cancel order
cancelOrder(orderId: string): Promise<boolean>

// Close position (optional)
closePosition(positionId: string): Promise<boolean>

// Reverse position (optional)
reversePosition(positionId: string): Promise<boolean>
```

### Extending the API

To add custom trading logic:

```typescript
// lib/tradingviewBrokerAPI.ts

export class TradeArenaBrokerAPI {
  async placeOrder(order: any) {
    // Call your backend trading engine (CFD OMS)
    // Validate margin, execute matching engine, etc.
    
    const response = await fetch("/api/orders/place", {
      method: "POST",
      body: JSON.stringify({
        accountId: this.accountId,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
      })
    });
    
    return response.json();
  }
}
```

## Real-Time Data Updates

### WebSocket Streaming

The system supports real-time price updates via:
1. **Supabase Realtime**: For orders, positions, and account changes
2. **Datafeed Streaming**: For tick-level price updates

```typescript
// In createDatafeed()
subscribe(channelString, interval, onRealtimeCallback) {
  // Use Supabase or WebSocket to stream price updates
  const subscription = supabase
    .channel(`prices:${symbol}`)
    .on("postgres_changes", { ... }, onRealtimeCallback)
    .subscribe();
}
```

## Customization

### Theme Customization

```tsx
theme: "dark",  // or "light"

// Custom colors (coming soon with advanced customization)
```

### Widget Bar Configuration

```tsx
widgetbar: {
  details: true,              // Symbol details
  news: true,                 // News feed
  watchlist: true,            // Watchlist
  datawindow: true,           // Data window
  watchlist_settings: {
    default_symbols: ["EURUSD", "GBPUSD", "XAUUSD", "BTCUSD"]
  }
}
```

### Broker Configuration

```tsx
broker_config: {
  configFlags: {
    supportNativeReversePosition: true,      // Flip position
    supportClosePosition: true,              // Close position
    supportOrderBrackets: true,              // Bracket orders (SL/TP)
    supportMarketBrackets: true,             // Brackets on market orders
    supportPositionBrackets: true,           // Brackets on positions
    supportOrdersHistory: true,              // Show order history
    supportModifyOrder: true,                // Modify existing orders
    supportLevel2Data: true,                 // Show DOM
    showQuantityInsteadOfAmount: true,       // Show lots not amount
  },
  durations: [
    { name: 'DAY', value: 'DAY' },
    { name: 'GTC', value: 'GTC' },    // Good Till Canceled
    { name: 'IOC', value: 'IOC' },    // Immediate or Cancel
  ]
}
```

## Troubleshooting

### "TradingView widget is undefined"

**Solution**: Ensure the script is loaded before initializing:

```tsx
useEffect(() => {
  if (!window.TradingView?.widget) {
    console.log("TradingView not ready yet");
    return;
  }
  // Initialize widget
}, [scriptLoaded])
```

### Broker API orders not appearing

**Solution**: Verify the broker_factory returns proper Promise objects:

```tsx
// CORRECT
orders: (accountId) => broker.orders(accountId)
  .then(orders => ({ orders }))

// INCORRECT
orders: (accountId) => ({ orders: [] })
```

### Chart not updating on symbol change

**Solution**: Ensure the datafeed properly handles symbol resolution:

```tsx
resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
  console.log("Resolving symbol:", symbolName);
  // Must call onSymbolResolvedCallback with SymbolInfo
}
```

## Performance Tips

1. **Use `dom_widget` sparingly**: Level 2 data is intensive
2. **Limit streaming symbols**: Subscribe only to active symbols
3. **Cache datafeed**: Store candles locally when possible
4. **Debounce order updates**: Reduce API calls from frequent updates

## Migration Path

### From Custom UI to TradingView

1. **Phase 1**: Keep both implementations side-by-side
   - Custom UI at `/trading`
   - TradingView at `/trading-tv`

2. **Phase 2**: Gradually migrate features
   - Use TradingView charts
   - Keep custom order entry (optional)
   - Integrate watchlist

3. **Phase 3**: Full cutover to TradingView Terminal
   - All widgets integrated
   - Complete broker API
   - Remove custom components

## Resources

- **TradingView Docs**: https://www.tradingview.com/charting-library-docs/
- **Trading Terminal Demo**: https://trading-terminal.tradingview-widget.com/
- **Broker API Guide**: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/
- **Trading Platform**: /trading_platform-master folder in workspace

## Examples

### Example 1: Simple Chart with Watchlist

```tsx
import TradingViewTerminal from "@/components/trading/TradingViewTerminal";
import { useUserTradingAccounts } from "@/hooks/useTrading";

export default function SimpleTradingView() {
  const { data: accounts } = useUserTradingAccounts();
  
  return (
    <TradingViewTerminal
      symbol="EURUSD"
      accountId={accounts?.[0]?.id}
    />
  );
}
```

### Example 2: Custom Layout with Widgets

```tsx
import TVChart from "@/components/trading/TVChart";
import WatchlistWidget from "@/components/trading/WatchlistWidget";
import NewsWidget from "@/components/trading/NewsWidget";
import DOMWidget from "@/components/trading/DOMWidget";

export default function CustomLayout() {
  const [symbol, setSymbol] = useState("EURUSD");
  
  return (
    <div className="grid grid-cols-3 gap-4 h-screen p-4">
      {/* Chart */}
      <div className="col-span-2">
        <TVChart symbol={symbol} />
      </div>
      
      {/* Right panel */}
      <div className="flex flex-col gap-4">
        <WatchlistWidget onSymbolSelect={setSymbol} />
        <NewsWidget symbol={symbol} height={200} />
      </div>
      
      {/* Bottom panel */}
      <div className="col-span-3">
        <DOMWidget symbol={symbol} height={150} />
      </div>
    </div>
  );
}
```

## Next Steps

1. ✅ Review TradingView documentation: `/trading_platform-master`
2. ✅ Test the full terminal at `/trading-tv` route
3. ✅ Customize broker API for your backend
4. ✅ Implement real-time price streaming
5. ✅ Add custom widgets and overlays
6. ✅ Deploy to production

---

**Last Updated**: January 13, 2026
**TradingView Library Version**: Latest (from trading_platform-master)
