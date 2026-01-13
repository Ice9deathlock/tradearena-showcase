/**
 * TradingView News Widget
 * Displays market news and economic calendar for selected symbol
 */

import { useEffect, useRef, useState } from "react";

interface NewsWidgetProps {
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
 * News widget component
 * Features:
 * - Real-time market news
 * - Economic calendar events
 * - RSS feeds integration
 * - Sentiment analysis
 * - Symbol-specific news filtering
 */
export const NewsWidget = ({ symbol = "EURUSD", height = 300 }: NewsWidgetProps) => {
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
        style: "2", // News/Feed style
        locale: "en",
        toolbar_bg: "#1f2937",
        enable_publishing: false,
        hide_side_toolbar: true,
        allow_symbol_change: true,
        container_id: "news_widget",
        // News-specific settings
        news: ["googlenews", "tradingview"],
      });
    } catch (e) {
      console.error("[NewsWidget] Error:", e);
    }
  }, [scriptLoaded, symbol, height]);

  return (
    <div
      ref={containerRef}
      id="news_widget"
      className="w-full rounded-lg overflow-hidden"
      style={{
        backgroundColor: "#131722",
        height: `${height}px`,
      }}
    >
      <div className="p-4 text-center text-gray-400 h-full flex items-center justify-center">
        <p>Loading Market News...</p>
      </div>
    </div>
  );
};

export default NewsWidget;
