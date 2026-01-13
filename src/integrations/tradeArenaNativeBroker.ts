/**
 * TradeArena Broker API for Native TradingView Platform
 * Connects trading.html to Supabase backend
 */

import { supabase } from '@/integrations/supabase/client';

export interface TradeArenaConfig {
  userId: string;
  userEmail: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export class TradeArenaNativeBroker {
  private config: TradeArenaConfig;

  constructor(config: TradeArenaConfig) {
    this.config = config;
  }

  /**
   * Get account metadata
   */
  async accountsMetainfo() {
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('user_id', this.config.userId)
        .single();

      if (error) throw error;

      return [
        {
          id: data?.id || 'account_1',
          name: 'TradeArena Trading Account',
          currency: 'USD',
          currencySign: '$',
          brokerName: 'TradeArena',
          accountType: 'demo',
          paperTrading: true,
        },
      ];
    } catch (error) {
      console.error('Error fetching account info:', error);
      return [];
    }
  }

  /**
   * Get account state (balance, equity, margin)
   */
  async getAccountState(accountId: string) {
    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', this.config.userId)
        .single();

      if (error) throw error;

      return {
        balance: data?.balance || 10000000,
        equity: data?.equity || 10000000,
        pl: (data?.equity || 10000000) - (data?.balance || 10000000),
        usedMargin: 0,
        freeMargin: data?.balance || 10000000,
        marginLevel: 100,
      };
    } catch (error) {
      console.error('Error fetching account state:', error);
      return {
        balance: 10000000,
        equity: 10000000,
        pl: 0,
        usedMargin: 0,
        freeMargin: 10000000,
        marginLevel: 100,
      };
    }
  }

  /**
   * Get open positions
   */
  async getPositions(accountId: string) {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', this.config.userId)
        .eq('status', 'open');

      if (error) throw error;

      return (data || []).map((pos: any, idx: number) => ({
        id: String(idx + 1),
        contractId: pos.symbol,
        side: pos.side === 'BUY' ? 1 : -1, // 1 for BUY, -1 for SELL
        qty: pos.quantity,
        avg_price: pos.average_price,
        current_price: pos.current_price,
        pnl: pos.pnl,
        pnlPercent: (pos.pnl / (pos.average_price * pos.quantity)) * 100,
        tradeid: String(idx + 1),
      }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  /**
   * Get open orders
   */
  async getOrders(accountId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', this.config.userId)
        .neq('status', 'closed');

      if (error) throw error;

      return (data || []).map((order: any, idx: number) => ({
        id: String(idx + 1),
        contractId: order.symbol,
        side: order.side === 'BUY' ? 1 : -1,
        qty: order.quantity,
        type: this.mapOrderType(order.order_type),
        status: this.mapOrderStatus(order.status),
        limitPrice: order.price,
        stopPrice: undefined,
        parentId: undefined,
        parentType: undefined,
        avgPrice: order.price,
        filledQty: 0,
        commission: 0,
        update_time_ms: new Date(order.updated_at).getTime(),
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  /**
   * Place order
   */
  async placeOrder(accountId: string, preOrder: any, parentId?: string) {
    try {
      const orderData = {
        user_id: this.config.userId,
        symbol: preOrder.instrument?.ticker || preOrder.symbol,
        side: preOrder.side === 1 ? 'BUY' : 'SELL',
        quantity: preOrder.qty,
        price: preOrder.limitPrice || preOrder.stopPrice || 0,
        order_type: this.mapOrderTypeToString(preOrder.type),
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        orderId: data.id,
      };
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  /**
   * Modify order
   */
  async modifyOrder(accountId: string, orderId: string, preOrder: any) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          quantity: preOrder.qty,
          price: preOrder.limitPrice || preOrder.stopPrice || 0,
          updated_at: new Date(),
        })
        .eq('id', orderId)
        .eq('user_id', this.config.userId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        orderId: data.id,
      };
    } catch (error) {
      console.error('Error modifying order:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(accountId: string, orderId: string) {
    try {
      await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date() })
        .eq('id', orderId)
        .eq('user_id', this.config.userId);
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Close position
   */
  async closePosition(accountId: string, positionId: string) {
    try {
      await supabase
        .from('positions')
        .update({ status: 'closed', updated_at: new Date() })
        .eq('id', positionId)
        .eq('user_id', this.config.userId);
    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  /**
   * Reverse position
   */
  async reversePosition(accountId: string, positionId: string) {
    try {
      const { data: position, error: fetchError } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (fetchError) throw fetchError;

      const reverseSide = position.side === 'BUY' ? 'SELL' : 'BUY';

      await supabase
        .from('positions')
        .update({
          side: reverseSide,
          updated_at: new Date(),
        })
        .eq('id', positionId);
    } catch (error) {
      console.error('Error reversing position:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private mapOrderType(typeStr: string): number {
    const typeMap: { [key: string]: number } = {
      'MARKET': 1,
      'LIMIT': 2,
      'STOP': 3,
      'STOP_LIMIT': 4,
    };
    return typeMap[typeStr] || 1;
  }

  private mapOrderTypeToString(type: number): string {
    const typeMap: { [key: number]: string } = {
      1: 'MARKET',
      2: 'LIMIT',
      3: 'STOP',
      4: 'STOP_LIMIT',
    };
    return typeMap[type] || 'MARKET';
  }

  private mapOrderStatus(statusStr: string): number {
    const statusMap: { [key: string]: number } = {
      'pending': 0,
      'working': 1,
      'filled': 2,
      'cancelled': 3,
      'rejected': 4,
    };
    return statusMap[statusStr] || 1;
  }
}

/**
 * Initialize broker connection with user context
 */
export function initializeTradeArenaBroker(config: TradeArenaConfig) {
  const broker = new TradeArenaNativeBroker(config);

  // Make broker factory available globally for TradingView
  if (typeof window !== 'undefined') {
    window.TradeArenaBroker = {
      create: (host: any, datafeed: any) => {
        // Wrapper for TradingView's broker API
        return {
          accountsMetainfo: () => broker.accountsMetainfo(),
          getAccountState: (accountId: string) => broker.getAccountState(accountId),
          getPositions: (accountId: string) => broker.getPositions(accountId),
          getOrders: (accountId: string) => broker.getOrders(accountId),
          placeOrder: (accountId: string, preOrder: any, parentId?: string) =>
            broker.placeOrder(accountId, preOrder, parentId),
          modifyOrder: (accountId: string, orderId: string, preOrder: any) =>
            broker.modifyOrder(accountId, orderId, preOrder),
          cancelOrder: (accountId: string, orderId: string) =>
            broker.cancelOrder(accountId, orderId),
          closePosition: (accountId: string, positionId: string) =>
            broker.closePosition(accountId, positionId),
          reversePosition: (accountId: string, positionId: string) =>
            broker.reversePosition(accountId, positionId),
        };
      },
    };
  }

  return broker;
}

export default TradeArenaNativeBroker;
