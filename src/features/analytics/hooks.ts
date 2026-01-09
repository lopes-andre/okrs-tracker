"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { queryKeys } from "@/lib/query-client";
import * as api from "./api";
import type { AnalyticsSummary, KrPerformanceRow } from "./api";
import {
  computeKrProgress,
  type KrProgressResult,
  type PaceStatus,
} from "@/lib/progress-engine";
import type { AnnualKr, CheckIn, Task } from "@/lib/supabase/types";

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

/**
 * Main analytics data hook - fetches all data needed for analytics
 */
export function useAnalyticsData(planId: string, year: number) {
  return useQuery({
    queryKey: [...queryKeys.objectives.list(planId), "analytics", year],
    queryFn: () => api.getAnalyticsData(planId),
    enabled: !!planId,
    staleTime: 30000, // 30 seconds - analytics can be slightly stale
  });
}

/**
 * Computed analytics summary from raw data
 */
export function useAnalyticsSummary(
  planId: string,
  year: number
): { data: AnalyticsSummary | undefined; isLoading: boolean } {
  const { data, isLoading } = useAnalyticsData(planId, year);

  const summary = useMemo(() => {
    if (!data) return undefined;

    const { objectives, checkIns, tasks } = data;
    const now = new Date();
    const asOfDate = now;

    // Group check-ins by KR
    const checkInsByKr: Record<string, CheckIn[]> = {};
    checkIns.forEach((ci) => {
      if (!checkInsByKr[ci.annual_kr_id]) {
        checkInsByKr[ci.annual_kr_id] = [];
      }
      checkInsByKr[ci.annual_kr_id].push(ci);
    });

    // Group tasks by KR
    const tasksByKr: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.annual_kr_id) {
        if (!tasksByKr[t.annual_kr_id]) {
          tasksByKr[t.annual_kr_id] = [];
        }
        tasksByKr[t.annual_kr_id].push(t);
      }
    });

    // Compute progress for all KRs
    let totalProgress = 0;
    let krCount = 0;
    let krsCompleted = 0;
    let objectivesOnTrack = 0;
    let objectivesAtRisk = 0;
    let objectivesBehind = 0;

    objectives.forEach((obj) => {
      const krs = obj.annual_krs || [];
      let objProgressSum = 0;

      krs.forEach((kr: AnnualKr) => {
        const krCheckIns = checkInsByKr[kr.id] || [];
        const krTasks = tasksByKr[kr.id] || [];
        
        const progressResult = computeKrProgress(kr, krCheckIns, krTasks, year, asOfDate);
        
        totalProgress += progressResult.progress;
        objProgressSum += progressResult.progress;
        krCount++;
        
        if (progressResult.isComplete) {
          krsCompleted++;
        }
      });

      // Determine objective pace status
      if (krs.length > 0) {
        const avgProgress = objProgressSum / krs.length;
        // Simple heuristic: compare to expected progress
        const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
        const expectedProgress = dayOfYear / 365;
        
        if (avgProgress >= expectedProgress * 0.9) {
          objectivesOnTrack++;
        } else if (avgProgress >= expectedProgress * 0.7) {
          objectivesAtRisk++;
        } else {
          objectivesBehind++;
        }
      }
    });

    // Calculate week boundaries
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Check-ins this week vs last week
    const checkInsThisWeek = checkIns.filter((ci) => new Date(ci.occurred_at) >= weekStart).length;
    const checkInsLastWeek = checkIns.filter((ci) => {
      const date = new Date(ci.occurred_at);
      return date >= lastWeekStart && date < weekStart;
    }).length;

    // Tasks completed this week vs last week
    const completedTasks = tasks.filter((t) => t.status === "completed" && t.completed_at);
    const tasksCompletedThisWeek = completedTasks.filter((t) => new Date(t.completed_at!) >= weekStart).length;
    const tasksCompletedLastWeek = completedTasks.filter((t) => {
      const date = new Date(t.completed_at!);
      return date >= lastWeekStart && date < weekStart;
    }).length;

    return {
      overallProgress: krCount > 0 ? totalProgress / krCount : 0,
      objectivesOnTrack,
      objectivesAtRisk,
      objectivesBehind,
      totalObjectives: objectives.length,
      krsCompleted,
      totalKrs: krCount,
      checkInsThisWeek,
      checkInsLastWeek,
      tasksCompletedThisWeek,
      tasksCompletedLastWeek,
    };
  }, [data, year]);

  return { data: summary, isLoading };
}

