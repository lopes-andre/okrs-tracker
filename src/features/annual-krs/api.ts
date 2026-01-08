import { createClient } from "@/lib/supabase/client";
import { handleSupabaseError, handleSupabaseQuery } from "@/lib/api-utils";
import type {
  AnnualKr,
  AnnualKrInsert,
  AnnualKrUpdate,
  AnnualKrWithDetails,
  Tag,
} from "@/lib/supabase/types";

// ============================================================================
// ANNUAL KRS API
// ============================================================================

/**
 * Get all annual KRs for a plan (via objectives)
 */
export async function getAnnualKrs(planId: string): Promise<AnnualKr[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("annual_krs")
      .select(`
        *,
        objectives!inner(plan_id)
      `)
      .eq("objectives.plan_id", planId)
      .order("sort_order", { ascending: true })
  );
}

/**
 * Get annual KRs for a specific objective
 */
export async function getAnnualKrsByObjective(objectiveId: string): Promise<AnnualKr[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("annual_krs")
      .select("*")
      .eq("objective_id", objectiveId)
      .order("sort_order", { ascending: true })
  );
}

/**
 * Get KR progress data from view
 */
export async function getKrProgress(planId: string): Promise<(AnnualKr & { 
  progress: number; 
  objective_code: string 
})[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("v_kr_progress")
      .select("*")
      .eq("plan_id", planId)
  );
}

/**
 * Get a single annual KR with details
 */
export async function getAnnualKr(krId: string): Promise<AnnualKr | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("annual_krs")
      .select("*")
      .eq("id", krId)
      .single()
  );
}

/**
 * Get an annual KR with all related data
 */
export async function getAnnualKrWithDetails(krId: string): Promise<AnnualKrWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("annual_krs")
    .select(`
      *,
      objective:objectives(*),
      group:kr_groups(*),
      quarter_targets(*),
      annual_kr_tags(tag:tags(*))
    `)
    .eq("id", krId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  // Calculate progress
  const progress = data.target_value > data.start_value
    ? ((data.current_value - data.start_value) / (data.target_value - data.start_value)) * 100
    : data.current_value >= data.target_value ? 100 : 0;

  return {
    ...data,
    tags: data.annual_kr_tags?.map((t: { tag: Tag }) => t.tag) || [],
    annual_kr_tags: undefined,
    progress: Math.min(Math.max(progress, 0), 100),
  } as AnnualKrWithDetails;
}

/**
 * Create an annual KR
 */
export async function createAnnualKr(kr: AnnualKrInsert): Promise<AnnualKr> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("annual_krs")
      .insert(kr)
      .select()
      .single()
  );
}

/**
 * Update an annual KR
 */
export async function updateAnnualKr(
  krId: string,
  updates: AnnualKrUpdate
): Promise<AnnualKr> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("annual_krs")
      .update(updates)
      .eq("id", krId)
      .select()
      .single()
  );
}

/**
 * Delete an annual KR
 */
export async function deleteAnnualKr(krId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("annual_krs")
    .delete()
    .eq("id", krId);

  if (error) throw error;
}

/**
 * Reorder KRs within an objective
 */
export async function reorderAnnualKrs(
  objectiveId: string,
  krIds: string[]
): Promise<void> {
  const supabase = createClient();

  const updates = krIds.map((id, index) =>
    supabase
      .from("annual_krs")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("objective_id", objectiveId)
  );

  await Promise.all(updates);
}

// ============================================================================
// KR TAGS API
// ============================================================================

/**
 * Add a tag to a KR
 */
export async function addTagToKr(krId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("annual_kr_tags")
    .insert({ annual_kr_id: krId, tag_id: tagId });

  if (error) throw error;
}

/**
 * Remove a tag from a KR
 */
export async function removeTagFromKr(krId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("annual_kr_tags")
    .delete()
    .eq("annual_kr_id", krId)
    .eq("tag_id", tagId);

  if (error) throw error;
}

/**
 * Set all tags for a KR (replace existing)
 */
export async function setKrTags(krId: string, tagIds: string[]): Promise<void> {
  const supabase = createClient();

  // Delete existing tags
  await supabase
    .from("annual_kr_tags")
    .delete()
    .eq("annual_kr_id", krId);

  // Insert new tags
  if (tagIds.length > 0) {
    const { error } = await supabase
      .from("annual_kr_tags")
      .insert(tagIds.map((tagId) => ({ annual_kr_id: krId, tag_id: tagId })));

    if (error) throw error;
  }
}
