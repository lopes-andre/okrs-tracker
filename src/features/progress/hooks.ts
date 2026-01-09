"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import {
  computeKrProgress,
  computeQuarterTargetProgress,
  computeObjectiveProgress,
  computePlanProgress,
  buildDailySeries,
  buildWeeklySeries,
  getAnnualKrWindow,
  getYearDates,
  type ProgressResult,
  type ObjectiveProgress,
  type PlanProgress,
  type DailyDataPoint,
  type KrConfig,
} from "@/lib/progress-engine";
import type {
  AnnualKr,
  QuarterTarget,
  CheckIn,
  Task,
  Objective,
  ObjectiveWithKrs,
} from "@/lib/supabase/types";
import { getCheckInsByKr } from "@/features/check-ins/api";
import { getTasks } from "@/features/tasks/api";

// ============================================================================
// INDIVIDUAL KR PROGRESS
// ============================================================================

/**
 * Hook to compute progress for a single Annual KR
 */
export function useComputedKrProgress(
  kr: AnnualKr | null | undefined,
  checkIns: CheckIn[],
  tasks: Task[],
  planYear: number,
  config?: KrConfig
): ProgressResult | null {
  return useMemo(() => {
    if (!kr) return null;
    
    // Filter check-ins and tasks for this KR
    const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
    const krTasks = tasks.filter((t) => t.annual_kr_id === kr.id);
    
    return computeKrProgress(kr, krCheckIns, krTasks, planYear, new Date(), config);
  }, [kr, checkIns, tasks, planYear, config]);
}

/**
 * Hook to compute progress for a Quarter Target
 */
export function useQuarterTargetProgress(
  quarterTarget: QuarterTarget | null | undefined,
  kr: AnnualKr | null | undefined,
  checkIns: CheckIn[],
  tasks: Task[],
  planYear: number,
  config?: KrConfig
): ProgressResult | null {
  return useMemo(() => {
    if (!quarterTarget || !kr) return null;
    
    // Filter check-ins and tasks for this quarter target
    const qtCheckIns = checkIns.filter((ci) => ci.quarter_target_id === quarterTarget.id);
    const qtTasks = tasks.filter((t) => t.quarter_target_id === quarterTarget.id);
    
    return computeQuarterTargetProgress(quarterTarget, kr, qtCheckIns, qtTasks, planYear, new Date(), config);
  }, [quarterTarget, kr, checkIns, tasks, planYear, config]);
}

// ============================================================================
// BATCH PROGRESS (OBJECTIVE LEVEL)
// ============================================================================

/**
 * Compute progress for all KRs in an objective
 */
export function useObjectiveKrProgresses(
  objective: ObjectiveWithKrs | null | undefined,
  checkIns: CheckIn[],
  tasks: Task[],
  planYear: number
): { kr: AnnualKr; progress: ProgressResult }[] {
  return useMemo(() => {
    if (!objective || !objective.annual_krs) return [];
    
    return objective.annual_krs.map((kr) => {
      const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
      const krTasks = tasks.filter((t) => t.annual_kr_id === kr.id);
      
      return {
        kr,
        progress: computeKrProgress(kr, krCheckIns, krTasks, planYear),
      };
    });
  }, [objective, checkIns, tasks, planYear]);
}

/**
 * Hook to compute rolled-up progress for an Objective
 */
export function useComputedObjectiveProgress(
  objective: ObjectiveWithKrs | null | undefined,
  checkIns: CheckIn[],
  tasks: Task[],
  planYear: number
): ObjectiveProgress | null {
  const krProgresses = useObjectiveKrProgresses(objective, checkIns, tasks, planYear);
  
  return useMemo(() => {
    if (!objective) return null;
    return computeObjectiveProgress(objective, krProgresses);
  }, [objective, krProgresses]);
}

// ============================================================================
// BATCH PROGRESS (PLAN LEVEL)
// ============================================================================

/**
 * Hook to compute rolled-up progress for an entire Plan
 */
export function usePlanProgress(
  planId: string,
  objectives: ObjectiveWithKrs[],
  checkIns: CheckIn[],
  tasks: Task[],
  planYear: number
): PlanProgress {
  return useMemo(() => {
    const objectiveProgresses = objectives.map((objective) => {
      const krProgresses = (objective.annual_krs || []).map((kr) => {
        const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
        const krTasks = tasks.filter((t) => t.annual_kr_id === kr.id);
        
        return {
          kr,
          progress: computeKrProgress(kr, krCheckIns, krTasks, planYear),
        };
      });
      
      return {
        objective,
        progress: computeObjectiveProgress(objective, krProgresses),
      };
    });
    
    return computePlanProgress(planId, objectiveProgresses);
  }, [planId, objectives, checkIns, tasks, planYear]);
}