/**
 * KR Performance table data with computed metrics
 */
export function useKrPerformanceData(
  planId: string,
  year: number
): { data: KrPerformanceRow[] | undefined; isLoading: boolean } {
  const { data, isLoading } = useAnalyticsData(planId, year);

  const performanceData = useMemo(() => {
    if (!data) return undefined;

    const { objectives, checkIns, tasks } = data;
    const asOfDate = new Date();

    // Group check-ins by KR
    const checkInsByKr: Record<string, CheckIn[]> = {};
    checkIns.forEach((ci) => {
      if (!checkInsByKr[ci.annual_kr_id]) {
        checkInsByKr[ci.annual_kr_id] = [];
      }
      checkInsByKr[ci.annual_kr_id].push(ci);
    });

    // Group tasks by KR
    const tasksByKr: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.annual_kr_id) {
        if (!tasksByKr[t.annual_kr_id]) {
          tasksByKr[t.annual_kr_id] = [];
        }
        tasksByKr[t.annual_kr_id].push(t);
      }
    });

    const rows: KrPerformanceRow[] = [];

    objectives.forEach((obj) => {
      const krs = obj.annual_krs || [];
      
      krs.forEach((kr: AnnualKr) => {
        const krCheckIns = checkInsByKr[kr.id] || [];
        const krTasks = tasksByKr[kr.id] || [];
        
        const progressResult = computeKrProgress(kr, krCheckIns, krTasks, year, asOfDate);
        
        // Determine trend from last 7 days
        const sevenDaysAgo = new Date(asOfDate);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentCheckIns = krCheckIns.filter((ci) => new Date(ci.occurred_at) >= sevenDaysAgo);
        let trend: "up" | "down" | "stable" = "stable";
        
        if (recentCheckIns.length >= 2) {
          const first = recentCheckIns[0].value;
          const last = recentCheckIns[recentCheckIns.length - 1].value;
          if (last > first) trend = "up";
          else if (last < first) trend = "down";
        }

        // Find last check-in date
        const sortedCheckIns = [...krCheckIns].sort((a, b) => 
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        );
        const lastCheckIn = sortedCheckIns[0];

        rows.push({
          id: kr.id,
          name: kr.name,
          description: kr.description,
          objectiveId: obj.id,
          objectiveName: obj.name,
          krType: kr.kr_type,
          direction: kr.direction,
          aggregation: kr.aggregation,
          unit: kr.unit,
          startValue: kr.start_value,
          targetValue: kr.target_value,
          currentValue: progressResult.currentValue,
          progress: progressResult.progress,
          paceStatus: progressResult.paceStatus,
          expectedValue: progressResult.expectedProgress * (kr.target_value - kr.start_value) + kr.start_value,
          forecast: progressResult.forecast,
          lastCheckInDate: lastCheckIn?.occurred_at || null,
          checkInCount: krCheckIns.length,
          trend,
        });
      });
    });

    return rows;
  }, [data, year]);

  return { data: performanceData, isLoading };
}

/**
 * Get check-ins by day for heatmap/charts
 */
export function useCheckInsByDay(planId: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...queryKeys.checkIns.all, planId, "byDay", dateFrom, dateTo],
    queryFn: () => api.getCheckInsByDay(planId, dateFrom, dateTo),
    enabled: !!planId,
  });
}

/**
 * Get check-ins for specific KRs (for charts)
 */
export function useKrCheckIns(krIds: string[], dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...queryKeys.checkIns.all, "krs", krIds.join(","), dateFrom, dateTo],
    queryFn: () => api.getKrCheckIns(krIds, dateFrom, dateTo),
    enabled: krIds.length > 0,
  });
}

/**
 * Get task metrics
 */
export function useTaskMetrics(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.all, planId, "metrics"],
    queryFn: () => api.getTaskMetrics(planId),
    enabled: !!planId,
  });
}

/**
 * Get productivity stats
 */
export function useProductivityStats(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.checkIns.all, planId, "productivity"],
    queryFn: () => api.getProductivityStats(planId),
    enabled: !!planId,
  });
}
