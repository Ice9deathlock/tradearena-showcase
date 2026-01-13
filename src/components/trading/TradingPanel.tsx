import { useState, useMemo, useCallback } from "react";
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
  TradingAccount,
  PositionWithInstrument,
  LivePriceData
} from "@/hooks/useTrading";
import { useStopLossAndTakeProfit } from "@/hooks/useStopLossAndTakeProfit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, X, ChevronUp, ChevronDown, History } from "lucide-react";
import OrderHistoryTable from "./OrderHistoryTable";

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

type OrderType = "market" | "buy_limit" | "sell_limit" | "buy_stop" | "sell_stop";

interface TradingPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function TradingPanel({ isCollapsed = false, onToggleCollapse }: TradingPanelProps) {
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = useUserTradingAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("0.1");
  const [leverage, setLeverage] = useState<string>("10");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  
  const selectedAccount = accounts?.find(a => a.id === selectedAccountId) || accounts?.[0];
  
  const { data: positions, isLoading: positionsLoading } = useAccountPositions(selectedAccount?.id);
  const { data: orders } = useAccountOrders(selectedAccount?.id);
  const { data: instruments } = useCompetitionInstruments(selectedAccount?.competition_id);
  
  // Get unique symbols from positions AND selected instrument for live price fetching
  const selectedInstrument = instruments?.find(i => i.instrument?.id === selectedInstrumentId)?.instrument;
  const allSymbols = useMemo(() => {
    const symbols = new Set(positions?.map(p => p.instrument?.symbol).filter(Boolean) as string[]);
    if (selectedInstrument?.symbol) symbols.add(selectedInstrument.symbol);
    return [...symbols];
  }, [positions, selectedInstrument]);
  
  // Fetch live prices for all symbols
  const { data: livePrices } = useLivePrices(allSymbols);
  
  const placeOrder = usePlaceOrder();
  const closePosition = useClosePosition();

  // Handle auto-trigger of stop loss and take profit
  const handleAutoTrigger = useCallback((positionId: string, triggerType: 'stop_loss' | 'take_profit') => {
    const position = positions?.find(p => p.id === positionId);
    if (!position || !selectedAccount) return;
    
    // Get current price as fallback
    const priceData = position.instrument?.symbol 
      ? livePrices?.[position.instrument.symbol] 
      : undefined;
    const clientPrice = priceData?.mid;
    
    closePosition.mutate({
      competition_id: selectedAccount.competition_id,
      position_id: positionId,
      client_price: clientPrice,
    }, {
      onSuccess: () => {
        const triggerLabel = triggerType === 'stop_loss' ? '🔴 Stop Loss' : '🟢 Take Profit';
        console.log(`${triggerLabel} position closed automatically`);
      }
    });
  }, [positions, selectedAccount, livePrices, closePosition]);

  // Monitor positions for stop loss and take profit
  useStopLossAndTakeProfit({
    positions,
    livePrices,
    onCloseTrigger: handleAutoTrigger,
  });

  // Auto-select first account and instrument
  if (accounts?.length && !selectedAccountId) {
    setSelectedAccountId(accounts[0].id);
  }
  if (instruments?.length && !selectedInstrumentId) {
    setSelectedInstrumentId(instruments[0].instrument?.id || "");
  }

  const handlePlaceOrder = async (side?: "buy" | "sell") => {
    if (!selectedAccount || !selectedInstrumentId) return;
    
    // Get current displayed price (mid) to send to backend as fallback
    const priceData = selectedInstrument?.symbol 
      ? livePrices?.[selectedInstrument.symbol] 
      : undefined;
    const clientPrice = priceData?.mid;
    
    // Determine side based on order type if not provided
    let orderSide: "buy" | "sell" = side || "buy";
    let effectiveOrderType: "market" | "limit" | "stop" = "market";
    let requestedPrice: number | undefined;
    
    if (orderType === "buy_limit") {
      orderSide = "buy";
      effectiveOrderType = "limit";
      requestedPrice = parseFloat(limitPrice) || undefined;
    } else if (orderType === "sell_limit") {
      orderSide = "sell";
      effectiveOrderType = "limit";
      requestedPrice = parseFloat(limitPrice) || undefined;
    } else if (orderType === "buy_stop") {
      orderSide = "buy";
      effectiveOrderType = "stop";
      requestedPrice = parseFloat(limitPrice) || undefined;
    } else if (orderType === "sell_stop") {
      orderSide = "sell";
      effectiveOrderType = "stop";
      requestedPrice = parseFloat(limitPrice) || undefined;
    }
    
    placeOrder.mutate({
      competition_id: selectedAccount.competition_id,
      instrument_id: selectedInstrumentId,
      side: orderSide,
      quantity: parseFloat(quantity) || 0.1,
      leverage: parseInt(leverage) || 10,
      client_price: clientPrice,
      order_type: effectiveOrderType,
      requested_price: requestedPrice,
      stop_loss: parseFloat(stopLoss) || undefined,
      take_profit: parseFloat(takeProfit) || undefined,
      create_new_position: true, // Always create new position instead of netting
    });
  };

