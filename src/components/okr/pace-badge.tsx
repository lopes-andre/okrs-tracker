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
  showTooltip = true,
  size = "sm",
  compact = false,
}: PaceBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
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
    
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {compactBadge}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {formatPaceStatus(status)}
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
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium mb-1">{formatPaceStatus(status)}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {config.description}
          </p>
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
