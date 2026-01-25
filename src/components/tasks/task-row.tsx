"use client";

import { memo, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  Target,
  AlertTriangle,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  MessageCircle,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Task, TaskStatus, TaskPriority, TaskEffort, OkrRole, TaskAssignee, RecurrenceFrequency } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { EditingDot } from "@/components/layout/editing-indicator";
import { RecurrenceBadge } from "./recurrence-picker";

interface TaskRowProps {
  task: Task & {
    objective?: { code: string; name: string } | null;
    annual_kr?: {
      name: string;
      kr_type?: string;
      objective_id?: string;
      objective?: { code: string; name: string } | null;
    } | null;
    quarter_target?: { quarter: number } | null;
    assigned_user?: { full_name: string | null; avatar_url: string | null } | null;
    assignees?: TaskAssignee[];
    tags?: { id: string; name: string; color?: string | null }[];
    // Recurrence fields
    recurrence_frequency?: RecurrenceFrequency | null;
    recurrence_rrule?: string | null;
  };
  role: OkrRole;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Enable selection mode with checkbox */
  selectable?: boolean;
  /** Whether this task is selected (only used if selectable is true) */
  selected?: boolean;
  /** Callback when selection changes (only used if selectable is true) */
  onSelectChange?: (selected: boolean) => void;
  /** Current user's ID for editing indicator */
  currentUserId?: string;
  /** Number of comments on this task */
  commentCount?: number;
  /** Whether the task has unread comments for current user */
  hasUnreadComments?: boolean;
  /** Callback when comments icon is clicked */
  onCommentsClick?: () => void;
}

// Priority: Alert/Impact style - filled, dominant, answers "Why does this matter?"
const priorityConfig: Record<TaskPriority, { 
  label: string; 
  tooltip: string;
  color: string;
  iconColor: string;
}> = {
  high: { 
    label: "Critical", 
    tooltip: "Critical — High impact if delayed",
    color: "bg-status-danger text-white border-status-danger",
    iconColor: "text-white",
  },
  medium: { 
    label: "Important", 
    tooltip: "Important — Should be addressed soon",
    color: "bg-status-warning text-white border-status-warning",
    iconColor: "text-white",
  },
  low: { 
    label: "Minor", 
    tooltip: "Minor — Low impact, handle when convenient",
    color: "bg-bg-1 text-text-muted border-border",
    iconColor: "text-text-muted",
  },
};

