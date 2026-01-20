"use client";

import { Loader2 } from "lucide-react";
import { WIDGET_TYPES, type WidgetType } from "./widget-registry";
import { useDashboardData } from "./dashboard-data-provider";
import type { DashboardWidget } from "@/lib/supabase/types";

// Import widget components
import { ObjectiveScorecardsWidget } from "./widgets/objective-scorecards";
import { AtRiskKrsWidget } from "./widgets/at-risk-krs";
import { TasksDueWidget } from "./widgets/tasks-due";
import { TimelinePreviewWidget } from "./widgets/timeline-preview";
import { RecentCheckinsWidget } from "./widgets/recent-checkins";
import { ActivityHeatmapWidget } from "./widgets/activity-heatmap-widget";
import { SummaryCardsWidget } from "./widgets/summary-cards-widget";
import { ProgressChartWidget } from "./widgets/progress-chart-widget";
import { QuickActionsWidget } from "./widgets/quick-actions";

interface WidgetRendererProps {
  widget: DashboardWidget;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  const { isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const config = widget.config as Record<string, unknown>;

  switch (widget.widget_type as WidgetType) {
    case WIDGET_TYPES.OBJECTIVE_SCORECARDS:
      return <ObjectiveScorecardsWidget config={config} />;

    case WIDGET_TYPES.AT_RISK_KRS:
      return <AtRiskKrsWidget config={config} />;

    case WIDGET_TYPES.TASKS_DUE:
      return <TasksDueWidget config={config} />;

    case WIDGET_TYPES.TIMELINE_PREVIEW:
      return <TimelinePreviewWidget config={config} />;

    case WIDGET_TYPES.RECENT_CHECKINS:
      return <RecentCheckinsWidget config={config} />;

    case WIDGET_TYPES.ACTIVITY_HEATMAP:
      return <ActivityHeatmapWidget config={config} />;

    case WIDGET_TYPES.SUMMARY_CARDS:
      return <SummaryCardsWidget config={config} />;

    case WIDGET_TYPES.PROGRESS_CHART:
      return <ProgressChartWidget config={config} />;

    case WIDGET_TYPES.QUICK_ACTIONS:
      return <QuickActionsWidget config={config} />;

    default:
      return (
        <div className="h-full flex items-center justify-center text-text-muted">
          Unknown widget type: {widget.widget_type}
        </div>
      );
  }
}
