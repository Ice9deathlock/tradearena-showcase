/**
 * Quick Trade Overlay - Buy/Sell buttons overlaid on chart
 */

import { useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  usePlaceOrder,
  TradingAccount,
  LivePriceData,
} from "@/hooks/useTrading";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QuickTradeOverlayProps {
  symbol: string;
  instrument?: {
    id: string;
    symbol: string;
    name: string;
  } | null;
  account?: TradingAccount;
  livePrices?: Record<string, LivePriceData>;
}

export default function QuickTradeOverlay({
  symbol,
  instrument,
  account,
  livePrices,
}: QuickTradeOverlayProps) {
  const [quantity, setQuantity] = useState("0.1");
  const [leverage, setLeverage] = useState("10");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const placeOrder = usePlaceOrder();

  const priceData = livePrices?.[symbol];
  const isBTC = symbol.includes("BTC");
  const decimals = isBTC ? 0 : 5;

  const handlePlaceOrder = (side: "buy" | "sell") => {
    if (!account || !instrument) return;

    placeOrder.mutate({
      competition_id: account.competition_id,
      instrument_id: instrument.id,
      side,
      quantity: parseFloat(quantity) || 0.1,
      leverage: parseFloat(leverage) || 10,
      client_price: priceData?.mid,
      order_type: "market",
      create_new_position: true,
      stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
      take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
    });
  };

  if (!priceData || !account || !instrument) return null;

  const spread = ((priceData.ask - priceData.bid) * (isBTC ? 1 : 10000)).toFixed(1);

  return (
    <div className="absolute top-3 left-3 z-20">
      <div className="flex items-stretch gap-0.5 bg-[#1e222d]/95 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl border border-[#2a2e39]">
        {/* Sell Button */}
        <button
          className="flex flex-col items-center justify-center px-4 py-2 bg-gradient-to-b from-[#ef5350] to-[#d32f2f] hover:from-[#f44336] hover:to-[#c62828] transition-all disabled:opacity-50 min-w-[90px]"
          onClick={() => handlePlaceOrder("sell")}
          disabled={placeOrder.isPending}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingDown className="w-3 h-3 text-white/80" />
            <span className="text-[10px] font-semibold text-white/80 tracking-wider">SELL</span>
          </div>
          <span className="text-lg font-bold text-white tabular-nums">
            {placeOrder.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              priceData.bid.toFixed(decimals)
            )}
          </span>
        </button>

        {/* Middle Section - Spread & Quantity */}
        <div className="flex flex-col items-center justify-center px-3 py-1 bg-[#2a2e39]">
          {/* Spread */}
          <div className="text-[9px] text-[#787b86] mb-1">{spread} pips</div>
          
          {/* Quantity Input */}
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-16 h-7 text-center text-sm font-semibold bg-[#1e222d] border-[#363a45] text-[#d1d4dc]"
            step="0.01"
            min="0.01"
          />

          {/* Settings */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="mt-1 p-1 rounded hover:bg-[#363a45] text-[#787b86] hover:text-[#d1d4dc] transition-colors">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-52 p-3 bg-[#1e222d] border-[#363a45]"
              side="bottom"
            >
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[#787b86] uppercase">Leverage</label>
                  <Input
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    className="h-7 mt-1 text-xs bg-[#2a2e39] border-[#363a45] text-[#d1d4dc]"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#787b86] uppercase">Stop Loss</label>
                  <Input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder={`e.g. ${(priceData.bid * 0.99).toFixed(decimals)}`}
                    className="h-7 mt-1 text-xs bg-[#2a2e39] border-[#363a45] text-[#d1d4dc] placeholder:text-[#787b86]/50"
                    step="0.00001"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#787b86] uppercase">Take Profit</label>
                  <Input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder={`e.g. ${(priceData.ask * 1.01).toFixed(decimals)}`}
                    className="h-7 mt-1 text-xs bg-[#2a2e39] border-[#363a45] text-[#d1d4dc] placeholder:text-[#787b86]/50"
                    step="0.00001"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Buy Button */}
        <button
          className="flex flex-col items-center justify-center px-4 py-2 bg-gradient-to-b from-[#26a69a] to-[#1e8b7e] hover:from-[#2bbd9a] hover:to-[#26a69a] transition-all disabled:opacity-50 min-w-[90px]"
          onClick={() => handlePlaceOrder("buy")}
          disabled={placeOrder.isPending}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-white/80" />
            <span className="text-[10px] font-semibold text-white/80 tracking-wider">BUY</span>
          </div>
          <span className="text-lg font-bold text-white tabular-nums">
            {placeOrder.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              priceData.ask.toFixed(decimals)
            )}
          </span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-3 mt-2 px-2">
        <div className="text-[10px] text-[#787b86]">
          Leverage: <span className="text-[#d1d4dc] font-medium">{leverage}x</span>
        </div>
        {stopLoss && (
          <div className="text-[10px] text-[#787b86]">
            SL: <span className="text-[#ef5350] font-medium">{stopLoss}</span>
          </div>
        )}
        {takeProfit && (
          <div className="text-[10px] text-[#787b86]">
            TP: <span className="text-[#26a69a] font-medium">{takeProfit}</span>
          </div>
        )}
      </div>
    </div>
  );
}
