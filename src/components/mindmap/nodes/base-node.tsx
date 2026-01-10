"use client";

import { memo, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { PaceStatus } from "@/lib/progress-engine";
import type { MindmapNodeData } from "../types";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// PACE BADGE COMPONENT
// ============================================================================

interface PaceBadgeProps {
  status: PaceStatus;
  size?: "sm" | "md";
}

export function PaceBadge({ status, size = "sm" }: PaceBadgeProps) {
  const config = {
    ahead: {
      label: "Ahead",
      icon: TrendingUp,
      className: "bg-status-success/10 text-status-success border-status-success/20",
    },
    on_track: {
      label: "On Track",
      icon: CheckCircle2,
      className: "bg-accent/10 text-accent border-accent/20",
    },
    at_risk: {
      label: "At Risk",
      icon: AlertTriangle,
      className: "bg-status-warning/10 text-status-warning border-status-warning/20",
    },
    off_track: {
      label: "Off Track",
      icon: AlertCircle,
      className: "bg-status-danger/10 text-status-danger border-status-danger/20",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 font-medium",
        size === "sm" ? "text-[10px]" : "text-xs",
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
      {label}
    </span>
  );
}

// ============================================================================
// BASE NODE WRAPPER
// ============================================================================

interface BaseNodeProps {
  children: ReactNode;
  nodeType: "plan" | "objective" | "kr" | "quarter" | "task";
  isSelected?: boolean;
  className?: string;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
}

export function BaseNodeWrapper({
  children,
  nodeType,
  isSelected,
  className,
  showSourceHandle = true,
  showTargetHandle = true,
}: BaseNodeProps) {
  const typeStyles = {
    plan: "bg-gradient-to-br from-accent/5 to-accent/10 border-accent/30 shadow-lg",
    objective: "bg-bg-0 border-border-soft shadow-card",
    kr: "bg-bg-0 border-border-soft shadow-card-sm",
    quarter: "bg-bg-1/80 border-border-soft",
    task: "bg-bg-1/60 border-border-soft",
  };

  return (
    <div
      className={cn(
        "rounded-card border transition-all duration-200",
        typeStyles[nodeType],
        isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-bg-0",
        className
      )}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-border-medium !border-2 !border-bg-0"
        />
      )}
      {children}
      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-border-medium !border-2 !border-bg-0"
        />
      )}
    </div>
  );
}

// ============================================================================
// PROGRESS BAR WITH EXPECTED LINE
// ============================================================================

interface NodeProgressBarProps {
  progress: number; // 0-1
  expected?: number; // 0-1
  paceStatus: PaceStatus;
  size?: "sm" | "md";
}

export function NodeProgressBar({ progress, expected, paceStatus, size = "sm" }: NodeProgressBarProps) {
  const statusColors = {
    ahead: "bg-status-success",
    on_track: "bg-accent",
    at_risk: "bg-status-warning",
    off_track: "bg-status-danger",
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "w-full bg-bg-1 rounded-full overflow-hidden",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", statusColors[paceStatus])}
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
      {expected !== undefined && (
        <div
          className="absolute top-0 h-full w-0.5 bg-text-muted/50"
          style={{ left: `${Math.min(expected * 100, 100)}%` }}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPAND/COLLAPSE BUTTON
// ============================================================================

interface ExpandButtonProps {
  isCollapsed: boolean;
  childCount: number;
  onClick: () => void;
}

export function ExpandButton({ isCollapsed, childCount, onClick }: ExpandButtonProps) {
  if (childCount === 0) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute -bottom-3 left-1/2 -translate-x-1/2 z-10",
        "w-6 h-6 rounded-full bg-bg-0 border border-border-soft shadow-sm",
        "flex items-center justify-center text-xs font-medium text-text-muted",
        "hover:bg-bg-1 hover:border-border-medium transition-colors"
      )}
    >
      {isCollapsed ? `+${childCount}` : "−"}
    </button>
  );
}
