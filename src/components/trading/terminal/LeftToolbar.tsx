/**
 * Left Drawing Toolbar - Compact vertical toolbar
 */

import { useState } from "react";
import { 
  MousePointer2, 
  TrendingUp, 
  Minus, 
  PenTool, 
  Type, 
  Ruler, 
  Eye, 
  Magnet, 
  Lock,
  Crosshair,
  Square,
  ArrowUpRight,
  Percent,
  Trash2,
  Circle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function ToolButton({ icon, label, active, onClick }: ToolButtonProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
              active 
                ? 'text-[#2962ff] bg-[#2962ff]/10' 
                : 'text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]'
            }`}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="text-xs bg-[#2a2e39] text-[#d1d4dc] border-[#363a45]"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function LeftToolbar() {
  const [activeTool, setActiveTool] = useState("crosshair");

  return (
    <div className="w-11 flex flex-col items-center py-1 shrink-0 bg-[#1e222d] border-r border-[#2a2e39]">
      {/* Cursor Tools */}
      <ToolButton 
        icon={<Crosshair className="w-[18px] h-[18px]" />} 
        label="Crosshair" 
        active={activeTool === "crosshair"}
        onClick={() => setActiveTool("crosshair")}
      />
      <ToolButton 
        icon={<MousePointer2 className="w-[18px] h-[18px]" />} 
        label="Arrow" 
        active={activeTool === "arrow"}
        onClick={() => setActiveTool("arrow")}
      />
      
      <div className="w-6 h-px bg-[#363a45] my-1" />

      {/* Line Tools */}
      <ToolButton 
        icon={<TrendingUp className="w-[18px] h-[18px]" />} 
        label="Trend Line"
        active={activeTool === "trendline"}
        onClick={() => setActiveTool("trendline")}
      />
      <ToolButton 
        icon={<Minus className="w-[18px] h-[18px]" />} 
        label="Horizontal Line"
        active={activeTool === "horizontal"}
        onClick={() => setActiveTool("horizontal")}
      />
      <ToolButton 
        icon={<ArrowUpRight className="w-[18px] h-[18px]" />} 
        label="Ray"
        active={activeTool === "ray"}
        onClick={() => setActiveTool("ray")}
      />
      
      <div className="w-6 h-px bg-[#363a45] my-1" />

      {/* Shape Tools */}
      <ToolButton 
        icon={<Square className="w-[18px] h-[18px]" />} 
        label="Rectangle"
        active={activeTool === "rectangle"}
        onClick={() => setActiveTool("rectangle")}
      />
      <ToolButton 
        icon={<Circle className="w-[18px] h-[18px]" />} 
        label="Circle"
        active={activeTool === "circle"}
        onClick={() => setActiveTool("circle")}
      />
      <ToolButton 
        icon={<PenTool className="w-[18px] h-[18px]" />} 
        label="Brush"
        active={activeTool === "brush"}
        onClick={() => setActiveTool("brush")}
      />
      
      <div className="w-6 h-px bg-[#363a45] my-1" />

      {/* Annotation Tools */}
      <ToolButton 
        icon={<Type className="w-[18px] h-[18px]" />} 
        label="Text"
        active={activeTool === "text"}
        onClick={() => setActiveTool("text")}
      />
      <ToolButton 
        icon={<Percent className="w-[18px] h-[18px]" />} 
        label="Fib Retracement"
        active={activeTool === "fib"}
        onClick={() => setActiveTool("fib")}
      />
      <ToolButton 
        icon={<Ruler className="w-[18px] h-[18px]" />} 
        label="Price Range"
        active={activeTool === "range"}
        onClick={() => setActiveTool("range")}
      />
      
      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Tools */}
      <ToolButton icon={<Magnet className="w-[18px] h-[18px]" />} label="Magnet Mode" />
      <ToolButton icon={<Lock className="w-[18px] h-[18px]" />} label="Lock Drawings" />
      <ToolButton icon={<Eye className="w-[18px] h-[18px]" />} label="Hide Drawings" />
      <ToolButton icon={<Trash2 className="w-[18px] h-[18px]" />} label="Delete All" />
    </div>
  );
}
