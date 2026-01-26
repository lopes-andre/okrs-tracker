"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { TagInsert, TagUpdate, KrGroupInsert, KrGroupUpdate, TagKind } from "@/lib/supabase/types";

// ============================================================================
// TAG QUERIES
// ============================================================================

/**
 * Get all tags for a plan
 */
export function useTags(planId: string) {
  return useQuery({
    queryKey: queryKeys.tags.list(planId),
    queryFn: () => api.getTags(planId),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes - tags don't change frequently
  });
}

/**
 * Get tags by kind
 */
export function useTagsByKind(planId: string, kind: TagKind) {
  return useQuery({
    queryKey: queryKeys.tags.byKind(planId, kind),
    queryFn: () => api.getTagsByKind(planId, kind),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes - tags don't change frequently
  });
}

// ============================================================================
// TAG MUTATIONS
// ============================================================================

/**
 * Create a tag
 */
export function useCreateTag(planId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (tag: Omit<TagInsert, "plan_id"> & { plan_id?: string }) => 
      api.createTag({ ...tag, plan_id: tag.plan_id || planId! }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.list(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.withUsage(data.plan_id) });
      toast(successMessages.tagCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Get all tags with usage counts
 */
export function useTagsWithUsage(planId: string) {
  return useQuery({
    queryKey: queryKeys.tags.withUsage(planId),
    queryFn: () => api.getTagsWithUsage(planId),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes - tags don't change frequently
  });
}

/**
 * Update a tag
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ tagId, updates }: { tagId: string; updates: TagUpdate }) =>
      api.updateTag(tagId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.list(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.withUsage(data.plan_id) });
      // Also invalidate tasks since they display tags
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast(successMessages.tagUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { tagId: string; planId: string }) =>
      api.deleteTag(params.tagId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.withUsage(planId) });
      // Also invalidate tasks since they display tags
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast(successMessages.tagDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// KR GROUPS QUERIES
// ============================================================================

/**
 * Get all KR groups for a plan
 */
export function useKrGroups(planId: string) {
  return useQuery({
    queryKey: queryKeys.groups.list(planId),
    queryFn: () => api.getKrGroups(planId),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes - KR groups don't change frequently
  });
}

// ============================================================================
// KR GROUPS MUTATIONS
// ============================================================================

/**
 * Create a KR group
 */
export function useCreateKrGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (group: KrGroupInsert) => api.createKrGroup(group),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(data.plan_id) });
      toast(successMessages.groupCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a KR group
 */
export function useUpdateKrGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: KrGroupUpdate }) =>
      api.updateKrGroup(groupId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(data.plan_id) });
      toast(successMessages.groupUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a KR group
 */
export function useDeleteKrGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { groupId: string; planId: string }) =>
      api.deleteKrGroup(params.groupId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(planId) });
      toast(successMessages.groupDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Reorder KR groups
 */
export function useReorderKrGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, groupIds }: { planId: string; groupIds: string[] }) =>
      api.reorderKrGroups(planId, groupIds),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(planId) });
    },
  });
}
