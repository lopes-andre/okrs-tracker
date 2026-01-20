"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { QuarterTarget } from "@/lib/supabase/types";
import { 
  getCurrentQuarter, 
  type QuarterProgressResult 
} from "@/lib/progress-engine";

interface QuarterTargetPillsProps {
  quarterTargets: QuarterTarget[];
  /** Pre-computed quarter progress results for accurate display */
  quarterProgress?: QuarterProgressResult[];
  compact?: boolean;
  showValues?: boolean;
  showCurrentDetail?: boolean;
  unit?: string | null;
}

export function QuarterTargetPills({
  quarterTargets,
  quarterProgress,
  compact = false,
  showValues = false,
  showCurrentDetail = false,
  unit,
}: QuarterTargetPillsProps) {
  // Sort by quarter
  const sortedTargets = [...quarterTargets].sort((a, b) => a.quarter - b.quarter);
  
  // Create maps for quick lookup
  const targetMap = new Map(sortedTargets.map((t) => [t.quarter, t]));
  const progressMap = new Map(quarterProgress?.map((p) => [p.quarter, p]) || []);

  // All quarters
  const quarters = [1, 2, 3, 4] as const;
  const currentQuarter = getCurrentQuarter();

  // Calculate progress for each quarter (fallback if no pre-computed progress)
  const getProgress = (quarter: 1 | 2 | 3 | 4) => {
    // Use pre-computed progress if available
    const computed = progressMap.get(quarter);
    if (computed) return computed.progress * 100;
    
    // Fallback calculation
    const target = targetMap.get(quarter);
    if (!target) return 0;
    if (target.target_value === 0) return target.current_value > 0 ? 100 : 0;
    return Math.min(Math.max((target.current_value / target.target_value) * 100, 0), 100);
  };

  // Get quarter status
  const getQuarterStatus = (quarter: 1 | 2 | 3 | 4) => {
    const target = targetMap.get(quarter);
    const computed = progressMap.get(quarter);
    const progress = getProgress(quarter);
    
    if (!target) return { status: "none", label: "No target" };
    
    if (computed) {
      if (computed.isComplete) return { status: "complete", label: "Complete" };
      if (computed.isPast) return { status: "missed", label: "Missed" };
      if (computed.isCurrent) return { status: "current", label: "In Progress" };
      if (computed.isFuture) return { status: "future", label: "Upcoming" };
    } else {
      // Fallback logic
      if (progress >= 100) return { status: "complete", label: "Complete" };
      if (quarter < currentQuarter) return { status: "missed", label: "Missed" };
      if (quarter === currentQuarter) return { status: "current", label: "In Progress" };
      if (quarter > currentQuarter) return { status: "future", label: "Upcoming" };
    }
    
    return { status: "none", label: "No target" };
  };

  // Get status color based on progress and quarter status
  const getStatusStyles = (quarter: 1 | 2 | 3 | 4) => {
    const { status } = getQuarterStatus(quarter);
    const progress = getProgress(quarter);
    
    switch (status) {
      case "complete":
        return {
          bg: "bg-status-success",
          text: "text-white",
          border: "border-status-success",
          icon: CheckCircle2,
        };
      case "missed":
        return {
          bg: "bg-status-danger/10",
          text: "text-status-danger",
          border: "border-status-danger/30",
          icon: Circle,
        };
      case "current":
        return {
          bg: progress >= 70 ? "bg-status-success/20" : progress >= 40 ? "bg-status-warning/20" : "bg-status-info/20",
          text: progress >= 70 ? "text-status-success" : progress >= 40 ? "text-status-warning" : "text-status-info",
          border: progress >= 70 ? "border-status-success/30" : progress >= 40 ? "border-status-warning/30" : "border-status-info/30",
          icon: Clock,
        };
      case "future":
        return {
          bg: "bg-bg-1",
          text: "text-text-subtle",
          border: "border-border-soft",
          icon: Circle,
        };
      default:
        return {
          bg: "bg-bg-1",
          text: "text-text-subtle",
          border: "border-border-soft",
          icon: Circle,
        };
    }
  };

  // Compact view - small pills
  if (compact) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {quarters.map((q) => {
          const target = targetMap.get(q);
          const progress = getProgress(q);
          const { status, label } = getQuarterStatus(q);
          const styles = getStatusStyles(q);

          return (
            <Tooltip key={q} delayDuration={100}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-7 h-7 rounded text-xs font-medium flex items-center justify-center border transition-all",
                    styles.bg,
                    styles.text,
                    styles.border,
                    status === "current" && "ring-2 ring-offset-1 ring-accent/30"
                  )}
                >
                  {status === "complete" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    `Q${q}`
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">Q{q}: {label}</p>
                {target && (
                  <p className="text-text-subtle">
                    {target.current_value.toLocaleString()} / {target.target_value.toLocaleString()}
                    {unit && ` ${unit}`} ({Math.round(progress)}%)
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  // Current quarter detail (shows prominently)
  const currentTarget = targetMap.get(currentQuarter);
  const currentProgress = getProgress(currentQuarter);
  const currentStyles = getStatusStyles(currentQuarter);

  // Full view - cards with progress bars
  return (
    <div className="space-y-3">
      {/* Current Quarter Highlight */}
      {showCurrentDetail && currentTarget && (
        <div className={cn(
          "p-3 rounded-button border-2",
          currentStyles.border,
          currentProgress >= 100 ? "bg-status-success/10" : "bg-white"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-body-sm font-semibold",
                currentStyles.text
              )}>
                Q{currentQuarter} - Current Quarter
              </span>
              {currentProgress >= 100 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success bg-status-success/20 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Goal Reached!
                </span>
              )}
            </div>
            <span className={cn(
              "text-h4 font-heading font-bold",
              currentStyles.text
            )}>
              {Math.round(currentProgress)}%
            </span>
          </div>
          <Progress 
            value={currentProgress} 
            className="h-2 mb-2" 
          />
          <div className="flex justify-between text-small text-text-muted">
            <span>
              {currentTarget.current_value.toLocaleString()}
              {unit && ` ${unit}`}
            </span>
            <span>
              Target: {currentTarget.target_value.toLocaleString()}
              {unit && ` ${unit}`}
            </span>
          </div>
        </div>
      )}

      {/* All Quarters Grid */}
      <div className="grid grid-cols-4 gap-2">
        {quarters.map((q) => {
          const target = targetMap.get(q);
          const progress = getProgress(q);
          const styles = getStatusStyles(q);
          const { status, label } = getQuarterStatus(q);
          const isCurrent = q === currentQuarter;

          return (
            <div
              key={q}
              className={cn(
                "rounded-button p-2.5 text-center transition-all border",
                styles.bg,
                styles.border,
                isCurrent && "ring-2 ring-offset-1 ring-accent/30"
              )}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {status === "complete" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                )}
                <p className={cn("text-xs font-semibold", styles.text)}>
                  Q{q}
                </p>
              </div>
              
              {target ? (
                <>
                  {showValues ? (
                    <>
                      <p className={cn("text-body font-bold", styles.text)}>
                        {target.current_value.toLocaleString()}
                      </p>
                      <p className="text-xs text-text-muted">
                        / {target.target_value.toLocaleString()}
                        {unit && ` ${unit}`}
                      </p>
                    </>
                  ) : (
                    <p className={cn("text-body font-bold", styles.text)}>
                      {Math.round(progress)}%
                    </p>
                  )}
                  
                  {/* Mini progress bar */}
                  <div className="mt-1.5 h-1 bg-black/10 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all rounded-full",
                        status === "complete" ? "bg-status-success" :
                        status === "current" ? "bg-current" :
                        status === "missed" ? "bg-status-danger" :
                        "bg-text-subtle"
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  
                  {/* Status label */}
                  <p className="text-[10px] text-text-subtle mt-1">
                    {label}
                  </p>
                </>
              ) : (
                <p className="text-small text-text-subtle">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
