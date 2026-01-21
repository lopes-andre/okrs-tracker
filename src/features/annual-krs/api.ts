import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
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

  // First get objectives for this plan, then get their KRs
  const { data: objectives, error: objError } = await supabase
    .from("objectives")
    .select("id")
    .eq("plan_id", planId) as { data: { id: string }[] | null; error: unknown };

  if (objError) throw objError;
  if (!objectives || objectives.length === 0) return [];

  const objectiveIds = objectives.map((o) => o.id);

  const { data, error } = await supabase
    .from("annual_krs")
    .select("*")
    .in("objective_id", objectiveIds)
    .order("sort_order", { ascending: true }) as { data: AnnualKr[] | null; error: unknown };

  if (error) throw error;
  return data || [];
}

/**
 * Get annual KRs for a specific objective
 */
export async function getAnnualKrsByObjective(objectiveId: string): Promise<AnnualKr[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("annual_krs")
    .select("*")
    .eq("objective_id", objectiveId)
    .order("sort_order", { ascending: true }) as { data: AnnualKr[] | null; error: unknown };

  if (error) throw error;
  return data || [];
}

/**
 * Get KR progress data from view
 */
export async function getKrProgress(planId: string): Promise<(AnnualKr & { 
  progress: number; 
  objective_code: string 
})[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("v_kr_progress")
    .select("*")
    .eq("plan_id", planId) as { data: (AnnualKr & { progress: number; objective_code: string })[] | null; error: unknown };

  if (error) throw error;
  return data || [];
}

/**
 * Get a single annual KR with details
 */
export async function getAnnualKr(krId: string): Promise<AnnualKr | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("annual_krs")
    .select("*")
    .eq("id", krId)
    .single() as { data: AnnualKr | null; error: { code: string } | null };

  if (error && error.code !== "PGRST116") throw error;
  return data;
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
    .single() as { 
      data: (AnnualKr & { 
        objective?: unknown; 
        group?: unknown; 
        quarter_targets?: unknown[]; 
        annual_kr_tags?: { tag: Tag }[] 
      }) | null; 
      error: { code: string; message: string } | null 
    };

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  // Calculate progress
  const progress = data.target_value > data.start_value
    ? ((data.current_value - data.start_value) / (data.target_value - data.start_value)) * 100
    : data.current_value >= data.target_value ? 100 : 0;

  return {
    ...data,
    tags: data.annual_kr_tags?.map((t) => t.tag) || [],
    annual_kr_tags: undefined,
    progress: Math.min(Math.max(progress, 0), 100),
  } as AnnualKrWithDetails;
}

/**
 * Create an annual KR
 */
export async function createAnnualKr(kr: AnnualKrInsert): Promise<AnnualKr> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("annual_krs")
    .insert(kr)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("No data returned");
  return data;
}

/**
 * Update an annual KR
 */
export async function updateAnnualKr(
  krId: string,
  updates: AnnualKrUpdate
): Promise<AnnualKr> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("annual_krs")
    .update(updates)
    .eq("id", krId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("No data returned");
  return data;
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
 * Get tag IDs for a KR
 */
export async function getKrTagIds(krId: string): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("annual_kr_tags")
    .select("tag_id")
    .eq("annual_kr_id", krId) as { data: { tag_id: string }[] | null; error: unknown };

  if (error) throw error;
  return (data || []).map((row) => row.tag_id);
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
