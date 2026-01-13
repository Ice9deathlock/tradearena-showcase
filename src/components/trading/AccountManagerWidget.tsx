/**
 * TradingView Account Manager Widget
 * Displays account information, positions, orders, and trading history
 * Integrates with Broker API for order management
 */

import { useEffect, useRef, useState } from "react";

interface AccountManagerWidgetProps {
  accountId?: string;
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
 * Account Manager widget component (Trading Panel)
 * Features:
 * - Display positions with P&L
 * - Show open/closed orders
 * - Trading history
 * - Account statistics (balance, margin, equity)
 * - Modify/close positions
 * - Cancel/modify orders
 * - Custom tabs for additional data
 */
export const AccountManagerWidget = ({
  accountId,
  height = 300,
}: AccountManagerWidgetProps) => {
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
      // Account Manager is typically embedded in the main widget
      // This creates a standalone view of account info
      const widget = new window.TradingView.widget({
        width: "100%",
        height: `${height}px`,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "7", // Account Manager style
        locale: "en",
        toolbar_bg: "#1f2937",
        enable_publishing: false,
        hide_side_toolbar: true,
        container_id: "account_manager_widget",
        // Account-specific settings
        account_id: accountId,
      });
    } catch (e) {
      console.error("[AccountManagerWidget] Error:", e);
    }
  }, [scriptLoaded, accountId, height]);

  return (
    <div
      ref={containerRef}
      id="account_manager_widget"
      className="w-full rounded-lg overflow-hidden"
      style={{
        backgroundColor: "#131722",
        height: `${height}px`,
      }}
    >
      <div className="p-4 text-center text-gray-400 h-full flex items-center justify-center">
        <p>Loading Account Manager...</p>
      </div>
    </div>
  );
};

export default AccountManagerWidget;
