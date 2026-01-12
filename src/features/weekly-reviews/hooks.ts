/**
 * Weekly Reviews React Query Hooks
 * 
 * Provides data fetching and mutations for weekly reviews with:
 * - Automatic caching
 * - Optimistic updates
 * - Query invalidation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWeeklyReviews,
  getWeeklyReviewSummaries,
  getWeeklyReview,
  getWeeklyReviewByWeek,
  getOrCreateWeeklyReview,
  createWeeklyReview,
  updateWeeklyReview,
  startWeeklyReview,
  completeWeeklyReview,
  deleteWeeklyReview,
  getWeeklyReviewSettings,
  getOrCreateWeeklyReviewSettings,
  updateWeeklyReviewSettings,
  getWeeklyReviewKrUpdates,
  createWeeklyReviewKrUpdate,
  getWeeklyReviewTasks,
  createWeeklyReviewTaskSnapshots,
  getPlanReviewStats,
  getPendingReviews,
  getCurrentWeekReview,
} from "./api";
import type {
  WeeklyReview,
  WeeklyReviewUpdate,
  WeeklyReviewSettingsUpdate,
  WeeklyReviewKrUpdateInsert,
  WeeklyReviewTaskInsert,
} from "@/lib/supabase/types";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const weeklyReviewKeys = {
  all: ["weekly-reviews"] as const,
  lists: () => [...weeklyReviewKeys.all, "list"] as const,
  list: (planId: string) => [...weeklyReviewKeys.lists(), planId] as const,
  summaries: (planId: string) => [...weeklyReviewKeys.all, "summaries", planId] as const,
  details: () => [...weeklyReviewKeys.all, "detail"] as const,
  detail: (reviewId: string) => [...weeklyReviewKeys.details(), reviewId] as const,
  byWeek: (planId: string, year: number, week: number) => 
    [...weeklyReviewKeys.all, "week", planId, year, week] as const,
  current: (planId: string) => [...weeklyReviewKeys.all, "current", planId] as const,
  pending: (planId: string) => [...weeklyReviewKeys.all, "pending", planId] as const,
  settings: (planId: string) => [...weeklyReviewKeys.all, "settings", planId] as const,
  stats: (planId: string) => [...weeklyReviewKeys.all, "stats", planId] as const,
  krUpdates: (reviewId: string) => [...weeklyReviewKeys.all, "kr-updates", reviewId] as const,
  tasks: (reviewId: string) => [...weeklyReviewKeys.all, "tasks", reviewId] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all weekly reviews for a plan
 */
export function useWeeklyReviews(planId: string) {
  return useQuery({
    queryKey: weeklyReviewKeys.list(planId),
    queryFn: () => getWeeklyReviews(planId),
    enabled: !!planId,
  });
}

/**
 * Get weekly review summaries (with computed fields)
 */
export function useWeeklyReviewSummaries(planId: string) {
  return useQuery({
    queryKey: weeklyReviewKeys.summaries(planId),
    queryFn: () => getWeeklyReviewSummaries(planId),
    enabled: !!planId,
  });
}

/**
 * Get a single weekly review by ID
 */
export function useWeeklyReview(reviewId: string | null) {
  return useQuery({
    queryKey: weeklyReviewKeys.detail(reviewId!),
    queryFn: () => getWeeklyReview(reviewId!),
    enabled: !!reviewId,
  });
}

/**
 * Get weekly review for a specific week
 */
export function useWeeklyReviewByWeek(planId: string, year: number, week: number) {
  return useQuery({
    queryKey: weeklyReviewKeys.byWeek(planId, year, week),
    queryFn: () => getWeeklyReviewByWeek(planId, year, week),
    enabled: !!planId && !!year && !!week,
  });
}

/**
 * Get current week's review (creates if doesn't exist)
 */
export function useCurrentWeekReview(planId: string) {
  return useQuery({
    queryKey: weeklyReviewKeys.current(planId),
    queryFn: () => getCurrentWeekReview(planId),
    enabled: !!planId,
  });
}

/**
 * Get pending (uncompleted) reviews
 */
export function usePendingReviews(planId: string) {
  return useQuery({
    queryKey: weeklyReviewKeys.pending(planId),
    queryFn: () => getPendingReviews(planId),
    enabled: !!planId,
  });
}

/**
 * Get review settings for a plan
 */
export function useWeeklyReviewSettings(planId: string) {
  return useQuery({
    queryKey: weeklyReviewKeys.settings(planId),
    queryFn: () => getOrCreateWeeklyReviewSettings(planId),
    enabled: !!planId,
  });
}

/**
 * Get review stats for a plan
 */
export function usePlanReviewStats(planId: string) {
  return useQuery({
    queryKey: weeklyReviewKeys.stats(planId),
    queryFn: () => getPlanReviewStats(planId),
    enabled: !!planId,
  });
}

