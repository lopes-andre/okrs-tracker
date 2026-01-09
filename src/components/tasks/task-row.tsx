"use client";

import {
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task, TaskStatus, TaskPriority, TaskEffort, OkrRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface TaskRowProps {
  task: Task & {
    objective?: { code: string; name: string } | null;
    annual_kr?: { name: string; kr_type?: string } | null;
    quarter_target?: { quarter: number } | null;
    assigned_user?: { full_name: string | null; avatar_url: string | null } | null;
    tags?: { id: string; name: string; color?: string | null }[];
  };
  role: OkrRole;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: "High", color: "text-status-danger bg-status-danger/10 border-status-danger/20" },
  medium: { label: "Medium", color: "text-status-warning bg-status-warning/10 border-status-warning/20" },
  low: { label: "Low", color: "text-text-muted bg-bg-1 border-border-soft" },
};

const effortConfig: Record<TaskEffort, { label: string; color: string }> = {
  light: { label: "Light", color: "text-status-success bg-status-success/10 border-status-success/20" },
  moderate: { label: "Moderate", color: "text-accent bg-accent/10 border-accent/20" },
  heavy: { label: "Heavy", color: "text-status-info bg-status-info/10 border-status-info/20" },
};

interface DueDateDisplay {
  text: string;
  timeText?: string;
  variant: "overdue" | "today" | "soon" | "normal" | "completed" | "completed-late";
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  // Parse HH:MM:SS or HH:MM format
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const m = minutes;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatDueDate(
  dateStr: string | null,
  timeStr: string | null,
  isCompleted: boolean,
  completedAt: string | null
): DueDateDisplay {
  // For completed tasks, show completion status
  if (isCompleted) {
    if (!dateStr) {
      return { text: "Completed", variant: "completed" };
    }
    
    const dueDate = new Date(dateStr);
    dueDate.setHours(23, 59, 59, 999); // End of due day
    
    if (completedAt) {
      const completedDate = new Date(completedAt);
      if (completedDate > dueDate) {
        const diffMs = completedDate.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return { 
          text: `Completed ${diffDays}d late`, 
          variant: "completed-late" 
        };
      }
    }
    return { text: "Completed", variant: "completed" };
  }

  // For non-completed tasks
  if (!dateStr) return { text: "", variant: "normal" };
  
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedTime = formatTime(timeStr);
  
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, timeText: formattedTime, variant: "overdue" };
  } else if (diffDays === 0) {
    return { text: "Today", timeText: formattedTime, variant: "today" };
  } else if (diffDays === 1) {
    return { text: "Tomorrow", timeText: formattedTime, variant: "soon" };
  } else if (diffDays <= 7) {
    return { text: `in ${diffDays}d`, timeText: formattedTime, variant: "soon" };
  } else {
    return { 
      text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), 
      timeText: formattedTime,
      variant: "normal"
    };
  }
}

const variantStyles: Record<DueDateDisplay["variant"], string> = {
  overdue: "text-status-danger font-medium",
  today: "text-status-info font-medium", // Blue for today
  soon: "text-status-warning",
  normal: "text-text-muted",
  completed: "text-status-success",
  "completed-late": "text-status-warning",
};

export function TaskRow({ task, role, onStatusChange, onEdit, onDelete }: TaskRowProps) {
  const canEdit = role === "owner" || role === "editor";
  const isCompleted = task.status === "completed";
  const dueDate = formatDueDate(task.due_date, task.due_time, isCompleted, task.completed_at);

  function handleToggleComplete() {
    if (!canEdit) return;
    onStatusChange(isCompleted ? "pending" : "completed");
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 border-b border-border-soft last:border-b-0",
        "hover:bg-bg-1/50 transition-colors",
        isCompleted && "opacity-60"
      )}
    >
      {/* Checkbox */}
      {canEdit && (
        <button
          onClick={handleToggleComplete}
          className="shrink-0 text-text-muted hover:text-text-strong transition-colors"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-status-success" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-body-sm font-medium text-text-strong truncate",
          isCompleted && "line-through text-text-muted"
        )}>
          {task.title}
        </p>
        {(task.objective || task.annual_kr || task.description || (task.tags && task.tags.length > 0)) && (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {/* Show Objective name (with icon) + optional KR name */}
            {task.objective && (
              <span className="inline-flex items-center gap-1 text-small text-text-muted">
                <Target className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{task.objective.name}</span>
              </span>
            )}
            {task.objective && task.annual_kr && (
              <span className="text-small text-text-subtle">→</span>
            )}
            {task.annual_kr && (
              <span className="text-small text-text-subtle truncate max-w-[150px]">
                {task.annual_kr.name}
              </span>
            )}
            {/* Show description only if no OKR links */}
            {task.description && !task.objective && !task.annual_kr && (
              <span className="text-small text-text-muted truncate">{task.description}</span>
            )}
            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex gap-1 ml-1">
                {task.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-[10px] py-0 px-1.5">
                    {tag.name}
                  </Badge>
                ))}
                {task.tags.length > 2 && (
                  <span className="text-[10px] text-text-subtle">+{task.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quarter Badge */}
      {task.quarter_target && (
        <Badge variant="secondary" className="shrink-0">
          Q{task.quarter_target.quarter}
        </Badge>
      )}

      {/* Priority Badge */}
      <Badge
        variant="outline"
        className={cn("shrink-0 text-xs", priorityConfig[task.priority].color)}
      >
        {priorityConfig[task.priority].label}
      </Badge>

      {/* Effort Badge */}
      {task.effort && (
        <Badge
          variant="outline"
          className={cn("shrink-0 text-xs", effortConfig[task.effort].color)}
        >
          {effortConfig[task.effort].label}
        </Badge>
      )}

      {/* Due Date / Completion Status */}
      {dueDate.text && (
        <span
          className={cn(
            "text-small shrink-0 flex items-center gap-1",
            variantStyles[dueDate.variant]
          )}
        >
          <Calendar className="w-3 h-3" />
          <span>{dueDate.text}</span>
          {dueDate.timeText && (
            <span className="text-text-subtle text-[10px]">@ {dueDate.timeText}</span>
          )}
        </span>
      )}

      {/* Actions */}
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {task.status !== "completed" && (
              <DropdownMenuItem onClick={() => onStatusChange("completed")}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
            )}
            {task.status === "pending" && (
              <DropdownMenuItem onClick={() => onStatusChange("in_progress")}>
                <Clock className="w-4 h-4 mr-2" />
                Start Task
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-status-danger focus:text-status-danger"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
