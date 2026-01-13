import {
  AccountId,
  AccountMetainfo,
  AccountManagerInfo,
  AccountManagerSummaryField,
  Brackets,
  ConnectionStatus,
  Execution,
  IBrokerConnectionAdapterHost,
  InstrumentInfo,
  Order,
  OrderStatus,
  OrderType,
  ParentType,
  PlaceOrderResult,
  Position,
  PreOrder,
  Side,
  IWatchedValue,
} from '../trading_platform-master/charting_library/broker-api';

import { IDatafeedQuotesApi, QuoteData } from '../trading_platform-master/charting_library/datafeed-api';
import { supabase } from '@/integrations/supabase/client';

interface SimpleMap<TValue> {
  [key: string]: TValue;
}

interface OrderData {
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  orderType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PositionData {
  symbol: string;
  side: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  createdAt: string;
}

/**
 * TradeArena Broker API - Connects TradingView to TradeArena OMS
 */
export class TradeArenaBrokerAPI {
  private _host: IBrokerConnectionAdapterHost;
  private _datafeed: IDatafeedQuotesApi;
  private _idsCounter: number = 1;
  private _positions: Position[] = [];
  private _positionById: SimpleMap<Position> = {};
  private _orderById: SimpleMap<Order> = {};
  private _balanceValue: IWatchedValue<number>;
  private _equityValue: IWatchedValue<number>;
  private _accountManagerData = {
    title: 'TradeArena Demo Account',
    balance: 10000000,
    equity: 10000000,
    pl: 0,
  };

  constructor(host: IBrokerConnectionAdapterHost, datafeed: IDatafeedQuotesApi) {
    this._host = host;
    this._datafeed = datafeed;
    this._balanceValue = host.createWatchedValue(this._accountManagerData.balance);
    this._equityValue = host.createWatchedValue(this._accountManagerData.equity);
  }

  /**
   * Get account information
   */
  async accountsMetainfo(): Promise<AccountMetainfo[]> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { data: account, error } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      return [
        {
          id: account?.id || 'account_1' as AccountId,
          name: 'TradeArena Trading Account',
          currency: 'USD',
          currencySign: '$',
          brokerName: 'TradeArena OMS',
          accountType: 'demo',
          paperTrading: true,
        },
      ];
    } catch (error) {
      console.error('Error fetching account info:', error);
      return [
        {
          id: 'account_1' as AccountId,
          name: 'TradeArena Trading Account',
          currency: 'USD',
          currencySign: '$',
          brokerName: 'TradeArena OMS',
          accountType: 'demo',
          paperTrading: true,
        },
      ];
    }
  }

  /**
   * Get account state (balance, equity, margin)
   */
  async getAccountState(accountId: AccountId): Promise<any> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { data: walletData, error } = await supabase
        .from('user_wallets')
        .select('balance, equity')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      return {
        balance: walletData?.balance || 10000000,
        equity: walletData?.equity || 10000000,
        pl: (walletData?.equity || 10000000) - (walletData?.balance || 10000000),
        usedMargin: 0,
        freeMargin: walletData?.balance || 10000000,
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
  async getPositions(accountId: AccountId): Promise<Position[]> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { data: positions, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'open');

      if (error) throw error;

      return (positions || []).map((pos: PositionData, idx: number) => ({
        id: String(idx + 1),
        contractId: pos.symbol,
        side: pos.side === 'BUY' ? Side.Buy : Side.Sell,
        qty: pos.quantity,
        avg_price: pos.averagePrice,
        current_price: pos.currentPrice,
        pnl: pos.pnl,
        pnlPercent: (pos.pnl / (pos.averagePrice * pos.quantity)) * 100,
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
  async getOrders(accountId: AccountId): Promise<Order[]> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .neq('status', 'closed');

      if (error) throw error;

      return (orders || []).map((order: OrderData, idx: number) => ({
        id: String(idx + 1),
        contractId: order.symbol,
        side: order.side === 'BUY' ? Side.Buy : Side.Sell,
        qty: order.quantity,
        type: this._mapOrderType(order.orderType),
        status: this._mapOrderStatus(order.status),
        limitPrice: order.price,
        stopPrice: undefined,
        parentId: undefined,
        parentType: undefined,
        avgPrice: order.price,
        filledQty: 0,
        commission: 0,
        update_time_ms: new Date(order.updatedAt).getTime(),
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  /**
   * Place order
   */
  async placeOrder(
    accountId: AccountId,
    preOrder: PreOrder,
    parentId?: string,
    parentType?: ParentType
  ): Promise<PlaceOrderResult> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const orderData = {
        user_id: session.user.id,
        symbol: preOrder.instrument.ticker,
        side: preOrder.side === Side.Buy ? 'BUY' : 'SELL',
        quantity: preOrder.qty,
        price: preOrder.limitPrice || preOrder.stopPrice || 0,
        order_type: this._mapOrderTypeToString(preOrder.type),
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      return {
        id: newOrder.id,
        orderId: newOrder.id,
        status: OrderStatus.Working,
      };
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  /**
   * Modify order
   */
  async modifyOrder(
    accountId: AccountId,
    orderId: string,
    preOrder: PreOrder
  ): Promise<PlaceOrderResult> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update({
          quantity: preOrder.qty,
          price: preOrder.limitPrice || preOrder.stopPrice || 0,
          updated_at: new Date(),
        })
        .eq('id', orderId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: updatedOrder.id,
        orderId: updatedOrder.id,
        status: OrderStatus.Working,
      };
    } catch (error) {
      console.error('Error modifying order:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(accountId: AccountId, orderId: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date() })
        .eq('id', orderId)
        .eq('user_id', session.user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Close position
   */
  async closePosition(accountId: AccountId, positionId: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('positions')
        .update({ status: 'closed', updated_at: new Date() })
        .eq('id', positionId)
        .eq('user_id', session.user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  /**
   * Reverse position
   */
  async reversePosition(accountId: AccountId, positionId: string): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { data: position, error: fetchError } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (fetchError) throw fetchError;

      const reverseSide = position.side === 'BUY' ? 'SELL' : 'BUY';

      const { error: updateError } = await supabase
        .from('positions')
        .update({
          side: reverseSide,
          updated_at: new Date(),
        })
        .eq('id', positionId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error reversing position:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private _mapOrderType(typeStr: string): OrderType {
    const typeMap: { [key: string]: OrderType } = {
      'MARKET': OrderType.Market,
      'LIMIT': OrderType.Limit,
      'STOP': OrderType.Stop,
      'STOP_LIMIT': OrderType.StopLimit,
    };
    return typeMap[typeStr] || OrderType.Market;
  }

  private _mapOrderTypeToString(type: OrderType): string {
    const typeMap: { [key in OrderType]: string } = {
      [OrderType.Market]: 'MARKET',
      [OrderType.Limit]: 'LIMIT',
      [OrderType.Stop]: 'STOP',
      [OrderType.StopLimit]: 'STOP_LIMIT',
    };
    return typeMap[type];
  }

  private _mapOrderStatus(statusStr: string): OrderStatus {
    const statusMap: { [key: string]: OrderStatus } = {
      'pending': OrderStatus.Inactive,
      'working': OrderStatus.Working,
      'filled': OrderStatus.Filled,
      'cancelled': OrderStatus.Canceled,
      'rejected': OrderStatus.Rejected,
    };
    return statusMap[statusStr] || OrderStatus.Working;
  }
}

export default TradeArenaBrokerAPI;
