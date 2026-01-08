"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { QuarterTargetInsert, QuarterTargetUpdate } from "@/lib/supabase/types";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all quarter targets for a plan
 */
export function useQuarterTargets(planId: string) {
  return useQuery({
    queryKey: queryKeys.quarterTargets.list(planId),
    queryFn: () => api.getQuarterTargets(planId),
    enabled: !!planId,
  });
}

/**
 * Get quarter targets for a specific KR
 */
export function useQuarterTargetsByKr(annualKrId: string) {
  return useQuery({
    queryKey: queryKeys.quarterTargets.byKr(annualKrId),
    queryFn: () => api.getQuarterTargetsByKr(annualKrId),
    enabled: !!annualKrId,
  });
}

/**
 * Get quarter targets for a specific quarter
 */
export function useQuarterTargetsByQuarter(planId: string, quarter: 1 | 2 | 3 | 4) {
  return useQuery({
    queryKey: queryKeys.quarterTargets.byQuarter(planId, quarter),
    queryFn: () => api.getQuarterTargetsByQuarter(planId, quarter),
    enabled: !!planId,
  });
}

/**
 * Get quarter overview stats
 */
export function useQuarterOverview(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.quarterTargets.list(planId), "overview"],
    queryFn: () => api.getQuarterOverview(planId),
    enabled: !!planId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a quarter target
 */
export function useCreateQuarterTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (target: QuarterTargetInsert) => api.createQuarterTarget(target),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quarterTargets.byKr(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quarterTargets.all });
      toast(successMessages.targetCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Upsert quarter targets for all quarters
 */
export function useUpsertQuarterTargets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      annualKrId,
      targets,
    }: {
      annualKrId: string;
      targets: { quarter: 1 | 2 | 3 | 4; target_value: number; notes?: string }[];
    }) => api.upsertQuarterTargets(annualKrId, targets),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.quarterTargets.byKr(data[0].annual_kr_id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.quarterTargets.all });
      toast(successMessages.targetUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a quarter target
 */
export function useUpdateQuarterTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ targetId, updates }: { targetId: string; updates: QuarterTargetUpdate }) =>
      api.updateQuarterTarget(targetId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quarterTargets.byKr(data.annual_kr_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quarterTargets.all });
      toast(successMessages.targetUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a quarter target
 */
export function useDeleteQuarterTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetId, annualKrId }: { targetId: string; annualKrId: string }) =>
      api.deleteQuarterTarget(targetId),
    onSuccess: (_, { annualKrId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quarterTargets.byKr(annualKrId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quarterTargets.all });
    },
  });
}
