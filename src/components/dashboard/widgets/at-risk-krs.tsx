"use client";

import { memo } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ArrowRight, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "../dashboard-data-provider";
import { cn } from "@/lib/utils";

interface AtRiskKrsWidgetProps {
  config: Record<string, unknown>;
}

export const AtRiskKrsWidget = memo(function AtRiskKrsWidget({ config }: AtRiskKrsWidgetProps) {
  const { planId, atRiskKrs } = useDashboardData();
  const maxItems = (config.maxItems as number) || 5;

  // Get current quarter progress for pace comparison
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  const quarterStart = new Date(new Date().getFullYear(), (currentQuarter - 1) * 3, 1);
  const quarterEnd = new Date(new Date().getFullYear(), currentQuarter * 3, 0);
  const quarterProgress = ((new Date().getTime() - quarterStart.getTime()) / (quarterEnd.getTime() - quarterStart.getTime())) * 100;

  if (atRiskKrs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <CheckCircle2 className="w-8 h-8 text-status-success mb-2" />
        <p className="text-body-sm font-medium text-text-strong">All KRs on track!</p>
        <p className="text-xs text-text-muted mt-1">Great job keeping up the pace</p>
      </div>
    );
  }

  const displayKrs = atRiskKrs.slice(0, maxItems);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-2 overflow-auto">
        {displayKrs.map((kr) => {
          const progress = Math.round(kr.progress * 100);
          const expectedProgress = Math.round(quarterProgress);
          const delta = progress - expectedProgress;
          const isOffTrack = kr.paceStatus === "off_track";

          return (
            <div
              key={kr.id}
              className={cn(
                "p-3 rounded-card border",
                isOffTrack
                  ? "bg-status-danger/5 border-status-danger/20"
                  : "bg-status-warning/5 border-status-warning/20"
              )}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className={cn(
                  "w-4 h-4 shrink-0 mt-0.5",
                  isOffTrack ? "text-status-danger" : "text-status-warning"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-text-strong truncate">
                    {kr.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">
                      {Math.abs(delta)}% behind pace
                    </span>
                    <TrendingDown className={cn(
                      "w-3 h-3",
                      isOffTrack ? "text-status-danger" : "text-status-warning"
                    )} />
                  </div>
                </div>
                <span className={cn(
                  "text-xs font-medium shrink-0",
                  isOffTrack ? "text-status-danger" : "text-status-warning"
                )}>
                  {progress}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {atRiskKrs.length > maxItems && (
        <div className="pt-3 border-t border-border-soft mt-3">
          <Link href={`/plans/${planId}/analytics`}>
            <Button variant="ghost" size="sm" className="w-full justify-center gap-1">
              View all {atRiskKrs.length} at risk
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
});
