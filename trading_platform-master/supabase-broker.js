/**
 * TradeArena Supabase Broker
 * Connects TradingView Trading Terminal to Supabase backend
 */

class SupabaseBroker {
  constructor(host, datafeed, config) {
    this.host = host;
    this.datafeed = datafeed;
    this.config = config || {};
    this.accountId = null;
    this.participantId = null;
    this.competitionId = null;
    this.supabaseUrl = config.supabaseUrl || '';
    this.supabaseKey = config.supabaseKey || '';
    this.userId = config.userId || '';

    // Cache for account data
    this._accountState = null;
    this._positions = [];
    this._orders = [];
    this._quoteSubscriptions = new Set();
    this._quoteIntervalId = null;

    console.log('[SupabaseBroker] Initialized with config:', {
      userId: this.userId,
      supabaseUrl: this.supabaseUrl ? 'SET' : 'NOT SET'
    });

    // Start pushing quote updates to TradingView
    this._startQuoteUpdates();

    // Notify TradingView that broker is connected
    setTimeout(() => {
      if (this.host && this.host.connectionStatusUpdate) {
        this.host.connectionStatusUpdate(1); // 1 = Connected
        console.log('[SupabaseBroker] Connection status: Connected');
      }
    }, 100);
  }

  // Connection status - required by TradingView
  connectionStatus() {
    return 1; // 1 = Connected
  }

  // Check if symbol is tradable
  isTradable(symbol) {
    console.log('[SupabaseBroker] isTradable check for:', symbol);
    return Promise.resolve(true);
  }

  // Push quote updates to TradingView host
  _startQuoteUpdates() {
    const self = this;
    const symbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];

    console.log('[SupabaseBroker] Starting quote updates for Trading Terminal');