  const handleClosePosition = async (position: PositionWithInstrument) => {
    if (!selectedAccount) return;
    
    // Get current mid price for this position's instrument as fallback
    const priceData = position.instrument?.symbol 
      ? livePrices?.[position.instrument.symbol] 
      : undefined;
    const clientPrice = priceData?.mid;
    
    closePosition.mutate({
      competition_id: selectedAccount.competition_id,
      position_id: position.id,
      client_price: clientPrice, // Pass the displayed mid price as fallback
    });
  };

  if (!user) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center p-4 text-center"
        style={{ backgroundColor: TV_COLORS.bgSecondary, color: TV_COLORS.textSecondary }}
      >
        <p className="text-sm mb-3">Sign in to start trading</p>
        <Button 
          size="sm"
          onClick={() => window.location.href = "/auth"}
          style={{ backgroundColor: TV_COLORS.blue }}
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (accountsLoading) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: TV_COLORS.bgSecondary }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: TV_COLORS.blue }} />
      </div>
    );
  }

  if (!accounts?.length) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center p-4 text-center"
        style={{ backgroundColor: TV_COLORS.bgSecondary, color: TV_COLORS.textSecondary }}
      >
        <p className="text-sm mb-3">Join a competition to start trading</p>
        <Button 
          size="sm"
          onClick={() => window.location.href = "/competitions"}
          style={{ backgroundColor: TV_COLORS.blue }}
        >
          Browse Competitions
        </Button>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="h-full w-8 flex items-center justify-center hover:bg-opacity-50 transition-colors"
        style={{ backgroundColor: TV_COLORS.bgSecondary, borderLeft: `1px solid ${TV_COLORS.border}` }}
      >
        <ChevronUp className="w-4 h-4 rotate-90" style={{ color: TV_COLORS.textSecondary }} />
      </button>
    );
  }

  // selectedInstrument already defined above

  return (
    <div 
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: TV_COLORS.bgSecondary, borderLeft: `1px solid ${TV_COLORS.border}` }}
    >
      {/* Header with Collapse */}
      <div 
        className="h-10 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: `1px solid ${TV_COLORS.border}` }}
      >
        <span className="text-xs font-medium" style={{ color: TV_COLORS.textPrimary }}>Trading</span>
        <button 
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-opacity-50"
          style={{ color: TV_COLORS.textSecondary }}
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {/* Account Selector */}
      <div className="p-2 shrink-0" style={{ borderBottom: `1px solid ${TV_COLORS.border}` }}>
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger 
            className="h-8 text-xs border-0"
            style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
          >
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: TV_COLORS.bgSecondary, borderColor: TV_COLORS.border }}>
            {accounts?.map(acc => (
              <SelectItem 
                key={acc.id} 
                value={acc.id}
                className="text-xs"
                style={{ color: TV_COLORS.textPrimary }}
              >
                {acc.competition_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Account Stats - Live calculated */}
      {selectedAccount && (
        <LiveAccountStats 
          account={selectedAccount}
          positions={positions}
          livePrices={livePrices}
        />
      )}

      {/* Order Form */}
      <div className="p-2 space-y-2 shrink-0 overflow-y-auto max-h-[350px]" style={{ borderBottom: `1px solid ${TV_COLORS.border}` }}>
        {/* Instrument Selector */}
        <Select value={selectedInstrumentId} onValueChange={setSelectedInstrumentId}>
          <SelectTrigger 
            className="h-8 text-xs border-0"
            style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
          >
            <SelectValue placeholder="Select instrument" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: TV_COLORS.bgSecondary, borderColor: TV_COLORS.border }}>
            {instruments?.map(ci => (
              <SelectItem 
                key={ci.instrument?.id} 
                value={ci.instrument?.id || ""}
                className="text-xs"
                style={{ color: TV_COLORS.textPrimary }}
              >
                {ci.instrument?.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Order Type Selector */}
        <div>
          <label className="text-xs mb-1 block" style={{ color: TV_COLORS.textSecondary }}>Order Type</label>
          <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
            <SelectTrigger 
              className="h-8 text-xs border-0"
              style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: TV_COLORS.bgSecondary, borderColor: TV_COLORS.border }}>
              <SelectItem value="market" className="text-xs" style={{ color: TV_COLORS.textPrimary }}>
                Market Order
              </SelectItem>
              <SelectItem value="buy_limit" className="text-xs" style={{ color: TV_COLORS.green }}>
                Buy Limit
              </SelectItem>
              <SelectItem value="sell_limit" className="text-xs" style={{ color: TV_COLORS.red }}>
                Sell Limit
              </SelectItem>
              <SelectItem value="buy_stop" className="text-xs" style={{ color: TV_COLORS.green }}>
                Buy Stop
              </SelectItem>
              <SelectItem value="sell_stop" className="text-xs" style={{ color: TV_COLORS.red }}>
                Sell Stop
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Live Price Display - Show Bid/Ask spread like MT4 */}
        {selectedInstrument && livePrices?.[selectedInstrument.symbol] && (
          <div 
            className="px-2 py-1.5 rounded text-xs"
            style={{ backgroundColor: TV_COLORS.bgTertiary }}
          >
            <div className="flex justify-between items-center mb-1">
              <span style={{ color: TV_COLORS.textSecondary }}>Spread</span>
              <span style={{ color: TV_COLORS.textSecondary }}>
                {((livePrices[selectedInstrument.symbol].ask - livePrices[selectedInstrument.symbol].bid) * 10000).toFixed(1)} pips
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold" style={{ color: TV_COLORS.red }}>
                BID: {livePrices[selectedInstrument.symbol].bid.toFixed(selectedInstrument.symbol.includes('BTC') ? 0 : 5)}
              </span>
              <span className="font-semibold" style={{ color: TV_COLORS.green }}>
                ASK: {livePrices[selectedInstrument.symbol].ask.toFixed(selectedInstrument.symbol.includes('BTC') ? 0 : 5)}
              </span>
            </div>
            <div className="text-center mt-1" style={{ color: TV_COLORS.textSecondary, fontSize: '9px' }}>
              Twelve Data (demo)
            </div>
          </div>
        )}

        {/* Limit/Stop Price (for pending orders) */}
        {orderType !== "market" && (
          <div>
            <label className="text-xs mb-1 block" style={{ color: TV_COLORS.textSecondary }}>
              {orderType.includes("limit") ? "Limit Price" : "Stop Price"}
            </label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={livePrices?.[selectedInstrument?.symbol || '']?.mid.toFixed(4) || "0.0000"}
              className="h-8 text-xs border-0"
              style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
            />
          </div>
        )}

        {/* Quantity & Leverage */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs mb-1 block" style={{ color: TV_COLORS.textSecondary }}>Quantity</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-8 text-xs border-0"
              style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: TV_COLORS.textSecondary }}>Leverage</label>
            <Select value={leverage} onValueChange={setLeverage}>
              <SelectTrigger 
                className="h-8 text-xs border-0"
                style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: TV_COLORS.bgSecondary, borderColor: TV_COLORS.border }}>
                {[1, 2, 5, 10, 20, 50, 100].map(lev => (
                  <SelectItem 
                    key={lev} 
                    value={lev.toString()}
                    className="text-xs"
                    style={{ color: TV_COLORS.textPrimary }}
                  >
                    {lev}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stop Loss & Take Profit */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs mb-1 block" style={{ color: TV_COLORS.red }}>Stop Loss</label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Optional"
              className="h-8 text-xs border-0"
              style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: TV_COLORS.green }}>Take Profit</label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Optional"
              className="h-8 text-xs border-0"
              style={{ backgroundColor: TV_COLORS.bgTertiary, color: TV_COLORS.textPrimary }}
            />
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        {orderType === "market" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="h-9 text-xs font-semibold text-white"
              style={{ backgroundColor: TV_COLORS.green }}
              disabled={placeOrder.isPending || !selectedInstrumentId}
              onClick={() => handlePlaceOrder("buy")}
            >
              {placeOrder.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
              BUY
            </Button>
            <Button
              size="sm"
              className="h-9 text-xs font-semibold text-white"
              style={{ backgroundColor: TV_COLORS.red }}
              disabled={placeOrder.isPending || !selectedInstrumentId}
              onClick={() => handlePlaceOrder("sell")}
            >
              {placeOrder.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              SELL
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="h-9 w-full text-xs font-semibold text-white"
            style={{ 
              backgroundColor: orderType.includes("buy") ? TV_COLORS.green : TV_COLORS.red 
            }}
            disabled={placeOrder.isPending || !selectedInstrumentId || !limitPrice}
            onClick={() => handlePlaceOrder()}
          >
            {placeOrder.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : orderType.includes("buy") ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1" />
            )}
            {orderType.replace("_", " ").toUpperCase()}
          </Button>
        )}
      </div>

      {/* Positions & Orders Tabs */}
      <Tabs defaultValue="positions" className="flex-1 flex flex-col overflow-hidden">
        <TabsList 
          className="h-8 w-full justify-start rounded-none p-0 shrink-0"
          style={{ backgroundColor: TV_COLORS.bg }}
        >
          <TabsTrigger 
            value="positions" 
            className="h-8 text-xs rounded-none px-3 data-[state=active]:bg-transparent"
            style={{ color: TV_COLORS.textSecondary }}
          >
            Positions ({positions?.length || 0})
          </TabsTrigger>
          <TabsTrigger 
            value="orders" 
            className="h-8 text-xs rounded-none px-3 data-[state=active]:bg-transparent"
            style={{ color: TV_COLORS.textSecondary }}
          >
            Pending
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="h-8 text-xs rounded-none px-3 data-[state=active]:bg-transparent"
            style={{ color: TV_COLORS.textSecondary }}
          >
            <History className="w-3 h-3 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="flex-1 overflow-auto m-0 p-0">
          {positionsLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: TV_COLORS.blue }} />
            </div>
          ) : positions?.length ? (
            <div className="divide-y" style={{ borderColor: TV_COLORS.border }}>
              {positions.map(pos => {
                const priceData = livePrices?.[pos.instrument?.symbol || ''];
                return (
                  <PositionRow 
                    key={pos.id} 
                    position={pos} 
                    priceData={priceData}
                    onClose={() => handleClosePosition(pos)}
                    isClosing={closePosition.isPending}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 text-xs" style={{ color: TV_COLORS.textSecondary }}>
              No open positions
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="flex-1 overflow-auto m-0 p-0">
          {orders?.filter(o => o.status === 'pending').length ? (
            <div className="divide-y" style={{ borderColor: TV_COLORS.border }}>
              {orders.filter(o => o.status === 'pending').map(order => (
                <div 
                  key={order.id}
                  className="p-2 text-xs"
                  style={{ borderColor: TV_COLORS.border }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span style={{ color: TV_COLORS.textPrimary }}>
                        {(order.instruments as { symbol: string })?.symbol || "—"}
                      </span>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] h-4"
                        style={{ 
                          color: order.side === "buy" ? TV_COLORS.green : TV_COLORS.red,
                          borderColor: order.side === "buy" ? TV_COLORS.green : TV_COLORS.red
                        }}
                      >
                        {order.order_type.toUpperCase()} {order.side.toUpperCase()}
                      </Badge>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] h-4"
                      style={{ color: "#f59e0b", borderColor: "#f59e0b" }}
                    >
                      PENDING
                    </Badge>
                  </div>
                  <div className="flex justify-between mt-1" style={{ color: TV_COLORS.textSecondary }}>
                    <span>Qty: {Number(order.quantity).toFixed(2)}</span>
                    <span>@ ${Number(order.requested_price || 0).toFixed(4)}</span>
                  </div>
                  {(order.stop_loss || order.take_profit) && (
                    <div className="flex gap-3 mt-1" style={{ color: TV_COLORS.textSecondary }}>
                      {order.stop_loss && (
                        <span style={{ color: TV_COLORS.red }}>SL: {Number(order.stop_loss).toFixed(4)}</span>
                      )}
                      {order.take_profit && (
                        <span style={{ color: TV_COLORS.green }}>TP: {Number(order.take_profit).toFixed(4)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 text-xs" style={{ color: TV_COLORS.textSecondary }}>
              No pending orders
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto m-0 p-0">
          <OrderHistoryTable accountId={selectedAccount?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Live Account Stats component - updates instantly with price changes
function LiveAccountStats({ 
  account, 
  positions, 
  livePrices 
}: { 
  account: TradingAccount;
  positions?: PositionWithInstrument[];
  livePrices?: Record<string, LivePriceData>;
}) {
  // Calculate total unrealized P&L from all positions using live prices
  const totalUnrealizedPnL = useMemo(() => {
    if (!positions?.length || !livePrices) return 0;
    
    return positions.reduce((total, pos) => {
      const priceData = livePrices[pos.instrument?.symbol || ''];
      if (!priceData?.mid) return total + Number(pos.unrealized_pnl || 0);
      
      const contractSize = Number(pos.instrument?.contract_size || 1);
      const pnl = calculateUnrealizedPnL(
        { side: pos.side, quantity: Number(pos.quantity), entry_price: Number(pos.entry_price) },
        priceData.mid,
        contractSize
      );
      return total + pnl;
    }, 0);
  }, [positions, livePrices]);

  // Calculate total used margin from all positions
  const totalUsedMargin = useMemo(() => {
    if (!positions?.length) return Number(account.used_margin);
    return positions.reduce((total, pos) => total + Number(pos.margin_used || 0), 0);
  }, [positions, account.used_margin]);

  // Derive live equity = balance + unrealized P&L
  const balance = Number(account.balance);
  const liveEquity = balance + totalUnrealizedPnL;
  const freeMargin = liveEquity - totalUsedMargin;

  return (
    <div className="grid grid-cols-2 gap-2 p-2 shrink-0" style={{ borderBottom: `1px solid ${TV_COLORS.border}` }}>
      <div className="text-xs">
        <div style={{ color: TV_COLORS.textSecondary }}>Balance</div>
        <div className="font-semibold" style={{ color: TV_COLORS.textPrimary }}>
          ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div className="text-xs">
        <div style={{ color: TV_COLORS.textSecondary }}>Equity</div>
        <div 
          className="font-semibold" 
          style={{ color: totalUnrealizedPnL >= 0 ? TV_COLORS.green : TV_COLORS.red }}
        >
          ${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div className="text-xs">
        <div style={{ color: TV_COLORS.textSecondary }}>Free Margin</div>
        <div className="font-semibold" style={{ color: TV_COLORS.textPrimary }}>
          ${freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div className="text-xs">
        <div style={{ color: TV_COLORS.textSecondary }}>Drawdown</div>
        <div 
          className="font-semibold"
          style={{ color: Number(account.max_drawdown_pct) > 5 ? TV_COLORS.red : TV_COLORS.green }}
        >
          {Number(account.max_drawdown_pct).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function PositionRow({ 
  position, 
  priceData,
  onClose, 
  isClosing 
}: { 
  position: PositionWithInstrument; 
  priceData?: LivePriceData;
  onClose: () => void;
  isClosing: boolean;
}) {
  // Calculate real-time P&L using MID price (broker standard for display)
  const contractSize = Number(position.instrument?.contract_size || 1);
  const midPrice = priceData?.mid || 0;
  
  const pnl = midPrice > 0 
    ? calculateUnrealizedPnL(
        { side: position.side, quantity: Number(position.quantity), entry_price: Number(position.entry_price) },
        midPrice,
        contractSize
      )
    : Number(position.unrealized_pnl || 0);
  
  const isProfitable = pnl >= 0;

  return (
    <div className="p-2 text-xs" style={{ backgroundColor: TV_COLORS.bgSecondary }}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="text-[10px] h-4"
            style={{ 
              color: position.side === "buy" ? TV_COLORS.green : TV_COLORS.red,
              borderColor: position.side === "buy" ? TV_COLORS.green : TV_COLORS.red
            }}
          >
            {position.side.toUpperCase()}
          </Badge>
          <span style={{ color: TV_COLORS.textPrimary }}>
            {position.instrument?.symbol || "—"}
          </span>
        </div>
        <button
          onClick={onClose}
          disabled={isClosing}
          className="p-1 rounded hover:bg-opacity-50 transition-colors"
          style={{ color: TV_COLORS.textSecondary }}
          title="Close position"
        >
          {isClosing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
        </button>
      </div>
      <div className="flex justify-between mt-1" style={{ color: TV_COLORS.textSecondary }}>
        <span>Qty: {Number(position.quantity).toFixed(2)} @ {Number(position.entry_price).toFixed(4)}</span>
        <span style={{ color: isProfitable ? TV_COLORS.green : TV_COLORS.red }}>
          {isProfitable ? "+" : ""}{pnl.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between mt-0.5" style={{ color: TV_COLORS.textSecondary }}>
        <span>Leverage: {position.leverage}x</span>
        {midPrice > 0 && (
          <span>Now: {midPrice.toFixed(position.instrument?.symbol?.includes('USD') && !position.instrument?.symbol?.includes('BTC') ? 5 : 2)}</span>
        )}
      </div>
      {(position.stop_loss || position.take_profit) && (
        <div className="flex gap-3 mt-1 items-center">
          {position.stop_loss && (
            <span style={{ color: TV_COLORS.red }} title="Stop Loss is active">
              🔴 SL: {Number(position.stop_loss).toFixed(4)}
            </span>
          )}
          {position.take_profit && (
            <span style={{ color: TV_COLORS.green }} title="Take Profit is active">
              🟢 TP: {Number(position.take_profit).toFixed(4)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
