"use client";

import Link from "next/link";
import { Clock, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "../dashboard-data-provider";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface RecentCheckinsWidgetProps {
  config: Record<string, unknown>;
}

export function RecentCheckinsWidget({ config }: RecentCheckinsWidgetProps) {
  const { planId, annualKrs, checkIns } = useDashboardData();
  const maxItems = (config.maxItems as number) || 5;

  // Get recent check-ins sorted by date
  const recentCheckIns = [...checkIns]
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .slice(0, maxItems);

  if (recentCheckIns.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Clock className="w-8 h-8 text-text-subtle mb-2" />
        <p className="text-body-sm text-text-muted">No check-ins yet</p>
        <p className="text-xs text-text-subtle mt-1">Record progress on your KRs</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-2 overflow-auto">
        {recentCheckIns.map((checkIn) => {
          const kr = annualKrs.find((k) => k.id === checkIn.annual_kr_id);
          const delta = checkIn.previous_value !== null
            ? checkIn.value - checkIn.previous_value
            : null;

          return (
            <div
              key={checkIn.id}
              className="p-3 rounded-card bg-bg-1/50 border border-border-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-text-strong truncate">
                    {kr?.name || "Unknown KR"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">
                      {checkIn.value.toLocaleString()}
                      {kr?.unit ? ` ${kr.unit}` : ""}
                    </span>
                    {delta !== null && (
                      <span className={cn(
                        "text-xs flex items-center gap-0.5",
                        delta > 0 ? "text-status-success" : delta < 0 ? "text-status-danger" : "text-text-muted"
                      )}>
                        {delta > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : delta < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {delta > 0 ? "+" : ""}{delta.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-text-subtle shrink-0">
                  {formatDistanceToNow(new Date(checkIn.recorded_at), { addSuffix: true })}
                </span>
              </div>
              {checkIn.note && (
                <p className="text-xs text-text-muted mt-2 line-clamp-2">
                  {checkIn.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-border-soft mt-3">
        <Link href={`/plans/${planId}/okrs`}>
          <Button variant="ghost" size="sm" className="w-full justify-center gap-1">
            View all check-ins
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
