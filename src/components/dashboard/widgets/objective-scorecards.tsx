"use client";

import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "../dashboard-data-provider";
import { computeKrProgress } from "@/lib/progress-engine";

interface ObjectiveScorecardsWidgetProps {
  config: Record<string, unknown>;
}

export function ObjectiveScorecardsWidget({ config }: ObjectiveScorecardsWidgetProps) {
  const { planId, objectives, annualKrs, checkIns, year } = useDashboardData();
  const maxItems = (config.maxItems as number) || 5;

  // Get current quarter progress for pace comparison
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  const quarterStart = new Date(new Date().getFullYear(), (currentQuarter - 1) * 3, 1);
  const quarterEnd = new Date(new Date().getFullYear(), currentQuarter * 3, 0);
  const quarterProgress = ((new Date().getTime() - quarterStart.getTime()) / (quarterEnd.getTime() - quarterStart.getTime())) * 100;

  if (objectives.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Target className="w-8 h-8 text-text-subtle mb-2" />
        <p className="text-body-sm text-text-muted mb-3">No objectives yet</p>
        <Link href={`/plans/${planId}/okrs`}>
          <Button variant="secondary" size="sm">
            Add Objective
          </Button>
        </Link>
      </div>
    );
  }

  const displayObjectives = objectives.slice(0, maxItems);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-3 overflow-auto">
        {displayObjectives.map((objective) => {
          const objectiveKrs = annualKrs.filter((kr) => kr.objective_id === objective.id);

          // Calculate objective progress using progress engine
          const objectiveProgress = objectiveKrs.length > 0
            ? objectiveKrs.reduce((sum, kr) => {
                const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
                const result = computeKrProgress(kr, krCheckIns, [], year);
                return sum + result.progress;
              }, 0) / objectiveKrs.length * 100
            : 0;

          const isAtRisk = objectiveProgress < quarterProgress * 0.75;

          return (
            <Link
              key={objective.id}
              href={`/plans/${planId}/okrs`}
              className="block p-3 rounded-card bg-bg-1/50 border border-border-soft hover:border-border hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-button bg-bg-0 flex items-center justify-center border border-border-soft shrink-0">
                    <Target className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-body-sm text-text-strong truncate">
                      {objective.code}: {objective.name}
                    </h4>
                    <p className="text-xs text-text-muted">
                      {objectiveKrs.length} KR{objectiveKrs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Badge variant={isAtRisk ? "warning" : "success"} className="shrink-0 ml-2">
                  {isAtRisk ? "At Risk" : "On Track"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={objectiveProgress} className="flex-1" />
                <span className="text-xs font-medium w-10 text-right">
                  {Math.round(objectiveProgress)}%
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {objectives.length > maxItems && (
        <div className="pt-3 border-t border-border-soft mt-3">
          <Link href={`/plans/${planId}/okrs`}>
            <Button variant="ghost" size="sm" className="w-full justify-center gap-1">
              View all {objectives.length} objectives
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
