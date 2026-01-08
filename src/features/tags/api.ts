import { createClient } from "@/lib/supabase/client";
import { handleSupabaseError, handleSupabaseQuery } from "@/lib/api-utils";
import type {
  Tag,
  TagInsert,
  TagUpdate,
  KrGroup,
  KrGroupInsert,
  KrGroupUpdate,
  TagKind,
} from "@/lib/supabase/types";

// ============================================================================
// TAGS API
// ============================================================================

/**
 * Get all tags for a plan
 */
export async function getTags(planId: string): Promise<Tag[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tags")
      .select("*")
      .eq("plan_id", planId)
      .order("kind", { ascending: true })
      .order("name", { ascending: true })
  );
}

/**
 * Get tags by kind
 */
export async function getTagsByKind(planId: string, kind: TagKind): Promise<Tag[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tags")
      .select("*")
      .eq("plan_id", planId)
      .eq("kind", kind)
      .order("name", { ascending: true })
  );
}

/**
 * Get a single tag
 */
export async function getTag(tagId: string): Promise<Tag | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("tags")
      .select("*")
      .eq("id", tagId)
      .single()
  );
}

/**
 * Create a tag
 */
export async function createTag(tag: TagInsert): Promise<Tag> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tags")
      .insert(tag)
      .select()
      .single()
  );
}

/**
 * Update a tag
 */
export async function updateTag(tagId: string, updates: TagUpdate): Promise<Tag> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tags")
      .update(updates)
      .eq("id", tagId)
      .select()
      .single()
  );
}

/**
 * Delete a tag
 */
export async function deleteTag(tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", tagId);

  if (error) throw error;
}

// ============================================================================
// KR GROUPS API
// ============================================================================

/**
 * Get all KR groups for a plan
 */
export async function getKrGroups(planId: string): Promise<KrGroup[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("kr_groups")
      .select("*")
      .eq("plan_id", planId)
      .order("sort_order", { ascending: true })
  );
}

/**
 * Get a single KR group
 */
export async function getKrGroup(groupId: string): Promise<KrGroup | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("kr_groups")
      .select("*")
      .eq("id", groupId)
      .single()
  );
}

/**
 * Get KR group with its KRs
 */
export async function getKrGroupWithKrs(groupId: string): Promise<KrGroup & { annual_krs: unknown[] } | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("kr_groups")
    .select(`
      *,
      annual_krs(*)
    `)
    .eq("id", groupId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

/**
 * Create a KR group
 */
export async function createKrGroup(group: KrGroupInsert): Promise<KrGroup> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("kr_groups")
      .insert(group)
      .select()
      .single()
  );
}

/**
 * Update a KR group
 */
export async function updateKrGroup(
  groupId: string,
  updates: KrGroupUpdate
): Promise<KrGroup> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("kr_groups")
      .update(updates)
      .eq("id", groupId)
      .select()
      .single()
  );
}

/**
 * Delete a KR group
 */
export async function deleteKrGroup(groupId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("kr_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw error;
}

/**
 * Reorder KR groups
 */
export async function reorderKrGroups(
  planId: string,
  groupIds: string[]
): Promise<void> {
  const supabase = createClient();

  const updates = groupIds.map((id, index) =>
    supabase
      .from("kr_groups")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("plan_id", planId)
  );

  await Promise.all(updates);
}
