"use client";

import { useState, use } from "react";
import {
  History,
  Filter,
  Target,
  CheckCircle2,
  Edit3,
  Loader2,
  Users,
  ListTodo,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTimelinePaginated } from "@/features/timeline/hooks";
import type { ActivityEventWithUser, EventType } from "@/lib/supabase/types";
import { formatDistanceToNow, format } from "date-fns";

const getEventIcon = (type: EventType, entityType?: string) => {
  // Map based on event type
  switch (type) {
    case "created":
      if (entityType === "check_in") return <Target className="w-4 h-4" />;
      if (entityType === "task") return <ListTodo className="w-4 h-4" />;
      if (entityType === "member") return <Users className="w-4 h-4" />;
      return <Edit3 className="w-4 h-4" />;
    case "updated":
      return <Edit3 className="w-4 h-4" />;
    case "deleted":
      return <Trash2 className="w-4 h-4" />;
    case "completed":
      return <CheckCircle2 className="w-4 h-4" />;
    case "status_changed":
      return <ListTodo className="w-4 h-4" />;
    case "joined":
    case "left":
    case "role_changed":
      return <Users className="w-4 h-4" />;
    default:
      return <Edit3 className="w-4 h-4" />;
  }
};

const getEventBadge = (type: EventType, entityType?: string) => {
  switch (type) {
    case "created":
      if (entityType === "check_in") return <Badge variant="info">Check-in</Badge>;
      if (entityType === "task") return <Badge variant="outline">Task Created</Badge>;
      if (entityType === "member") return <Badge variant="success">Member Joined</Badge>;
      if (entityType === "objective") return <Badge variant="success">Objective Created</Badge>;
      if (entityType === "annual_kr") return <Badge variant="success">KR Created</Badge>;
      if (entityType === "quarter_target") return <Badge variant="success">Target Created</Badge>;
      return <Badge variant="outline">Created</Badge>;
    case "updated":
      if (entityType === "task") return <Badge variant="outline">Task Updated</Badge>;
      if (entityType === "objective") return <Badge variant="info">Objective Updated</Badge>;
      if (entityType === "annual_kr") return <Badge variant="info">KR Updated</Badge>;
      if (entityType === "quarter_target") return <Badge variant="info">Target Updated</Badge>;
      return <Badge variant="outline">Updated</Badge>;
    case "deleted":
      if (entityType === "task") return <Badge variant="warning">Task Deleted</Badge>;
      if (entityType === "objective") return <Badge variant="warning">Objective Deleted</Badge>;
      if (entityType === "annual_kr") return <Badge variant="warning">KR Deleted</Badge>;
      if (entityType === "quarter_target") return <Badge variant="warning">Target Deleted</Badge>;
      return <Badge variant="warning">Deleted</Badge>;
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "status_changed":
      return <Badge variant="info">Status Changed</Badge>;
    case "joined":
      return <Badge variant="success">Joined</Badge>;
    case "left":
      return <Badge variant="warning">Left</Badge>;
    case "role_changed":
      return <Badge variant="info">Role Changed</Badge>;
    default:
      return <Badge>Event</Badge>;
  }
};

const formatEventTitle = (event: ActivityEventWithUser): string => {
  // Try to get entity name from new_data or metadata
  const newData = event.new_data as { name?: string; title?: string } | null;
  const metadata = event.metadata as { name?: string; title?: string } | null;
  const entityName = newData?.name || newData?.title || metadata?.name || metadata?.title || "";
  
  // Format based on entity type and event type
  const entityLabel = {
    task: "Task",
    check_in: "Check-in",
    member: "Member",
    objective: "Objective",
    annual_kr: "Key Result",
    quarter_target: "Quarter Target",
    plan: "Plan",
  }[event.entity_type] || "Item";

  switch (event.event_type) {
    case "created":
      if (event.entity_type === "check_in") return `Check-in recorded${entityName ? ` for ${entityName}` : ""}`;
      return `${entityLabel} created${entityName ? `: ${entityName}` : ""}`;
    case "updated":
      return `${entityLabel} updated${entityName ? `: ${entityName}` : ""}`;
    case "deleted":
      return `${entityLabel} deleted${entityName ? `: ${entityName}` : ""}`;
    case "completed":
      return `${entityLabel} completed${entityName ? `: ${entityName}` : ""}`;
    case "status_changed":
      return `${entityLabel} status changed${entityName ? `: ${entityName}` : ""}`;
    case "joined":
      return "New member joined the plan";
    case "left":
      return "Member left the plan";
    case "role_changed":
      return "Member role changed";
  }
  // Fallback for any future event types
  return (event.event_type as string).replace(/_/g, " ");
};

