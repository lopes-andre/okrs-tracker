/**
 * Weekly Reviews API
 * 
 * Supabase queries for weekly review operations including:
 * - CRUD for reviews
 * - Settings management
 * - KR update tracking
 * - Task snapshots
 */

import { createClient } from "@/lib/supabase/client";
import type {
  WeeklyReview,
  WeeklyReviewSettings,
  WeeklyReviewKrUpdate,
  WeeklyReviewTask,
  WeeklyReviewInsert,
  WeeklyReviewUpdate,
  WeeklyReviewSettingsInsert,
  WeeklyReviewSettingsUpdate,
  WeeklyReviewKrUpdateInsert,
  WeeklyReviewTaskInsert,
  WeeklyReviewSummary,
  PlanReviewStats,
} from "@/lib/supabase/types";
import {
  getISOWeekNumber,
  getISOWeekYear,
  getWeekBounds,
  formatDateString,
} from "@/lib/weekly-review-engine";

// ============================================================================
// WEEKLY REVIEWS
// ============================================================================

/**
 * Get all weekly reviews for a plan
 */
export async function getWeeklyReviews(planId: string): Promise<WeeklyReview[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("plan_id", planId)
    .order("year", { ascending: false })
    .order("week_number", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get weekly review summaries (with computed fields) for a plan
 */
export async function getWeeklyReviewSummaries(planId: string): Promise<WeeklyReviewSummary[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("v_weekly_review_summary")
    .select("*")
    .eq("plan_id", planId)
    .order("year", { ascending: false })
    .order("week_number", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific weekly review by ID
 */
export async function getWeeklyReview(reviewId: string): Promise<WeeklyReview | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("id", reviewId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Get weekly review for a specific week
 */
export async function getWeeklyReviewByWeek(
  planId: string,
  year: number,
  weekNumber: number
): Promise<WeeklyReview | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("plan_id", planId)
    .eq("year", year)
    .eq("week_number", weekNumber)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Get or create weekly review for a specific week
 */
export async function getOrCreateWeeklyReview(
  planId: string,
  year?: number,
  weekNumber?: number
): Promise<WeeklyReview> {
  const now = new Date();
  const targetYear = year ?? getISOWeekYear(now);
  const targetWeek = weekNumber ?? getISOWeekNumber(now);
  
  // Try to get existing
  const existing = await getWeeklyReviewByWeek(planId, targetYear, targetWeek);
  if (existing) return existing;
  
  // Create new
  const { start, end } = getWeekBounds(targetYear, targetWeek);
  
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .insert({
      plan_id: planId,
      year: targetYear,
      week_number: targetWeek,
      week_start: formatDateString(start),
      week_end: formatDateString(end),
      status: "open",
    } as WeeklyReviewInsert)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a weekly review
 */
export async function createWeeklyReview(review: WeeklyReviewInsert): Promise<WeeklyReview> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_reviews")
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a weekly review
 */
export async function updateWeeklyReview(
  reviewId: string,
  updates: WeeklyReviewUpdate
): Promise<WeeklyReview> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_reviews")
    .update(updates)
    .eq("id", reviewId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Start a weekly review (set started_at timestamp)
 */
export async function startWeeklyReview(reviewId: string): Promise<WeeklyReview> {
  return updateWeeklyReview(reviewId, {
    started_at: new Date().toISOString(),
  });
}

/**
 * Complete a weekly review
 */
export async function completeWeeklyReview(
  reviewId: string,
  data: {
    reflection_what_went_well?: string;
    reflection_what_to_improve?: string;
    reflection_lessons_learned?: string;
    reflection_notes?: string;
    week_rating?: number;
    stats_krs_updated?: number;
    stats_tasks_completed?: number;
    stats_tasks_created?: number;
    stats_check_ins_made?: number;
    stats_objectives_on_track?: number;
    stats_objectives_at_risk?: number;
    stats_objectives_off_track?: number;
  }
): Promise<WeeklyReview> {
  const supabase = createClient();
  
  // Determine status based on current time vs week end
  const review = await getWeeklyReview(reviewId);
  if (!review) throw new Error("Review not found");
  
  const now = new Date();
  
  // Parse week_end as local date (it's stored as YYYY-MM-DD)
  // week_end is Saturday, grace period ends Monday 11:59pm (2 days after)
  const [year, month, day] = review.week_end.split("-").map(Number);
  const gracePeriodEnd = new Date(year, month - 1, day + 2, 23, 59, 59, 999);
  
  const status = now <= gracePeriodEnd ? "complete" : "late";
  
  const { data: updated, error } = await supabase
    .from("weekly_reviews")
    .update({
      ...data,
      status,
      completed_at: now.toISOString(),
    })
    .eq("id", reviewId)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

/**
 * Delete a weekly review
 */
export async function deleteWeeklyReview(reviewId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from("weekly_reviews")
    .delete()
    .eq("id", reviewId);

  if (error) throw error;
}

// ============================================================================
// WEEKLY REVIEW SETTINGS
// ============================================================================

/**
 * Get settings for a plan
 */
export async function getWeeklyReviewSettings(planId: string): Promise<WeeklyReviewSettings | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_review_settings")
    .select("*")
    .eq("plan_id", planId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Get or create settings for a plan
 */
export async function getOrCreateWeeklyReviewSettings(planId: string): Promise<WeeklyReviewSettings> {
  const existing = await getWeeklyReviewSettings(planId);
  if (existing) return existing;
  
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weekly_review_settings")
    .insert({
      plan_id: planId,
      reminder_enabled: true,
      reminder_day: 5, // Friday
      reminder_time: "17:00",
      auto_create_reviews: true,
    } as WeeklyReviewSettingsInsert)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update settings
 */
export async function updateWeeklyReviewSettings(
  planId: string,
  updates: WeeklyReviewSettingsUpdate
): Promise<WeeklyReviewSettings> {
  // Ensure settings exist first
  await getOrCreateWeeklyReviewSettings(planId);
  
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weekly_review_settings")
    .update(updates)
    .eq("plan_id", planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// KR UPDATES (during review)
// ============================================================================

/**
 * Get KR updates for a review
 */
export async function getWeeklyReviewKrUpdates(
  reviewId: string
): Promise<WeeklyReviewKrUpdate[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_review_kr_updates")
    .select("*")
    .eq("weekly_review_id", reviewId);

  if (error) throw error;
  return data || [];
}

/**
 * Record a KR update during review
 */
export async function createWeeklyReviewKrUpdate(
  update: WeeklyReviewKrUpdateInsert
): Promise<WeeklyReviewKrUpdate> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_review_kr_updates")
    .upsert(update, {
      onConflict: "weekly_review_id,annual_kr_id",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// TASK SNAPSHOTS (during review)
// ============================================================================

/**
 * Get task snapshots for a review
 */
export async function getWeeklyReviewTasks(reviewId: string): Promise<WeeklyReviewTask[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_review_tasks")
    .select("*")
    .eq("weekly_review_id", reviewId);

  if (error) throw error;
  return data || [];
}

/**
 * Record task snapshot during review
 */
export async function createWeeklyReviewTaskSnapshot(
  snapshot: WeeklyReviewTaskInsert
): Promise<WeeklyReviewTask> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_review_tasks")
    .upsert(snapshot, {
      onConflict: "weekly_review_id,task_id",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Bulk create task snapshots
 */
export async function createWeeklyReviewTaskSnapshots(
  snapshots: WeeklyReviewTaskInsert[]
): Promise<WeeklyReviewTask[]> {
  if (snapshots.length === 0) return [];
  
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_review_tasks")
    .upsert(snapshots, {
      onConflict: "weekly_review_id,task_id",
    })
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================================================
// STATS & ANALYTICS
// ============================================================================

/**
 * Get review stats for a plan
 */
export async function getPlanReviewStats(planId: string): Promise<PlanReviewStats | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("v_plan_review_stats")
    .select("*")
    .eq("plan_id", planId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Get pending (uncompleted) reviews for a plan
 */
export async function getPendingReviews(planId: string): Promise<WeeklyReview[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("plan_id", planId)
    .in("status", ["open", "pending"])
    .order("year", { ascending: true })
    .order("week_number", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get the current week's review (or create it)
 */
export async function getCurrentWeekReview(planId: string): Promise<WeeklyReview> {
  return getOrCreateWeeklyReview(planId);
}
