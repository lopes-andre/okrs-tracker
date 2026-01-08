import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError, handleSupabaseQuery } from "@/lib/api-utils";
import type {
  Objective,
  ObjectiveInsert,
  ObjectiveUpdate,
  ObjectiveWithKrs,
} from "@/lib/supabase/types";

// ============================================================================
// OBJECTIVES API
// ============================================================================

/**
 * Get all objectives for a plan
 */
export async function getObjectives(planId: string): Promise<Objective[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("objectives")
      .select("*")
      .eq("plan_id", planId)
      .order("sort_order", { ascending: true })
  );
}

/**
 * Get objectives with their annual KRs
 */
export async function getObjectivesWithKrs(planId: string): Promise<ObjectiveWithKrs[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("objectives")
    .select(`
      *,
      annual_krs(*)
    `)
    .eq("plan_id", planId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  // Calculate progress for each objective
  return (data || []).map((obj) => {
    const krs = obj.annual_krs || [];
    const progress = krs.length > 0
      ? krs.reduce((sum: number, kr: { target_value: number; current_value: number; start_value: number; weight?: number }) => {
          const krProgress = kr.target_value > 0
            ? ((kr.current_value - kr.start_value) / (kr.target_value - kr.start_value)) * 100
            : 0;
          return sum + krProgress * (kr.weight || 1);
        }, 0) / krs.reduce((sum: number, kr: { weight?: number }) => sum + (kr.weight || 1), 0)
      : 0;

    return {
      ...obj,
      progress: Math.min(Math.max(progress, 0), 100),
    };
  }) as ObjectiveWithKrs[];
}

/**
 * Get progress data from the view
 */
export async function getObjectiveProgress(planId: string): Promise<{
  id: string;
  code: string;
  name: string;
  progress: number;
  kr_count: number;
}[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("v_objective_progress")
      .select("*")
      .eq("plan_id", planId)
      .order("code", { ascending: true })
  );
}

/**
 * Get a single objective
 */
export async function getObjective(objectiveId: string): Promise<Objective | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("objectives")
      .select("*")
      .eq("id", objectiveId)
      .single()
  );
}

/**
 * Create an objective
 */
export async function createObjective(objective: ObjectiveInsert): Promise<Objective> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("objectives")
      .insert(objective)
      .select()
      .single()
  );
}

/**
 * Update an objective
 */
export async function updateObjective(
  objectiveId: string,
  updates: ObjectiveUpdate
): Promise<Objective> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("objectives")
      .update(updates)
      .eq("id", objectiveId)
      .select()
      .single()
  );
}

/**
 * Delete an objective
 */
export async function deleteObjective(objectiveId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("objectives")
    .delete()
    .eq("id", objectiveId);

  if (error) throw error;
}

/**
 * Reorder objectives
 */
export async function reorderObjectives(
  planId: string,
  objectiveIds: string[]
): Promise<void> {
  const supabase = createClient();

  // Update sort_order for each objective
  const updates = objectiveIds.map((id, index) =>
    supabase
      .from("objectives")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("plan_id", planId)
  );

  await Promise.all(updates);
}
