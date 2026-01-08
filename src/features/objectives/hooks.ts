"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { ObjectiveInsert, ObjectiveUpdate } from "@/lib/supabase/types";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all objectives for a plan
 */
export function useObjectives(planId: string) {
  return useQuery({
    queryKey: queryKeys.objectives.list(planId),
    queryFn: () => api.getObjectives(planId),
    enabled: !!planId,
  });
}

/**
 * Get objectives with their KRs
 */
export function useObjectivesWithKrs(planId: string) {
  return useQuery({
    queryKey: queryKeys.objectives.withKrs(planId),
    queryFn: () => api.getObjectivesWithKrs(planId),
    enabled: !!planId,
  });
}

/**
 * Get objective progress from view
 */
export function useObjectiveProgress(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.objectives.list(planId), "progress"],
    queryFn: () => api.getObjectiveProgress(planId),
    enabled: !!planId,
  });
}

/**
 * Get a single objective
 */
export function useObjective(objectiveId: string) {
  return useQuery({
    queryKey: queryKeys.objectives.detail(objectiveId),
    queryFn: () => api.getObjective(objectiveId),
    enabled: !!objectiveId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create an objective
 */
export function useCreateObjective() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (objective: ObjectiveInsert) => api.createObjective(objective),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.list(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.withKrs(data.plan_id) });
      toast(successMessages.objectiveCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update an objective
 */
export function useUpdateObjective() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ objectiveId, updates }: { objectiveId: string; updates: ObjectiveUpdate }) =>
      api.updateObjective(objectiveId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.list(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.withKrs(data.plan_id) });
      toast(successMessages.objectiveUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete an objective
 */
export function useDeleteObjective() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ objectiveId, planId }: { objectiveId: string; planId: string }) =>
      api.deleteObjective(objectiveId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.withKrs(planId) });
      toast(successMessages.objectiveDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Reorder objectives
 */
export function useReorderObjectives() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, objectiveIds }: { planId: string; objectiveIds: string[] }) =>
      api.reorderObjectives(planId, objectiveIds),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.list(planId) });
    },
  });
}
