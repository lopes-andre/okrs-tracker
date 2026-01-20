import type { DashboardWidgetInsert } from "@/lib/supabase/types";

/**
 * Default widgets configuration for new dashboards
 * Position is grid-based: x (0-3 for 4 columns), y (row)
 */
export const DEFAULT_DASHBOARD_WIDGETS: Omit<DashboardWidgetInsert, "dashboard_id">[] = [
  {
    widget_type: "objective_scorecards",
    title: "Objectives",
    config: { maxItems: 5 },
    position_x: 0,
    position_y: 0,
    width: 2,
    height: 2,
  },
  {
    widget_type: "at_risk_krs",
    title: "Needs Attention",
    config: { maxItems: 5 },
    position_x: 2,
    position_y: 0,
    width: 2,
    height: 1,
  },
  {
    widget_type: "tasks_due",
    title: "Tasks Due",
    config: { maxItems: 5 },
    position_x: 2,
    position_y: 1,
    width: 2,
    height: 1,
  },
  {
    widget_type: "activity_heatmap",
    title: "Activity",
    config: { compact: true },
    position_x: 0,
    position_y: 2,
    width: 4,
    height: 1,
  },
  {
    widget_type: "timeline_preview",
    title: "Recent Activity",
    config: { maxItems: 8 },
    position_x: 0,
    position_y: 3,
    width: 4,
    height: 1,
  },
];

/**
 * Calculate next available position for a new widget
 */
export function calculateNextPosition(
  existingWidgets: { position_x: number; position_y: number; width: number; height: number }[],
  newWidth: number
): { x: number; y: number } {
  if (existingWidgets.length === 0) {
    return { x: 0, y: 0 };
  }

  // Find the maximum y position and the widgets at that row
  let maxY = 0;
  existingWidgets.forEach((w) => {
    const bottomY = w.position_y + w.height;
    if (bottomY > maxY) maxY = bottomY;
  });

  // Try to fit in the last row first
  const lastRowWidgets = existingWidgets.filter((w) => w.position_y === maxY - 1);
  let occupiedColumns = 0;
  lastRowWidgets.forEach((w) => {
    occupiedColumns = Math.max(occupiedColumns, w.position_x + w.width);
  });

  // If there's room in the last row, use it
  if (occupiedColumns + newWidth <= 4) {
    return { x: occupiedColumns, y: maxY - 1 };
  }

  // Otherwise, start a new row
  return { x: 0, y: maxY };
}
