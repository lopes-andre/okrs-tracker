"use client";

import { useMemo, useCallback } from "react";
import { WidgetWrapper } from "./widget-wrapper";
import { WidgetRenderer } from "./widget-renderer";
import { SortableContainer, SortableItemWrapper, useSortableState } from "@/components/ui/sortable";
import { cn } from "@/lib/utils";
import type { DashboardWidget } from "@/lib/supabase/types";

interface DashboardGridProps {
  widgets: DashboardWidget[];
  isEditing: boolean;
  onRemoveWidget: (widgetId: string) => void;
  onReorderWidgets?: (widgets: { id: string; position_x: number; position_y: number }[]) => void;
}

export function DashboardGrid({
  widgets,
  isEditing,
  onRemoveWidget,
  onReorderWidgets,
}: DashboardGridProps) {
  // Sort widgets by position (y first, then x)
  const sortedWidgets = useMemo(() =>
    [...widgets].sort((a, b) => {
      if (a.position_y !== b.position_y) {
        return a.position_y - b.position_y;
      }
      return a.position_x - b.position_x;
    }),
    [widgets]
  );

  // Handle reorder - calculate new positions based on new order
  const handleReorder = useCallback((reorderedWidgets: DashboardWidget[]) => {
    if (!onReorderWidgets) return;

    // Assign new positions based on order (simple sequential layout)
    const updatedPositions = reorderedWidgets.map((widget, index) => {
      // Calculate position in a 4-column grid
      // For simplicity, we place widgets sequentially
      const col = index % 4;
      const row = Math.floor(index / 4);

      return {
        id: widget.id,
        position_x: col,
        position_y: row,
      };
    });

    onReorderWidgets(updatedPositions);
  }, [onReorderWidgets]);

  // Render a single widget (used for both regular and overlay)
  const renderWidget = useCallback((widget: DashboardWidget, isOverlay = false, includeKey = false) => (
    <div
      key={includeKey ? widget.id : undefined}
      className={cn(
        "min-w-0 h-full",
        isOverlay && "shadow-2xl rounded-card"
      )}
      style={{
        gridColumn: `span ${Math.min(widget.width, 4)}`,
        gridRow: `span ${widget.height}`,
      }}
    >
      <WidgetWrapper
        widget={widget}
        isEditing={isEditing && !isOverlay}
        onRemove={() => onRemoveWidget(widget.id)}
      >
        <WidgetRenderer widget={widget} />
      </WidgetWrapper>
    </div>
  ), [isEditing, onRemoveWidget]);

  if (sortedWidgets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <p>No widgets yet. Click &quot;Add Widget&quot; to get started.</p>
      </div>
    );
  }

  // When not editing, render without DnD for better performance
  if (!isEditing) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(200px,auto)]">
        {sortedWidgets.map((widget) => renderWidget(widget, false, true))}
      </div>
    );
  }

  return (
    <SortableContainer
      items={sortedWidgets}
      onReorder={handleReorder}
      strategy="grid"
      renderOverlay={(widget) => renderWidget(widget, true)}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(200px,auto)]"
    >
      {sortedWidgets.map((widget) => (
        <SortableGridItem key={widget.id} widget={widget}>
          {renderWidget(widget)}
        </SortableGridItem>
      ))}
    </SortableContainer>
  );
}

// Separate component to access sortable state
function SortableGridItem({
  widget,
  children
}: {
  widget: DashboardWidget;
  children: React.ReactNode;
}) {
  const { activeId } = useSortableState();
  const isBeingDragged = activeId === widget.id;

  return (
    <SortableItemWrapper
      id={widget.id}
      className={cn(
        "transition-all duration-200",
        isBeingDragged && "opacity-40 scale-[0.98]"
      )}
      draggingClassName=""
      style={{
        gridColumn: `span ${Math.min(widget.width, 4)}`,
        gridRow: `span ${widget.height}`,
      }}
    >
      {children}
    </SortableItemWrapper>
  );
}
