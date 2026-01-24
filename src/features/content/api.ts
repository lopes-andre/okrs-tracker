import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError, handleSupabaseQuery, handleSupabaseDelete } from "@/lib/api-utils";
import type {
  ContentPlatform,
  ContentAccount,
  ContentAccountInsert,
  ContentAccountUpdate,
  ContentAccountWithPlatform,
  ContentGoal,
  ContentGoalInsert,
  ContentGoalUpdate,
  ContentPost,
  ContentPostInsert,
  ContentPostUpdate,
  ContentPostWithDetails,
  ContentPostMedia,
  ContentPostMediaInsert,
  ContentPostLink,
  ContentPostLinkInsert,
  ContentDistribution,
  ContentDistributionInsert,
  ContentDistributionUpdate,
  ContentDistributionMetrics,
  ContentDistributionMetricsInsert,
  ContentCampaign,
  ContentCampaignInsert,
  ContentCampaignUpdate,
  ContentCampaignCheckin,
  ContentCampaignCheckinInsert,
  ContentCalendarEntry,
  ContentPostFilters,
  ContentCampaignFilters,
} from "@/lib/supabase/types";

// ============================================================================
// PLATFORMS API (Read-only)
// ============================================================================

/**
 * Get all available platforms
 */
export async function getPlatforms(): Promise<ContentPlatform[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_platforms")
      .select("*")
      .order("display_name", { ascending: true })
  );
}

/**
 * Get a single platform by ID
 */
export async function getPlatform(platformId: string): Promise<ContentPlatform | null> {
  const supabase = createClient();
  return handleSupabaseQuery(
    supabase
      .from("content_platforms")
      .select("*")
      .eq("id", platformId)
      .single()
  );
}

// ============================================================================
// ACCOUNTS API
// ============================================================================

/**
 * Get all accounts for a plan
 */
export async function getAccounts(planId: string): Promise<ContentAccount[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_accounts")
      .select("*")
      .eq("plan_id", planId)
      .order("display_order", { ascending: true })
  );
}

/**
 * Get accounts with platform details
 */
export async function getAccountsWithPlatform(planId: string): Promise<ContentAccountWithPlatform[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_accounts")
      .select(`
        *,
        platform:content_platforms(*),
        linked_kr:annual_krs(
          *,
          objective:objectives(code, name)
        )
      `)
      .eq("plan_id", planId)
      .order("display_order", { ascending: true })
  );
}

/**
 * Get a single account with details
 */
export async function getAccount(accountId: string): Promise<ContentAccountWithPlatform | null> {
  const supabase = createClient();
  return handleSupabaseQuery(
    supabase
      .from("content_accounts")
      .select(`
        *,
        platform:content_platforms(*),
        linked_kr:annual_krs(*)
      `)
      .eq("id", accountId)
      .single()
  );
}

/**
 * Create a new account
 */
export async function createAccount(account: ContentAccountInsert): Promise<ContentAccount> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_accounts")
      .insert(account)
      .select()
      .single()
  );
}

/**
 * Update an account
 */
export async function updateAccount(accountId: string, updates: ContentAccountUpdate): Promise<ContentAccount> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_accounts")
      .update(updates)
      .eq("id", accountId)
      .select()
      .single()
  );
}

/**
 * Delete an account
 */
export async function deleteAccount(accountId: string): Promise<void> {
  const supabase = createClient();
  await handleSupabaseDelete(
    supabase
      .from("content_accounts")
      .delete()
      .eq("id", accountId),
    "deleteAccount"
  );
}

// ============================================================================
// GOALS API
// ============================================================================

/**
 * Get all goals for a plan
 */
export async function getGoals(planId: string): Promise<ContentGoal[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_goals")
      .select("*")
      .eq("plan_id", planId)
      .order("display_order", { ascending: true })
  );
}

/**
 * Create a new goal
 */
export async function createGoal(goal: ContentGoalInsert): Promise<ContentGoal> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_goals")
      .insert(goal)
      .select()
      .single()
  );
}

/**
 * Update a goal
 */
export async function updateGoal(goalId: string, updates: ContentGoalUpdate): Promise<ContentGoal> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_goals")
      .update(updates)
      .eq("id", goalId)
      .select()
      .single()
  );
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<void> {
  const supabase = createClient();
  await handleSupabaseDelete(
    supabase
      .from("content_goals")
      .delete()
      .eq("id", goalId),
    "deleteGoal"
  );
}

