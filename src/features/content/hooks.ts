"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage } from "@/lib/toast-utils";
import { createClient } from "@/lib/supabase/client";
import * as api from "./api";
import type {
  ContentAccountInsert,
  ContentAccountUpdate,
  ContentGoalInsert,
  ContentGoalUpdate,
  ContentPostInsert,
  ContentPostUpdate,
  ContentPostMediaInsert,
  ContentDistributionInsert,
  ContentDistributionUpdate,
  ContentDistributionMetricsInsert,
  ContentCampaignUpdate,
  ContentCampaignCheckinInsert,
  ContentPostFilters,
  ContentCampaignFilters,
} from "@/lib/supabase/types";

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

const successMessages = {
  accountCreated: { title: "Account created", variant: "success" as const },
  accountUpdated: { title: "Account updated", variant: "success" as const },
  accountDeleted: { title: "Account deleted", variant: "success" as const },
  goalCreated: { title: "Goal created", variant: "success" as const },
  goalUpdated: { title: "Goal updated", variant: "success" as const },
  goalDeleted: { title: "Goal deleted", variant: "success" as const },
  postCreated: { title: "Post created", variant: "success" as const },
  postUpdated: { title: "Post updated", variant: "success" as const },
  postDeleted: { title: "Post deleted", variant: "success" as const },
  distributionCreated: { title: "Distribution scheduled", variant: "success" as const },
  distributionUpdated: { title: "Distribution updated", variant: "success" as const },
  distributionDeleted: { title: "Distribution removed", variant: "success" as const },
  distributionPosted: { title: "Marked as posted", variant: "success" as const },
  metricsAdded: { title: "Metrics recorded", variant: "success" as const },
  campaignCreated: { title: "Campaign created", variant: "success" as const },
  campaignUpdated: { title: "Campaign updated", variant: "success" as const },
  campaignDeleted: { title: "Campaign deleted", variant: "success" as const },
  mediaUploaded: { title: "Media uploaded", variant: "success" as const },
  mediaDeleted: { title: "Media deleted", variant: "success" as const },
  linkAdded: { title: "Link added", variant: "success" as const },
  linkDeleted: { title: "Link deleted", variant: "success" as const },
};

// ============================================================================
// PLATFORMS HOOKS
// ============================================================================

/**
 * Get all available platforms
 */
export function usePlatforms() {
  return useQuery({
    queryKey: queryKeys.content.platforms.list(),
    queryFn: api.getPlatforms,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - platforms don't change
  });
}

// ============================================================================
// ACCOUNTS HOOKS
// ============================================================================

/**
 * Get accounts for a plan
 */
export function useAccounts(planId: string) {
  return useQuery({
    queryKey: queryKeys.content.accounts.list(planId),
    queryFn: () => api.getAccounts(planId),
    enabled: !!planId,
  });
}

/**
 * Get accounts with platform details
 */
export function useAccountsWithPlatform(planId: string) {
  return useQuery({
    queryKey: queryKeys.content.accounts.list(planId),
    queryFn: () => api.getAccountsWithPlatform(planId),
    enabled: !!planId,
  });
}

/**
 * Get a single account
 */
export function useAccount(accountId: string) {
  return useQuery({
    queryKey: queryKeys.content.accounts.detail(accountId),
    queryFn: () => api.getAccount(accountId),
    enabled: !!accountId,
  });
}

/**
 * Create an account
 */
export function useCreateAccount(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (account: Omit<ContentAccountInsert, "plan_id" | "user_id">) => {
      // Get current user ID
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      return api.createAccount({ ...account, plan_id: planId, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.accounts.list(planId) });
      toast(successMessages.accountCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update an account
 */
export function useUpdateAccount(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ accountId, updates }: { accountId: string; updates: ContentAccountUpdate }) =>
      api.updateAccount(accountId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.accounts.list(planId) });
      toast(successMessages.accountUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete an account
 */
export function useDeleteAccount(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => api.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.accounts.list(planId) });
      toast(successMessages.accountDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// GOALS HOOKS
// ============================================================================

/**
 * Get goals for a plan
 */
export function useGoals(planId: string) {
  return useQuery({
    queryKey: queryKeys.content.goals.list(planId),
    queryFn: () => api.getGoals(planId),
    enabled: !!planId,
  });
}

/**
 * Create a goal
 */
export function useCreateGoal(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (goal: Omit<ContentGoalInsert, "plan_id">) =>
      api.createGoal({ ...goal, plan_id: planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.goals.list(planId) });
      toast(successMessages.goalCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a goal
 */
export function useUpdateGoal(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ goalId, updates }: { goalId: string; updates: ContentGoalUpdate }) =>
      api.updateGoal(goalId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.goals.list(planId) });
      toast(successMessages.goalUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a goal
 */
export function useDeleteGoal(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (goalId: string) => api.deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.goals.list(planId) });
      toast(successMessages.goalDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Reorder goals
 */
export function useReorderGoals(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalIds: string[]) => api.reorderGoals(goalIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.goals.list(planId) });
    },
  });
}

