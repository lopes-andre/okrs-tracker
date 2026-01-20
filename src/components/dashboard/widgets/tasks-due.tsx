"use client";

import Link from "next/link";
import { CheckCircle2, Clock, ArrowRight, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "../dashboard-data-provider";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, isPast, isToday, isTomorrow, isThisWeek } from "date-fns";

interface TasksDueWidgetProps {
  config: Record<string, unknown>;
}

export function TasksDueWidget({ config }: TasksDueWidgetProps) {
  const { planId, tasks } = useDashboardData();
  const maxItems = (config.maxItems as number) || 5;

  // Filter to active tasks with due dates, sorted by due date
  const dueTasks = tasks
    .filter((task) =>
      task.status !== "completed" &&
      task.status !== "cancelled" &&
      task.due_date
    )
    .sort((a, b) => {
      const dateA = new Date(a.due_date!);
      const dateB = new Date(b.due_date!);
      return dateA.getTime() - dateB.getTime();
    });

  // Separate overdue and upcoming
  const overdueTasks = dueTasks.filter((t) => isPast(new Date(t.due_date!)) && !isToday(new Date(t.due_date!)));
  const upcomingTasks = dueTasks.filter((t) => !isPast(new Date(t.due_date!)) || isToday(new Date(t.due_date!)));

  // Combine with overdue first, then upcoming
  const sortedTasks = [...overdueTasks, ...upcomingTasks];
  const displayTasks = sortedTasks.slice(0, maxItems);

  if (dueTasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <CheckCircle2 className="w-8 h-8 text-status-success mb-2" />
        <p className="text-body-sm font-medium text-text-strong">No tasks due</p>
        <p className="text-xs text-text-muted mt-1">You&apos;re all caught up!</p>
      </div>
    );
  }

  function getDueDateLabel(dueDate: string) {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { label: formatDistanceToNow(date, { addSuffix: true }), isOverdue: true };
    }
    if (isToday(date)) {
      return { label: "Today", isOverdue: false };
    }
    if (isTomorrow(date)) {
      return { label: "Tomorrow", isOverdue: false };
    }
    if (isThisWeek(date)) {
      return { label: formatDistanceToNow(date, { addSuffix: true }), isOverdue: false };
    }
    return { label: formatDistanceToNow(date, { addSuffix: true }), isOverdue: false };
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-2 overflow-auto">
        {displayTasks.map((task) => {
          const { label, isOverdue } = getDueDateLabel(task.due_date!);

          return (
            <div
              key={task.id}
              className={cn(
                "p-3 rounded-card border",
                isOverdue
                  ? "bg-status-danger/5 border-status-danger/20"
                  : "bg-bg-1/50 border-border-soft"
              )}
            >
              <div className="flex items-start gap-2">
                {isOverdue ? (
                  <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-text-strong truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-xs",
                      isOverdue ? "text-status-danger" : "text-text-muted"
                    )}>
                      {label}
                    </span>
                    {task.priority === "high" && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        High
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedTasks.length > maxItems && (
        <div className="pt-3 border-t border-border-soft mt-3">
          <Link href={`/plans/${planId}/tasks`}>
            <Button variant="ghost" size="sm" className="w-full justify-center gap-1">
              View all {sortedTasks.length} tasks
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div className="text-xs text-status-danger text-center mt-2">
          {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