// ============================================================================
// DATA SERIES FOR CHARTS
// ============================================================================

/**
 * Hook to get daily progress series for a KR
 */
export function useKrDailySeries(
  kr: AnnualKr | null | undefined,
  checkIns: CheckIn[],
  planYear: number
): DailyDataPoint[] {
  return useMemo(() => {
    if (!kr) return [];
    
    const window = getAnnualKrWindow(kr, planYear);
    const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
    
    return buildDailySeries(kr, krCheckIns, window);
  }, [kr, checkIns, planYear]);
}

/**
 * Hook to get weekly progress series for a KR
 */
export function useKrWeeklySeries(
  kr: AnnualKr | null | undefined,
  checkIns: CheckIn[],
  planYear: number
): DailyDataPoint[] {
  const dailySeries = useKrDailySeries(kr, checkIns, planYear);
  
  return useMemo(() => {
    return buildWeeklySeries(dailySeries);
  }, [dailySeries]);
}

// ============================================================================
// ASYNC DATA FETCHING HOOKS
// ============================================================================

/**
 * Hook to fetch and compute progress for a KR with its check-ins
 */
export function useKrProgressWithData(
  kr: AnnualKr | null | undefined,
  planId: string,
  planYear: number,
  config?: KrConfig
) {
  // Fetch check-ins for this KR
  const { data: checkIns = [] } = useQuery({
    queryKey: kr ? queryKeys.checkIns.byKr(kr.id) : ["disabled"],
    queryFn: () => (kr ? getCheckInsByKr(kr.id) : Promise.resolve([])),
    enabled: !!kr,
  });
  
  // Fetch tasks for this plan (filtered in hook)
  const { data: tasks = [] } = useQuery({
    queryKey: queryKeys.tasks.list(planId),
    queryFn: () => getTasks(planId),
    enabled: !!planId,
  });
  
  // Filter tasks for this KR
  const krTasks = useMemo(() => {
    return kr ? tasks.filter((t) => t.annual_kr_id === kr.id) : [];
  }, [kr, tasks]);
  
  // Compute progress
  const progress = useComputedKrProgress(kr, checkIns, krTasks, planYear, config);
  
  return {
    progress,
    checkIns,
    tasks: krTasks,
    isLoading: !checkIns || !tasks,
  };
}

// ============================================================================
// SUMMARY STATS
// ============================================================================

export interface ProgressSummaryStats {
  totalKrs: number;
  onTrackCount: number;
  atRiskCount: number;
  offTrackCount: number;
  aheadCount: number;
  averageProgress: number;
  averageExpectedProgress: number;
  overallPaceStatus: ObjectiveProgress["paceStatus"];
}

/**
 * Compute summary statistics from multiple KR progresses
 */
export function useProgressSummaryStats(
  krProgresses: { kr: AnnualKr; progress: ProgressResult }[]
): ProgressSummaryStats {
  return useMemo(() => {
    if (krProgresses.length === 0) {
      return {
        totalKrs: 0,
        onTrackCount: 0,
        atRiskCount: 0,
        offTrackCount: 0,
        aheadCount: 0,
        averageProgress: 0,
        averageExpectedProgress: 0,
        overallPaceStatus: "off_track" as const,
      };
    }
    
    let onTrackCount = 0;
    let atRiskCount = 0;
    let offTrackCount = 0;
    let aheadCount = 0;
    let totalProgress = 0;
    let totalExpected = 0;
    let worstStatus: ProgressResult["paceStatus"] = "ahead";
    
    const statusOrder = { ahead: 0, on_track: 1, at_risk: 2, off_track: 3 };
    
    for (const { progress } of krProgresses) {
      totalProgress += progress.progress;
      totalExpected += progress.expectedProgress;
      
      switch (progress.paceStatus) {
        case "ahead":
          aheadCount++;
          break;
        case "on_track":
          onTrackCount++;
          break;
        case "at_risk":
          atRiskCount++;
          break;
        case "off_track":
          offTrackCount++;
          break;
      }
      
      if (statusOrder[progress.paceStatus] > statusOrder[worstStatus]) {
        worstStatus = progress.paceStatus;
      }
    }
    
    return {
      totalKrs: krProgresses.length,
      onTrackCount,
      atRiskCount,
      offTrackCount,
      aheadCount,
      averageProgress: totalProgress / krProgresses.length,
      averageExpectedProgress: totalExpected / krProgresses.length,
      overallPaceStatus: worstStatus,
    };
  }, [krProgresses]);
}
