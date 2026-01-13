/**
 * Bottom Panel - Account Manager with Positions, Orders, History
 */

import { useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, X, Loader2, DollarSign, TrendingUp, Wallet, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  useAccountPositions,
  useAccountOrders,
  useClosePosition,
  calculateUnrealizedPnL,
  PositionWithInstrument,
  TradingAccount,
  LivePriceData,
  useLivePrices,
} from "@/hooks/useTrading";
import { useStopLossAndTakeProfit } from "@/hooks/useStopLossAndTakeProfit";
import OrderHistoryTable from "../OrderHistoryTable";

interface BottomPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  height: number;
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  account?: TradingAccount;
  livePrices?: Record<string, LivePriceData>;
}

export default function BottomPanel({
  isExpanded,
  onToggle,
  height,
  selectedSymbol,
  onSymbolChange,
  account,
  livePrices,
}: BottomPanelProps) {
  const { data: positions } = useAccountPositions(account?.id);
  const { data: orders } = useAccountOrders(account?.id);
  const closePosition = useClosePosition();

  // Calculate account totals
  const accountStats = useMemo(() => {
    if (!account || !positions) {
      return { balance: 0, equity: 0, usedMargin: 0, freeMargin: 0, unrealizedPnL: 0 };
    }

    let totalUnrealized = 0;
    positions.forEach(pos => {
      const priceData = pos.instrument?.symbol ? livePrices?.[pos.instrument.symbol] : undefined;
      if (priceData) {
        totalUnrealized += calculateUnrealizedPnL(pos, priceData.mid);
      } else {
        totalUnrealized += pos.unrealized_pnl || 0;
      }
    });

    return {
      balance: account.balance || 0,
      equity: (account.balance || 0) + totalUnrealized,
      usedMargin: account.used_margin || 0,
      freeMargin: ((account.balance || 0) + totalUnrealized) - (account.used_margin || 0),
      unrealizedPnL: totalUnrealized,
    };
  }, [account, positions, livePrices]);

  // Handle auto-trigger of stop loss and take profit
  const handleAutoTrigger = useCallback((positionId: string, triggerType: 'stop_loss' | 'take_profit') => {
    const position = positions?.find(p => p.id === positionId);
    if (!position || !account) return;
    
    const priceData = position.instrument?.symbol 
      ? livePrices?.[position.instrument.symbol] 
      : undefined;
    
    closePosition.mutate({
      competition_id: account.competition_id,
      position_id: positionId,
      client_price: priceData?.mid,
    });
  }, [positions, account, livePrices, closePosition]);

  // Monitor positions for stop loss and take profit
  useStopLossAndTakeProfit({
    positions,
    livePrices,
    onCloseTrigger: handleAutoTrigger,
  });

  const handleClosePosition = async (position: PositionWithInstrument) => {
    if (!account) return;
    
    const priceData = position.instrument?.symbol 
      ? livePrices?.[position.instrument.symbol] 
      : undefined;
    
    closePosition.mutate({
      competition_id: account.competition_id,
      position_id: position.id,
      client_price: priceData?.mid,
    });
  };

  const pendingOrders = orders?.filter(o => o.status === 'pending') || [];

  // Collapsed state
  if (!isExpanded) {
    return (
      <div
        className="h-9 flex items-center justify-between px-4 cursor-pointer shrink-0 bg-[#1e222d] border-t border-[#2a2e39]"
        onClick={onToggle}
      >
        <div className="flex items-center gap-6">
          <span className="text-xs font-medium text-[#d1d4dc]">Account Manager</span>
          <span className="text-xs text-[#787b86]">
            Positions ({positions?.length || 0})
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <StatBadge icon={<Wallet className="w-3 h-3" />} label="Balance" value={`$${accountStats.balance.toFixed(0)}`} />
            <StatBadge icon={<Activity className="w-3 h-3" />} label="Equity" value={`$${accountStats.equity.toFixed(0)}`} />
            <StatBadge 
              icon={<TrendingUp className="w-3 h-3" />} 
              label="P&L" 
              value={`$${accountStats.unrealizedPnL.toFixed(2)}`}
              valueColor={accountStats.unrealizedPnL >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
            />
          </div>
          <ChevronUp className="w-4 h-4 text-[#787b86]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col shrink-0 bg-[#1e222d] border-t border-[#2a2e39]"
      style={{ height: `${height}px` }}
    >
      <Tabs defaultValue="positions" className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-2 border-b border-[#2a2e39]">
          <TabsList className="h-9 bg-transparent gap-0">
            <TabsTrigger
              value="positions"
              className="text-xs h-9 px-4 data-[state=active]:bg-transparent data-[state=active]:text-[#2962ff] data-[state=active]:border-b-2 data-[state=active]:border-[#2962ff] rounded-none text-[#787b86]"
            >
              Positions ({positions?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="text-xs h-9 px-4 data-[state=active]:bg-transparent data-[state=active]:text-[#2962ff] data-[state=active]:border-b-2 data-[state=active]:border-[#2962ff] rounded-none text-[#787b86]"
            >
              Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs h-9 px-4 data-[state=active]:bg-transparent data-[state=active]:text-[#2962ff] data-[state=active]:border-b-2 data-[state=active]:border-[#2962ff] rounded-none text-[#787b86]"
            >
              History
            </TabsTrigger>
          </TabsList>

          {/* Account Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <StatBadge icon={<Wallet className="w-3 h-3" />} label="Balance" value={`$${accountStats.balance.toFixed(2)}`} />
              <StatBadge icon={<Activity className="w-3 h-3" />} label="Equity" value={`$${accountStats.equity.toFixed(2)}`} />
              <StatBadge icon={<DollarSign className="w-3 h-3" />} label="Margin" value={`$${accountStats.usedMargin.toFixed(2)}`} />
              <StatBadge icon={<DollarSign className="w-3 h-3" />} label="Free" value={`$${accountStats.freeMargin.toFixed(2)}`} />
              <StatBadge 
                icon={<TrendingUp className="w-3 h-3" />} 
                label="P&L" 
                value={`${accountStats.unrealizedPnL >= 0 ? '+' : ''}$${accountStats.unrealizedPnL.toFixed(2)}`}
                valueColor={accountStats.unrealizedPnL >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
              />
            </div>
            <button onClick={onToggle} className="p-1.5 rounded hover:bg-[#2a2e39]">
              <ChevronDown className="w-4 h-4 text-[#787b86]" />
            </button>
          </div>
        </div>

        {/* Positions Tab */}
        <TabsContent value="positions" className="flex-1 overflow-auto m-0">
          {positions?.length ? (
            <table className="w-full text-xs">
              <thead className="bg-[#2a2e39] sticky top-0">
                <tr className="text-left text-[#787b86]">
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Entry</th>
                  <th className="px-3 py-2 font-medium">Current</th>
                  <th className="px-3 py-2 font-medium">P&L</th>
                  <th className="px-3 py-2 font-medium">SL</th>
                  <th className="px-3 py-2 font-medium">TP</th>
                  <th className="px-3 py-2 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const priceData = pos.instrument?.symbol ? livePrices?.[pos.instrument.symbol] : undefined;
                  const pnl = priceData ? calculateUnrealizedPnL(pos, priceData.mid) : pos.unrealized_pnl || 0;
                  const isBTC = pos.instrument?.symbol?.includes('BTC');
                  const decimals = isBTC ? 0 : 5;

                  return (
                    <tr
                      key={pos.id}
                      className="border-b border-[#2a2e39] hover:bg-[#2a2e39]/50 cursor-pointer"
                      onClick={() => pos.instrument?.symbol && onSymbolChange(pos.instrument.symbol)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#2a2e39] flex items-center justify-center text-[9px] font-bold text-[#787b86]">
                            {pos.instrument?.symbol?.substring(0, 2) || '??'}
                          </div>
                          <span className="text-[#d1d4dc] font-medium">{pos.instrument?.symbol || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          pos.side === 'buy' 
                            ? 'bg-[#26a69a]/20 text-[#26a69a]' 
                            : 'bg-[#ef5350]/20 text-[#ef5350]'
                        }`}>
                          {pos.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#d1d4dc]">{pos.quantity}</td>
                      <td className="px-3 py-2 text-[#787b86]">{pos.entry_price.toFixed(decimals)}</td>
                      <td className="px-3 py-2 text-[#d1d4dc] font-medium">{priceData?.mid.toFixed(decimals) || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={pnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#787b86]">{pos.stop_loss?.toFixed(isBTC ? 0 : 4) || '—'}</td>
                      <td className="px-3 py-2 text-[#787b86]">{pos.take_profit?.toFixed(isBTC ? 0 : 4) || '—'}</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-[#ef5350]/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClosePosition(pos);
                          }}
                          disabled={closePosition.isPending}
                        >
                          {closePosition.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#787b86]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-[#ef5350]" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#787b86] gap-2">
              <Activity className="w-8 h-8 opacity-50" />
              <span className="text-sm">No open positions</span>
            </div>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="flex-1 overflow-auto m-0">
          {pendingOrders.length ? (
            <table className="w-full text-xs">
              <thead className="bg-[#2a2e39] sticky top-0">
                <tr className="text-left text-[#787b86]">
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[#2a2e39]">
                    <td className="px-3 py-2 text-[#d1d4dc]">{(order.instruments as any)?.symbol || 'N/A'}</td>
                    <td className="px-3 py-2 text-[#787b86] uppercase">{order.order_type}</td>
                    <td className="px-3 py-2">
                      <span className={order.side === 'buy' ? 'text-[#26a69a]' : 'text-[#ef5350]'}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#d1d4dc]">{order.quantity}</td>
                    <td className="px-3 py-2 text-[#787b86]">{order.requested_price?.toFixed(5) || '—'}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#2962ff]/20 text-[#2962ff]">
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#787b86] gap-2">
              <DollarSign className="w-8 h-8 opacity-50" />
              <span className="text-sm">No pending orders</span>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 overflow-auto m-0 p-0">
          <OrderHistoryTable accountId={account?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for stats
function StatBadge({ 
  icon, 
  label, 
  value, 
  valueColor = 'text-[#d1d4dc]' 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[#787b86]">{icon}</span>
      <span className="text-[10px] text-[#787b86]">{label}</span>
      <span className={`text-xs font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}
