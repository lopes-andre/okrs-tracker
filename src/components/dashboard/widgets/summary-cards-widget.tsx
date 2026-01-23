"use client";

import { memo, useMemo } from "react";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
} from "lucide-react";
import { useDashboardData } from "../dashboard-data-provider";
import { computeKrProgress } from "@/lib/progress-engine";
import { cn } from "@/lib/utils";

interface SummaryCardsWidgetProps {
  config: Record<string, unknown>;
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
    <div className={cn(
      "p-4 rounded-card border transition-all",
      variant === "success" && "border-status-success/30 bg-status-success/5",
      variant === "warning" && "border-status-warning/30 bg-status-warning/5",
      variant === "danger" && "border-status-danger/30 bg-status-danger/5",
      variant === "accent" && "border-accent/30 bg-accent/5",
      variant === "default" && "border-border-soft bg-bg-1/50"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted font-medium">{title}</p>
          <p className={cn(
            "text-2xl font-bold font-heading mt-1",
            variant === "success" && "text-status-success",
            variant === "warning" && "text-status-warning",
            variant === "danger" && "text-status-danger",
            variant === "accent" && "text-accent",
            variant === "default" && "text-text-strong"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[10px] text-text-subtle mt-0.5">{subtitle}</p>
          )}
        </div>
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
      </div>
    </div>
  );
}

export const SummaryCardsWidget = memo<SummaryCardsWidgetProps>(function SummaryCardsWidget() {
  const { objectives, annualKrs, checkIns, tasks, year, overallProgress, atRiskKrs } = useDashboardData();

  // Calculate objectives status
  const objectiveStatus = useMemo(() => {
    let onTrack = 0;
    let atRisk = 0;
    let behind = 0;

    objectives.forEach((obj) => {
      const objKrs = annualKrs.filter((kr) => kr.objective_id === obj.id);
      if (objKrs.length === 0) {
        onTrack++;
        return;
      }

      // Calculate average pace status
      let riskScore = 0;
      objKrs.forEach((kr) => {
        const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
        const result = computeKrProgress(kr, krCheckIns, [], year);
        if (result.paceStatus === "off_track") riskScore += 2;
        else if (result.paceStatus === "at_risk") riskScore += 1;
      });

      const avgRisk = riskScore / objKrs.length;
      if (avgRisk >= 1.5) behind++;
      else if (avgRisk >= 0.5) atRisk++;
      else onTrack++;
    });

    return { onTrack, atRisk, behind };
  }, [objectives, annualKrs, checkIns, year]);

  // Calculate active tasks
  const activeTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  ).length;

  // Determine variants
  const progressVariant = overallProgress >= 70
    ? "success"
    : overallProgress >= 40
      ? "warning"
      : "danger";

  const objectivesVariant = objectiveStatus.behind > 0
    ? "danger"
    : objectiveStatus.atRisk > 0
      ? "warning"
      : "success";

  return (
    <div className="h-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 h-full">
        <StatCard
          title="Overall Progress"
          value={`${Math.round(overallProgress)}%`}
          subtitle={`${annualKrs.length} KRs tracked`}
          icon={Target}
          variant={progressVariant}
        />
        <StatCard
          title="Objectives On Track"
          value={`${objectiveStatus.onTrack}/${objectives.length}`}
          subtitle={
            objectiveStatus.atRisk + objectiveStatus.behind > 0
              ? `${objectiveStatus.atRisk} at risk, ${objectiveStatus.behind} behind`
              : "All healthy"
          }
          icon={objectiveStatus.behind > 0 ? AlertTriangle : CheckCircle2}
          variant={objectivesVariant}
        />
        <StatCard
          title="KRs At Risk"
          value={atRiskKrs.length}
          subtitle={atRiskKrs.length > 0 ? "Need attention" : "All on track"}
          icon={AlertTriangle}
          variant={atRiskKrs.length > 0 ? "warning" : "success"}
        />
        <StatCard
          title="Active Tasks"
          value={activeTasks}
          subtitle={`${tasks.filter((t) => t.status === "completed").length} completed`}
          icon={ListTodo}
          variant="default"
        />
      </div>
    </div>
  );
});
