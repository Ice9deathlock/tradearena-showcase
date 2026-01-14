/**
 * TradeArena Broker API for Native TradingView Platform
 */

declare global {
  interface Window {
    TradeArenaBroker?: {
      create: () => IBrokerTerminal;
    };
  }
}

export interface IBrokerTerminal {
  accountsMetainfo: () => Promise<AccountMetaInfo[]>;
  getAccountState: (accountId: string) => Promise<AccountState>;
  getPositions: (accountId: string) => Promise<Position[]>;
  getOrders: (accountId: string) => Promise<Order[]>;
  placeOrder: (accountId: string, preOrder: PreOrder, parentId?: string) => Promise<OrderResult>;
  modifyOrder: (accountId: string, orderId: string, preOrder: PreOrder) => Promise<OrderResult>;
  cancelOrder: (accountId: string, orderId: string) => Promise<boolean>;
  closePosition: (accountId: string, positionId: string) => Promise<boolean>;
  reversePosition: (accountId: string, positionId: string) => Promise<boolean>;
}

export interface AccountMetaInfo {
  id: string;
  name: string;
  currency: string;
  currencySign: string;
  brokerName: string;
  accountType: string;
  paperTrading: boolean;
}

export interface AccountState {
  balance: number;
  equity: number;
  pl: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
}

export interface Position {
  id: string;
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  avgPrice: number;
  pl: number;
}

export interface Order {
  id: string;
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: number;
  status: number;
  limitPrice?: number;
  stopPrice?: number;
}

export interface PreOrder {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: string;
  limitPrice?: number;
  stopPrice?: number;
}

export interface OrderResult {
  id: string;
  orderId: string;
}

export interface TradeArenaConfig {
  userId: string;
  userEmail: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export class TradeArenaNativeBroker {
  constructor(public readonly config: TradeArenaConfig) {}

  async accountsMetainfo(): Promise<AccountMetaInfo[]> {
    return [{
      id: 'account_1',
      name: 'TradeArena Trading Account',
      currency: 'USD',
      currencySign: '$',
      brokerName: 'TradeArena',
      accountType: 'demo',
      paperTrading: true,
    }];
  }

  async getAccountState(): Promise<AccountState> {
    return {
      balance: 10000000,
      equity: 10000000,
      pl: 0,
      usedMargin: 0,
      freeMargin: 10000000,
      marginLevel: 100,
    };
  }

  async getPositions(): Promise<Position[]> {
    return [];
  }

  async getOrders(): Promise<Order[]> {
    return [];
  }

  async placeOrder(): Promise<OrderResult> {
    const id = String(Date.now());
    return { id, orderId: id };
  }

  async modifyOrder(_accountId: string, orderId: string): Promise<OrderResult> {
    return { id: orderId, orderId };
  }

  async cancelOrder(): Promise<boolean> {
    return true;
  }

  async closePosition(): Promise<boolean> {
    return true;
  }

  async reversePosition(): Promise<boolean> {
    return true;
  }
}

export function initializeTradeArenaBroker(config: TradeArenaConfig): TradeArenaNativeBroker {
  const broker = new TradeArenaNativeBroker(config);

  if (typeof window !== 'undefined') {
    window.TradeArenaBroker = {
      create: (): IBrokerTerminal => ({
        accountsMetainfo: () => broker.accountsMetainfo(),
        getAccountState: () => broker.getAccountState(),
        getPositions: () => broker.getPositions(),
        getOrders: () => broker.getOrders(),
        placeOrder: () => broker.placeOrder(),
        modifyOrder: (_, orderId) => broker.modifyOrder('', orderId),
        cancelOrder: () => broker.cancelOrder(),
        closePosition: () => broker.closePosition(),
        reversePosition: () => broker.reversePosition(),
      }),
    };
  }

  return broker;
}

export default TradeArenaNativeBroker;
