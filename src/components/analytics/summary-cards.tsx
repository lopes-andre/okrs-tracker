"use client";

import {
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  ListTodo,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/features/analytics/api";

interface SummaryCardsProps {
  summary: AnalyticsSummary;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "warning" | "danger" | "accent";
}

function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;
  
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
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                isPositiveTrend ? "text-status-success" : "text-status-danger"
              )}>
                {isPositiveTrend ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{isPositiveTrend ? "+" : ""}{trend.value}% {trend.label}</span>
              </div>
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

export function SummaryCards({ summary }: SummaryCardsProps) {
  // Calculate momentum trend
  const checkInTrend = summary.checkInsLastWeek > 0
    ? Math.round(((summary.checkInsThisWeek - summary.checkInsLastWeek) / summary.checkInsLastWeek) * 100)
    : summary.checkInsThisWeek > 0 ? 100 : 0;
  
  const taskTrend = summary.tasksCompletedLastWeek > 0
    ? Math.round(((summary.tasksCompletedThisWeek - summary.tasksCompletedLastWeek) / summary.tasksCompletedLastWeek) * 100)
    : summary.tasksCompletedThisWeek > 0 ? 100 : 0;

  // Determine overall progress variant
  const progressVariant = summary.overallProgress >= 0.7 
    ? "success" 
    : summary.overallProgress >= 0.4 
      ? "warning" 
      : "danger";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Overall Progress */}
      <StatCard
        title="Overall Progress"
        value={`${Math.round(summary.overallProgress * 100)}%`}
        subtitle={`${summary.krsCompleted}/${summary.totalKrs} KRs completed`}
        icon={Target}
        variant={progressVariant}
      />

      {/* Objectives Status */}
      <StatCard
        title="Objectives On Track"
        value={`${summary.objectivesOnTrack}/${summary.totalObjectives}`}
        subtitle={
          summary.objectivesAtRisk + summary.objectivesBehind > 0
            ? `${summary.objectivesAtRisk} at risk, ${summary.objectivesBehind} behind`
            : "All objectives healthy"
        }
        icon={summary.objectivesBehind > 0 ? AlertTriangle : CheckCircle2}
        variant={
          summary.objectivesBehind > 0 
            ? "danger" 
            : summary.objectivesAtRisk > 0 
              ? "warning" 
              : "success"
        }
      />

      {/* Weekly Momentum - Check-ins */}
      <StatCard
        title="Check-ins This Week"
        value={summary.checkInsThisWeek}
        icon={Zap}
        trend={checkInTrend !== 0 ? { value: checkInTrend, label: "vs last week" } : undefined}
        variant="accent"
      />

      {/* Tasks Completed */}
      <StatCard
        title="Tasks Completed"
        value={summary.tasksCompletedThisWeek}
        subtitle="this week"
        icon={ListTodo}
        trend={taskTrend !== 0 ? { value: taskTrend, label: "vs last week" } : undefined}
        variant="default"
      />
    </div>
  );
}
