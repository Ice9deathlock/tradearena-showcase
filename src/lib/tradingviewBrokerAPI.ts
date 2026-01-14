/**
 * TradingView Broker API Implementation
 * 
 * This module implements the TradingView Broker API interface for trading operations.
 * It connects the TradingView UI with your backend order management system.
 * 
 * Full documentation: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/#broker-api
 */

/**
 * Account information structure
 */
export interface Account {
  id: string;
  name: string;
  currency: string;
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
}

/**
 * Position structure
 */
export interface Position {
  id: string;
  symbol: string;
  qty: number;
  avgPrice: number;
  side: "buy" | "sell";
  realizedPnL: number;
  unrealizedPnL: number;
  contractSize: number;
}

/**
 * Order structure
 */
export interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price?: number;
  stopPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  type: "market" | "limit" | "stop";
  status: "new" | "working" | "partial" | "filled" | "canceled" | "rejected";
  filledQty: number;
  avgFillPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trade (closed position) structure
 */
export interface Trade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnL: number;
  duration: number; // milliseconds
  enteredAt: Date;
  exitedAt: Date;
}

/**
 * Broker Demo Implementation
 * Implements all required methods of the TradingView Broker API
 */
export class TradeArenaBrokerAPI {
  private accountId: string;
  private host: any;

  constructor(accountId: string, host: any) {
    this.accountId = accountId;
    this.host = host;
  }

  /**
   * Returns account metadata and list of available accounts
   */
  async accountsMetainfo() {
    return [
      {
        id: this.accountId,
        name: "TradeArena Trading Account",
        currency: "USD",
        type: "demo",
      },
    ];
  }

  /**
   * Get account state: balance, margin, equity, etc.
   */
  async getAccountState(accountId: string) {
    return {
      accountId: accountId,
      balance: 10000000,
      equity: 10000000,
      realizedPnL: 0,
      unrealizedPnL: 0,
      usedMargin: 0,
      freeMargin: 10000000,
      marginLevel: 100,
    };
  }

  /**
   * Get list of open positions
   */
  async positions(accountId: string): Promise<Position[]> {
    return [];
  }

  /**
   * Get list of open orders
   */
  async orders(accountId: string): Promise<Order[]> {
    return [];
  }

  /**
   * Place a new order
   */
  async placeOrder(order: any): Promise<{ orderId: string; status: string }> {
    return {
      orderId: String(Date.now()),
      status: "working",
    };
  }


  /**
   * Modify an existing order
   */
  async modifyOrder(orderId: string, modifications: any): Promise<boolean> {
    return true;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    return true;
  }

  /**
   * Close a position (flat it out)
   */
  async closePosition(positionId: string): Promise<boolean> {
    return true;
  }

  /**
   * Reverse/flip a position (close + open opposite)
   */
  async reversePosition(positionId: string): Promise<boolean> {
    return true;
  }
}

/**
 * Create a broker factory function for TradingView
 * Usage in widget constructor:
 *   broker_factory: createBrokerFactory(accountId)
 */
export function createBrokerFactory(accountId: string) {
  return function (host: any) {
    const broker = new TradeArenaBrokerAPI(accountId, host);

    return {
      /**
       * Required method: Get accounts metadata
       */
      accountsMetainfo: () => broker.accountsMetainfo(),

      /**
       * Required method: Get account state
       */
      getAccountState: (accountId: string) => broker.getAccountState(accountId),

      /**
       * Required method: Get positions
       */
      positions: (accountId: string) =>
        broker.positions(accountId).then((positions) => ({
          positions: positions,
        })),

      /**
       * Required method: Get orders
       */
      orders: (accountId: string) =>
        broker.orders(accountId).then((orders) => ({
          orders: orders,
        })),

      /**
       * Required method: Place order
       */
      placeOrder: (order: any) => broker.placeOrder(order),

      /**
       * Required method: Modify order
       */
      modifyOrder: (orderId: string, modifications: any) =>
        broker.modifyOrder(orderId, modifications),

      /**
       * Required method: Cancel order
       */
      cancelOrder: (orderId: string) => broker.cancelOrder(orderId),

      /**
       * Optional method: Close position
       */
      closePosition: (positionId: string) => broker.closePosition(positionId),

      /**
       * Optional method: Reverse position
       */
      reversePosition: (positionId: string) =>
        broker.reversePosition(positionId),
    };
  };
}

export default TradeArenaBrokerAPI;