    // Push quotes every second
    this._quoteIntervalId = setInterval(function() {
      const quotes = [];

      for (const symbol of symbols) {
        let quote = null;

        // Get quote from PRICE_DATA
        if (window.PRICE_DATA && window.PRICE_DATA[symbol]) {
          const pd = window.PRICE_DATA[symbol];
          if (pd.bid && pd.ask) {
            quote = {
              s: 'ok',
              n: symbol,
              v: {
                ask: pd.ask,
                bid: pd.bid,
                lp: pd.mid || (pd.bid + pd.ask) / 2,
                ch: 0,
                chp: 0,
                spread: pd.ask - pd.bid
              }
            };
          }
        }

        if (quote) {
          quotes.push(quote);
        }
      }

      // Push to TradingView
      if (quotes.length > 0 && self.host && self.host.quotesUpdate) {
        self.host.quotesUpdate(quotes);
        // Log first update only
        if (!self._quotesStarted) {
          console.log('[SupabaseBroker] Quote updates started, pushing', quotes.length, 'symbols');
          self._quotesStarted = true;
        }
      }
    }, 1000);
  }

  // Subscribe to quotes for a symbol (called by TradingView)
  subscribeQuotes(symbols) {
    symbols.forEach(s => this._quoteSubscriptions.add(s));
    console.log('[SupabaseBroker] Subscribed to quotes:', symbols);
  }

  // Unsubscribe from quotes
  unsubscribeQuotes(symbols) {
    symbols.forEach(s => this._quoteSubscriptions.delete(s));
    console.log('[SupabaseBroker] Unsubscribed from quotes:', symbols);
  }

  // Get quotes - called by TradingView for order panel
  getQuotes(symbols) {
    console.log('[SupabaseBroker] getQuotes called for:', symbols);
    const results = [];

    for (const symbol of symbols) {
      if (window.PRICE_DATA && window.PRICE_DATA[symbol]) {
        const pd = window.PRICE_DATA[symbol];
        if (pd.bid && pd.ask) {
          results.push({
            s: 'ok',
            n: symbol,
            v: {
              ask: pd.ask,
              bid: pd.bid,
              lp: pd.mid || (pd.bid + pd.ask) / 2,
              ch: 0,
              chp: 0,
              spread: pd.ask - pd.bid,
              short_name: symbol,
              description: symbol
            }
          });
          console.log(`[SupabaseBroker] Quote for ${symbol}: Bid=$${pd.bid.toFixed(2)}, Ask=$${pd.ask.toFixed(2)}`);
        }
      }
    }

    return results;
  }

  // Get current symbol quote - for order execution
  getCurrentQuote(symbol) {
    if (window.PRICE_DATA && window.PRICE_DATA[symbol]) {
      const pd = window.PRICE_DATA[symbol];
      return {
        bid: pd.bid,
        ask: pd.ask,
        mid: pd.mid || (pd.bid + pd.ask) / 2,
        spread: pd.ask - pd.bid
      };
    }
    return null;
  }

  // Subscribe to DOM (Depth of Market) data - required for Level2 data support
  subscribeDOME(symbol, callback, guid) {
    console.log('[SupabaseBroker] subscribeDOME called for:', symbol);
    const self = this;

    // Generate DOM data from quotes
    function generateDOMData() {
      const quote = self.getCurrentQuote(symbol);
      if (!quote) return;

      const mid = (quote.bid + quote.ask) / 2;
      const spread = quote.ask - quote.bid;
      const tickSize = mid > 1000 ? 1 : 0.01;

      // Generate synthetic order book with 5 levels
      const bids = [];
      const asks = [];

      for (let i = 0; i < 5; i++) {
        const bidPrice = quote.bid - (i * tickSize);
        const askPrice = quote.ask + (i * tickSize);
        const size = Math.floor(Math.random() * 100) + 10;

        bids.push({
          price: bidPrice,
          volume: size
        });
        asks.push({
          price: askPrice,
          volume: size
        });
      }

      callback({
        snapshot: true,
        bids: bids,
        asks: asks
      });
    }

    // Update immediately
    generateDOMData();

    // Then update every second
    const intervalId = setInterval(generateDOMData, 1000);
    this._subscribers = this._subscribers || {};
    this._subscribers[guid] = intervalId;

    console.log('[SupabaseBroker] DOM subscription started for:', symbol);
  }

  // Unsubscribe from DOM data
  unsubscribeDOME(guid) {
    if (this._subscribers && this._subscribers[guid]) {
      clearInterval(this._subscribers[guid]);
      delete this._subscribers[guid];
      console.log('[SupabaseBroker] DOM unsubscribed:', guid);
    }
  }

  // Helper to make Supabase REST API calls
  async supabaseRequest(endpoint, options = {}) {
    const url = `${this.supabaseUrl}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': this.supabaseKey,
      'Authorization': `Bearer ${this.supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    };

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[SupabaseBroker] API Error:', error);
      throw new Error(error);
    }

    return response.json();
  }

  // Call Edge Function
  async callEdgeFunction(functionName, body, accessToken) {
    const url = `${this.supabaseUrl}/functions/v1/${functionName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken || this.supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Edge function failed');
    }
    return data;
  }

  // Load user's active competition account
  async loadUserAccount() {
    if (!this.userId) {
      console.warn('[SupabaseBroker] No userId set');
      return this._getDefaultAccountState();
    }

    if (!this.supabaseUrl || !this.supabaseKey) {
      console.warn('[SupabaseBroker] Supabase credentials not set');
      return this._getDefaultAccountState();
    }

    try {
      console.log('[SupabaseBroker] Loading account for user:', this.userId);

      // Get user's active participation with account
      const participations = await this.supabaseRequest(
        `competition_participants?user_id=eq.${this.userId}&status=eq.active&select=id,competition_id,accounts(*)`
      );

      console.log('[SupabaseBroker] Participations found:', participations);

      if (participations && participations.length > 0) {
        const participation = participations[0];
        this.participantId = participation.id;
        this.competitionId = participation.competition_id;

        const account = Array.isArray(participation.accounts)
          ? participation.accounts[0]
          : participation.accounts;

        if (account) {
          this.accountId = account.id;
          this._accountState = {
            balance: parseFloat(account.balance) || 100000,
            equity: parseFloat(account.equity) || 100000,
            pl: parseFloat(account.equity) - parseFloat(account.balance),
            usedMargin: parseFloat(account.used_margin) || 0,
            freeMargin: parseFloat(account.equity) - parseFloat(account.used_margin),
            marginLevel: account.used_margin > 0
              ? (parseFloat(account.equity) / parseFloat(account.used_margin)) * 100
              : 100
          };
          console.log('[SupabaseBroker] Loaded account:', this.accountId, this._accountState);
          return this._accountState;
        }
      }

      console.warn('[SupabaseBroker] No active participation found');
      return this._getDefaultAccountState();
    } catch (error) {
      console.error('[SupabaseBroker] Failed to load account:', error);
      return this._getDefaultAccountState();
    }
  }

  _getDefaultAccountState() {
    return {
      balance: 100000,
      equity: 100000,
      pl: 0,
      usedMargin: 0,
      freeMargin: 100000,
      marginLevel: 100
    };
  }

  // Required: Account metadata
  async accountsMetainfo() {
    await this.loadUserAccount();

    return [{
      id: this.accountId || 'demo_account',
      name: 'TradeArena Competition Account',
      currency: 'USD',
      currencySign: '$',
    }];
  }

  // Required: Account state (balance, equity, margin)
  async accountInfo(accountId) {
    if (!this._accountState) {
      await this.loadUserAccount();
    }

    return this._accountState || {
      balance: 100000,
      equity: 100000,
      pl: 0,
      usedMargin: 0,
      freeMargin: 100000,
      marginLevel: 100
    };
  }

  // Required: Get positions
  async positions(accountId) {
    if (!this.accountId) {
      return [];
    }

    try {
      const positions = await this.supabaseRequest(
        `positions?account_id=eq.${this.accountId}&status=eq.open&select=*,instruments(symbol,tv_symbol)`
      );

      this._positions = (positions || []).map(p => ({
        id: p.id,
        symbol: p.instruments?.symbol || p.instrument_id,
        qty: parseFloat(p.quantity),
        side: p.side === 'buy' ? 1 : -1,
        avgPrice: parseFloat(p.entry_price),
        pl: parseFloat(p.unrealized_pnl) || 0,
        stopLoss: p.stop_loss ? parseFloat(p.stop_loss) : undefined,
        takeProfit: p.take_profit ? parseFloat(p.take_profit) : undefined
      }));

      console.log('[SupabaseBroker] Loaded positions:', this._positions.length);
      return this._positions;
    } catch (error) {
      console.error('[SupabaseBroker] Failed to load positions:', error);
      return [];
    }
  }

  // Required: Get orders
  async orders(accountId) {
    if (!this.accountId) {
      return [];
    }

    try {
      const orders = await this.supabaseRequest(
        `orders?account_id=eq.${this.accountId}&status=eq.pending&select=*,instruments(symbol)`
      );

      this._orders = (orders || []).map(o => ({
        id: o.id,
        symbol: o.instruments?.symbol || o.instrument_id,
        qty: parseFloat(o.quantity),
        side: o.side === 'buy' ? 1 : -1,
        type: o.order_type === 'market' ? 1 : (o.order_type === 'limit' ? 2 : 3),
        status: 6, // Working
        limitPrice: o.requested_price ? parseFloat(o.requested_price) : undefined,
        stopPrice: o.stop_loss ? parseFloat(o.stop_loss) : undefined
      }));

      return this._orders;
    } catch (error) {
      console.error('[SupabaseBroker] Failed to load orders:', error);
      return [];
    }
  }

  // Required: Place order
  async placeOrder(preOrder) {
    console.log('[SupabaseBroker] Placing order:', preOrder);

    if (!this.accountId) {
      throw new Error('No trading account found. Please join a competition first.');
    }

    try {
      // Get instrument ID from symbol
      const instruments = await this.supabaseRequest(
        `instruments?symbol=eq.${preOrder.symbol}&select=id`
      );

      if (!instruments || instruments.length === 0) {
        throw new Error(`Instrument not found: ${preOrder.symbol}`);
      }

      const instrumentId = instruments[0].id;

      // Get current price
      const quote = window.PRICE_DATA?.[preOrder.symbol];
      const executionPrice = preOrder.side === 1 ? quote?.ask : quote?.bid;

      // Call Edge Function to place order
      const result = await this.callEdgeFunction('place-order', {
        competition_id: this.competitionId,
        account_id: this.accountId,
        instrument_id: instrumentId,
        side: preOrder.side === 1 ? 'buy' : 'sell',
        order_type: 'market',
        quantity: preOrder.qty,
        client_price: executionPrice,
        stop_loss: preOrder.stopLoss,
        take_profit: preOrder.takeProfit,
        leverage: preOrder.leverage || 1
      });

      console.log('[SupabaseBroker] Order placed:', result);

      // Notify host of the new order/position
      if (this.host && this.host.positionUpdate) {
        this.host.positionUpdate({
          id: result.position_id || result.order_id,
          symbol: preOrder.symbol,
          qty: preOrder.qty,
          side: preOrder.side,
          avgPrice: executionPrice
        });
      }

      return {
        orderId: result.order_id || result.position_id,
        status: 'filled'
      };
    } catch (error) {
      console.error('[SupabaseBroker] Order failed:', error);
      throw error;
    }
  }

  // Required: Modify order
  async modifyOrder(orderId, modifications) {
    console.log('[SupabaseBroker] Modifying order:', orderId, modifications);
    // TODO: Implement order modification
    return true;
  }

  // Required: Cancel order
  async cancelOrder(orderId) {
    console.log('[SupabaseBroker] Canceling order:', orderId);

    try {
      await this.supabaseRequest(`orders?id=eq.${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' })
      });
      return true;
    } catch (error) {
      console.error('[SupabaseBroker] Cancel failed:', error);
      return false;
    }
  }

  // Optional: Close position
  async closePosition(positionId) {
    console.log('[SupabaseBroker] Closing position:', positionId);

    try {
      const result = await this.callEdgeFunction('close-position', {
        position_id: positionId
      });

      console.log('[SupabaseBroker] Position closed:', result);

      // Refresh account state
      await this.loadUserAccount();

      return true;
    } catch (error) {
      console.error('[SupabaseBroker] Close position failed:', error);
      return false;
    }
  }

  // Optional: Reverse position
  async reversePosition(positionId) {
    console.log('[SupabaseBroker] Reversing position:', positionId);
    // Close existing and open opposite
    const position = this._positions.find(p => p.id === positionId);
    if (position) {
      await this.closePosition(positionId);
      await this.placeOrder({
        symbol: position.symbol,
        qty: position.qty,
        side: position.side === 1 ? -1 : 1
      });
    }
    return true;
  }
}

// Factory function for TradingView
function createSupabaseBrokerFactory(config) {
  return function(host, datafeed) {
    const broker = new SupabaseBroker(host, datafeed, config);

    // Load account data immediately
    broker.loadUserAccount();

    return {
      accountsMetainfo: () => broker.accountsMetainfo(),
      accountInfo: (accountId) => broker.accountInfo(accountId),
      positions: (accountId) => broker.positions(accountId),
      orders: (accountId) => broker.orders(accountId),
      placeOrder: (order) => broker.placeOrder(order),
      modifyOrder: (orderId, mods) => broker.modifyOrder(orderId, mods),
      cancelOrder: (orderId) => broker.cancelOrder(orderId),
      closePosition: (posId) => broker.closePosition(posId),
      reversePosition: (posId) => broker.reversePosition(posId)
    };
  };
}

// Export for use in trading.html
window.SupabaseBroker = SupabaseBroker;
window.createSupabaseBrokerFactory = createSupabaseBrokerFactory;

console.log('[SupabaseBroker] Module loaded');
