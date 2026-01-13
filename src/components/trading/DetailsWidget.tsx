/**
 * TradingView Details Widget
 * Shows symbol information: bid/ask prices, trading hours, price ranges
 */

import { useEffect, useRef, useState } from "react";

interface DetailsWidgetProps {
  symbol?: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const LIBRARY_PATH = "/Tradingview/";
const SCRIPT_SRC = `${LIBRARY_PATH}charting_library.standalone.js`;

/**
 * Details widget component
 * Features:
 * - Current bid/ask prices
 * - Daily high/low
 * - Open/Close prices
 * - Trading volume
 * - Trading hours status
 * - Symbol information (contract size, pip value, etc.)
 */
export const DetailsWidget = ({ symbol = "EURUSD" }: DetailsWidgetProps) => {
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
        symbol: symbol,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "8", // Details style
        locale: "en",
        toolbar_bg: "#1f2937",
        enable_publishing: false,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        container_id: "details_widget",
      });
    } catch (e) {
      console.error("[DetailsWidget] Error:", e);
    }
  }, [scriptLoaded, symbol]);

  return (
    <div
      ref={containerRef}
      id="details_widget"
      className="w-full h-full bg-gray-900 rounded-lg overflow-hidden"
      style={{ backgroundColor: "#131722" }}
    >
      <div className="p-4 text-center text-gray-400">
        <p>Loading Symbol Details...</p>
      </div>
    </div>
  );
};

export default DetailsWidget;