/**
 * Reorder goals
 */
export async function reorderGoals(goalIds: string[]): Promise<void> {
  const supabase = createClient();

  // Update each goal's display_order based on its position in the array
  for (let i = 0; i < goalIds.length; i++) {
    await supabase
      .from("content_goals")
      .update({ display_order: i })
      .eq("id", goalIds[i]);
  }
}

// ============================================================================
// POSTS API
// ============================================================================

/**
 * Get all posts for a plan
 */
export async function getPosts(planId: string, filters?: ContentPostFilters): Promise<ContentPost[]> {
  const supabase = createClient();
  let query = supabase
    .from("content_posts")
    .select("*")
    .eq("plan_id", planId);

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }

  if (filters?.created_by) {
    query = query.eq("created_by", filters.created_by);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  return handleSupabaseError(
    query.order("status", { ascending: true }).order("display_order", { ascending: true })
  );
}

/**
 * Get posts with full details using RPC function
 */
export async function getPostsWithDetails(planId: string): Promise<ContentPostWithDetails[]> {
  const supabase = createClient();
  const result = await supabase.rpc("get_content_posts_with_details", {
    p_plan_id: planId,
  });

  if (result.error) {
    throw result.error;
  }

  // Fetch additional details for each post
  const posts = result.data || [];
  const postsWithDetails: ContentPostWithDetails[] = [];

  for (const post of posts) {
    // Get media
    const { data: media } = await supabase
      .from("content_post_media")
      .select("*")
      .eq("post_id", post.id)
      .order("display_order", { ascending: true });

    // Get links
    const { data: links } = await supabase
      .from("content_post_links")
      .select("*")
      .eq("post_id", post.id);

    // Get distributions with account info
    const { data: distributions } = await supabase
      .from("content_distributions")
      .select(`
        *,
        account:content_accounts(
          *,
          platform:content_platforms(*)
        )
      `)
      .eq("post_id", post.id);

    postsWithDetails.push({
      ...post,
      media: media || [],
      links: links || [],
      distributions: distributions || [],
    });
  }

  return postsWithDetails;
}

/**
 * Get a single post with details
 */
export async function getPost(postId: string): Promise<ContentPostWithDetails | null> {
  const supabase = createClient();

  // Get post
  const { data: post, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error || !post) return null;

  // Get goals
  const { data: postGoals } = await supabase
    .from("content_post_goals")
    .select("goal_id")
    .eq("post_id", postId);

  const goalIds = (postGoals || []).map(pg => pg.goal_id);
  let goals: ContentGoal[] = [];
  if (goalIds.length > 0) {
    const { data } = await supabase
      .from("content_goals")
      .select("*")
      .in("id", goalIds);
    goals = data || [];
  }

  // Get media
  const { data: media } = await supabase
    .from("content_post_media")
    .select("*")
    .eq("post_id", postId)
    .order("display_order", { ascending: true });

  // Get links
  const { data: links } = await supabase
    .from("content_post_links")
    .select("*")
    .eq("post_id", postId);

  // Get distributions
  const { data: distributions } = await supabase
    .from("content_distributions")
    .select(`
      *,
      account:content_accounts(
        *,
        platform:content_platforms(*)
      )
    `)
    .eq("post_id", postId);

  // Count distributions
  const dists = distributions || [];
  const distributionCount = dists.length;
  const scheduledCount = dists.filter(d => d.status === "scheduled").length;
  const postedCount = dists.filter(d => d.status === "posted").length;

  return {
    ...post,
    goals,
    media: media || [],
    links: links || [],
    distributions: dists,
    distribution_count: distributionCount,
    scheduled_count: scheduledCount,
    posted_count: postedCount,
  };
}

/**
 * Create a new post
 */
export async function createPost(post: ContentPostInsert, goalIds?: string[]): Promise<ContentPost> {
  const supabase = createClient();

  // Create post
  const { data, error } = await supabase
    .from("content_posts")
    .insert(post)
    .select()
    .single();

  if (error) throw error;

  // Add goals if provided
  if (goalIds && goalIds.length > 0) {
    await supabase.from("content_post_goals").insert(
      goalIds.map(goalId => ({ post_id: data.id, goal_id: goalId }))
    );
  }

  return data;
}

