/**
 * TradingView Trading Terminal - Exact Replica
 * Full-screen professional trading interface modeled after trading-terminal.tradingview-widget.com
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TVChart from "@/components/trading/TVChart";
import TopToolbar from "@/components/trading/terminal/TopToolbar";
import LeftToolbar from "@/components/trading/terminal/LeftToolbar";
import RightSidebar from "@/components/trading/terminal/RightSidebar";
import BottomPanel from "@/components/trading/terminal/BottomPanel";
import QuickTradeOverlay from "@/components/trading/terminal/QuickTradeOverlay";
import { useCompetitionInstruments, useUserTradingAccounts, useLivePrices } from "@/hooks/useTrading";
import { useTradingRealtime } from "@/hooks/useRealtimePrices";
import { Button } from "@/components/ui/button";

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

const Trading = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [selectedSymbol, setSelectedSymbol] = useState(searchParams.get("symbol") || "EURUSD");
  const [interval, setInterval] = useState("1h");
  const [bottomPanelExpanded, setBottomPanelExpanded] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);

  // Get user's trading accounts and competition instruments
  const { data: accounts, isLoading: accountsLoading } = useUserTradingAccounts();
  const selectedAccount = accounts?.[0];
  const { data: competitionInstruments } = useCompetitionInstruments(selectedAccount?.competition_id);

  // Get available symbols from competition - grouped by asset class
  const instrumentsByClass = useMemo(() => {
    if (!competitionInstruments?.length) {
      return {
        forex: [{ symbol: 'EURUSD', name: 'Euro/US Dollar' }, { symbol: 'GBPUSD', name: 'British Pound/US Dollar' }],
        crypto: [{ symbol: 'BTCUSD', name: 'Bitcoin/US Dollar' }],
        commodities: [{ symbol: 'XAUUSD', name: 'Gold/US Dollar' }],
        indices: [],
        stocks: [],
      };
    }
    const grouped: Record<string, { symbol: string; name: string; id: string }[]> = {
      forex: [],
      crypto: [],
      commodities: [],
      indices: [],
      stocks: [],
    };
    competitionInstruments.forEach(ci => {
      if (ci.instrument) {
        const cls = ci.instrument.asset_class || 'forex';
        if (!grouped[cls]) grouped[cls] = [];
        grouped[cls].push({
          symbol: ci.instrument.symbol,
          name: ci.instrument.name,
          id: ci.instrument.id,
        });
      }
    });
    return grouped;
  }, [competitionInstruments]);

  const allSymbols = useMemo(() => {
    return Object.values(instrumentsByClass).flat().map(i => i.symbol);
  }, [instrumentsByClass]);

  // Get instrument IDs for realtime subscription
  const instrumentIds = useMemo(() => {
    return competitionInstruments
      ?.map(ci => ci.instrument?.id)
      .filter(Boolean) as string[] || [];
  }, [competitionInstruments]);

  // Subscribe to realtime updates
  useTradingRealtime(selectedAccount?.id, instrumentIds);

  // Get live prices for watchlist
  const { data: livePrices } = useLivePrices(allSymbols);

  // Get selected instrument details
  const selectedInstrument = useMemo(() => {
    return competitionInstruments?.find(ci => ci.instrument?.symbol === selectedSymbol)?.instrument;
  }, [competitionInstruments, selectedSymbol]);

  // Update URL when symbol changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("symbol", selectedSymbol);
    navigate(`/trading?${newParams.toString()}`, { replace: true });
  }, [selectedSymbol]);

  const handleSymbolChange = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
  }, []);

  // Not authenticated - show login prompt
  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: TV_COLORS.bg }}>
        <div className="text-center max-w-md p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Trading Terminal</h2>
          <p className="mb-6" style={{ color: TV_COLORS.textSecondary }}>
            Sign in to access the full trading terminal with live market data and order execution.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="text-white"
            style={{ backgroundColor: TV_COLORS.blue }}
          >
            Sign In to Trade
          </Button>
        </div>
      </div>
    );
  }

  // No competition account - show join prompt
  if (!accountsLoading && !accounts?.length) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: TV_COLORS.bg }}>
        <div className="text-center max-w-md p-8">
          <h2 className="text-2xl font-bold text-white mb-4">No Active Competition</h2>
          <p className="mb-6" style={{ color: TV_COLORS.textSecondary }}>
            Join a competition to start trading with virtual funds.
          </p>
          <Button
            onClick={() => navigate("/competitions")}
            className="text-white"
            style={{ backgroundColor: TV_COLORS.blue }}
          >
            Browse Competitions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: TV_COLORS.bg }}>
      {/* Top Toolbar */}
      <TopToolbar
        selectedSymbol={selectedSymbol}
        selectedInstrument={selectedInstrument}
        interval={interval}
        onIntervalChange={setInterval}
        onSymbolSearch={handleSymbolChange}
        rightSidebarVisible={rightSidebarVisible}
        onToggleRightSidebar={() => setRightSidebarVisible(!rightSidebarVisible)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawing Toolbar */}
        <LeftToolbar />

        {/* Chart Area with Overlaid Trade Buttons */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Chart */}
          <div 
            className="flex-1 min-h-0 relative"
            style={{ 
              height: bottomPanelExpanded 
                ? `calc(100% - ${bottomPanelHeight}px)` 
                : "calc(100% - 32px)" 
            }}
          >
            <TVChart
              symbol={selectedSymbol}
              instrumentId={selectedInstrument?.id}
              accountId={selectedAccount?.id}
            />

            {/* Quick Trade Overlay - Buy/Sell buttons on chart */}
            <QuickTradeOverlay
              symbol={selectedSymbol}
              instrument={selectedInstrument}
              account={selectedAccount}
              livePrices={livePrices}
            />
          </div>

          {/* Bottom Panel - Account Manager / Trade */}
          <BottomPanel
            isExpanded={bottomPanelExpanded}
            onToggle={() => setBottomPanelExpanded(!bottomPanelExpanded)}
            height={bottomPanelHeight}
            selectedSymbol={selectedSymbol}
            onSymbolChange={handleSymbolChange}
            account={selectedAccount}
            livePrices={livePrices}
          />
        </div>

        {/* Right Sidebar - Watchlist, Symbol Info, News */}
        {rightSidebarVisible && (
          <RightSidebar
            instrumentsByClass={instrumentsByClass}
            selectedSymbol={selectedSymbol}
            onSymbolChange={handleSymbolChange}
            livePrices={livePrices}
            selectedInstrument={selectedInstrument}
          />
        )}
      </div>
    </div>
  );
};

export default Trading;