// Effort: Battery/Energy style - outlined, informational, answers "What does this cost me?"
const effortConfig: Record<TaskEffort, { 
  label: string; 
  tooltip: string;
  color: string;
  Icon: typeof Battery;
}> = {
  light: { 
    label: "Light", 
    tooltip: "Light — Quick task, low energy needed",
    color: "border-status-success/50 text-status-success bg-transparent",
    Icon: BatteryLow,
  },
  moderate: { 
    label: "Moderate", 
    tooltip: "Moderate — Requires some focus and time",
    color: "border-text-muted/50 text-text-muted bg-transparent",
    Icon: BatteryMedium,
  },
  heavy: { 
    label: "Heavy", 
    tooltip: "Heavy — Significant time and energy investment",
    color: "border-status-danger/40 text-status-danger bg-transparent",
    Icon: BatteryFull,
  },
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

export const TaskRow = memo(function TaskRow({
  task,
  role,
  onStatusChange,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onSelectChange,
  currentUserId,
  commentCount = 0,
  hasUnreadComments = false,
  onCommentsClick,
}: TaskRowProps) {
  const canEdit = role === "owner" || role === "editor";
  const isCompleted = task.status === "completed";
  const dueDate = formatDueDate(task.due_date, task.due_time, isCompleted, task.completed_at);

  const handleToggleComplete = useCallback(() => {
    if (!canEdit) return;
    onStatusChange(isCompleted ? "pending" : "completed");
  }, [canEdit, isCompleted, onStatusChange]);

  const handleSelectToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectChange) {
      onSelectChange(!selected);
    }
  }, [onSelectChange, selected]);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 border-b border-border-soft last:border-b-0",
        "hover:bg-bg-1/50 transition-colors",
        isCompleted && "opacity-60",
        selected && "bg-accent/5 hover:bg-accent/10"
      )}
    >
      {/* Selection Checkbox (when in select mode) */}
      {selectable && canEdit && (
        <button
          onClick={handleSelectToggle}
          className={cn(
            "shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            selected
              ? "bg-accent border-accent text-white"
              : "border-border-soft hover:border-accent/50"
          )}
        >
          {selected && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}

      {/* Status Checkbox (when not in select mode) */}
      {!selectable && canEdit && (
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
        {(() => {
          // Get objective from direct link OR from annual_kr's parent
          const objective = task.objective || task.annual_kr?.objective;
          const hasOkrLink = objective || task.annual_kr;
          const showTags = task.tags && task.tags.length > 0;
          
          if (!hasOkrLink && !task.description && !showTags) return null;
          
          return (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {/* Show Objective name (with icon) */}
              {objective && (
                <span className="inline-flex items-center gap-1 text-small text-text-muted">
                  <Target className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[180px]">{objective.name}</span>
                </span>
              )}
              {/* Arrow between objective and KR */}
              {objective && task.annual_kr && (
                <span className="text-small text-text-subtle">→</span>
              )}
              {/* KR name */}
              {task.annual_kr && (
                <span className="text-small text-text-subtle truncate max-w-[180px]">
                  {task.annual_kr.name}
                </span>
              )}
              {/* Show description only if no OKR links */}
              {task.description && !hasOkrLink && (
                <span className="text-small text-text-muted truncate">{task.description}</span>
              )}
              {/* Tags */}
              {showTags && (
                <div className="flex gap-1 ml-1">
                  {task.tags!.slice(0, 2).map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-[10px] py-0 px-1.5">
                      {tag.name}
                    </Badge>
                  ))}
                  {task.tags!.length > 2 && (
                    <span className="text-[10px] text-text-subtle">+{task.tags!.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Editing Indicator */}
      <EditingDot
        entityType="task"
        entityId={task.id}
        currentUserId={currentUserId}
      />

      {/* Quarter Badge */}
      {task.quarter_target && (
        <Badge variant="secondary" className="shrink-0">
          Q{task.quarter_target.quarter}
        </Badge>
      )}

      {/* Recurrence Badge */}
      {(task.is_recurring || task.recurring_master_id || task.recurrence_frequency) && (
        <RecurrenceBadge
          frequency={task.recurrence_frequency}
          rrule={task.recurrence_rrule}
          className="shrink-0"
        />
      )}

      {/* Priority Badge - Filled, dominant, alert-style */}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "shrink-0 text-xs gap-1 cursor-default",
              priorityConfig[task.priority].color
            )}
          >
            <AlertTriangle className={cn("w-3 h-3", priorityConfig[task.priority].iconColor)} />
            {priorityConfig[task.priority].label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {priorityConfig[task.priority].tooltip}
        </TooltipContent>
      </Tooltip>

      {/* Effort Badge - Outlined, informational, battery-style */}
      {task.effort && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-xs gap-1 cursor-default",
                effortConfig[task.effort].color
              )}
            >
              {(() => {
                const EffortIcon = effortConfig[task.effort].Icon;
                return <EffortIcon className="w-3 h-3" />;
              })()}
              {effortConfig[task.effort].label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {effortConfig[task.effort].tooltip}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Assignees */}
      {task.assignees && task.assignees.length > 0 && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="flex -space-x-1.5 shrink-0">
              {task.assignees.slice(0, 2).map((assignee) => (
                <Avatar key={assignee.id} className="h-6 w-6 border-2 border-bg-0">
                  {assignee.user?.avatar_url && (
                    <AvatarImage src={assignee.user.avatar_url} />
                  )}
                  <AvatarFallback className="text-[10px] bg-accent/10 text-accent">
                    {assignee.user?.full_name
                      ? assignee.user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                      : assignee.user?.email?.slice(0, 2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 2 && (
                <div className="h-6 w-6 rounded-full bg-bg-1 border-2 border-bg-0 flex items-center justify-center text-[10px] text-text-muted font-medium">
                  +{task.assignees.length - 2}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Assigned to:</span>
              {task.assignees.map((assignee) => (
                <span key={assignee.id}>
                  {assignee.user?.full_name || assignee.user?.email || "Unknown user"}
                </span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Comments Button */}
      {onCommentsClick && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCommentsClick();
              }}
              className={cn(
                "shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors",
                hasUnreadComments
                  ? "text-accent bg-accent/10 hover:bg-accent/20"
                  : "text-text-muted hover:text-text-strong hover:bg-bg-1"
              )}
            >
              <MessageCircle className={cn("w-4 h-4", hasUnreadComments && "fill-accent/20")} />
              {commentCount > 0 && (
                <span className={cn(
                  "text-xs font-medium",
                  hasUnreadComments && "text-accent"
                )}>
                  {commentCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {commentCount === 0
              ? "Add comment"
              : hasUnreadComments
              ? `${commentCount} comment${commentCount > 1 ? "s" : ""} (unread)`
              : `${commentCount} comment${commentCount > 1 ? "s" : ""}`}
          </TooltipContent>
        </Tooltip>
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
              aria-label="Task actions"
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
});