/**
 * Update a post
 */
export async function updatePost(postId: string, updates: ContentPostUpdate, goalIds?: string[]): Promise<ContentPost> {
  const supabase = createClient();

  // Update post
  const { data, error } = await supabase
    .from("content_posts")
    .update(updates)
    .eq("id", postId)
    .select()
    .single();

  if (error) throw error;

  // Update goals if provided
  if (goalIds !== undefined) {
    // Remove existing goals
    await supabase.from("content_post_goals").delete().eq("post_id", postId);
    // Add new goals
    if (goalIds.length > 0) {
      await supabase.from("content_post_goals").insert(
        goalIds.map(goalId => ({ post_id: postId, goal_id: goalId }))
      );
    }
  }

  return data;
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<void> {
  const supabase = createClient();
  await handleSupabaseDelete(
    supabase
      .from("content_posts")
      .delete()
      .eq("id", postId),
    "deletePost"
  );
}

/**
 * Reorder posts within a status column (Kanban)
 */
export async function reorderPosts(postIds: string[], status: string): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("reorder_content_posts", {
    p_post_ids: postIds,
    p_status: status,
  });
}

// ============================================================================
// POST MEDIA API
// ============================================================================

/**
 * Add media to a post
 */
export async function addPostMedia(media: ContentPostMediaInsert): Promise<ContentPostMedia> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_post_media")
      .insert(media)
      .select()
      .single()
  );
}

/**
 * Delete post media
 */
export async function deletePostMedia(mediaId: string): Promise<void> {
  const supabase = createClient();
  await handleSupabaseDelete(
    supabase
      .from("content_post_media")
      .delete()
      .eq("id", mediaId),
    "deletePostMedia"
  );
}

// ============================================================================
// POST LINKS API
// ============================================================================

/**
 * Add link to a post
 */
export async function addPostLink(link: ContentPostLinkInsert): Promise<ContentPostLink> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_post_links")
      .insert(link)
      .select()
      .single()
  );
}

/**
 * Delete post link
 */
export async function deletePostLink(linkId: string): Promise<void> {
  const supabase = createClient();
  await handleSupabaseDelete(
    supabase
      .from("content_post_links")
      .delete()
      .eq("id", linkId),
    "deletePostLink"
  );
}

// ============================================================================
// DISTRIBUTIONS API
// ============================================================================

/**
 * Get distributions for a post
 */
export async function getDistributionsByPost(postId: string): Promise<ContentDistribution[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_distributions")
      .select(`
        *,
        account:content_accounts(
          *,
          platform:content_platforms(*)
        )
      `)
      .eq("post_id", postId)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
  );
}

/**
 * Get calendar data (distributions for a date range)
 */
export async function getCalendarData(
  planId: string,
  startDate: string,
  endDate: string
): Promise<ContentCalendarEntry[]> {
  const supabase = createClient();
  const result = await supabase.rpc("get_content_calendar", {
    p_plan_id: planId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (result.error) throw result.error;
  return result.data || [];
}

/**
 * Create a distribution
 */
export async function createDistribution(distribution: ContentDistributionInsert): Promise<ContentDistribution> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_distributions")
      .insert(distribution)
      .select()
      .single()
  );
}

/**
 * Update a distribution
 */
export async function updateDistribution(
  distributionId: string,
  updates: ContentDistributionUpdate
): Promise<ContentDistribution> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_distributions")
      .update(updates)
      .eq("id", distributionId)
      .select()
      .single()
  );
}

/**
 * Delete a distribution
 */
export async function deleteDistribution(distributionId: string): Promise<void> {
  const supabase = createClient();
  await handleSupabaseDelete(
    supabase
      .from("content_distributions")
      .delete()
      .eq("id", distributionId),
    "deleteDistribution"
  );
}

/**
 * Mark a distribution as posted
 */
export async function markDistributionPosted(
  distributionId: string,
  platformPostUrl?: string
): Promise<ContentDistribution> {
  return updateDistribution(distributionId, {
    status: "posted",
    posted_at: new Date().toISOString(),
    platform_post_url: platformPostUrl,
  });
}

// ============================================================================
// DISTRIBUTION METRICS API
// ============================================================================

