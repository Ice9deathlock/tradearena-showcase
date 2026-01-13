/**
 * Account Manager - Bottom panel for positions, orders, and trading
 * Modeled after TradingView Trading Terminal's account panel
 */

import { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, X, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useUserTradingAccounts,
  useAccountPositions,
  useAccountOrders,
  useCompetitionInstruments,
  usePlaceOrder,
  useClosePosition,
  useLivePrices,
  calculateUnrealizedPnL,
  PositionWithInstrument,
} from "@/hooks/useTrading";
import { useStopLossAndTakeProfit } from "@/hooks/useStopLossAndTakeProfit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderHistoryTable from "./OrderHistoryTable";

interface AccountManagerProps {
  isExpanded: boolean;
  onToggle: () => void;
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

const TV_COLORS = {
  bg: "#131722",
  bgSecondary: "#1e222d",
  bgTertiary: "#2a2e39",
  border: "#363a45",
  textPrimary: "#d1d4dc",
  textSecondary: "#787b86",
  blue: "#2962ff",
  green: "#26a69a",
  red: "#ef5350",
};

export default function AccountManager({ 
  isExpanded, 
  onToggle, 
  selectedSymbol,
  onSymbolChange 
}: AccountManagerProps) {
  const { user } = useAuth();
  const { data: accounts } = useUserTradingAccounts();
  const selectedAccount = accounts?.[0];
  
  const { data: positions } = useAccountPositions(selectedAccount?.id);
  const { data: orders } = useAccountOrders(selectedAccount?.id);
  const { data: instruments } = useCompetitionInstruments(selectedAccount?.competition_id);
  
  // Trading form state
  const [quantity, setQuantity] = useState("0.1");
  const [leverage, setLeverage] = useState("10");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  
  const placeOrder = usePlaceOrder();
  const closePosition = useClosePosition();

  // Get selected instrument
  const selectedInstrument = instruments?.find(i => i.instrument?.symbol === selectedSymbol)?.instrument;
  
  // Get live prices for all positions + selected symbol
  const allSymbols = useMemo(() => {
    const symbols = new Set(positions?.map(p => p.instrument?.symbol).filter(Boolean) as string[]);
    if (selectedSymbol) symbols.add(selectedSymbol);
    return [...symbols];
  }, [positions, selectedSymbol]);
  
  const { data: livePrices } = useLivePrices(allSymbols);

  // Handle auto-trigger of stop loss and take profit
  const handleAutoTrigger = useCallback((positionId: string, triggerType: 'stop_loss' | 'take_profit') => {
    const position = positions?.find(p => p.id === positionId);
    if (!position || !selectedAccount) return;
    
    const priceData = position.instrument?.symbol 
      ? livePrices?.[position.instrument.symbol] 
      : undefined;
    
    closePosition.mutate({
      competition_id: selectedAccount.competition_id,
      position_id: positionId,
      client_price: priceData?.mid,
    });
  }, [positions, selectedAccount, livePrices, closePosition]);

  // Monitor positions for stop loss and take profit
  useStopLossAndTakeProfit({
    positions,
    livePrices,
    onCloseTrigger: handleAutoTrigger,
  });

  // Handle order placement
  const handlePlaceOrder = async (side: "buy" | "sell") => {
    if (!selectedAccount || !selectedInstrument) return;
    
    const priceData = livePrices?.[selectedSymbol];
    const clientPrice = priceData?.mid;
    
    placeOrder.mutate({
      competition_id: selectedAccount.competition_id,
      instrument_id: selectedInstrument.id,
      side,
      quantity: parseFloat(quantity) || 0.1,
      leverage: parseInt(leverage) || 10,
      client_price: clientPrice,
      order_type: "market",
      stop_loss: parseFloat(stopLoss) || undefined,
      take_profit: parseFloat(takeProfit) || undefined,
      create_new_position: true,
    });
  };

  // Handle position close
  const handleClosePosition = async (position: PositionWithInstrument) => {
    if (!selectedAccount) return;
    
    const priceData = position.instrument?.symbol 
      ? livePrices?.[position.instrument.symbol] 
      : undefined;
    
    closePosition.mutate({
      competition_id: selectedAccount.competition_id,
      position_id: position.id,
      client_price: priceData?.mid,
    });
  };

  // Calculate account totals
  const accountStats = useMemo(() => {
    if (!selectedAccount || !positions) {
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
      balance: selectedAccount.balance || 0,
      equity: (selectedAccount.balance || 0) + totalUnrealized,
      usedMargin: selectedAccount.used_margin || 0,
      freeMargin: ((selectedAccount.balance || 0) + totalUnrealized) - (selectedAccount.used_margin || 0),
      unrealizedPnL: totalUnrealized,
    };
  }, [selectedAccount, positions, livePrices]);

  // Collapsed state - just show header
  if (!isExpanded) {
    return (
      <div
        className="h-10 flex items-center justify-between px-4 cursor-pointer"
        style={{ backgroundColor: TV_COLORS.bgSecondary, borderTop: `1px solid ${TV_COLORS.border}` }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium" style={{ color: TV_COLORS.textPrimary }}>
            Account Manager
          </span>
          <span className="text-xs" style={{ color: TV_COLORS.textSecondary }}>
            Balance: ${accountStats.balance.toFixed(2)} | 
            Equity: ${accountStats.equity.toFixed(2)} | 
            P&L: <span style={{ color: accountStats.unrealizedPnL >= 0 ? TV_COLORS.green : TV_COLORS.red }}>
              ${accountStats.unrealizedPnL.toFixed(2)}
            </span>
          </span>
        </div>
        <ChevronUp className="w-4 h-4" style={{ color: TV_COLORS.textSecondary }} />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ 
        height: "200px",
        backgroundColor: TV_COLORS.bgSecondary, 
        borderTop: `1px solid ${TV_COLORS.border}` 
      }}
    >
      {/* Header */}
      <div 
        className="h-8 flex items-center justify-between px-4 shrink-0 cursor-pointer"
        style={{ borderBottom: `1px solid ${TV_COLORS.border}` }}
        onClick={onToggle}
      >
        <span className="text-xs font-medium" style={{ color: TV_COLORS.textPrimary }}>
          Account Manager
        </span>
        <ChevronDown className="w-4 h-4" style={{ color: TV_COLORS.textSecondary }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Quick Trade Panel */}
        <div 
          className="w-64 shrink-0 p-3 flex flex-col gap-2 overflow-y-auto"
          style={{ borderRight: `1px solid ${TV_COLORS.border}` }}
        >
          {/* Symbol & Price */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: TV_COLORS.textPrimary }}>
              {selectedSymbol}
            </span>
            {livePrices?.[selectedSymbol] && (
              <span className="text-xs" style={{ color: TV_COLORS.textSecondary }}>
                {livePrices[selectedSymbol].mid.toFixed(selectedSymbol.includes('BTC') ? 0 : 5)}
              </span>
            )}
          </div>

          {/* Quantity & Leverage */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: TV_COLORS.textSecondary }}>Qty</label>
              <Input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-7 text-xs border-0"
                style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
              />
            </div>
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: TV_COLORS.textSecondary }}>Lev</label>
              <Input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="h-7 text-xs border-0"
                style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
              />
            </div>
          </div>

          {/* SL/TP */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: TV_COLORS.red }}>SL</label>
              <Input
                type="number"
                step="0.0001"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="—"
                className="h-7 text-xs border-0"
                style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
              />
            </div>
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: TV_COLORS.green }}>TP</label>
              <Input
                type="number"
                step="0.0001"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="—"
                className="h-7 text-xs border-0"
                style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
              />
            </div>
          </div>

          {/* Buy/Sell Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <Button
              size="sm"
              className="h-8 text-xs font-bold text-white"
              style={{ backgroundColor: TV_COLORS.green }}
              disabled={placeOrder.isPending}
              onClick={() => handlePlaceOrder("buy")}
            >
              {placeOrder.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "BUY"}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-bold text-white"
              style={{ backgroundColor: TV_COLORS.red }}
              disabled={placeOrder.isPending}
              onClick={() => handlePlaceOrder("sell")}
            >
              {placeOrder.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "SELL"}
            </Button>
          </div>
        </div>

        {/* Center - Positions/Orders/History Tabs */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Tabs defaultValue="positions" className="flex-1 flex flex-col overflow-hidden">
            <TabsList 
              className="h-7 px-2 justify-start gap-4 rounded-none shrink-0"
              style={{ backgroundColor: "transparent", borderBottom: `1px solid ${TV_COLORS.border}` }}
            >
              <TabsTrigger 
                value="positions" 
                className="text-xs h-6 px-2 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#2962ff] rounded-none"
                style={{ color: TV_COLORS.textSecondary }}
              >
                Positions ({positions?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="text-xs h-6 px-2 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#2962ff] rounded-none"
                style={{ color: TV_COLORS.textSecondary }}
              >
                Orders ({orders?.filter(o => o.status === 'pending').length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-xs h-6 px-2 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#2962ff] rounded-none"
                style={{ color: TV_COLORS.textSecondary }}
              >
                History
              </TabsTrigger>
            </TabsList>

            {/* Positions Tab */}
            <TabsContent value="positions" className="flex-1 overflow-auto m-0 p-0">
              {positions?.length ? (
                <table className="w-full text-xs">
                  <thead style={{ backgroundColor: TV_COLORS.bgTertiary }}>
                    <tr className="text-left" style={{ color: TV_COLORS.textSecondary }}>
                      <th className="px-3 py-1.5 font-medium">Symbol</th>
                      <th className="px-3 py-1.5 font-medium">Side</th>
                      <th className="px-3 py-1.5 font-medium">Qty</th>
                      <th className="px-3 py-1.5 font-medium">Entry</th>
                      <th className="px-3 py-1.5 font-medium">Current</th>
                      <th className="px-3 py-1.5 font-medium">P&L</th>
                      <th className="px-3 py-1.5 font-medium">SL/TP</th>
                      <th className="px-3 py-1.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => {
                      const priceData = pos.instrument?.symbol ? livePrices?.[pos.instrument.symbol] : undefined;
                      const pnl = priceData ? calculateUnrealizedPnL(pos, priceData.mid) : pos.unrealized_pnl || 0;
                      const isBTC = pos.instrument?.symbol?.includes('BTC');
                      
                      return (
                        <tr 
                          key={pos.id} 
                          className="border-b hover:bg-[#2a2e39]/50 cursor-pointer"
                          style={{ borderColor: TV_COLORS.border }}
                          onClick={() => pos.instrument?.symbol && onSymbolChange(pos.instrument.symbol)}
                        >
                          <td className="px-3 py-1.5" style={{ color: TV_COLORS.textPrimary }}>
                            {pos.instrument?.symbol || 'N/A'}
                          </td>
                          <td className="px-3 py-1.5">
                            <span style={{ color: pos.side === 'buy' ? TV_COLORS.green : TV_COLORS.red }}>
                              {pos.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-1.5" style={{ color: TV_COLORS.textPrimary }}>
                            {pos.quantity}
                          </td>
                          <td className="px-3 py-1.5" style={{ color: TV_COLORS.textSecondary }}>
                            {pos.entry_price.toFixed(isBTC ? 0 : 5)}
                          </td>
                          <td className="px-3 py-1.5" style={{ color: TV_COLORS.textPrimary }}>
                            {priceData?.mid.toFixed(isBTC ? 0 : 5) || '—'}
                          </td>
                          <td className="px-3 py-1.5">
                            <span style={{ color: pnl >= 0 ? TV_COLORS.green : TV_COLORS.red }}>
                              ${pnl.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-3 py-1.5" style={{ color: TV_COLORS.textSecondary }}>
                            {pos.stop_loss?.toFixed(isBTC ? 0 : 4) || '—'} / {pos.take_profit?.toFixed(isBTC ? 0 : 4) || '—'}
                          </td>
                          <td className="px-3 py-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClosePosition(pos);
                              }}
                              disabled={closePosition.isPending}
                            >
                              <X className="w-3 h-3" style={{ color: TV_COLORS.red }} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-full" style={{ color: TV_COLORS.textSecondary }}>
                  No open positions
                </div>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="flex-1 overflow-auto m-0 p-0">
              {orders?.filter(o => o.status === 'pending').length ? (
                <table className="w-full text-xs">
                  <thead style={{ backgroundColor: TV_COLORS.bgTertiary }}>
                    <tr className="text-left" style={{ color: TV_COLORS.textSecondary }}>
                      <th className="px-3 py-1.5 font-medium">Symbol</th>
                      <th className="px-3 py-1.5 font-medium">Type</th>
                      <th className="px-3 py-1.5 font-medium">Side</th>
                      <th className="px-3 py-1.5 font-medium">Qty</th>
                      <th className="px-3 py-1.5 font-medium">Price</th>
                      <th className="px-3 py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o => o.status === 'pending').map((order) => (
                      <tr 
                        key={order.id} 
                        className="border-b"
                        style={{ borderColor: TV_COLORS.border }}
                      >
                        <td className="px-3 py-1.5" style={{ color: TV_COLORS.textPrimary }}>
                          {(order.instruments as any)?.symbol || 'N/A'}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: TV_COLORS.textSecondary }}>
                          {order.order_type.toUpperCase()}
                        </td>
                        <td className="px-3 py-1.5">
                          <span style={{ color: order.side === 'buy' ? TV_COLORS.green : TV_COLORS.red }}>
                            {order.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-1.5" style={{ color: TV_COLORS.textPrimary }}>
                          {order.quantity}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: TV_COLORS.textSecondary }}>
                          {order.requested_price?.toFixed(5) || 'Market'}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: TV_COLORS.textSecondary }}>
                          {order.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-full" style={{ color: TV_COLORS.textSecondary }}>
                  No pending orders
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-auto m-0 p-0">
              <OrderHistoryTable accountId={selectedAccount?.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right - Account Summary */}
        <div 
          className="w-48 shrink-0 p-3 space-y-2"
          style={{ borderLeft: `1px solid ${TV_COLORS.border}` }}
        >
          <div className="text-xs" style={{ color: TV_COLORS.textSecondary }}>Account Summary</div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span style={{ color: TV_COLORS.textSecondary }}>Balance</span>
              <span style={{ color: TV_COLORS.textPrimary }}>${accountStats.balance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: TV_COLORS.textSecondary }}>Equity</span>
              <span style={{ color: TV_COLORS.textPrimary }}>${accountStats.equity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: TV_COLORS.textSecondary }}>Used Margin</span>
              <span style={{ color: TV_COLORS.textPrimary }}>${accountStats.usedMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: TV_COLORS.textSecondary }}>Free Margin</span>
              <span style={{ color: TV_COLORS.textPrimary }}>${accountStats.freeMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1.5" style={{ borderTop: `1px solid ${TV_COLORS.border}` }}>
              <span style={{ color: TV_COLORS.textSecondary }}>Unrealized P&L</span>
              <span style={{ color: accountStats.unrealizedPnL >= 0 ? TV_COLORS.green : TV_COLORS.red }}>
                ${accountStats.unrealizedPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
