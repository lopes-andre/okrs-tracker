"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import * as api from "./api";
import { useMemo } from "react";

/**
 * Hook to get workload statistics for all plan members
 */
export function useTeamWorkload(planId: string) {
  return useQuery({
    queryKey: queryKeys.teamAnalytics.workload(planId),
    queryFn: () => api.getMemberWorkloadStats(planId),
    enabled: !!planId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get contribution timeline data for team members
 */
export function useTeamContributions(
  planId: string,
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: queryKeys.teamAnalytics.contributions(planId, dateFrom, dateTo),
    queryFn: () => api.getMemberContributions(planId, dateFrom, dateTo),
    enabled: !!planId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to compute team summary from workload data
 */
export function useTeamSummary(planId: string) {
  const { data: workloadStats, isLoading, error } = useTeamWorkload(planId);

  const summary = useMemo(() => {
    if (!workloadStats) return null;
    return api.computeTeamSummary(workloadStats);
  }, [workloadStats]);

  return {
    data: summary,
    isLoading,
    error,
  };
}
