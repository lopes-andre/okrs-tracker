"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { AnnualKrInsert, AnnualKrUpdate } from "@/lib/supabase/types";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all annual KRs for a plan
 */
export function useAnnualKrs(planId: string) {
  return useQuery({
    queryKey: queryKeys.annualKrs.list(planId),
    queryFn: () => api.getAnnualKrs(planId),
    enabled: !!planId,
  });
}

/**
 * Get annual KRs for a specific objective
 */
export function useAnnualKrsByObjective(objectiveId: string) {
  return useQuery({
    queryKey: queryKeys.annualKrs.byObjective(objectiveId),
    queryFn: () => api.getAnnualKrsByObjective(objectiveId),
    enabled: !!objectiveId,
  });
}

/**
 * Get KR progress data
 */
export function useKrProgress(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.annualKrs.list(planId), "progress"],
    queryFn: () => api.getKrProgress(planId),
    enabled: !!planId,
  });
}

/**
 * Get a single annual KR
 */
export function useAnnualKr(krId: string) {
  return useQuery({
    queryKey: queryKeys.annualKrs.detail(krId),
    queryFn: () => api.getAnnualKr(krId),
    enabled: !!krId,
  });
}

/**
 * Get a KR with all details (objective, group, targets, tags)
 */
export function useAnnualKrWithDetails(krId: string) {
  return useQuery({
    queryKey: queryKeys.annualKrs.withDetails(krId),
    queryFn: () => api.getAnnualKrWithDetails(krId),
    enabled: !!krId,
  });
}

/**
 * Get tag IDs for a KR
 */
export function useKrTagIds(krId: string | null) {
  return useQuery({
    queryKey: krId ? queryKeys.annualKrs.tags(krId) : [],
    queryFn: () => api.getKrTagIds(krId!),
    enabled: !!krId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create an annual KR
 */
export function useCreateAnnualKr() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (kr: AnnualKrInsert) => api.createAnnualKr(kr),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.byObjective(data.objective_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
      // Also invalidate plan stats to update counters
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      toast(successMessages.krCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update an annual KR
 */
export function useUpdateAnnualKr() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ krId, updates }: { krId: string; updates: AnnualKrUpdate }) =>
      api.updateAnnualKr(krId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.withDetails(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.byObjective(data.objective_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
      // Also invalidate plan stats to update counters
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      toast(successMessages.krUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete an annual KR
 */
export function useDeleteAnnualKr() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ krId, objectiveId }: { krId: string; objectiveId: string }) =>
      api.deleteAnnualKr(krId),
    onSuccess: (_, { objectiveId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.byObjective(objectiveId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
      // Also invalidate plan stats to update counters
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      toast(successMessages.krDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Reorder KRs
 */
export function useReorderAnnualKrs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ objectiveId, krIds }: { objectiveId: string; krIds: string[] }) =>
      api.reorderAnnualKrs(objectiveId, krIds),
    onSuccess: (_, { objectiveId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.byObjective(objectiveId) });
    },
  });
}

/**
 * Set tags for a KR
 */
export function useSetKrTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ krId, tagIds }: { krId: string; tagIds: string[] }) =>
      api.setKrTags(krId, tagIds),
    onSuccess: (_, { krId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.withDetails(krId) });
    },
  });
}
