"use client";

import Image from "next/image";
import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { MemberWorkloadStats } from "@/lib/supabase/types";

interface TeamMemberCardProps {
  member: MemberWorkloadStats;
  avgTasksPerMember: number;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "owner":
      return "default";
    case "editor":
      return "secondary";
    default:
      return "outline";
  }
}

export function TeamMemberCard({ member, avgTasksPerMember }: TeamMemberCardProps) {
  const completionRate = member.tasks_assigned > 0
    ? Math.round((member.tasks_completed / member.tasks_assigned) * 100)
    : 0;

  // Determine workload status
  const isOverloaded = avgTasksPerMember > 0 && member.tasks_assigned > avgTasksPerMember * 1.5;
  const isUnderutilized = avgTasksPerMember > 0 && member.tasks_assigned > 0 && member.tasks_assigned < avgTasksPerMember * 0.5;

  const displayName = member.full_name || member.email.split("@")[0];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-card",
      isOverloaded && "border-status-danger/50",
      isUnderutilized && "border-status-warning/50"
    )}>
      <CardContent className="p-4">
        {/* Header: Avatar, Name, Role */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          {member.avatar_url ? (
            <Image
              src={member.avatar_url}
              alt={displayName}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-medium text-sm shrink-0">
              {getInitials(member.full_name, member.email)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-text-strong truncate">{displayName}</h3>
              <Badge variant={getRoleBadgeVariant(member.role)} className="shrink-0 text-xs">
                {member.role}
              </Badge>
            </div>
            <p className="text-xs text-text-muted truncate">{member.email}</p>
          </div>
        </div>

        {/* Status badges */}
        {(isOverloaded || isUnderutilized) && (
          <div className="mb-3">
            {isOverloaded && (
              <Badge variant="danger" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overloaded
              </Badge>
            )}
            {isUnderutilized && (
              <Badge variant="outline" className="text-xs border-status-warning text-status-warning">
                Underutilized
              </Badge>
            )}
          </div>
        )}

        {/* Task Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="p-2 bg-bg-1 rounded-md">
            <div className="text-lg font-semibold text-text-strong">{member.tasks_assigned}</div>
            <div className="text-xs text-text-muted">assigned</div>
          </div>
          <div className="p-2 bg-bg-1 rounded-md">
            <div className="text-lg font-semibold text-status-success">{member.tasks_completed}</div>
            <div className="text-xs text-text-muted">done</div>
          </div>
          <div className="p-2 bg-bg-1 rounded-md">
            <div className={cn(
              "text-lg font-semibold",
              member.tasks_overdue > 0 ? "text-status-danger" : "text-text-muted"
            )}>
              {member.tasks_overdue}
            </div>
            <div className="text-xs text-text-muted">overdue</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-text-muted">Completion rate</span>
            <span className="text-xs font-medium text-text-strong">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Footer: Last Activity */}
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="w-3 h-3" />
          <span>
            {member.last_activity_at
              ? `Last active ${formatDistanceToNow(new Date(member.last_activity_at), { addSuffix: true })}`
              : "No recent activity"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
