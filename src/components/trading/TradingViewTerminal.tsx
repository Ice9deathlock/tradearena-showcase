/**
 * TradingView Trading Terminal Component
 * Full integration with TradingView's Trading Platform (chat, orders, positions, etc.)
 * Replaces the custom trading UI with official TradingView widgets
 */

import { useEffect, useRef, useState } from "react";
import { createDatafeed } from "@/lib/tradingviewDatafeed";

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewTerminalProps {
  symbol?: string;
  accountId?: string;
  brokerId?: string;
}

const LIBRARY_PATH = "/Tradingview/";
const SCRIPT_SRC = `${LIBRARY_PATH}charting_library.standalone.js`;

/**
 * Full TradingView Trading Terminal with:
 * - Main chart widget
 * - Account Manager (positions, orders, trades)
 * - Watchlist widget
 * - Depth of Market (DOM)
 * - Details widget (bid/ask prices)
 * - News widget
 * - Advanced Order Ticket
 */
export const TradingViewTerminal = ({
  symbol = "EURUSD",
  accountId,
  brokerId,
}: TradingViewTerminalProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONTAINER_ID = "tv_trading_terminal";

  /**
   * Step 1: Load TradingView library script
   */
  useEffect(() => {
    setError(null);

    if (window.TradingView?.widget) {
      console.log("[TradingViewTerminal] TradingView already loaded");
      setScriptLoaded(true);
      return;
    }

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      console.log("[TradingViewTerminal] Script exists, waiting for widget...");
      const t = setInterval(() => {
        if (window.TradingView?.widget) {
          clearInterval(t);
          setScriptLoaded(true);
        }
      }, 100);
      return () => clearInterval(t);
    }

    console.log("[TradingViewTerminal] Injecting script:", SCRIPT_SRC);

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      console.log("[TradingViewTerminal] Script loaded. TradingView.widget =", !!window.TradingView?.widget);
      if (window.TradingView?.widget) {
        setScriptLoaded(true);
      } else {
        setError("TradingView loaded but TradingView.widget is missing.");
      }
    };

    script.onerror = () => {
      setError(`Failed to load TradingView script: ${SCRIPT_SRC}`);
    };

    document.head.appendChild(script);
  }, []);

  /**
   * Step 2: Initialize Trading Terminal widget
   * Uses TradingView.widget with trading-specific parameters
   */
  useEffect(() => {
    if (!scriptLoaded) return;

    const init = () => {
      try {
        const elById = document.getElementById(CONTAINER_ID);
        const elByRef = containerRef.current;
        const el = elByRef || elById;

        if (!el) {
          requestAnimationFrame(init);
          return;
        }

        if (!window.TradingView?.widget) {
          console.warn("[TradingViewTerminal] TradingView.widget not available yet");
          requestAnimationFrame(init);
          return;
        }

        console.log("[TradingViewTerminal] Initializing widget...");

        // Create custom datafeed with real-time updates
        const datafeed = createDatafeed();

        // Create Trading Terminal widget with all trading features
        widgetRef.current = new window.TradingView.widget({
          // Basic configuration
          fullscreen: true,
          symbol: symbol,
          interval: "1H",
          container: CONTAINER_ID,
          datafeed: datafeed,
          library_path: LIBRARY_PATH,
          locale: "en",
          timezone: "Etc/UTC",

          // Disable localStorage - use custom storage
          disabled_features: [
            "use_localstorage_for_settings",
            "header_fullscreen_button",
          ],

          // Enable all trading features
          enabled_features: [
            "study_templates",
            "dom_widget",
            "header_layouttoggle",
            "trading_terminal",
            "chart_trading",
          ],

          // Custom storage for chart layouts
          charts_storage_url: "https://saveload.tradingview.com",
          charts_storage_api_version: "1.1",
          client_id: "tradearena_platform",
          user_id: accountId || "user_default",

          // Theme
          theme: "dark",

          // Widget bar with multiple tools
          widgetbar: {
            details: true, // Symbol details (bid/ask prices)
            news: true, // News feed
            watchlist: true, // Watchlist widget
            datawindow: true, // Data window
            watchlist_settings: {
              default_symbols: ["EURUSD", "GBPUSD", "XAUUSD", "BTCUSD"],
            },
          },

          // News feed configuration
          rss_news_feed: {
            default: [
              {
                url: "https://demo-feed-data.tradingview.com/news?symbol={SYMBOL}",
                name: "Market News",
              },
            ],
          },

          // Broker integration for trading (optional)
          // Requires implementing Broker API
          broker_factory: brokerId ? createBrokerFactory(brokerId) : undefined,

          broker_config: {
            configFlags: {
              // Order types
              supportNativeReversePosition: true,
              supportClosePosition: true,
              supportPLUpdate: true,
              supportLevel2Data: false,
              showQuantityInsteadOfAmount: true,
              supportEditAmount: true,
              supportOrderBrackets: true,
              supportMarketBrackets: true,
              supportPositionBrackets: true,
              supportOrdersHistory: true,
              supportModifyOrder: true,
            },
            durations: [
              { name: "DAY", value: "DAY" },
              { name: "GTC", value: "GTC" },
              { name: "IOC", value: "IOC" },
            ],
          },
        });

        console.log("[TradingViewTerminal] Widget initialized successfully");
        setIsReady(true);

        widgetRef.current.onChartReady(() => {
          console.log("[TradingViewTerminal] Chart ready");
          // Chart is fully loaded - can add overlays, drawings, etc.
        });

        return () => {
          if (widgetRef.current?.remove) {
            widgetRef.current.remove();
          }
        };
      } catch (e: any) {
        console.error("[TradingViewTerminal] Init error:", e);
        setError(e.message);
      }
    };

    init();
  }, [scriptLoaded, symbol, accountId, brokerId]);

  return (
    <div
      ref={containerRef}
      id={CONTAINER_ID}
      className="w-full h-full"
      style={{
        backgroundColor: "#131722",
        color: "#d1d4dc",
      }}
    >
      {!isReady && !error && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm text-gray-400">Loading TradingView Terminal...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <p className="text-red-500 font-semibold mb-2">Error Loading Terminal</p>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Create a broker factory function for trading capabilities
 * This would connect to your backend trading engine (CFD OMS)
 */
function createBrokerFactory(brokerId: string) {
  return function (host: any) {
    return {
      // Implement Broker API methods here
      // See TradingView docs for full broker API interface
      accountsMetainfo: () => Promise.resolve([
        {
          id: brokerId,
          name: "TradeArena Account",
          currency: "USD",
        },
      ]),
      orders: () => Promise.resolve([]),
      positions: () => Promise.resolve([]),
      placeOrder: (order: any) => {
        console.log("[Broker] Place order:", order);
        return Promise.resolve({
          orderId: Math.random().toString(),
          status: "accepted",
        });
      },
      modifyOrder: (order: any) => Promise.resolve(true),
      cancelOrder: (orderId: string) => Promise.resolve(true),
      reversePosition: (positionId: string) => Promise.resolve(true),
      closePosition: (positionId: string) => Promise.resolve(true),
    };
  };
}

export default TradingViewTerminal;
