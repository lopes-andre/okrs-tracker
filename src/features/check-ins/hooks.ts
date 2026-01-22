"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { CheckIn, CheckInFilters, CheckInUpdate } from "@/lib/supabase/types";

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
 * Create a check-in (records progress) with optimistic updates
 */
export function useCreateCheckIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (checkIn: Parameters<typeof api.createCheckIn>[0]) => api.createCheckIn(checkIn),
    onMutate: async (newCheckIn) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.checkIns.byKr(newCheckIn.annual_kr_id) });

      // Snapshot the previous value
      const previousCheckIns = queryClient.getQueryData<CheckIn[]>(
        queryKeys.checkIns.byKr(newCheckIn.annual_kr_id)
      );

      // Optimistically add the new check-in
      const optimisticCheckIn: CheckIn = {
        id: `temp-${Date.now()}`,
        annual_kr_id: newCheckIn.annual_kr_id,
        quarter_target_id: newCheckIn.quarter_target_id ?? null,
        value: newCheckIn.value,
        previous_value: null,
        note: newCheckIn.note ?? null,
        evidence_url: newCheckIn.evidence_url ?? null,
        recorded_at: new Date().toISOString(),
        recorded_by: newCheckIn.recorded_by,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<CheckIn[]>(
        queryKeys.checkIns.byKr(newCheckIn.annual_kr_id),
        (old) => [optimisticCheckIn, ...(old || [])]
      );

      // Return context with the snapshotted value
      return { previousCheckIns, annualKrId: newCheckIn.annual_kr_id };
    },
    onError: (error, _newCheckIn, context) => {
      // Rollback to the previous value on error
      if (context?.previousCheckIns !== undefined) {
        queryClient.setQueryData(
          queryKeys.checkIns.byKr(context.annualKrId),
          context.previousCheckIns
        );
      }
      toast(formatErrorMessage(error));
    },
    onSuccess: (data) => {
      toast(successMessages.checkInRecorded);

      // Also invalidate KR queries since current_value is updated
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.detail(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.withDetails(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });

      // Invalidate timeline
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.byKr(variables.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: ["checkIns"] });
    },
  });
}

/**
 * Quick check-in (simplified) with optimistic updates
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
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.checkIns.byKr(variables.annualKrId) });

      // Snapshot the previous value
      const previousCheckIns = queryClient.getQueryData<CheckIn[]>(
        queryKeys.checkIns.byKr(variables.annualKrId)
      );

      // Optimistically add the new check-in
      const optimisticCheckIn: CheckIn = {
        id: `temp-${Date.now()}`,
        annual_kr_id: variables.annualKrId,
        quarter_target_id: variables.quarterTargetId ?? null,
        value: variables.value,
        previous_value: null,
        note: variables.note ?? null,
        evidence_url: variables.evidenceUrl ?? null,
        recorded_at: new Date().toISOString(),
        recorded_by: "", // Will be set by server
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<CheckIn[]>(
        queryKeys.checkIns.byKr(variables.annualKrId),
        (old) => [optimisticCheckIn, ...(old || [])]
      );

      return { previousCheckIns, annualKrId: variables.annualKrId };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousCheckIns !== undefined) {
        queryClient.setQueryData(
          queryKeys.checkIns.byKr(context.annualKrId),
          context.previousCheckIns
        );
      }
      toast(formatErrorMessage(error));
    },
    onSuccess: (data) => {
      toast(successMessages.checkInRecorded);

      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.detail(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.byKr(variables.annualKrId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns.all });
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
