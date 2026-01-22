"use client";

import React, { createContext, useContext, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  UniqueIdentifier,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type SortingStrategy = "vertical" | "horizontal" | "grid";

export interface SortableItem {
  id: string;
}

// ============================================================================
// CONTEXT - For tracking active item during drag
// ============================================================================

interface SortableContextValue {
  activeId: UniqueIdentifier | null;
  isDragging: boolean;
}

const SortableStateContext = createContext<SortableContextValue>({
  activeId: null,
  isDragging: false,
});

export function useSortableState() {
  return useContext(SortableStateContext);
}

// ============================================================================
// SORTABLE CONTAINER - Wraps items that can be reordered
// ============================================================================

interface SortableContainerProps<T extends SortableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  strategy?: SortingStrategy;
  children: React.ReactNode;
  /** Render the drag overlay (item being dragged) */
  renderOverlay?: (activeItem: T) => React.ReactNode;
  /** Called when drag starts */
  onDragStart?: (item: T) => void;
  /** Called when item is dragged over another container (for Kanban) */
  onDragOver?: (event: DragOverEvent) => void;
  /** CSS class for the container */
  className?: string;
}

export function SortableContainer<T extends SortableItem>({
  items,
  onReorder,
  strategy = "vertical",
  children,
  renderOverlay,
  onDragStart,
  onDragOver,
  className,
}: SortableContainerProps<T>) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortingStrategy = useMemo(() => {
    switch (strategy) {
      case "horizontal":
        return horizontalListSortingStrategy;
      case "grid":
        return rectSortingStrategy;
      default:
        return verticalListSortingStrategy;
    }
  }, [strategy]);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId),
    [activeId, items]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
    const item = items.find((i) => i.id === event.active.id);
    if (item && onDragStart) {
      onDragStart(item);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (onDragOver) {
      onDragOver(event);
    }
  }

  const contextValue = useMemo(
    () => ({ activeId, isDragging: activeId !== null }),
    [activeId]
  );

  return (
    <SortableStateContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={sortingStrategy}>
          <div className={className}>{children}</div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: "0.4",
                },
              },
            }),
          }}
        >
          {activeItem && renderOverlay ? renderOverlay(activeItem) : null}
        </DragOverlay>
      </DndContext>
    </SortableStateContext.Provider>
  );
}

// ============================================================================
// SORTABLE ITEM - Individual draggable item
// ============================================================================

interface SortableItemWrapperProps {
  id: string;
  children: React.ReactNode;
  /** Whether drag is enabled */
  disabled?: boolean;
  /** CSS class applied when dragging */
  draggingClassName?: string;
  /** CSS class for the item */
  className?: string;
  /** Render as a different element */
  as?: React.ElementType;
  /** Additional styles */
  style?: React.CSSProperties;
}

export function SortableItemWrapper({
  id,
  children,
  disabled = false,
  draggingClassName = "opacity-50 shadow-lg scale-105",
  className,
  as: Component = "div",
  style,
}: SortableItemWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...style,
  };

  return (
    <Component
      ref={setNodeRef}
      style={sortableStyle}
      className={cn(className, isDragging && draggingClassName)}
      {...attributes}
      {...listeners}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// DRAG HANDLE - Separate drag handle for items with interactive content
// ============================================================================

interface DragHandleProps {
  id: string;
  className?: string;
  disabled?: boolean;
}

export function DragHandle({ id, className, disabled = false }: DragHandleProps) {
  const { attributes, listeners, setNodeRef } = useSortable({ id, disabled });

  if (disabled) return null;

  return (
    <button
      ref={setNodeRef}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none",
        "p-1 rounded hover:bg-bg-1 transition-colors",
        "text-text-subtle hover:text-text-muted",
        className
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-4 h-4" />
      <span className="sr-only">Drag to reorder</span>
    </button>
  );
}

// ============================================================================
// UTILITY HOOK - For custom sortable implementations
// ============================================================================

export { useSortable, arrayMove };
export type { DragEndEvent, DragStartEvent, DragOverEvent, UniqueIdentifier };
