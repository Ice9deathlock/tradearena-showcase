import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, CandlestickData, Time } from "lightweight-charts";

interface CandlestickChartProps {
  instrumentId: string | undefined;
  symbol: string;
  currentPrice?: number;
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const timeframeConfig: Record<Timeframe, { label: string; seconds: number }> = {
  "1m": { label: "1m", seconds: 60 },
  "5m": { label: "5m", seconds: 5 * 60 },
  "15m": { label: "15m", seconds: 15 * 60 },
  "1h": { label: "1H", seconds: 60 * 60 },
  "4h": { label: "4H", seconds: 4 * 60 * 60 },
  "1d": { label: "1D", seconds: 24 * 60 * 60 },
};

// Generate mock candlestick data for demo
const generateMockCandles = (basePrice: number, count: number, timeframe: Timeframe): CandlestickData[] => {
  const candles: CandlestickData[] = [];
  let currentPrice = basePrice * (0.95 + Math.random() * 0.1); // Start with some variance
  const now = Math.floor(Date.now() / 1000);
  const interval = timeframeConfig[timeframe].seconds;
  
  for (let i = count; i >= 0; i--) {
    const volatility = basePrice * 0.003;
    const trend = Math.sin(i / 20) * volatility * 0.5; // Add some trend
    const change = (Math.random() - 0.5) * volatility * 2 + trend;
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    
    candles.push({
      time: (now - i * interval) as Time,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
    });
    
    currentPrice = close;
  }
  
  return candles;
};

const CandlestickChart = ({ instrumentId, symbol, currentPrice = 100 }: CandlestickChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with dark theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "hsl(220, 10%, 45%)",
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: "hsl(220, 15%, 12%)" },
        horzLines: { color: "hsl(220, 15%, 12%)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "hsl(220, 15%, 30%)",
          width: 1,
          style: 2,
          labelBackgroundColor: "hsl(220, 18%, 15%)",
        },
        horzLine: {
          color: "hsl(220, 15%, 30%)",
          width: 1,
          style: 2,
          labelBackgroundColor: "hsl(220, 18%, 15%)",
        },
      },
      rightPriceScale: {
        borderColor: "hsl(220, 15%, 15%)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "hsl(220, 15%, 15%)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create candlestick series with professional colors
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // Generate and set mock data
    const candles = generateMockCandles(currentPrice, 150, timeframe);
    candlestickSeries.setData(candles);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);
    handleResize();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [instrumentId, timeframe, currentPrice]);

  return (
    <div className="h-full flex flex-col">
      {/* Timeframe Selector */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border/30 bg-[hsl(220,18%,6%)]">
        {(Object.keys(timeframeConfig) as Timeframe[]).map((tf) => (
          <button
            key={tf}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              timeframe === tf
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(220,15%,12%)]'
            }`}
            onClick={() => setTimeframe(tf)}
          >
            {timeframeConfig[tf].label}
          </button>
        ))}
        
        {/* Chart type indicators */}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-chart-up"></span>
            Bullish
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-chart-down"></span>
            Bearish
          </span>
        </div>
      </div>
      
      {/* Chart Container */}
      <div ref={chartContainerRef} className="flex-1 min-h-0" />
    </div>
  );
};

export default CandlestickChart;
