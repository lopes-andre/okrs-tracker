"use client";

import {
  TrendingUp,
  ListTodo,
  CheckCircle2,
  Target,
  Users,
  Calendar,
  Zap,
  Edit3,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek } from "date-fns";
import type { ActivityEventWithUser } from "@/lib/supabase/types";

interface WeeklyReviewPanelProps {
  events: ActivityEventWithUser[];
  dateRange: { from: Date; to: Date };
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  sublabel?: string;
  variant?: "default" | "success" | "warning" | "accent";
}

function StatCard({ icon: Icon, label, value, sublabel, variant = "default" }: StatCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-card border transition-all",
      variant === "success" && "bg-status-success/5 border-status-success/20",
      variant === "warning" && "bg-status-warning/5 border-status-warning/20",
      variant === "accent" && "bg-accent/5 border-accent/20",
      variant === "default" && "bg-bg-1/50 border-border-soft"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-card flex items-center justify-center",
          variant === "success" && "bg-status-success/10",
          variant === "warning" && "bg-status-warning/10",
          variant === "accent" && "bg-accent/10",
          variant === "default" && "bg-bg-1"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            variant === "success" && "text-status-success",
            variant === "warning" && "text-status-warning",
            variant === "accent" && "text-accent",
            variant === "default" && "text-text-muted"
          )} />
        </div>
        <div>
          <p className="text-2xl font-bold font-heading">{value}</p>
          <p className="text-small text-text-muted">{label}</p>
          {sublabel && <p className="text-xs text-text-subtle">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

export function WeeklyReviewPanel({ events, dateRange }: WeeklyReviewPanelProps) {
  // Calculate stats from events
  const stats = {
    totalEvents: events.length,
    checkIns: events.filter(e => e.entity_type === "check_in").length,
    tasksCompleted: events.filter(e => e.entity_type === "task" && e.event_type === "completed").length,
    tasksCreated: events.filter(e => e.entity_type === "task" && e.event_type === "created").length,
    krsUpdated: events.filter(e => e.entity_type === "annual_kr").length,
    objectivesUpdated: events.filter(e => e.entity_type === "objective").length,
    membersJoined: events.filter(e => e.entity_type === "member" && e.event_type === "joined").length,
  };

  // Group events by type for the breakdown
  const eventsByType = events.reduce((acc, event) => {
    const key = `${event.entity_type}_${event.event_type}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get unique contributors
  const uniqueContributors = new Set(events.map(e => e.user_id).filter(Boolean)).size;

  // Get most active entity types
  const entityCounts = events.reduce((acc, event) => {
    acc[event.entity_type] = (acc[event.entity_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedEntities = Object.entries(entityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-status-warning" />
              Weekly Review
            </CardTitle>
            <p className="text-small text-text-muted mt-1">
              {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {stats.totalEvents} total events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={CheckCircle2}
            label="Tasks Completed"
            value={stats.tasksCompleted}
            variant="success"
          />
          <StatCard
            icon={TrendingUp}
            label="Check-ins"
            value={stats.checkIns}
            variant="accent"
          />
          <StatCard
            icon={ListTodo}
            label="Tasks Created"
            value={stats.tasksCreated}
            variant="default"
          />
          <StatCard
            icon={Users}
            label="Contributors"
            value={uniqueContributors}
            variant="default"
          />
        </div>

        {/* What Changed This Week */}
        <div className="space-y-4">
          <h4 className="text-small font-semibold text-text-strong">What changed this week</h4>
          
          {sortedEntities.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {sortedEntities.map(([entityType, count]) => {
                const labels: Record<string, { label: string; icon: React.ElementType }> = {
                  task: { label: "Tasks", icon: ListTodo },
                  check_in: { label: "Check-ins", icon: TrendingUp },
                  objective: { label: "Objectives", icon: Target },
                  annual_kr: { label: "Key Results", icon: TrendingUp },
                  quarter_target: { label: "Quarter Targets", icon: Calendar },
                  member: { label: "Members", icon: Users },
                  plan: { label: "Plan", icon: Target },
                };
                const { label, icon: Icon } = labels[entityType] || { label: entityType, icon: Edit3 };
                
                return (
                  <div 
                    key={entityType}
                    className="flex items-center gap-2 p-2 rounded-button bg-bg-1/50 border border-border-soft"
                  >
                    <Icon className="w-4 h-4 text-text-muted" />
                    <span className="text-small text-text-muted">{label}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-small text-text-muted text-center py-4">
              No activity recorded this week
            </p>
          )}
        </div>

        {/* Breakdown by Action */}
        {stats.totalEvents > 0 && (
          <div className="mt-4 pt-4 border-t border-border-soft">
            <h4 className="text-small font-semibold text-text-strong mb-3">Activity Breakdown</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventsByType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([key, count]) => {
                  const [entity, action] = key.split("_");
                  const actionLabels: Record<string, string> = {
                    created: "created",
                    updated: "updated",
                    deleted: "deleted",
                    completed: "completed",
                    changed: "changed",
                    joined: "joined",
                    left: "left",
                  };
                  const entityLabels: Record<string, string> = {
                    task: "Task",
                    check: "Check-in",
                    objective: "Objective",
                    annual: "KR",
                    quarter: "Quarter",
                    member: "Member",
                    plan: "Plan",
                  };
                  
                  return (
                    <Badge key={key} variant="outline" className="text-[10px] gap-1">
                      <span className="text-text-muted">{entityLabels[entity] || entity}</span>
                      <span>{actionLabels[action] || action}</span>
                      <span className="text-accent font-bold">×{count}</span>
                    </Badge>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