const formatEventDescription = (event: ActivityEventWithUser): string => {
  const newData = event.new_data as Record<string, unknown> | null;
  const oldData = event.old_data as Record<string, unknown> | null;
  const metadata = event.metadata as Record<string, unknown> | null;
  
  // For check-ins, show value changes
  if (event.entity_type === "check_in" && newData) {
    const value = newData.value;
    const previous = newData.previous_value ?? oldData?.value;
    if (value !== undefined && previous !== undefined) {
      return `Value updated from ${previous} to ${value}`;
    }
    if (value !== undefined) {
      return `Recorded value: ${value}`;
    }
  }
  
  // For role changes
  if (event.event_type === "role_changed" && metadata) {
    const newRole = metadata.new_role;
    const oldRole = metadata.old_role;
    if (newRole && oldRole) {
      return `Role changed from ${oldRole} to ${newRole}`;
    }
  }
  
  // For status changes
  if (event.event_type === "status_changed" && newData && oldData) {
    const newStatus = newData.status;
    const oldStatus = oldData.status;
    if (newStatus && oldStatus) {
      return `Status: ${oldStatus} → ${newStatus}`;
    }
  }
  
  // Check for note or description
  if (newData?.note) {
    return newData.note as string;
  }
  if (newData?.description) {
    return (newData.description as string).slice(0, 100);
  }
  
  return "";
};

export default function TimelinePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");
  
  const filters = filterType !== "all" 
    ? { event_type: [filterType as EventType] }
    : undefined;
    
  const { data, isLoading, isFetching } = useTimelinePaginated(planId, page, 20, filters);
  
  const events = data?.data || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <>
      <PageHeader
        title="Timeline"
        description="Activity feed and audit log for your OKR plan"
      >
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="checkin_created">Check-ins</SelectItem>
            <SelectItem value="task_completed">Task Completed</SelectItem>
            <SelectItem value="task_created">Task Created</SelectItem>
            <SelectItem value="objective_created">Objective Created</SelectItem>
            <SelectItem value="kr_created">KR Created</SelectItem>
            <SelectItem value="member_added">Member Added</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-text-muted" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Activity will appear here as you create objectives, check-ins, and tasks."
        />
      ) : (
        <Card>
          <CardContent className="py-6">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border-soft" />

              {/* Events */}
              <div className="space-y-6">
                {events.map((event) => (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div className="relative z-10 w-12 h-12 rounded-full bg-bg-0 border border-border-soft flex items-center justify-center shrink-0">
                      {getEventIcon(event.event_type, event.entity_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-body-sm text-text-strong">
                              {formatEventTitle(event)}
                            </h4>
                            {getEventBadge(event.event_type, event.entity_type)}
                          </div>
                          {formatEventDescription(event) && (
                            <p className="text-body-sm text-text-muted">
                              {formatEventDescription(event)}
                            </p>
                          )}
                        </div>
                        <span className="text-small text-text-subtle whitespace-nowrap" title={format(new Date(event.created_at), "PPpp")}>
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* User */}
                      {event.user && (
                        <div className="flex items-center gap-2 mt-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={event.user.avatar_url || ""} />
                            <AvatarFallback className="text-[10px]">
                              {event.user.full_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-small text-text-muted">
                            {event.user.full_name || event.user.email || "Unknown"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-small text-text-muted">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
