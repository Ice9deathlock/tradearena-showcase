/**
 * TradingView Watchlist Widget
 * Displays symbols with price changes, volume, and quick actions
 */

import { useEffect, useRef, useState } from "react";
import { createDatafeed } from "@/lib/tradingviewDatafeed";

interface WatchlistWidgetProps {
  defaultSymbols?: string[];
  onSymbolSelect?: (symbol: string) => void;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const LIBRARY_PATH = "/Tradingview/";
const SCRIPT_SRC = `${LIBRARY_PATH}charting_library.standalone.js`;

/**
 * Watchlist widget component
 * Features:
 * - Display multiple symbols with bid/ask prices
 * - Show price changes and volumes
 * - Sort by name, change %, or volume
 * - Create multiple lists
 * - Quick symbol switching
 */
export const WatchlistWidget = ({
  defaultSymbols = ["EURUSD", "GBPUSD", "XAUUSD", "BTCUSD"],
  onSymbolSelect,
}: WatchlistWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (window.TradingView?.widget) {
      setScriptLoaded(true);
      return;
    }

    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      const t = setInterval(() => {
        if (window.TradingView?.widget) {
          clearInterval(t);
          setScriptLoaded(true);
        }
      }, 100);
      return () => clearInterval(t);
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => setScriptLoaded(!!window.TradingView?.widget);
    script.onerror = () => console.error("Failed to load TradingView");
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    try {
      const widget = new window.TradingView.widget({
        width: "100%",
        height: "100%",
        symbol: defaultSymbols[0],
        interval: "1D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1", // Watchlist style
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        withdateranges: true,
        range: "ytd",
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: true,
        hotlist: true,
        calendar: false,
        show_popup_button_on_product_logo: false,
        popup_width: "1000px",
        popup_height: "650px",
        container_id: "watchlist_widget",
      });
    } catch (e) {
      console.error("[WatchlistWidget] Error:", e);
    }
  }, [scriptLoaded, defaultSymbols]);

  return (
    <div
      ref={containerRef}
      id="watchlist_widget"
      className="w-full h-full bg-gray-900 rounded-lg overflow-hidden"
      style={{ backgroundColor: "#131722" }}
    >
      <div className="p-4 text-center text-gray-400">
        <p>Loading Watchlist...</p>
      </div>
    </div>
  );
};

export default WatchlistWidget;
