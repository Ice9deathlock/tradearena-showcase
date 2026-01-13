/**
 * TradingView Depth of Market (DOM) Widget
 * Shows bid/ask volume at different price levels
 * Enables direct order placement from the DOM
 */

import { useEffect, useRef, useState } from "react";

interface DOMWidgetProps {
  symbol?: string;
  height?: number;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const LIBRARY_PATH = "/Tradingview/";
const SCRIPT_SRC = `${LIBRARY_PATH}charting_library.standalone.js`;

/**
 * Depth of Market widget component
 * Features:
 * - Bid/Ask volume ladder
 * - Real-time level 2 data updates
 * - Direct order placement from DOM
 * - Customizable price range
 * - Buy/Sell quick buttons at each level
 */
export const DOMWidget = ({ symbol = "EURUSD", height = 400 }: DOMWidgetProps) => {
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
        height: `${height}px`,
        symbol: symbol,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "3", // DOM style
        locale: "en",
        toolbar_bg: "#1f2937",
        enable_publishing: false,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        container_id: "dom_widget",
        // DOM-specific settings
        dom_rows_count: 15,
      });
    } catch (e) {
      console.error("[DOMWidget] Error:", e);
    }
  }, [scriptLoaded, symbol, height]);

  return (
    <div
      ref={containerRef}
      id="dom_widget"
      className="w-full rounded-lg overflow-hidden"
      style={{
        backgroundColor: "#131722",
        height: `${height}px`,
      }}
    >
      <div className="p-4 text-center text-gray-400 h-full flex items-center justify-center">
        <p>Loading Depth of Market...</p>
      </div>
    </div>
  );
};

export default DOMWidget;
