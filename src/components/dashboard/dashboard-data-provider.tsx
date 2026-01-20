"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useObjectives } from "@/features/objectives/hooks";
import { useAnnualKrs } from "@/features/annual-krs/hooks";
import { useCheckIns } from "@/features/check-ins/hooks";
import { useTasks } from "@/features/tasks/hooks";
import { usePlan } from "@/features/plans/hooks";
import { computeKrProgress } from "@/lib/progress-engine";
import type {
  Objective,
  AnnualKr,
  CheckIn,
  Task,
  Plan,
} from "@/lib/supabase/types";

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface DashboardDataContextValue {
  planId: string;
  plan: Plan | null | undefined;
  year: number;
  objectives: Objective[];
  annualKrs: AnnualKr[];
  checkIns: CheckIn[];
  tasks: Task[];
  isLoading: boolean;
  // Computed values
  atRiskKrs: (AnnualKr & { progress: number; paceStatus: string })[];
  overallProgress: number;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface DashboardDataProviderProps {
  planId: string;
  children: ReactNode;
}

export function DashboardDataProvider({
  planId,
  children,
}: DashboardDataProviderProps) {
  // Fetch all required data
  const { data: plan, isLoading: planLoading } = usePlan(planId);
  const { data: objectives = [], isLoading: objectivesLoading } = useObjectives(planId);
  const { data: annualKrs = [], isLoading: krsLoading } = useAnnualKrs(planId);
  const { data: checkIns = [], isLoading: checkInsLoading } = useCheckIns(planId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(planId);

  const isLoading = planLoading || objectivesLoading || krsLoading || checkInsLoading || tasksLoading;
  const year = plan?.year || new Date().getFullYear();

  // Compute at-risk KRs
  const atRiskKrs = useMemo(() => {
    return annualKrs
      .map((kr) => {
        const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
        const result = computeKrProgress(kr, krCheckIns, [], year);
        return {
          ...kr,
          progress: result.progress,
          paceStatus: result.paceStatus,
        };
      })
      .filter((kr) => kr.paceStatus === "at_risk" || kr.paceStatus === "off_track");
  }, [annualKrs, checkIns, year]);

  // Compute overall progress
  const overallProgress = useMemo(() => {
    if (annualKrs.length === 0) return 0;

    let totalProgress = 0;
    annualKrs.forEach((kr) => {
      const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
      const result = computeKrProgress(kr, krCheckIns, [], year);
      totalProgress += result.progress;
    });

    return (totalProgress / annualKrs.length) * 100;
  }, [annualKrs, checkIns, year]);

  const value: DashboardDataContextValue = {
    planId,
    plan,
    year,
    objectives,
    annualKrs,
    checkIns,
    tasks,
    isLoading,
    atRiskKrs,
    overallProgress,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return context;
}
