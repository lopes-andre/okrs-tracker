"use client";

import { WidgetWrapper } from "./widget-wrapper";
import { WidgetRenderer } from "./widget-renderer";
import type { DashboardWidget } from "@/lib/supabase/types";

interface DashboardGridProps {
  widgets: DashboardWidget[];
  isEditing: boolean;
  onRemoveWidget: (widgetId: string) => void;
}

export function DashboardGrid({
  widgets,
  isEditing,
  onRemoveWidget,
}: DashboardGridProps) {
  // Sort widgets by position (y first, then x)
  const sortedWidgets = [...widgets].sort((a, b) => {
    if (a.position_y !== b.position_y) {
      return a.position_y - b.position_y;
    }
    return a.position_x - b.position_x;
  });

  if (sortedWidgets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <p>No widgets yet. Click &quot;Add Widget&quot; to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(200px,auto)]">
      {sortedWidgets.map((widget) => (
        <div
          key={widget.id}
          className="min-w-0"
          style={{
            gridColumn: `span ${Math.min(widget.width, 4)}`,
            gridRow: `span ${widget.height}`,
          }}
        >
          <WidgetWrapper
            widget={widget}
            isEditing={isEditing}
            onRemove={() => onRemoveWidget(widget.id)}
          >
            <WidgetRenderer widget={widget} />
          </WidgetWrapper>
        </div>
      ))}
    </div>
  );
}