/**
 * Get metrics for a distribution
 */
export async function getDistributionMetrics(distributionId: string): Promise<ContentDistributionMetrics[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_distribution_metrics")
      .select("*")
      .eq("distribution_id", distributionId)
      .order("checked_at", { ascending: false })
  );
}

/**
 * Add metrics check-in for a distribution
 */
export async function addDistributionMetrics(
  metrics: ContentDistributionMetricsInsert
): Promise<ContentDistributionMetrics> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_distribution_metrics")
      .insert(metrics)
      .select()
      .single()
  );
}

// ============================================================================
// CAMPAIGNS API
// ============================================================================

/**
 * Get campaigns for a plan
 */
export async function getCampaigns(
  planId: string,
  filters?: ContentCampaignFilters
): Promise<ContentCampaign[]> {
  const supabase = createClient();
  let query = supabase
    .from("content_campaigns")
    .select("*")
    .eq("plan_id", planId);

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }

  if (filters?.platform_id) {
    query = query.eq("platform_id", filters.platform_id);
  }

  if (filters?.objective) {
    const objectives = Array.isArray(filters.objective) ? filters.objective : [filters.objective];
    query = query.in("objective", objectives);
  }

  return handleSupabaseError(query.order("created_at", { ascending: false }));
}

/**
 * Get a campaign with details
 */
export async function getCampaign(campaignId: string): Promise<ContentCampaign | null> {
  const supabase = createClient();
  return handleSupabaseQuery(
    supabase
      .from("content_campaigns")
      .select(`
        *,
        platform:content_platforms(*)
      `)
      .eq("id", campaignId)
      .single()
  );
}

/**
 * Create a campaign
 */
export async function createCampaign(campaign: ContentCampaignInsert): Promise<ContentCampaign> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_campaigns")
      .insert(campaign)
      .select()
      .single()
  );
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  updates: ContentCampaignUpdate
): Promise<ContentCampaign> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_campaigns")
      .update(updates)
      .eq("id", campaignId)
      .select()
      .single()
  );
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  const supabase = createClient();
  await handleSupabaseDelete(
    supabase
      .from("content_campaigns")
      .delete()
      .eq("id", campaignId),
    "deleteCampaign"
  );
}

/**
 * Add posts to a campaign
 */
export async function addPostsToCampaign(campaignId: string, postIds: string[]): Promise<void> {
  const supabase = createClient();
  await supabase.from("content_campaign_posts").insert(
    postIds.map((postId, index) => ({
      campaign_id: campaignId,
      post_id: postId,
      sort_order: index,
    }))
  );
}

/**
 * Remove post from a campaign
 */
export async function removePostFromCampaign(campaignId: string, postId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("content_campaign_posts")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("post_id", postId);
}

// ============================================================================
// CAMPAIGN CHECKINS API
// ============================================================================

/**
 * Get checkins for a campaign
 */
export async function getCampaignCheckins(campaignId: string): Promise<ContentCampaignCheckin[]> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_campaign_checkins")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("checked_at", { ascending: false })
  );
}

/**
 * Add campaign checkin
 */
export async function addCampaignCheckin(
  checkin: ContentCampaignCheckinInsert
): Promise<ContentCampaignCheckin> {
  const supabase = createClient();
  return handleSupabaseError(
    supabase
      .from("content_campaign_checkins")
      .insert(checkin)
      .select()
      .single()
  );
}

// ============================================================================
// STORAGE API
// ============================================================================

/**
 * Upload media file for a content post
 */
export async function uploadMediaFile(
  planId: string,
  postId: string,
  file: File
): Promise<{ path: string; url: string }> {
  const supabase = createClient();

  // Generate path
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}.${ext}`;
  const path = `${planId}/${postId}/${fileName}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from("content-media")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  // Get signed URL
  const { data: urlData } = await supabase.storage
    .from("content-media")
    .createSignedUrl(data.path, 60 * 60 * 24); // 24 hours

  return {
    path: data.path,
    url: urlData?.signedUrl || "",
  };
}

/**
 * Get signed URL for a media file
 */
export async function getMediaSignedUrl(path: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("content-media")
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Delete a media file from storage
 */
export async function deleteMediaFile(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("content-media")
    .remove([path]);

  if (error) throw error;
}
