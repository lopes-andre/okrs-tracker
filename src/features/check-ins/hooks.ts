"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { CheckInFilters, CheckInUpdate } from "@/lib/supabase/types";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get check-ins for a plan
 */
export function useCheckIns(planId: string, filters?: CheckInFilters) {
  return useQuery({
    queryKey: queryKeys.checkIns.list(planId, filters),
    queryFn: () => api.getCheckIns(planId, filters),
    enabled: !!planId,
  });
}

/**
 * Get check-ins with details
 */
export function useCheckInsWithDetails(planId: string, filters?: CheckInFilters) {
  return useQuery({
    queryKey: [...queryKeys.checkIns.list(planId, filters), "withDetails"],
    queryFn: () => api.getCheckInsWithDetails(planId, filters),
    enabled: !!planId,
  });
}

/**
 * Get check-ins for a specific KR
 */
export function useCheckInsByKr(annualKrId: string) {
  return useQuery({
    queryKey: queryKeys.checkIns.byKr(annualKrId),
    queryFn: () => api.getCheckInsByKr(annualKrId),
    enabled: !!annualKrId,
  });
}

/**
 * Get recent check-ins
 */
export function useRecentCheckIns(planId: string, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.checkIns.recent(planId, limit),
    queryFn: () => api.getRecentCheckIns(planId, limit),
    enabled: !!planId,
  });
}

/**
 * Get paginated check-ins
 */
export function useCheckInsPaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: CheckInFilters
) {
  return useQuery({
    queryKey: [...queryKeys.checkIns.list(planId, filters), "paginated", page, limit],
    queryFn: () => api.getCheckInsPaginated(planId, page, limit, filters),
    enabled: !!planId,
  });
}

/**
 * Get check-ins by day
 */
export function useCheckInsByDay(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.checkIns.list(planId), "byDay"],
    queryFn: () => api.getCheckInsByDay(planId),
    enabled: !!planId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a check-in (records progress)
 */
export function useCreateCheckIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (checkIn: Parameters<typeof api.createCheckIn>[0]) => api.createCheckIn(checkIn),
    onSuccess: (data) => {
      // Invalidate check-in queries
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.byKr(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
      
      // Also invalidate KR queries since current_value is updated
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.detail(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.withDetails(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
      
      // Invalidate timeline
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      
      toast(successMessages.checkInRecorded);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Quick check-in (simplified)
 */
export function useQuickCheckIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      annualKrId,
      value,
      note,
      evidenceUrl,
      quarterTargetId,
    }: {
      annualKrId: string;
      value: number;
      note?: string;
      evidenceUrl?: string;
      quarterTargetId?: string;
    }) => api.quickCheckIn(annualKrId, value, note, evidenceUrl, quarterTargetId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.byKr(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.detail(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      
      toast(successMessages.checkInRecorded);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a check-in
 */
export function useUpdateCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ checkInId, updates }: { checkInId: string; updates: CheckInUpdate }) =>
      api.updateCheckIn(checkInId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.byKr(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
    },
  });
}
