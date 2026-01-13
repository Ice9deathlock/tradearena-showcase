/**
 * TradingView Trading Terminal Page
 * Full-screen professional trading interface using TradingView's Trading Platform
 * 
 * This is an alternative to the custom Trading.tsx that uses TradingView's
 * native widgets and components for a more feature-complete experience.
 * 
 * Features:
 * - Full-screen chart with all TradingView tools
 * - Integrated Account Manager showing positions, orders, trades
 * - Watchlist widget for symbol tracking
 * - Depth of Market (DOM) for level 2 data
 * - News and Details widgets
 * - Advanced Order Ticket for complex orders (brackets, trailing stops, etc.)
 * - Buy/Sell buttons and lines on chart
 * - Multi-chart synchronized layouts
 * 
 * To use this page instead of the custom Trading.tsx:
 * 1. Import: import TradingViewPlatformPage from "@/pages/TradingViewPlatform"
 * 2. Add route: <Route path="/trading-tv" element={<TradingViewPlatformPage />} />
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserTradingAccounts, useCompetitionInstruments } from "@/hooks/useTrading";
import TradingViewTerminal from "@/components/trading/TradingViewTerminal";
import { createBrokerFactory } from "@/lib/tradingviewBrokerAPI";
import { Button } from "@/components/ui/button";

const TradingViewPlatformPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedSymbol, setSelectedSymbol] = useState(
    searchParams.get("symbol") || "EURUSD"
  );
  const [useTradingViewTerminal, setUseTradingViewTerminal] = useState(true);

  // Get user's trading account
  const { data: accounts, isLoading: accountsLoading } = useUserTradingAccounts();
  const selectedAccount = accounts?.[0];

  // Get available instruments
  const { data: competitionInstruments } =
    useCompetitionInstruments(selectedAccount?.competition_id);

  // Not authenticated
  if (!user) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: "#131722" }}
      >
        <div className="text-center max-w-md p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Trading Terminal
          </h2>
          <p className="mb-6 text-gray-400">
            Sign in to access the professional trading platform with live market
            data and order execution.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign In to Trade
          </Button>
        </div>
      </div>
    );
  }

  // No trading account
  if (!accountsLoading && !accounts?.length) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: "#131722" }}
      >
        <div className="text-center max-w-md p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            No Active Competition
          </h2>
          <p className="mb-6 text-gray-400">
            Join a trading competition to start trading with virtual funds.
          </p>
          <Button
            onClick={() => navigate("/competitions")}
            className="text-white bg-blue-600 hover:bg-blue-700"
          >
            Browse Competitions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* TradingView Trading Terminal - Full Screen */}
      <TradingViewTerminal
        symbol={selectedSymbol}
        accountId={selectedAccount?.id}
        brokerId={selectedAccount?.id} // Connects to TradeArenaBrokerAPI
      />

      {/* Optional: Floating menu to switch implementations */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/trading")}
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          Switch to Custom UI
        </Button>
      </div>
    </div>
  );
};

export default TradingViewPlatformPage;