// ============================================================================
// POSTS HOOKS
// ============================================================================

/**
 * Get posts for a plan
 */
export function usePosts(planId: string, filters?: ContentPostFilters) {
  return useQuery({
    queryKey: queryKeys.content.posts.list(planId, filters),
    queryFn: () => api.getPosts(planId, filters),
    enabled: !!planId,
  });
}

/**
 * Get posts with full details
 */
export function usePostsWithDetails(planId: string) {
  return useQuery({
    queryKey: queryKeys.content.posts.withDetails(planId),
    queryFn: () => api.getPostsWithDetails(planId),
    enabled: !!planId,
  });
}

/**
 * Get a single post with details
 */
export function usePost(postId: string) {
  return useQuery({
    queryKey: queryKeys.content.posts.detail(postId),
    queryFn: () => api.getPost(postId),
    enabled: !!postId,
  });
}

/**
 * Create a post
 */
export function useCreatePost(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      post,
      goalIds,
    }: {
      post: Omit<ContentPostInsert, "plan_id" | "created_by" | "display_order">;
      goalIds?: string[];
    }) => {
      // Get current user ID
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      return api.createPost(
        {
          ...post,
          plan_id: planId,
          created_by: user.id,
        },
        goalIds
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.postCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a post
 */
export function useUpdatePost(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ postId, updates, goalIds }: { postId: string; updates: ContentPostUpdate; goalIds?: string[] }) =>
      api.updatePost(postId, updates, goalIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.postUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a post
 */
export function useDeletePost(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (postId: string) => api.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.postDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Toggle post favorite status
 */
export function useToggleFavorite(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isFavorite }: { postId: string; isFavorite: boolean }) =>
      api.togglePostFavorite(postId, isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.withDetails(planId) });
    },
  });
}

/**
 * Reorder posts (Kanban)
 */
export function useReorderPosts(_planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postIds, status }: { postIds: string[]; status: string }) =>
      api.reorderPosts(postIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
    },
  });
}

// ============================================================================
// POST MEDIA HOOKS
// ============================================================================

/**
 * Add media to a post
 */
export function useAddPostMedia(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (media: ContentPostMediaInsert) => api.addPostMedia(media),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.mediaUploaded);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete post media
 */
export function useDeletePostMedia(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (mediaId: string) => api.deletePostMedia(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.mediaDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// DISTRIBUTIONS HOOKS
// ============================================================================

/**
 * Get distributions for a post
 */
export function useDistributionsByPost(postId: string) {
  return useQuery({
    queryKey: queryKeys.content.distributions.byPost(postId),
    queryFn: () => api.getDistributionsByPost(postId),
    enabled: !!postId,
  });
}

/**
 * Get calendar data
 */
export function useCalendarData(planId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.content.distributions.calendar(planId, startDate, endDate),
    queryFn: () => api.getCalendarData(planId, startDate, endDate),
    enabled: !!planId && !!startDate && !!endDate,
  });
}

/**
 * Create a distribution
 */
