"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskWithDetails, TaskStatus, OkrRole } from "@/lib/supabase/types";

interface CollapsibleTaskListProps {
  title: string;
  count: number;
  tasks: TaskWithDetails[];
  icon?: React.ReactNode;
  variant?: "default" | "accent" | "danger" | "warning" | "success" | "muted";
  defaultExpanded?: boolean;
  maxItems?: number;
  showPagination?: boolean;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  role: OkrRole;
  onStatusChange: (task: TaskWithDetails, status: TaskStatus) => void;
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (task: TaskWithDetails) => void;
  renderTask: (
    task: TaskWithDetails,
    handlers: {
      onStatusChange: (status: TaskStatus) => void;
      onEdit: () => void;
      onDelete: () => void;
    }
  ) => React.ReactNode;
  emptyMessage?: string;
}

const variantStyles = {
  default: {
    border: "border-border-soft",
    header: "bg-bg-1/50",
    badge: "default" as const,
    titleClass: "",
  },
  accent: {
    // Blue styling for "Today" - blue border/badge but dark title for emphasis
    border: "border-status-info/30",
    header: "bg-status-info/5",
    badge: "info" as const,
    titleClass: "", // Keep title dark like other lists for emphasis
  },
  danger: {
    border: "border-status-danger/30",
    header: "bg-status-danger/5",
    badge: "danger" as const,
    titleClass: "",
  },
  warning: {
    border: "border-status-warning/30",
    header: "bg-status-warning/5",
    badge: "warning" as const,
    titleClass: "",
  },
  success: {
    border: "border-status-success/30",
    header: "bg-status-success/5",
    badge: "success" as const,
    titleClass: "",
  },
  muted: {
    border: "border-border-soft",
    header: "bg-bg-1",
    badge: "outline" as const,
    titleClass: "",
  },
};

export function CollapsibleTaskList({
  title,
  count,
  tasks,
  icon,
  variant = "default",
  defaultExpanded = true,
  maxItems,
  showPagination = false,
  totalCount,
  currentPage = 1,
  onPageChange,
  isLoading = false,
  role: _role,
  onStatusChange,
  onEdit,
  onDelete,
  renderTask,
  emptyMessage = "No tasks in this list",
}: CollapsibleTaskListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const styles = variantStyles[variant];

  // Limit items if maxItems is set and not showing pagination
  const displayedTasks =
    maxItems && !showPagination ? tasks.slice(0, maxItems) : tasks;
  const hasMore = maxItems && !showPagination && tasks.length > maxItems;
  // Show truncation indicator when totalCount is provided and greater than displayed tasks
  const isTruncated = totalCount !== undefined && totalCount > displayedTasks.length;

  if (count === 0 && !showPagination) {
    return null; // Don't render empty sections
  }

  return (
    <Card className={cn("overflow-hidden", styles.border)}>
      <CardHeader
        className={cn(
          "cursor-pointer transition-colors hover:bg-bg-1/70",
          styles.header
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
            </button>
            {icon && <span className="shrink-0">{icon}</span>}
            <CardTitle className={cn("text-h5", styles.titleClass)}>{title}</CardTitle>
          </div>
          <Badge variant={styles.badge}>{count}</Badge>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          ) : displayedTasks.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-text-muted">
              {emptyMessage}
            </p>
          ) : (
            <>
              <div className="divide-y divide-border-soft">
                {displayedTasks.map((task) =>
                  renderTask(task, {
                    onStatusChange: (status) => onStatusChange(task, status),
                    onEdit: () => onEdit(task),
                    onDelete: () => onDelete(task),
                  })
                )}
              </div>

              {/* "Show More" for non-paginated lists */}
              {hasMore && (
                <div className="py-3 text-center border-t border-border-soft">
                  <p className="text-small text-text-muted">
                    +{tasks.length - maxItems!} more tasks
                  </p>
                </div>
              )}

              {/* Truncation indicator when totalCount exceeds displayed */}
              {!hasMore && isTruncated && (
                <div className="py-3 text-center border-t border-border-soft">
                  <p className="text-small text-text-muted">
                    Showing {displayedTasks.length} of {totalCount} tasks
                  </p>
                </div>
              )}

              {/* Pagination */}
              {showPagination && totalCount && onPageChange && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border-soft">
                  <p className="text-small text-text-muted">
                    Showing {displayedTasks.length} of {totalCount}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPageChange(currentPage - 1);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={displayedTasks.length < 20}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPageChange(currentPage + 1);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
