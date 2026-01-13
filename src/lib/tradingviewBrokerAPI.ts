/**
 * TradingView Broker API Implementation
 * 
 * This module implements the TradingView Broker API interface for trading operations.
 * It connects the TradingView UI with your backend order management system.
 * 
 * Full documentation: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/#broker-api
 */

import { supabase } from "@/integrations/supabase/client";

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
    try {
      const { data: account } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("id", this.accountId)
        .single();

      if (!account) {
        return [];
      }

      return [
        {
          id: account.id,
          name: account.name || "Trading Account",
          currency: "USD",
          type: "real", // or 'demo'
        },
      ];
    } catch (error) {
      console.error("[BrokerAPI] accountsMetainfo error:", error);
      return [];
    }
  }

  /**
   * Get account state: balance, margin, equity, etc.
   */
  async getAccountState(accountId: string) {
    try {
      const { data: account } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("id", accountId)
        .single();

      if (!account) {
        throw new Error("Account not found");
      }

      // Calculate margin stats from positions
      let usedMargin = 0;
      let unrealizedPnL = 0;

      const { data: positions } = await supabase
        .from("positions")
        .select("*")
        .eq("account_id", accountId)
        .eq("is_open", true);

      if (positions) {
        for (const pos of positions) {
          // Calculate used margin for this position
          const notional = Math.abs(pos.units) * pos.contract_size;
          const positionMargin = notional / pos.leverage;
          usedMargin += positionMargin;

          // Calculate unrealized PnL
          const currentPrice = pos.current_bid || pos.current_ask || pos.avg_open_price;
          if (pos.units > 0) {
            unrealizedPnL += pos.units * (currentPrice - pos.avg_open_price);
          } else if (pos.units < 0) {
            unrealizedPnL += pos.units * (pos.avg_open_price - currentPrice);
          }
        }
      }

      const equity = account.balance + unrealizedPnL;
      const freeMargin = equity - usedMargin;
      const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 999;

      return {
        accountId: account.id,
        balance: account.balance,
        equity: equity,
        realizedPnL: account.realized_pnl || 0,
        unrealizedPnL: unrealizedPnL,
        usedMargin: usedMargin,
        freeMargin: freeMargin,
        marginLevel: marginLevel,
      };
    } catch (error) {
      console.error("[BrokerAPI] getAccountState error:", error);
      throw error;
    }
  }

  /**
   * Get list of open positions
   */
  async positions(accountId: string): Promise<Position[]> {
    try {
      const { data: positions } = await supabase
        .from("positions")
        .select("*")
        .eq("account_id", accountId)
        .eq("is_open", true);

      if (!positions) return [];

      return positions.map((p: any) => ({
        id: p.id,
        symbol: p.symbol,
        qty: p.units > 0 ? p.units : -p.units, // absolute qty
        side: p.units > 0 ? "buy" : "sell",
        avgPrice: p.avg_open_price,
        realizedPnL: p.realized_pnl || 0,
        unrealizedPnL: p.unrealized_pnl || 0,
        contractSize: p.contract_size,
      }));
    } catch (error) {
      console.error("[BrokerAPI] positions error:", error);
      return [];
    }
  }

  /**
   * Get list of open orders
   */
  async orders(accountId: string): Promise<Order[]> {
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("account_id", accountId)
        .in("state", ["new", "working", "partial"]);

      if (!orders) return [];

      return orders.map((o: any) => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side === "buy" ? "buy" : "sell",
        qty: o.size,
        price: o.limit_price || o.stop_price,
        stopPrice: o.stop_price,
        takeProfit: o.take_profit,
        stopLoss: o.stop_loss,
        type: o.type,
        status: o.state,
        filledQty: o.filled_size || 0,
        avgFillPrice: o.avg_fill_price || 0,
        createdAt: new Date(o.created_at),
        updatedAt: new Date(o.updated_at),
      }));
    } catch (error) {
      console.error("[BrokerAPI] orders error:", error);
      return [];
    }
  }

  /**
   * Place a new order
   */
  async placeOrder(order: any): Promise<{ orderId: string; status: string }> {
    try {
      console.log("[BrokerAPI] Placing order:", order);

      // Validate order parameters
      if (!order.symbol || !order.quantity) {
        throw new Error("Invalid order: missing symbol or quantity");
      }

      // Insert order into database
      const { data: newOrder, error } = await supabase
        .from("orders")
        .insert({
          account_id: this.accountId,
          symbol: order.symbol,
          type: order.ordertype || "market", // market, limit, stop
          side: order.side || "buy",
          size: order.quantity,
          limit_price: order.limitPrice || null,
          stop_price: order.stopPrice || null,
          stop_loss: order.stopLoss || null,
          take_profit: order.takeProfit || null,
          state: "new",
          filled_size: 0,
          avg_fill_price: 0,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        orderId: newOrder.id,
        status: "accepted",
      };
    } catch (error) {
      console.error("[BrokerAPI] placeOrder error:", error);
      throw error;
    }
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(orderId: string, modifications: any): Promise<boolean> {
    try {
      console.log("[BrokerAPI] Modifying order:", orderId, modifications);

      const { error } = await supabase
        .from("orders")
        .update({
          limit_price: modifications.limitPrice,
          stop_price: modifications.stopPrice,
          stop_loss: modifications.stopLoss,
          take_profit: modifications.takeProfit,
          size: modifications.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("[BrokerAPI] modifyOrder error:", error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      console.log("[BrokerAPI] Canceling order:", orderId);

      const { error } = await supabase
        .from("orders")
        .update({
          state: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("[BrokerAPI] cancelOrder error:", error);
      throw error;
    }
  }

  /**
   * Close a position (flat it out)
   */
  async closePosition(positionId: string): Promise<boolean> {
    try {
      console.log("[BrokerAPI] Closing position:", positionId);

      const { data: position } = await supabase
        .from("positions")
        .select("*")
        .eq("id", positionId)
        .single();

      if (!position || !position.is_open) {
        throw new Error("Position not found or already closed");
      }

      // Create market order to close
      const closeQty = Math.abs(position.units);
      const closeSide = position.units > 0 ? "sell" : "buy";

      const { error } = await supabase
        .from("orders")
        .insert({
          account_id: this.accountId,
          symbol: position.symbol,
          type: "market",
          side: closeSide,
          size: closeQty,
          state: "new",
          filled_size: 0,
          avg_fill_price: 0,
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("[BrokerAPI] closePosition error:", error);
      throw error;
    }
  }

  /**
   * Reverse/flip a position (close + open opposite)
   */
  async reversePosition(positionId: string): Promise<boolean> {
    try {
      console.log("[BrokerAPI] Reversing position:", positionId);

      const { data: position } = await supabase
        .from("positions")
        .select("*")
        .eq("id", positionId)
        .single();

      if (!position || !position.is_open) {
        throw new Error("Position not found or already closed");
      }

      const qty = Math.abs(position.units);
      const newSide = position.units > 0 ? "sell" : "buy";
      const reverseQty = qty * 2; // Close current + open opposite

      const { error } = await supabase
        .from("orders")
        .insert({
          account_id: this.accountId,
          symbol: position.symbol,
          type: "market",
          side: newSide,
          size: reverseQty,
          state: "new",
          filled_size: 0,
          avg_fill_price: 0,
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("[BrokerAPI] reversePosition error:", error);
      throw error;
    }
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
