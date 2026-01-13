/**
 * TradingView Charting Library Component
 * Mounts TradingView widget into a guaranteed existing DOM element.
 */

import { useEffect, useRef, useState } from "react";
import { createDatafeed } from "@/lib/tradingviewDatafeed";

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TVChartProps {
  symbol: string;
  instrumentId?: string;
  accountId?: string; // not used here yet; keep for later markers
}

const LIBRARY_PATH = "/Tradingview/";
const SCRIPT_SRC = `${LIBRARY_PATH}charting_library.standalone.js`;

const TVChart = ({ symbol, instrumentId }: TVChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hard constant container id (prevents the '#' empty-id bug)
  const CONTAINER_ID = "tv_chart_container";

  // 1) Load TradingView library script once
  useEffect(() => {
    setError(null);

    // Already available
    if (window.TradingView?.widget) {
      console.log("[TVChart] TradingView already loaded");
      setScriptLoaded(true);
      return;
    }

    // Script already injected
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      console.log("[TVChart] Script exists, waiting for widget...");
      const t = setInterval(() => {
        if (window.TradingView?.widget) {
          clearInterval(t);
          setScriptLoaded(true);
        }
      }, 100);
      return () => clearInterval(t);
    }

    console.log("[TVChart] Injecting script:", SCRIPT_SRC);

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      console.log("[TVChart] Script loaded. TradingView.widget =", !!window.TradingView?.widget);
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

  // 2) Initialize widget AFTER script + container exist
  useEffect(() => {
    if (!scriptLoaded) return;

    const init = () => {
      try {
        // Ensure container exists in DOM
        const elById = document.getElementById(CONTAINER_ID);
        const elByRef = containerRef.current;

        console.log("[TVChart] init: container_id =", CONTAINER_ID, "elById =", elById, "elByRef =", elByRef);

        const el = elByRef || elById;
        if (!el) {
          // React may not have painted yet; retry next frame
          requestAnimationFrame(init);
          return;
        }

        if (!window.TradingView?.widget) {
          setError("TradingView.widget is not available.");
          return;
        }

        // Clean up any previous widget
        if (widgetRef.current) {
          try {
            widgetRef.current.remove();
          } catch {}
          widgetRef.current = null;
        }

        const instrumentIdMap: Record<string, string> = {};
        if (instrumentId) instrumentIdMap[symbol] = instrumentId;

        const datafeed = createDatafeed(instrumentIdMap);

        console.log("[TVChart] Creating widget for symbol:", symbol);

        const widget = new window.TradingView.widget({
          // ✅ Provide BOTH
          container_id: CONTAINER_ID,
          container: el, // some builds use this directly

          library_path: LIBRARY_PATH, // trailing slash is important
          datafeed,
          symbol,
          interval: "60",
          timezone: "Etc/UTC",
          theme: "Dark",
          autosize: true,
          debug: true,
        });

        widgetRef.current = widget;

        widget.onChartReady(() => {
          console.log("[TVChart] Chart ready");
          setIsReady(true);
          setError(null);
        });
      } catch (e: any) {
        console.error("[TVChart] init error:", e);
        setError(`Failed to initialize chart: ${String(e?.message || e)}`);
      }
    };

    // Start init on next frame to ensure DOM is painted
    requestAnimationFrame(init);

    return () => {
      setIsReady(false);
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.warn("[TVChart] cleanup remove() error:", e);
        }
        widgetRef.current = null;
      }
    };
  }, [scriptLoaded, symbol, instrumentId]);

  return (
    <div className="h-full w-full relative bg-[#131722]">
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#131722]">
          <div className="flex items-center gap-3 text-[#787b86]">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-emerald-400" />
            Loading chart...
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#131722] p-6">
          <div className="max-w-md text-center">
            <div className="text-red-400 mb-2 font-semibold">Chart Error</div>
            <div className="text-[#787b86] text-sm mb-4">{error}</div>
            <button
              className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* IMPORTANT: this element must always exist */}
      <div id={CONTAINER_ID} ref={containerRef} className="h-full w-full" />
    </div>
  );
};

export default TVChart;
