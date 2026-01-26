"use client";

import { memo } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "../dashboard-data-provider";
import { useRecentActivity } from "@/features/timeline/hooks";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TimelinePreviewWidgetProps {
  config: Record<string, unknown>;
}

// Map event types to display labels
function getEventLabel(eventType: string, entityType: string): string {
  const labels: Record<string, Record<string, string>> = {
    created: {
      task: "Task created",
      check_in: "Check-in recorded",
      objective: "Objective created",
      annual_kr: "KR created",
      quarter_target: "Target set",
      weekly_review: "Review started",
    },
    completed: {
      task: "Task completed",
      weekly_review: "Review completed",
    },
    updated: {
      task: "Task updated",
      objective: "Objective updated",
      annual_kr: "KR updated",
      plan: "Plan updated",
    },
    status_changed: {
      task: "Task status changed",
    },
    deleted: {
      task: "Task deleted",
      check_in: "Check-in deleted",
    },
  };

  return labels[eventType]?.[entityType] || `${entityType} ${eventType}`;
}

export const TimelinePreviewWidget = memo(function TimelinePreviewWidget({ config }: TimelinePreviewWidgetProps) {
  const { planId } = useDashboardData();
  const maxItems = (config.maxItems as number) || 8;

  const { data: events = [], isLoading } = useRecentActivity(planId, maxItems);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Clock className="w-6 h-6 animate-pulse text-text-muted" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Activity className="w-8 h-8 text-text-subtle mb-2" />
        <p className="text-body-sm text-text-muted">No recent activity</p>
        <p className="text-xs text-text-subtle mt-1">Updates will appear here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-card bg-bg-1/50 border border-border-soft"
            >
              <div className="flex items-start gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                  event.event_type === "completed" ? "bg-status-success" :
                  event.event_type === "created" ? "bg-accent" :
                  event.event_type === "deleted" ? "bg-status-danger" :
                  "bg-text-muted"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-strong truncate">
                    {getEventLabel(event.event_type, event.entity_type)}
                  </p>
                  {event.new_data && (event.new_data as { name?: string; title?: string }).name && (
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {(event.new_data as { name?: string; title?: string }).name || (event.new_data as { name?: string; title?: string }).title}
                    </p>
                  )}
                  <p className="text-[10px] text-text-subtle mt-1">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-border-soft mt-3">
        <Link href={`/plans/${planId}/settings?tab=activity`}>
          <Button variant="ghost" size="sm" className="w-full justify-center gap-1">
            View full activity log
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
});
