// Core components
export { DashboardGrid } from "./dashboard-grid";
export { DashboardHeader } from "./dashboard-header";
export { DashboardDataProvider, useDashboardData } from "./dashboard-data-provider";
export { WidgetWrapper } from "./widget-wrapper";
export { WidgetFullscreen } from "./widget-fullscreen";
export { WidgetRenderer } from "./widget-renderer";
export { AddWidgetDialog } from "./add-widget-dialog";

// Registry
export {
  WIDGET_TYPES,
  WIDGET_DEFINITIONS,
  getWidgetDefinition,
  getWidgetsByCategory,
  getAllWidgetTypes,
  type WidgetType,
  type WidgetCategory,
  type WidgetDefinition,
} from "./widget-registry";

// Widget components
export { ObjectiveScorecardsWidget } from "./widgets/objective-scorecards";
export { AtRiskKrsWidget } from "./widgets/at-risk-krs";
export { TasksDueWidget } from "./widgets/tasks-due";
export { TimelinePreviewWidget } from "./widgets/timeline-preview";
export { RecentCheckinsWidget } from "./widgets/recent-checkins";
export { ActivityHeatmapWidget } from "./widgets/activity-heatmap-widget";
export { SummaryCardsWidget } from "./widgets/summary-cards-widget";
export { ProgressChartWidget } from "./widgets/progress-chart-widget";
export { QuickActionsWidget } from "./widgets/quick-actions";