export function useCreateDistribution(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (distribution: ContentDistributionInsert) => api.createDistribution(distribution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.distributions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.distributionCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a distribution
 */
export function useUpdateDistribution(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ distributionId, updates }: { distributionId: string; updates: ContentDistributionUpdate }) =>
      api.updateDistribution(distributionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.distributions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.distributionUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a distribution
 */
export function useDeleteDistribution(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (distributionId: string) => api.deleteDistribution(distributionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.distributions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.distributionDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Mark a distribution as posted
 */
export function useMarkDistributionPosted(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ distributionId, platformPostUrl }: { distributionId: string; platformPostUrl?: string }) =>
      api.markDistributionPosted(distributionId, platformPostUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.distributions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      toast(successMessages.distributionPosted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// DISTRIBUTION METRICS HOOKS
// ============================================================================

/**
 * Get metrics for a distribution
 */
export function useDistributionMetrics(distributionId: string) {
  return useQuery({
    queryKey: [...queryKeys.content.distributions.all, "metrics", distributionId],
    queryFn: () => api.getDistributionMetrics(distributionId),
    enabled: !!distributionId,
  });
}

/**
 * Add metrics check-in
 */
export function useAddDistributionMetrics(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (metrics: ContentDistributionMetricsInsert) => api.addDistributionMetrics(metrics),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.distributions.all });
      toast(successMessages.metricsAdded);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// CAMPAIGNS HOOKS
// ============================================================================

/**
 * Get campaigns for a plan
 */
export function useCampaigns(planId: string, filters?: ContentCampaignFilters) {
  return useQuery({
    queryKey: queryKeys.content.campaigns.list(planId, filters),
    queryFn: () => api.getCampaigns(planId, filters),
    enabled: !!planId,
  });
}

/**
 * Get a single campaign
 */
export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.content.campaigns.detail(campaignId),
    queryFn: () => api.getCampaign(campaignId),
    enabled: !!campaignId,
  });
}

/**
 * Create a campaign
 */
export function useCreateCampaign(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (campaign: api.CreateCampaignData) =>
      api.createCampaign(planId, campaign),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.campaigns.all });
      toast(successMessages.campaignCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a campaign
 */
export function useUpdateCampaign(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ campaignId, updates }: { campaignId: string; updates: ContentCampaignUpdate }) =>
      api.updateCampaign(campaignId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.campaigns.all });
      toast(successMessages.campaignUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a campaign
 */
export function useDeleteCampaign(_planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (campaignId: string) => api.deleteCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.campaigns.all });
      toast(successMessages.campaignDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Add posts to a campaign
 */
export function useAddPostsToCampaign(_planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, postIds }: { campaignId: string; postIds: string[] }) =>
      api.addPostsToCampaign(campaignId, postIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.campaigns.all });
    },
  });
}

/**
 * Remove post from a campaign
 */
export function useRemovePostFromCampaign(_planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, postId }: { campaignId: string; postId: string }) =>
      api.removePostFromCampaign(campaignId, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.campaigns.all });
    },
  });
}

// ============================================================================
// CAMPAIGN CHECKINS HOOKS
// ============================================================================

/**
 * Get checkins for a campaign
 */
export function useCampaignCheckins(campaignId: string) {
  return useQuery({
    queryKey: [...queryKeys.content.campaigns.all, "checkins", campaignId],
    queryFn: () => api.getCampaignCheckins(campaignId),
    enabled: !!campaignId,
  });
}

/**
 * Add campaign checkin
 */
export function useAddCampaignCheckin(_planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checkin: ContentCampaignCheckinInsert) => api.addCampaignCheckin(checkin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.campaigns.all });
    },
  });
}

// ============================================================================
// STORAGE HOOKS
// ============================================================================

/**
 * Upload media file
 */
export function useUploadMedia(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ postId, file }: { postId: string; file: File }) =>
      api.uploadMediaFile(planId, postId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.withDetails(planId) });
      toast(successMessages.mediaUploaded);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete media file
 */
export function useDeleteMedia(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (mediaId: string) => api.deleteMediaFile(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.withDetails(planId) });
      toast(successMessages.mediaDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// LINKS HOOKS
// ============================================================================

/**
 * Add a link to a post
 */
export function useAddPostLink(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (link: { post_id: string; url: string; title?: string | null }) =>
      api.addPostLink({
        post_id: link.post_id,
        url: link.url,
        title: link.title ?? null,
        description: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.withDetails(planId) });
      toast(successMessages.linkAdded);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a link from a post
 */
export function useDeletePostLink(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (linkId: string) => api.deletePostLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.posts.withDetails(planId) });
      toast(successMessages.linkDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

/**
 * Get content analytics data
 */
export function useContentAnalytics(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.content.posts.all, "analytics", planId],
    queryFn: () => api.getContentAnalytics(planId),
    enabled: !!planId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
