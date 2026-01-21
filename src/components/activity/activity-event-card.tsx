"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Target,
  TrendingUp,
  ListTodo,
  Users,
  UserPlus,
  UserMinus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Link as LinkIcon,
  FileText,
  Calendar,
  CalendarCheck,
  Hash,
  Flag,
  Star,
  Play,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import type { ActivityEventWithUser, EventType, EventEntityType } from "@/lib/supabase/types";

interface ActivityEventCardProps {
  event: ActivityEventWithUser;
  defaultExpanded?: boolean;
}

// Icons for different event types (kept for potential future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _eventTypeIcons: Record<EventType, React.ElementType> = {
  created: Edit3,
  updated: Edit3,
  deleted: Trash2,
  completed: CheckCircle2,
  status_changed: AlertCircle,
  joined: UserPlus,
  left: UserMinus,
  role_changed: Users,
  started: Play,
};

// Icons for different entity types
const entityTypeIcons: Record<EventEntityType, React.ElementType> = {
  task: ListTodo,
  check_in: TrendingUp,
  member: Users,
  objective: Target,
  annual_kr: TrendingUp,
  quarter_target: Calendar,
  plan: Flag,
  weekly_review: CalendarCheck,
};

// Badge variants for event types
const getEventBadgeVariant = (type: EventType): "success" | "warning" | "danger" | "secondary" | "outline" => {
  switch (type) {
    case "created":
      return "success";
    case "completed":
      return "success";
    case "started":
      return "success";
    case "deleted":
      return "danger";
    case "status_changed":
      return "warning";
    case "role_changed":
      return "secondary";
    default:
      return "secondary";
  }
};

// Format entity type for display
const formatEntityType = (type: EventEntityType): string => {
  const labels: Record<EventEntityType, string> = {
    task: "Task",
    check_in: "Check-in",
    member: "Member",
    objective: "Objective",
    annual_kr: "Key Result",
    quarter_target: "Quarter Target",
    plan: "Plan",
    weekly_review: "Weekly Review",
  };
  return labels[type] || type;
};

// Format event type for display
const formatEventType = (type: EventType): string => {
  const labels: Record<EventType, string> = {
    created: "Created",
    updated: "Updated",
    deleted: "Deleted",
    completed: "Completed",
    status_changed: "Status Changed",
    joined: "Joined",
    left: "Left",
    role_changed: "Role Changed",
    started: "Started",
  };
  return labels[type] || type;
};

// Get the entity name from event data
const getEntityName = (event: ActivityEventWithUser): string => {
  const newData = event.new_data as Record<string, unknown> | null;
  const oldData = event.old_data as Record<string, unknown> | null;
  const metadata = event.metadata as Record<string, unknown> | null;
  
  return (
    (newData?.name as string) || 
    (newData?.title as string) || 
    (oldData?.name as string) || 
    (oldData?.title as string) || 
    (metadata?.name as string) || 
    (metadata?.title as string) || 
    ""
  );
};

// Format value changes for display (kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _formatValueChange = (key: string, oldVal: unknown, newVal: unknown): string => {
  if (key === "status") {
    return `${oldVal || "none"} → ${newVal}`;
  }
  if (key === "priority") {
    return `${oldVal || "none"} → ${newVal}`;
  }
  if (key === "value" && typeof oldVal === "number" && typeof newVal === "number") {
    const diff = newVal - oldVal;
    const sign = diff >= 0 ? "+" : "";
    return `${oldVal.toLocaleString()} → ${newVal.toLocaleString()} (${sign}${diff.toLocaleString()})`;
  }
  if (typeof newVal === "number") {
    return newVal.toLocaleString();
  }
  return String(newVal);
};

