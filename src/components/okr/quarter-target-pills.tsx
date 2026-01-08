"use client";

import { cn } from "@/lib/utils";
import type { QuarterTarget } from "@/lib/supabase/types";

interface QuarterTargetPillsProps {
  quarterTargets: QuarterTarget[];
  compact?: boolean;
  showValues?: boolean;
  unit?: string | null;
}

export function QuarterTargetPills({
  quarterTargets,
  compact = false,
  showValues = false,
  unit,
}: QuarterTargetPillsProps) {
  // Sort by quarter
  const sortedTargets = [...quarterTargets].sort((a, b) => a.quarter - b.quarter);
  
  // Create a map for quick lookup
  const targetMap = new Map(sortedTargets.map((t) => [t.quarter, t]));

  // All quarters
  const quarters = [1, 2, 3, 4] as const;

  // Calculate progress for each quarter
  const getProgress = (target: QuarterTarget | undefined) => {
    if (!target) return 0;
    if (target.target_value === 0) return target.current_value > 0 ? 100 : 0;
    return Math.min(Math.max((target.current_value / target.target_value) * 100, 0), 100);
  };

  // Get status color based on progress
  const getStatusColor = (progress: number) => {
    if (progress >= 100) return "bg-status-success text-status-success";
    if (progress >= 70) return "bg-status-success/20 text-status-success";
    if (progress >= 40) return "bg-status-warning/20 text-status-warning";
    if (progress > 0) return "bg-status-danger/20 text-status-danger";
    return "bg-bg-1 text-text-subtle";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {quarters.map((q) => {
          const target = targetMap.get(q);
          const progress = getProgress(target);
          const hasTarget = !!target;
          
          return (
            <div
              key={q}
              className={cn(
                "w-6 h-6 rounded text-xs font-medium flex items-center justify-center",
                hasTarget ? getStatusColor(progress) : "bg-bg-1 text-text-subtle"
              )}
              title={
                hasTarget
                  ? `Q${q}: ${target.current_value}/${target.target_value} (${Math.round(progress)}%)`
                  : `Q${q}: No target`
              }
            >
              Q{q}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {quarters.map((q) => {
        const target = targetMap.get(q);
        const progress = getProgress(target);
        const hasTarget = !!target;

        return (
          <div
            key={q}
            className={cn(
              "rounded-button p-2 text-center transition-colors",
              hasTarget ? getStatusColor(progress) : "bg-white border border-border-soft"
            )}
          >
            <p className="text-xs font-medium mb-0.5">Q{q}</p>
            {showValues && hasTarget ? (
              <>
                <p className="text-body-sm font-semibold">
                  {target.current_value.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">
                  / {target.target_value.toLocaleString()}
                  {unit && ` ${unit}`}
                </p>
                <div className="mt-1 h-1 bg-black/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-current transition-all" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : hasTarget ? (
              <p className="text-small font-medium">{Math.round(progress)}%</p>
            ) : (
              <p className="text-small text-text-subtle">—</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
