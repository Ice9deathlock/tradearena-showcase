/**
 * Right Sidebar - Watchlist & Symbol Details
 */

import { useState, useMemo } from "react";
import { Star, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { LivePriceData } from "@/hooks/useTrading";

interface RightSidebarProps {
  instrumentsByClass: Record<string, { symbol: string; name: string; id?: string }[]>;
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  livePrices?: Record<string, LivePriceData>;
  selectedInstrument?: {
    symbol: string;
    name: string;
    asset_class: string;
  } | null;
}

const ASSET_ICONS: Record<string, string> = {
  forex: "FX",
  crypto: "₿",
  commodities: "◆",
  indices: "📊",
  stocks: "📈",
};

export default function RightSidebar({
  instrumentsByClass,
  selectedSymbol,
  onSymbolChange,
  livePrices,
  selectedInstrument,
}: RightSidebarProps) {
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({
    forex: true,
    crypto: true,
    commodities: true,
    indices: true,
    stocks: true,
  });
  const [searchQuery, setSearchQuery] = useState("");

  const toggleClass = (cls: string) => {
    setExpandedClasses(prev => ({ ...prev, [cls]: !prev[cls] }));
  };

  // Filter instruments by search
  const filteredInstruments = useMemo(() => {
    if (!searchQuery) return instrumentsByClass;
    
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, { symbol: string; name: string; id?: string }[]> = {};
    
    Object.entries(instrumentsByClass).forEach(([cls, instruments]) => {
      const matches = instruments.filter(i => 
        i.symbol.toLowerCase().includes(query) || 
        i.name.toLowerCase().includes(query)
      );
      if (matches.length) filtered[cls] = matches;
    });
    
    return filtered;
  }, [instrumentsByClass, searchQuery]);

  const currentPrice = livePrices?.[selectedSymbol];

  return (
    <div className="w-72 flex flex-col shrink-0 bg-[#1e222d] border-l border-[#2a2e39]">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[#2a2e39]">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-[#787b86]" />
          <span className="text-sm font-medium text-[#d1d4dc]">Watchlist</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-[#2a2e39]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#787b86]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-7 pl-7 text-xs bg-[#2a2e39] border-0 text-[#d1d4dc] placeholder:text-[#787b86]"
          />
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center px-3 py-1.5 text-[10px] uppercase text-[#787b86] border-b border-[#2a2e39]">
        <span className="flex-1">Symbol</span>
        <span className="w-20 text-right">Price</span>
        <span className="w-16 text-right">Chg%</span>
      </div>

      {/* Watchlist */}
      <ScrollArea className="flex-1">
        {Object.entries(filteredInstruments).map(([cls, instruments]) => {
          if (!instruments.length) return null;
          const isExpanded = expandedClasses[cls] !== false;

          return (
            <div key={cls}>
              {/* Category Header */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2e39]"
                onClick={() => toggleClass(cls)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-[#787b86]" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-[#787b86]" />
                )}
                <span className="text-xs font-medium text-[#787b86] uppercase">
                  {cls}
                </span>
                <span className="text-[10px] text-[#787b86]">
                  ({instruments.length})
                </span>
              </button>

              {/* Instruments */}
              {isExpanded && instruments.map((inst) => {
                const price = livePrices?.[inst.symbol];
                const isSelected = selectedSymbol === inst.symbol;
                // Calculate mock change for demo
                const changePercent = price ? ((price.mid - price.bid) / price.bid * 100) : 0;
                const isPositive = changePercent >= 0;

                return (
                  <button
                    key={inst.symbol}
                    className={`w-full flex items-center px-3 py-2 transition-colors ${
                      isSelected 
                        ? 'bg-[#2962ff]/15' 
                        : 'hover:bg-[#2a2e39]'
                    }`}
                    onClick={() => onSymbolChange(inst.symbol)}
                  >
                    {/* Symbol Info */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-[#2a2e39] flex items-center justify-center text-[10px] font-bold text-[#787b86]">
                        {inst.symbol.substring(0, 2)}
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className={`text-xs font-medium truncate ${
                          isSelected ? 'text-[#2962ff]' : 'text-[#d1d4dc]'
                        }`}>
                          {inst.symbol}
                        </span>
                        <span className="text-[10px] text-[#787b86] truncate">
                          {inst.name}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="w-20 text-right">
                      <span className="text-xs text-[#d1d4dc] font-medium">
                        {price?.mid?.toFixed(inst.symbol.includes("BTC") ? 0 : 4) || "—"}
                      </span>
                    </div>

                    {/* Change */}
                    <div className="w-16 flex items-center justify-end gap-1">
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 text-[#26a69a]" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-[#ef5350]" />
                      )}
                      <span className={`text-xs ${isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                        {isPositive ? '+' : ''}{(Math.random() * 2 - 1).toFixed(2)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </ScrollArea>

      {/* Symbol Details Card */}
      {selectedInstrument && currentPrice && (
        <div className="border-t border-[#2a2e39] p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#2a2e39] flex items-center justify-center text-sm font-bold text-[#d1d4dc]">
              {selectedSymbol.substring(0, 2)}
            </div>
            <div>
              <div className="text-base font-semibold text-[#d1d4dc]">
                {selectedSymbol}
              </div>
              <div className="text-xs text-[#787b86]">
                {selectedInstrument.name}
              </div>
            </div>
          </div>

          {/* Current Price */}
          <div className="mb-3">
            <div className="text-2xl font-bold text-[#d1d4dc]">
              {currentPrice.mid.toFixed(selectedSymbol.includes("BTC") ? 0 : 5)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#26a69a]">+0.0023</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#26a69a]/20 text-[#26a69a]">
                +0.18%
              </span>
            </div>
          </div>

          {/* Bid/Ask */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#2a2e39] rounded p-2">
              <div className="text-[#787b86] mb-1">Bid</div>
              <div className="text-[#ef5350] font-medium">
                {currentPrice.bid.toFixed(selectedSymbol.includes("BTC") ? 0 : 5)}
              </div>
            </div>
            <div className="bg-[#2a2e39] rounded p-2">
              <div className="text-[#787b86] mb-1">Ask</div>
              <div className="text-[#26a69a] font-medium">
                {currentPrice.ask.toFixed(selectedSymbol.includes("BTC") ? 0 : 5)}
              </div>
            </div>
          </div>

          {/* Spread */}
          <div className="mt-2 text-center text-[10px] text-[#787b86]">
            Spread: {((currentPrice.ask - currentPrice.bid) * (selectedSymbol.includes("BTC") ? 1 : 10000)).toFixed(1)} pips
          </div>
        </div>
      )}
    </div>
  );
}