export function ActivityEventCard({ event, defaultExpanded = false }: ActivityEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const EventIcon = entityTypeIcons[event.entity_type] || Edit3;
  const entityName = getEntityName(event);
  
  const newData = event.new_data as Record<string, unknown> | null;
  const oldData = event.old_data as Record<string, unknown> | null;
  
  // Check if there are details to show
  const hasDetails = newData || oldData;
  
  // Build description text
  const getDescription = (): string => {
    const entity = formatEntityType(event.entity_type);
    const action = formatEventType(event.event_type).toLowerCase();
    
    if (event.event_type === "status_changed" && newData?.status) {
      return `${entity} status changed to ${newData.status}${entityName ? `: ${entityName}` : ""}`;
    }
    
    if (event.event_type === "completed") {
      if (event.entity_type === "weekly_review") {
        const year = newData?.year as number | undefined;
        const weekNumber = newData?.week_number as number | undefined;
        const rating = newData?.week_rating as number | undefined;
        return `Weekly Review completed${year && weekNumber ? ` for W${weekNumber} ${year}` : ""}${rating ? ` (${rating}/5 stars)` : ""}`;
      }
      return `${entity} completed${entityName ? `: ${entityName}` : ""}`;
    }
    
    if (event.entity_type === "check_in") {
      const value = newData?.value as number | undefined;
      const unit = newData?.unit as string | undefined;
      return `Check-in recorded${value !== undefined ? `: ${value.toLocaleString()}${unit ? ` ${unit}` : ""}` : ""}`;
    }
    
    if (event.entity_type === "weekly_review") {
      const year = newData?.year as number | undefined;
      const weekNumber = newData?.week_number as number | undefined;
      return `Weekly Review ${action}${year && weekNumber ? ` for W${weekNumber} ${year}` : ""}`;
    }
    
    return `${entity} ${action}${entityName ? `: ${entityName}` : ""}`;
  };

  return (
    <div 
      className={cn(
        "group rounded-card border transition-all",
        isExpanded 
          ? "border-border bg-white shadow-sm" 
          : "border-transparent hover:border-border-soft hover:bg-bg-1/30"
      )}
    >
      {/* Main Row - Always Visible */}
      <div 
        className={cn(
          "flex items-start gap-3 p-3 cursor-pointer",
          hasDetails && "cursor-pointer"
        )}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        {/* Event Icon */}
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          event.event_type === "created" && "bg-status-success/10",
          event.event_type === "completed" && "bg-status-success/10",
          event.event_type === "started" && "bg-status-success/10",
          event.event_type === "deleted" && "bg-status-danger/10",
          event.event_type === "status_changed" && "bg-status-warning/10",
          !["created", "completed", "started", "deleted", "status_changed"].includes(event.event_type) && "bg-bg-1 border border-border-soft"
        )}>
          <EventIcon className={cn(
            "w-4 h-4",
            event.event_type === "created" && "text-status-success",
            event.event_type === "completed" && "text-status-success",
            event.event_type === "started" && "text-status-success",
            event.event_type === "deleted" && "text-status-danger",
            event.event_type === "status_changed" && "text-status-warning",
            !["created", "completed", "started", "deleted", "status_changed"].includes(event.event_type) && "text-text-muted"
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Description */}
          <p className="text-body-sm text-text-strong leading-snug">
            {getDescription()}
          </p>
          
          {/* Meta: Actor + Time */}
          <div className="flex items-center gap-2 mt-1">
            {event.user && (
              <>
                <Avatar className="w-4 h-4">
                  <AvatarImage src={event.user.avatar_url || ""} />
                  <AvatarFallback className="text-[8px]">
                    {event.user.full_name?.split(" ").map((n) => n[0]).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-small text-text-muted">
                  {event.user.full_name || event.user.email}
                </span>
                <span className="text-text-subtle">•</span>
              </>
            )}
            <span 
              className="text-small text-text-subtle"
              title={format(new Date(event.created_at), "PPpp")}
            >
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Right Side: Badge + Expand */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge 
            variant={getEventBadgeVariant(event.event_type)}
            className="text-[10px] px-2 py-0.5"
          >
            {formatEventType(event.event_type)}
          </Badge>
          
          {hasDetails && (
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
              isExpanded ? "bg-accent/10" : "bg-transparent group-hover:bg-bg-1"
            )}>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-accent" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-subtle group-hover:text-text-muted" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && !!hasDetails && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-12 p-3 rounded-button bg-bg-1/50 border border-border-soft text-small">
            {/* Status Change Details */}
            {event.event_type === "status_changed" && !!oldData?.status && !!newData?.status && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-text-muted">Status:</span>
                <Badge variant="outline" className="text-[10px]">{String(oldData.status)}</Badge>
                <ArrowRight className="w-3 h-3 text-text-subtle" />
                <Badge variant="secondary" className="text-[10px]">{String(newData.status)}</Badge>
              </div>
            )}
            
            {/* Check-in Details */}
            {event.entity_type === "check_in" && newData && (
              <div className="space-y-1.5">
                {newData.value !== undefined && (
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3 text-text-muted" />
                    <span className="text-text-muted">Value:</span>
                    <span className="font-medium text-text-strong">
                      {(newData.value as number).toLocaleString()}
                      {newData.unit ? ` ${String(newData.unit)}` : ""}
                    </span>
                  </div>
                )}
                {!!newData.note && (
                  <div className="flex items-start gap-2">
                    <FileText className="w-3 h-3 text-text-muted mt-0.5" />
                    <span className="text-text-muted">Note:</span>
                    <span className="text-text-strong">{String(newData.note)}</span>
                  </div>
                )}
                {!!newData.evidence_url && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-3 h-3 text-text-muted" />
                    <span className="text-text-muted">Evidence:</span>
                    <a 
                      href={String(newData.evidence_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-accent hover:underline truncate max-w-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {String(newData.evidence_url)}
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {/* Weekly Review Details */}
            {event.entity_type === "weekly_review" && newData && (
              <div className="space-y-1.5">
                {newData.year !== undefined && newData.week_number !== undefined && (
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-3 h-3 text-text-muted" />
                    <span className="text-text-muted">Week:</span>
                    <span className="font-medium text-text-strong">
                      W{String(newData.week_number)} {String(newData.year)}
                    </span>
                  </div>
                )}
                {newData.week_rating !== undefined && newData.week_rating !== null && (
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-status-warning" />
                    <span className="text-text-muted">Rating:</span>
                    <span className="font-medium text-text-strong">
                      {String(newData.week_rating)}/5 stars
                    </span>
                  </div>
                )}
                {newData.stats_tasks_completed !== undefined && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-status-success" />
                    <span className="text-text-muted">Tasks completed:</span>
                    <span className="font-medium text-text-strong">
                      {String(newData.stats_tasks_completed)}
                    </span>
                  </div>
                )}
                {(newData.stats_objectives_on_track !== undefined ||
                  newData.stats_objectives_at_risk !== undefined) && (
                  <div className="flex items-center gap-2">
                    <Target className="w-3 h-3 text-text-muted" />
                    <span className="text-text-muted">KRs:</span>
                    <span className="font-medium text-text-strong">
                      {String(newData.stats_objectives_on_track ?? 0)} on track,{" "}
                      {String(newData.stats_objectives_at_risk ?? 0)} at risk
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Task Details */}
            {event.entity_type === "task" && (
              <div className="space-y-1.5">
                {!!newData?.title && (
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-3 h-3 text-text-muted" />
                    <span className="text-text-muted">Title:</span>
                    <span className="text-text-strong">{String(newData.title)}</span>
                  </div>
                )}
                {!!newData?.priority && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-text-muted" />
                    <span className="text-text-muted">Priority:</span>
                    <Badge variant="outline" className="text-[10px]">{String(newData.priority)}</Badge>
                  </div>
                )}
                {!!newData?.due_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-text-muted" />
                    <span className="text-text-muted">Due:</span>
                    <span className="text-text-strong">
                      {format(new Date(String(newData.due_date)), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Generic Key-Value Display for Other Types */}
            {!["check_in", "task"].includes(event.entity_type) && 
             event.event_type !== "status_changed" && newData && (
              <div className="space-y-1.5">
                {Object.entries(newData).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  if (["id", "plan_id", "created_at", "updated_at"].includes(key)) return null;
                  
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-text-muted capitalize">{key.replace(/_/g, " ")}:</span>
                      <span className="text-text-strong">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Show Changes (Old vs New) */}
            {event.event_type === "updated" && oldData && newData && (
              <div className="space-y-1.5 mt-2 pt-2 border-t border-border-soft">
                <p className="text-[10px] font-medium text-text-subtle uppercase tracking-wide mb-1">Changes</p>
                {Object.keys(newData).map((key) => {
                  const oldVal = oldData[key];
                  const newVal = newData[key];
                  if (oldVal === newVal) return null;
                  if (["id", "plan_id", "created_at", "updated_at"].includes(key)) return null;
                  
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-text-muted capitalize">{key.replace(/_/g, " ")}:</span>
                      <span className="text-text-subtle line-through">{String(oldVal ?? "empty")}</span>
                      <ArrowRight className="w-3 h-3 text-text-subtle" />
                      <span className="text-text-strong">{String(newVal ?? "empty")}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
