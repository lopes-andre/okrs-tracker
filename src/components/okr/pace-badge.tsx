"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
} from "lucide-react";
import { 
  formatPaceStatus, 
  formatProgress,
  type PaceStatus,
} from "@/lib/progress-engine";

interface PaceBadgeProps {
  status: PaceStatus;
  paceRatio?: number;
  progress?: number;
  expectedProgress?: number;
  /** Expected value at this point in time */
  expectedValue?: number;
  /** Current actual value */
  currentValue?: number;
  /** Unit for display (e.g., "followers", "subscribers") */
  unit?: string | null;
  showTooltip?: boolean;
  size?: "sm" | "md";
  /** Extra compact mode - icon only with minimal text */
  compact?: boolean;
}

const statusConfig: Record<PaceStatus, {
  variant: "success" | "info" | "warning" | "danger";
  icon: typeof TrendingUp;
  description: string;
}> = {
  ahead: {
    variant: "success",
    icon: TrendingUp,
    description: "Progressing faster than expected",
  },
  on_track: {
    variant: "info",
    icon: CheckCircle2,
    description: "Progressing as expected",
  },
  at_risk: {
    variant: "warning",
    icon: AlertTriangle,
    description: "Slightly behind expected pace",
  },
  off_track: {
    variant: "danger",
    icon: XCircle,
    description: "Significantly behind expected pace",
  },
};

export function PaceBadge({ 
  status, 
  paceRatio, 
  progress, 
  expectedProgress,
  expectedValue,
  currentValue,
  unit,
  showTooltip = true,
  size = "sm",
  compact = false,
}: PaceBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  // Format value with unit
  const formatValueWithUnit = (value: number) => {
    const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return unit ? `${formatted} ${unit}` : formatted;
  };
  
  // Build tooltip content
  const buildTooltipContent = () => {
    const lines: string[] = [];
    
    if (expectedValue !== undefined) {
      lines.push(`By today you should have ${formatValueWithUnit(expectedValue)}`);
    }
    
    if (currentValue !== undefined && expectedValue !== undefined) {
      const diff = currentValue - expectedValue;
      if (diff > 0) {
        lines.push(`You are ahead by ${formatValueWithUnit(diff)}`);
      } else if (diff < 0) {
        lines.push(`You are behind by ${formatValueWithUnit(Math.abs(diff))}`);
      } else {
        lines.push("You are exactly on track!");
      }
    }
    
    return lines;
  };
  
  // Compact mode - smaller badge with abbreviated text
  if (compact) {
    const compactLabels: Record<PaceStatus, string> = {
      ahead: "↑",
      on_track: "✓",
      at_risk: "!",
      off_track: "✕",
    };
    
    const compactBadge = (
      <span 
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
          config.variant === "success" ? "bg-status-success/20 text-status-success" :
          config.variant === "info" ? "bg-status-info/20 text-status-info" :
          config.variant === "warning" ? "bg-status-warning/20 text-status-warning" :
          "bg-status-danger/20 text-status-danger"
        }`}
      >
        {compactLabels[status]}
      </span>
    );
    
    if (!showTooltip) return compactBadge;
    
    const tooltipLines = buildTooltipContent();
    
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {compactBadge}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            <p className="font-medium">{formatPaceStatus(status)}</p>
            {tooltipLines.length > 0 && (
              <div className="mt-1 space-y-0.5 text-muted-foreground">
                {tooltipLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  const badge = (
    <Badge 
      variant={config.variant} 
      className={size === "sm" ? "text-xs gap-1" : "text-sm gap-1.5"}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {formatPaceStatus(status)}
    </Badge>
  );
  
  if (!showTooltip) return badge;
  
  const tooltipLines = buildTooltipContent();
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium mb-1">{formatPaceStatus(status)}</p>
          
          {/* Expected value messages */}
          {tooltipLines.length > 0 && (
            <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
              {tooltipLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          
          {/* Progress details */}
          {(progress !== undefined || expectedProgress !== undefined) && (
            <div className="text-xs space-y-1 pt-2 border-t border-border">
              {progress !== undefined && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-medium">{formatProgress(progress)}</span>
                </div>
              )}
              {expectedProgress !== undefined && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Expected:</span>
                  <span className="font-medium">{formatProgress(expectedProgress)}</span>
                </div>
              )}
              {paceRatio !== undefined && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Pace ratio:</span>
                  <span className="font-medium">{(paceRatio * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
