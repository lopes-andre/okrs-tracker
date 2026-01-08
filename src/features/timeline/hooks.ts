"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import * as api from "./api";
import type { TimelineFilters } from "@/lib/supabase/types";

// ============================================================================
// TIMELINE QUERIES
// ============================================================================

/**
 * Get timeline events for a plan
 */
export function useTimeline(planId: string, filters?: TimelineFilters) {
  return useQuery({
    queryKey: queryKeys.timeline.list(planId, filters),
    queryFn: () => api.getTimeline(planId, filters),
    enabled: !!planId,
  });
}

/**
 * Get recent activity
 */
export function useRecentActivity(planId: string, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.timeline.recent(planId, limit),
    queryFn: () => api.getRecentActivity(planId, limit),
    enabled: !!planId,
  });
}

/**
 * Get paginated timeline
 */
export function useTimelinePaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: TimelineFilters
) {
  return useQuery({
    queryKey: [...queryKeys.timeline.list(planId, filters), "paginated", page, limit],
    queryFn: () => api.getTimelinePaginated(planId, page, limit, filters),
    enabled: !!planId,
  });
}

/**
 * Get activity for a specific entity
 */
export function useEntityActivity(planId: string, entityType: string, entityId: string) {
  return useQuery({
    queryKey: [...queryKeys.timeline.list(planId), "entity", entityType, entityId],
    queryFn: () => api.getEntityActivity(planId, entityType, entityId),
    enabled: !!planId && !!entityType && !!entityId,
  });
}

/**
 * Get activity grouped by date
 */
export function useActivityByDate(planId: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...queryKeys.timeline.list(planId), "byDate", dateFrom, dateTo],
    queryFn: () => api.getActivityByDate(planId, dateFrom, dateTo),
    enabled: !!planId,
  });
}

/**
 * Get activity statistics
 */
export function useActivityStats(planId: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...queryKeys.timeline.list(planId), "stats", dateFrom, dateTo],
    queryFn: () => api.getActivityStats(planId, dateFrom, dateTo),
    enabled: !!planId,
  });
}
