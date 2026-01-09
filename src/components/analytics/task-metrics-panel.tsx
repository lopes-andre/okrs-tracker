"use client";

import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Target,
  Link2Off,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TaskMetrics } from "@/features/analytics/api";

interface TaskMetricsPanelProps {
  metrics: TaskMetrics;
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sublabel?: string;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
}

function MetricCard({ icon: Icon, label, value, sublabel, variant = "default" }: MetricCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-card border",
      variant === "success" && "bg-status-success/5 border-status-success/20",
      variant === "warning" && "bg-status-warning/5 border-status-warning/20",
      variant === "danger" && "bg-status-danger/5 border-status-danger/20",
      variant === "accent" && "bg-accent/5 border-accent/20",
      variant === "default" && "bg-bg-1/50 border-border-soft"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-card flex items-center justify-center shrink-0",
          variant === "success" && "bg-status-success/10",
          variant === "warning" && "bg-status-warning/10",
          variant === "danger" && "bg-status-danger/10",
          variant === "accent" && "bg-accent/10",
          variant === "default" && "bg-bg-1"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            variant === "success" && "text-status-success",
            variant === "warning" && "text-status-warning",
            variant === "danger" && "text-status-danger",
            variant === "accent" && "text-accent",
            variant === "default" && "text-text-muted"
          )} />
        </div>
        <div>
          <p className="text-2xl font-bold font-heading">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
          {sublabel && <p className="text-[10px] text-text-subtle mt-0.5">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

export function TaskMetricsPanel({ metrics }: TaskMetricsPanelProps) {
  // Calculate completion rate
  const completionRate = metrics.totalActive + metrics.completedThisMonth > 0
    ? (metrics.completedThisMonth / (metrics.totalActive + metrics.completedThisMonth)) * 100
    : 0;

  // Calculate linked percentage
  const totalTasks = metrics.tasksLinkedToKrs + metrics.orphanTasks;
  const linkedPercentage = totalTasks > 0 
    ? (metrics.tasksLinkedToKrs / totalTasks) * 100 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-text-muted" />
          Task Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={ListTodo}
            label="Active Tasks"
            value={metrics.totalActive}
            variant="default"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Completed This Week"
            value={metrics.completedThisWeek}
            variant="success"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Overdue"
            value={metrics.overdueCount}
            variant={metrics.overdueCount > 0 ? "danger" : "default"}
          />
          <MetricCard
            icon={Zap}
            label="Quick Wins"
            value={metrics.quickWinsCompleted}
            sublabel="High priority, low effort"
            variant="accent"
          />
        </div>

        {/* Progress Indicators */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Completion Rate */}
          <div className="p-4 rounded-card border border-border-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-small font-medium">Monthly Completion Rate</span>
              <span className="text-small font-bold">{completionRate.toFixed(0)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <p className="text-xs text-text-muted mt-2">
              {metrics.completedThisMonth} completed out of {metrics.totalActive + metrics.completedThisMonth} tasks
            </p>
          </div>

          {/* OKR Linkage */}
          <div className="p-4 rounded-card border border-border-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-small font-medium">Tasks Linked to KRs</span>
              <span className="text-small font-bold">{linkedPercentage.toFixed(0)}%</span>
            </div>
            <Progress 
              value={linkedPercentage} 
              className={cn(
                "h-2",
                linkedPercentage < 50 && "[&>div]:bg-status-warning"
              )}
            />
            <p className="text-xs text-text-muted mt-2">
              {metrics.tasksLinkedToKrs} linked, {metrics.orphanTasks} unlinked tasks
            </p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-soft">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-xs">Avg Completion</span>
            </div>
            <p className="text-lg font-bold">{metrics.avgCompletionDays}d</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-xs">This Month</span>
            </div>
            <p className="text-lg font-bold">{metrics.completedThisMonth}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
              <Target className="w-3 h-3" />
              <span className="text-xs">Linked to KRs</span>
            </div>
            <p className="text-lg font-bold">{metrics.tasksLinkedToKrs}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
