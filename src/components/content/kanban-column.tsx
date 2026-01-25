"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ContentPostStatus } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface KanbanColumnProps {
  id: ContentPostStatus;
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
  emptyMessage: string;
  onAddPost?: () => void;
  /** Whether to show the add button in header and empty state */
  showAddButton?: boolean;
}

// ============================================================================
// STATUS COLORS
// ============================================================================

const statusColors: Record<ContentPostStatus, { bg: string; border: string; badge: string }> = {
  backlog: {
    bg: "bg-bg-1/50",
    border: "border-border-soft",
    badge: "bg-text-muted/10 text-text-muted",
  },
  tagged: {
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    border: "border-amber-200/50 dark:border-amber-800/30",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  ongoing: {
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    border: "border-blue-200/50 dark:border-blue-800/30",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  complete: {
    bg: "bg-green-50/50 dark:bg-green-950/20",
    border: "border-green-200/50 dark:border-green-800/30",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanColumn({
  id,
  title,
  description,
  count,
  children,
  emptyMessage,
  onAddPost,
  showAddButton = false,
}: KanbanColumnProps) {
  const colors = statusColors[id];

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border",
        colors.bg,
        colors.border
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border-soft">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-body-sm">{title}</h3>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-small font-medium",
                colors.badge
              )}
            >
              {count}
            </span>
          </div>
          {showAddButton && onAddPost && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onAddPost}
            >
              <Plus className="w-4 h-4" />
              <span className="sr-only">Add post to {title}</span>
            </Button>
          )}
        </div>
        <p className="text-small text-text-muted">{description}</p>
      </div>

      {/* Column Content - grows with content, page scrolls */}
      <div className="p-2 space-y-2">
        {children}

        {/* Empty state */}
        {count === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-small text-text-muted mb-2">{emptyMessage}</p>
            {showAddButton && onAddPost && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAddPost}
                className="text-small"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Post
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
