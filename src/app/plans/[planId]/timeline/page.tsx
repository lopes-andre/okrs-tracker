"use client";

import { useState, use } from "react";
import {
  History,
  Filter,
  Calendar,
  MessageSquare,
  Target,
  CheckCircle2,
  Edit3,
  Loader2,
  Users,
  ListTodo,
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

const getEventIcon = (type: EventType) => {
  switch (type) {
    case "checkin_created":
      return <Target className="w-4 h-4" />;
    case "task_completed":
      return <CheckCircle2 className="w-4 h-4" />;
    case "task_created":
    case "task_updated":
    case "task_deleted":
      return <ListTodo className="w-4 h-4" />;
    case "member_added":
    case "member_removed":
    case "role_changed":
      return <Users className="w-4 h-4" />;
    default:
      return <Edit3 className="w-4 h-4" />;
  }
};

const getEventBadge = (type: EventType) => {
  switch (type) {
    case "checkin_created":
      return <Badge variant="info">Check-in</Badge>;
    case "task_completed":
      return <Badge variant="success">Completed</Badge>;
    case "task_created":
      return <Badge variant="outline">Task Created</Badge>;
    case "task_updated":
      return <Badge variant="outline">Task Updated</Badge>;
    case "task_deleted":
      return <Badge variant="warning">Task Deleted</Badge>;
    case "member_added":
      return <Badge variant="success">Member Added</Badge>;
    case "member_removed":
      return <Badge variant="warning">Member Removed</Badge>;
    case "role_changed":
      return <Badge variant="info">Role Changed</Badge>;
    case "objective_created":
    case "kr_created":
    case "quarter_target_created":
      return <Badge variant="success">Created</Badge>;
    case "objective_updated":
    case "kr_updated":
    case "quarter_target_updated":
      return <Badge variant="info">Updated</Badge>;
    case "objective_deleted":
    case "kr_deleted":
    case "quarter_target_deleted":
      return <Badge variant="warning">Deleted</Badge>;
    default:
      return <Badge>Event</Badge>;
  }
};

const formatEventTitle = (event: ActivityEventWithUser): string => {
  const entityName = (event.payload as { name?: string; title?: string })?.name ||
    (event.payload as { name?: string; title?: string })?.title ||
    event.entity_type;
  
  switch (event.event_type) {
    case "checkin_created":
      return `Check-in recorded for ${entityName}`;
    case "task_completed":
      return `Task completed: ${entityName}`;
    case "task_created":
      return `New task created: ${entityName}`;
    case "task_updated":
      return `Task updated: ${entityName}`;
    case "task_deleted":
      return `Task deleted: ${entityName}`;
    case "member_added":
      return "New member added to plan";
    case "member_removed":
      return "Member removed from plan";
    case "role_changed":
      return "Member role changed";
    case "objective_created":
      return `New objective: ${entityName}`;
    case "objective_updated":
      return `Objective updated: ${entityName}`;
    case "objective_deleted":
      return `Objective deleted: ${entityName}`;
    case "kr_created":
      return `New key result: ${entityName}`;
    case "kr_updated":
      return `Key result updated: ${entityName}`;
    case "kr_deleted":
      return `Key result deleted: ${entityName}`;
    case "quarter_target_created":
      return `New quarter target: ${entityName}`;
    case "quarter_target_updated":
      return `Quarter target updated: ${entityName}`;
    case "quarter_target_deleted":
      return `Quarter target deleted: ${entityName}`;
    default:
      return `${event.event_type.replace(/_/g, " ")}`;
  }
};

const formatEventDescription = (event: ActivityEventWithUser): string => {
  const payload = event.payload as Record<string, unknown>;
  
  if (event.event_type === "checkin_created") {
    const value = payload.value;
    const previous = payload.previous_value;
    if (value !== undefined && previous !== undefined) {
      return `Value updated from ${previous} to ${value}`;
    }
    if (value !== undefined) {
      return `Recorded value: ${value}`;
    }
  }
  
  if (event.event_type === "role_changed") {
    const newRole = payload.new_role;
    const oldRole = payload.old_role;
    if (newRole && oldRole) {
      return `Role changed from ${oldRole} to ${newRole}`;
    }
  }
  
  // Check for note or description
  if (payload.note) {
    return payload.note as string;
  }
  if (payload.description) {
    return payload.description as string;
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
    ? { eventTypes: [filterType as EventType] }
    : undefined;
    
  const { data, isLoading, isFetching } = useTimelinePaginated(planId, page, 20, filters);
  
  const events = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / 20);

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
                      {getEventIcon(event.event_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-body-sm text-text-strong">
                              {formatEventTitle(event)}
                            </h4>
                            {getEventBadge(event.event_type)}
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
