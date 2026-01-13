# TradingView UI - Quick Reference

## 🚀 Quick Start

### Use Full Trading Platform
```tsx
import TradingViewTerminal from "@/components/trading/TradingViewTerminal";

<TradingViewTerminal symbol="EURUSD" accountId={id} brokerId={id} />
```

### Use Individual Widgets
```tsx
import WatchlistWidget from "@/components/trading/WatchlistWidget";
import DOMWidget from "@/components/trading/DOMWidget";
import NewsWidget from "@/components/trading/NewsWidget";
import DetailsWidget from "@/components/trading/DetailsWidget";
import AccountManagerWidget from "@/components/trading/AccountManagerWidget";
```

## 📊 Available Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **TradingViewTerminal** | Full trading platform with all widgets | `components/trading/TradingViewTerminal.tsx` |
| **WatchlistWidget** | Symbol watchlist & quick switching | `components/trading/WatchlistWidget.tsx` |
| **DOMWidget** | Depth of Market (bid/ask ladder) | `components/trading/DOMWidget.tsx` |
| **DetailsWidget** | Symbol info (prices, OHLC, volume) | `components/trading/DetailsWidget.tsx` |
| **NewsWidget** | Market news & economic calendar | `components/trading/NewsWidget.tsx` |
| **AccountManagerWidget** | Positions, orders, account stats | `components/trading/AccountManagerWidget.tsx` |
| **TVChart** | Advanced Charts (existing) | `components/trading/TVChart.tsx` |

## 🔌 API Integration

### Broker API
- Location: `lib/tradingviewBrokerAPI.ts`
- Class: `TradeArenaBrokerAPI`
- Methods:
  - `accountsMetainfo()` - List accounts
  - `getAccountState()` - Balance, margin, equity
  - `positions()` - Open positions
  - `orders()` - Open orders
  - `placeOrder()` - Submit order
  - `modifyOrder()` - Update order
  - `cancelOrder()` - Cancel order
  - `closePosition()` - Close position
  - `reversePosition()` - Flip position

### Datafeed API
- Location: `lib/tradingviewDatafeed.ts`
- Methods:
  - `onReady()` - Server time, timezone
  - `resolveSymbol()` - Symbol resolution
  - `getBars()` - Historical candles
  - `getQuotes()` - Bid/ask prices
  - `subscribe()` - Real-time streaming

## 🎨 Features

### TradingViewTerminal Features
- ✅ Full-screen professional chart
- ✅ All drawing tools & indicators
- ✅ Multiple synchronized layouts
- ✅ Integrated Account Manager
- ✅ Watchlist with multi-symbol tracking
- ✅ Depth of Market (DOM) widget
- ✅ Symbol Details widget
- ✅ News & Economic Calendar
- ✅ Advanced Order Ticket (brackets, trailing stops)
- ✅ Buy/Sell buttons & lines on chart
- ✅ Real-time price updates
- ✅ Order & position management

## 🛠️ Configuration

### Enable/Disable Features
```tsx
disabled_features: [
  "use_localstorage_for_settings",
  "header_fullscreen_button"
]

enabled_features: [
  "study_templates",
  "dom_widget",
  "trading_terminal"
]
```

### Widget Bar
```tsx
widgetbar: {
  details: true,        // Symbol details
  news: true,           // News feed
  watchlist: true,      // Watchlist
  datawindow: true,     // Data window
  watchlist_settings: {
    default_symbols: ["EURUSD", "GBPUSD"]
  }
}
```

### Broker Config
```tsx
broker_config: {
  configFlags: {
    supportClosePosition: true,
    supportOrderBrackets: true,
    supportMarketBrackets: true,
    supportLevel2Data: true,
    supportModifyOrder: true
  },
  durations: [
    { name: 'DAY', value: 'DAY' },
    { name: 'GTC', value: 'GTC' },
    { name: 'IOC', value: 'IOC' }
  ]
}
```

## 📍 Routes

### Custom Trading UI (existing)
```
GET /trading?symbol=EURUSD
```

### TradingView Terminal (new)
```
GET /trading-tv?symbol=EURUSD
```

## 🔄 Data Flow

```
TradingView Widget
    ├── Datafeed
    │   ├── getBars() → Historical candles from DB
    │   ├── getQuotes() → Current bid/ask prices
    │   └── subscribe() → Real-time streaming
    │
    ├── Broker API
    │   ├── accountsMetainfo() → Account list
    │   ├── getAccountState() → Balance & margin
    │   ├── positions() → Open positions
    │   ├── orders() → Open orders
    │   └── placeOrder() → Order submission
    │
    └── Widget Bar
        ├── Watchlist
        ├── Details
        ├── News
        └── Data Window
```

## 💾 Database Integration

### Tables Used
- `trading_accounts` - Account info
- `positions` - Open/closed positions
- `orders` - Order history
- `candles` - OHLC data
- `quotes` - Real-time prices

### Queries
```sql
-- Get account state
SELECT * FROM trading_accounts WHERE id = ?

-- Get open positions
SELECT * FROM positions WHERE account_id = ? AND is_open = true

-- Get open orders
SELECT * FROM orders WHERE account_id = ? AND state IN ('new', 'working')

-- Get historical candles
SELECT * FROM candles WHERE symbol = ? AND timeframe = ? ORDER BY time DESC LIMIT 100
```

## 🐛 Common Issues & Solutions

### Issue: "TradingView is not defined"
**Solution**: Script loads asynchronously. Wait for `window.TradingView?.widget` to be available.

### Issue: Orders not showing in Account Manager
**Solution**: Broker API must return `Promise` objects, not plain objects.

```tsx
// CORRECT
orders: (accountId) => broker.orders(accountId).then(orders => ({ orders }))

// INCORRECT
orders: (accountId) => ({ orders: [] })
```

### Issue: Chart not updating on symbol change
**Solution**: Ensure datafeed `resolveSymbol()` properly resolves the new symbol.

### Issue: Real-time prices not updating
**Solution**: Implement `subscribe()` method in datafeed with proper WebSocket/Supabase integration.

## 📚 Resources

- **TradingView Docs**: https://www.tradingview.com/charting-library-docs/
- **Demo**: https://trading-terminal.tradingview-widget.com/
- **Platform Files**: `/trading_platform-master`
- **Integration Guide**: `TRADINGVIEW_INTEGRATION.md`

## 🎯 Implementation Checklist

- [ ] Review TradingView documentation
- [ ] Test TradingViewTerminal at `/trading-tv`
- [ ] Configure datafeed with real data
- [ ] Implement broker API methods
- [ ] Test order placement
- [ ] Test position management
- [ ] Test real-time price updates
- [ ] Customize widget bar
- [ ] Add custom styling
- [ ] Deploy to production

## 🚀 Next Steps

1. **Immediate**: Test the `/trading-tv` route
2. **Short-term**: Integrate with backend trading engine (CFD OMS)
3. **Medium-term**: Implement full datafeed with streaming
4. **Long-term**: Add custom overlays and indicators

---

**Last Updated**: January 13, 2026
