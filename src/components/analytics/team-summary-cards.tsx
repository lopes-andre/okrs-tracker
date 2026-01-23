"use client";

import { Users, BarChart3, ListChecks, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TeamSummaryMetrics } from "@/lib/supabase/types";

interface TeamSummaryCardsProps {
  summary: TeamSummaryMetrics;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
}

function StatCard({ title, value, subtitle, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-card",
      variant === "success" && "border-status-success/30",
      variant === "warning" && "border-status-warning/30",
      variant === "danger" && "border-status-danger/30",
      variant === "accent" && "border-accent/30"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-small text-text-muted font-medium">{title}</p>
            <p className={cn(
              "text-3xl font-bold font-heading mt-1",
              variant === "success" && "text-status-success",
              variant === "warning" && "text-status-warning",
              variant === "danger" && "text-status-danger",
              variant === "accent" && "text-accent",
              variant === "default" && "text-text-strong"
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-text-subtle mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-card flex items-center justify-center shrink-0",
            variant === "success" && "bg-status-success/10",
            variant === "warning" && "bg-status-warning/10",
            variant === "danger" && "bg-status-danger/10",
            variant === "accent" && "bg-accent/10",
            variant === "default" && "bg-bg-1"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              variant === "success" && "text-status-success",
              variant === "warning" && "text-status-warning",
              variant === "danger" && "text-status-danger",
              variant === "accent" && "text-accent",
              variant === "default" && "text-text-muted"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamSummaryCards({ summary }: TeamSummaryCardsProps) {
  // Determine balance score variant
  const balanceVariant = summary.workload_balance_score >= 70
    ? "success"
    : summary.workload_balance_score >= 40
      ? "warning"
      : "danger";

  const balanceSubtitle = summary.overloaded_members > 0 || summary.underutilized_members > 0
    ? `${summary.overloaded_members} overloaded, ${summary.underutilized_members} underutilized`
    : "Team workload is balanced";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Members */}
      <StatCard
        title="Team Members"
        value={summary.total_members}
        subtitle={`${summary.active_members} active in last 30 days`}
        icon={Users}
        variant="default"
      />

      {/* Workload Balance Score */}
      <StatCard
        title="Workload Balance"
        value={`${summary.workload_balance_score}%`}
        subtitle={balanceSubtitle}
        icon={BarChart3}
        variant={balanceVariant}
      />

      {/* Tasks Assigned */}
      <StatCard
        title="Tasks Assigned"
        value={summary.total_tasks_assigned}
        subtitle={`~${summary.avg_tasks_per_member} per member`}
        icon={ListChecks}
        variant="accent"
      />

      {/* Check-in Activity */}
      <StatCard
        title="Total Check-ins"
        value={summary.total_check_ins}
        subtitle="All time"
        icon={Zap}
        variant="default"
      />
    </div>
  );
}
