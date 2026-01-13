/**
 * Top Toolbar - Clean TradingView-style header
 */

import { useState } from "react";
import { 
  Search, 
  Plus, 
  ChevronDown, 
  Camera, 
  Settings, 
  Maximize2, 
  Minimize2, 
  LayoutGrid, 
  PanelRightOpen, 
  PanelRightClose,
  Undo2,
  Redo2,
  BarChart2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopToolbarProps {
  selectedSymbol: string;
  selectedInstrument?: {
    symbol: string;
    name: string;
    asset_class: string;
  } | null;
  interval: string;
  onIntervalChange: (interval: string) => void;
  onSymbolSearch: (symbol: string) => void;
  rightSidebarVisible: boolean;
  onToggleRightSidebar: () => void;
}

const INTERVALS = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "D", value: "D" },
  { label: "W", value: "W" },
  { label: "M", value: "M" },
];

const CHART_TYPES = [
  { label: "Candles", value: "candles" },
  { label: "Bars", value: "bars" },
  { label: "Line", value: "line" },
  { label: "Area", value: "area" },
  { label: "Heikin Ashi", value: "heikinashi" },
];

export default function TopToolbar({
  selectedSymbol,
  selectedInstrument,
  interval,
  onIntervalChange,
  rightSidebarVisible,
  onToggleRightSidebar,
}: TopToolbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartType, setChartType] = useState("candles");

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const currentInterval = INTERVALS.find(i => i.value === interval)?.label || "1H";

  return (
    <header className="h-10 flex items-center px-1 shrink-0 bg-[#1e222d] border-b border-[#2a2e39]">
      {/* Left Section */}
      <div className="flex items-center">
        {/* Symbol Selector */}
        <button className="flex items-center gap-1.5 h-8 px-3 rounded hover:bg-[#2a2e39] transition-colors">
          <Search className="w-4 h-4 text-[#787b86]" />
          <span className="text-sm font-semibold text-[#d1d4dc]">{selectedSymbol}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#787b86]" />
        </button>

        {/* Compare / Add */}
        <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#2a2e39] text-[#787b86]">
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#363a45] mx-1" />

        {/* Time Intervals */}
        <div className="flex items-center">
          {INTERVALS.slice(0, 6).map((int) => (
            <button
              key={int.value}
              onClick={() => onIntervalChange(int.value)}
              className={`h-8 px-2 text-xs font-medium rounded transition-colors ${
                interval === int.value 
                  ? 'text-[#2962ff] bg-[#2962ff]/10' 
                  : 'text-[#787b86] hover:bg-[#2a2e39]'
              }`}
            >
              {int.label}
            </button>
          ))}
          
          {/* More intervals dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 px-2 flex items-center gap-1 text-xs text-[#787b86] rounded hover:bg-[#2a2e39]">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1e222d] border-[#363a45] min-w-[100px]">
              {INTERVALS.slice(6).map((int) => (
                <DropdownMenuItem
                  key={int.value}
                  onClick={() => onIntervalChange(int.value)}
                  className={`text-xs cursor-pointer ${
                    interval === int.value ? 'text-[#2962ff] bg-[#2962ff]/10' : 'text-[#d1d4dc]'
                  }`}
                >
                  {int.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="w-px h-5 bg-[#363a45] mx-1" />

        {/* Chart Type */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 px-2 flex items-center gap-1.5 text-[#787b86] rounded hover:bg-[#2a2e39]">
              <BarChart2 className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1e222d] border-[#363a45]">
            {CHART_TYPES.map((type) => (
              <DropdownMenuItem
                key={type.value}
                onClick={() => setChartType(type.value)}
                className={`text-xs cursor-pointer ${
                  chartType === type.value ? 'text-[#2962ff] bg-[#2962ff]/10' : 'text-[#d1d4dc]'
                }`}
              >
                {type.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-[#363a45] mx-1" />

        {/* Indicators */}
        <button className="h-8 px-2 flex items-center gap-1.5 text-[#787b86] rounded hover:bg-[#2a2e39]">
          <LayoutGrid className="w-4 h-4" />
          <span className="text-xs">Indicators</span>
        </button>
      </div>

      {/* Center - Symbol Info */}
      <div className="flex-1 flex justify-center">
        {selectedInstrument && (
          <div className="flex items-center gap-2 text-xs text-[#787b86]">
            <span className="text-[#d1d4dc] font-medium">{selectedInstrument.name}</span>
            <span>•</span>
            <span className="uppercase">{selectedInstrument.asset_class}</span>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center">
        {/* Undo/Redo */}
        <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#2a2e39] text-[#787b86]">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#2a2e39] text-[#787b86]">
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#363a45] mx-1" />

        {/* Screenshot */}
        <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#2a2e39] text-[#787b86]">
          <Camera className="w-4 h-4" />
        </button>

        {/* Toggle Sidebar */}
        <button 
          onClick={onToggleRightSidebar}
          className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#2a2e39] text-[#787b86]"
        >
          {rightSidebarVisible ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>

        {/* Fullscreen */}
        <button 
          onClick={toggleFullscreen}
          className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#2a2e39] text-[#787b86]"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* Settings */}
        <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#2a2e39] text-[#787b86]">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
