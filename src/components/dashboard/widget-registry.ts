import {
  Target,
  AlertTriangle,
  Clock,
  Activity,
  Calendar,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Zap,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// WIDGET TYPES
// ============================================================================

export const WIDGET_TYPES = {
  OBJECTIVE_SCORECARDS: "objective_scorecards",
  AT_RISK_KRS: "at_risk_krs",
  TIMELINE_PREVIEW: "timeline_preview",
  TASKS_DUE: "tasks_due",
  ACTIVITY_HEATMAP: "activity_heatmap",
  SUMMARY_CARDS: "summary_cards",
  PROGRESS_CHART: "progress_chart",
  RECENT_CHECKINS: "recent_checkins",
  QUICK_ACTIONS: "quick_actions",
} as const;

export type WidgetType = typeof WIDGET_TYPES[keyof typeof WIDGET_TYPES];

// ============================================================================
// WIDGET CATEGORY
// ============================================================================

export type WidgetCategory = "overview" | "analytics" | "activity";

// ============================================================================
// WIDGET DEFINITION
// ============================================================================

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: LucideIcon;
  category: WidgetCategory;
  defaultWidth: number;  // 1-4 columns
  defaultHeight: number; // 1-3 rows
  supportsFullscreen: boolean;
}

// ============================================================================
// WIDGET REGISTRY
// ============================================================================

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  [WIDGET_TYPES.OBJECTIVE_SCORECARDS]: {
    type: WIDGET_TYPES.OBJECTIVE_SCORECARDS,
    name: "Objectives",
    description: "View all objectives with their progress and status",
    icon: Target,
    category: "overview",
    defaultWidth: 2,
    defaultHeight: 2,
    supportsFullscreen: true,
  },
  [WIDGET_TYPES.AT_RISK_KRS]: {
    type: WIDGET_TYPES.AT_RISK_KRS,
    name: "Needs Attention",
    description: "Key Results that are behind pace or at risk",
    icon: AlertTriangle,
    category: "overview",
    defaultWidth: 2,
    defaultHeight: 1,
    supportsFullscreen: true,
  },
  [WIDGET_TYPES.TASKS_DUE]: {
    type: WIDGET_TYPES.TASKS_DUE,
    name: "Tasks Due",
    description: "Upcoming and overdue tasks",
    icon: CheckCircle2,
    category: "overview",
    defaultWidth: 2,
    defaultHeight: 1,
    supportsFullscreen: true,
  },
  [WIDGET_TYPES.TIMELINE_PREVIEW]: {
    type: WIDGET_TYPES.TIMELINE_PREVIEW,
    name: "Recent Activity",
    description: "Latest activity events in your plan",
    icon: Activity,
    category: "activity",
    defaultWidth: 4,
    defaultHeight: 1,
    supportsFullscreen: true,
  },
  [WIDGET_TYPES.ACTIVITY_HEATMAP]: {
    type: WIDGET_TYPES.ACTIVITY_HEATMAP,
    name: "Activity Heatmap",
    description: "GitHub-style visualization of check-in activity",
    icon: Calendar,
    category: "analytics",
    defaultWidth: 4,
    defaultHeight: 1,
    supportsFullscreen: true,
  },
  [WIDGET_TYPES.SUMMARY_CARDS]: {
    type: WIDGET_TYPES.SUMMARY_CARDS,
    name: "Summary Cards",
    description: "Key metrics at a glance",
    icon: BarChart3,
    category: "analytics",
    defaultWidth: 4,
    defaultHeight: 1,
    supportsFullscreen: false,
  },
  [WIDGET_TYPES.PROGRESS_CHART]: {
    type: WIDGET_TYPES.PROGRESS_CHART,
    name: "Progress Chart",
    description: "Track KR progress over time",
    icon: TrendingUp,
    category: "analytics",
    defaultWidth: 2,
    defaultHeight: 2,
    supportsFullscreen: true,
  },
  [WIDGET_TYPES.RECENT_CHECKINS]: {
    type: WIDGET_TYPES.RECENT_CHECKINS,
    name: "Recent Check-ins",
    description: "Latest progress updates",
    icon: Clock,
    category: "activity",
    defaultWidth: 2,
    defaultHeight: 1,
    supportsFullscreen: true,
  },
  [WIDGET_TYPES.QUICK_ACTIONS]: {
    type: WIDGET_TYPES.QUICK_ACTIONS,
    name: "Quick Actions",
    description: "Shortcuts to common actions",
    icon: Zap,
    category: "overview",
    defaultWidth: 1,
    defaultHeight: 1,
    supportsFullscreen: false,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return WIDGET_DEFINITIONS[type as WidgetType];
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return Object.values(WIDGET_DEFINITIONS).filter((w) => w.category === category);
}

export function getAllWidgetTypes(): WidgetDefinition[] {
  return Object.values(WIDGET_DEFINITIONS);
}
