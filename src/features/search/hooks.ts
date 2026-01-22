"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "./api";

/**
 * Search within a specific plan
 */
export function usePlanSearch(planId: string, query: string, limit?: number) {
  return useQuery({
    queryKey: ["search", "plan", planId, query, limit],
    queryFn: () => api.searchPlan(planId, query, limit),
    enabled: !!planId && query.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Global search across all user's plans
 */
export function useGlobalSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: ["search", "global", query, limit],
    queryFn: () => api.searchGlobal(query, limit),
    enabled: query.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}