/**
 * Get KR updates for a review
 */
export function useWeeklyReviewKrUpdates(reviewId: string | null) {
  return useQuery({
    queryKey: weeklyReviewKeys.krUpdates(reviewId!),
    queryFn: () => getWeeklyReviewKrUpdates(reviewId!),
    enabled: !!reviewId,
  });
}

/**
 * Get task snapshots for a review
 */
export function useWeeklyReviewTasks(reviewId: string | null) {
  return useQuery({
    queryKey: weeklyReviewKeys.tasks(reviewId!),
    queryFn: () => getWeeklyReviewTasks(reviewId!),
    enabled: !!reviewId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Get or create a weekly review
 */
export function useGetOrCreateWeeklyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      year,
      weekNumber,
    }: {
      planId: string;
      year?: number;
      weekNumber?: number;
    }) => getOrCreateWeeklyReview(planId, year, weekNumber),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.list(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.summaries(data.plan_id) });
      queryClient.setQueryData(weeklyReviewKeys.detail(data.id), data);
    },
  });
}

/**
 * Start a weekly review
 */
export function useStartWeeklyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => startWeeklyReview(reviewId),
    onSuccess: (data) => {
      queryClient.setQueryData(weeklyReviewKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.list(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.summaries(data.plan_id) });
    },
  });
}

/**
 * Update a weekly review
 */
export function useUpdateWeeklyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      updates,
    }: {
      reviewId: string;
      updates: WeeklyReviewUpdate;
    }) => updateWeeklyReview(reviewId, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(weeklyReviewKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.list(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.summaries(data.plan_id) });
    },
  });
}

/**
 * Complete a weekly review
 */
export function useCompleteWeeklyReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      reviewId,
      data,
    }: {
      reviewId: string;
      data: Parameters<typeof completeWeeklyReview>[1];
    }) => completeWeeklyReview(reviewId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(weeklyReviewKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.list(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.summaries(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.pending(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.current(data.plan_id) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.stats(data.plan_id) });
      toast({ title: "Weekly review completed! 🎉", variant: "success" });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a weekly review
 */
export function useDeleteWeeklyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      planId,
    }: {
      reviewId: string;
      planId: string;
    }) => deleteWeeklyReview(reviewId).then(() => ({ reviewId, planId })),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: weeklyReviewKeys.detail(variables.reviewId) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.list(variables.planId) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.summaries(variables.planId) });
      queryClient.invalidateQueries({ queryKey: weeklyReviewKeys.stats(variables.planId) });
    },
  });
}

/**
 * Update review settings
 */
export function useUpdateWeeklyReviewSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      planId,
      updates,
    }: {
      planId: string;
      updates: WeeklyReviewSettingsUpdate;
    }) => updateWeeklyReviewSettings(planId, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(weeklyReviewKeys.settings(data.plan_id), data);
      toast({ title: "Review settings updated", variant: "success" });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Record KR update during review
 */
export function useRecordKrUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: WeeklyReviewKrUpdateInsert) => createWeeklyReviewKrUpdate(update),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: weeklyReviewKeys.krUpdates(data.weekly_review_id) 
      });
    },
  });
}

/**
 * Bulk record task snapshots
 */
export function useRecordTaskSnapshots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      snapshots,
    }: {
      reviewId: string;
      snapshots: WeeklyReviewTaskInsert[];
    }) => createWeeklyReviewTaskSnapshots(snapshots),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: weeklyReviewKeys.tasks(variables.reviewId) 
      });
    },
  });
}

// ============================================================================
// COMPOSITE HOOKS
// ============================================================================

/**
 * Hook that provides all data needed for the weekly review wizard
 */
export function useWeeklyReviewWizard(reviewId: string | null) {
  const review = useWeeklyReview(reviewId);
  const krUpdates = useWeeklyReviewKrUpdates(reviewId);
  const taskSnapshots = useWeeklyReviewTasks(reviewId);
  
  const startReview = useStartWeeklyReview();
  const updateReview = useUpdateWeeklyReview();
  const completeReview = useCompleteWeeklyReview();
  const recordKrUpdate = useRecordKrUpdate();
  const recordTasks = useRecordTaskSnapshots();

  return {
    // Data
    review: review.data,
    krUpdates: krUpdates.data || [],
    taskSnapshots: taskSnapshots.data || [],
    
    // Loading states
    isLoading: review.isLoading || krUpdates.isLoading || taskSnapshots.isLoading,
    
    // Mutations
    startReview: startReview.mutate,
    updateReview: updateReview.mutate,
    completeReview: completeReview.mutate,
    recordKrUpdate: recordKrUpdate.mutate,
    recordTasks: recordTasks.mutate,
    
    // Mutation states
    isStarting: startReview.isPending,
    isUpdating: updateReview.isPending,
    isCompleting: completeReview.isPending,
  };
}
