import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError, handleSupabaseQuery } from "@/lib/api-utils";
import type {
  QuarterTarget,
  QuarterTargetInsert,
  QuarterTargetUpdate,
} from "@/lib/supabase/types";

// ============================================================================
// QUARTER TARGETS API
// ============================================================================

/**
 * Get all quarter targets for a plan
 */
export async function getQuarterTargets(planId: string): Promise<QuarterTarget[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("quarter_targets")
    .select(`
      *,
      annual_krs!inner(
        objectives!inner(plan_id)
      )
    `)
    .eq("annual_krs.objectives.plan_id", planId)
    .order("quarter", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get quarter targets for a specific annual KR
 */
export async function getQuarterTargetsByKr(annualKrId: string): Promise<QuarterTarget[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("quarter_targets")
      .select("*")
      .eq("annual_kr_id", annualKrId)
      .order("quarter", { ascending: true })
  );
}

/**
 * Get quarter targets by quarter number
 */
export async function getQuarterTargetsByQuarter(
  planId: string,
  quarter: 1 | 2 | 3 | 4
): Promise<QuarterTarget[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("quarter_targets")
    .select(`
      *,
      annual_krs!inner(
        *,
        objectives!inner(plan_id, code, name)
      )
    `)
    .eq("annual_krs.objectives.plan_id", planId)
    .eq("quarter", quarter);

  if (error) throw error;
  return data || [];
}

/**
 * Get quarter overview from view
 */
export async function getQuarterOverview(planId: string): Promise<{
  quarter: number;
  target_count: number;
  avg_progress: number;
}[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("v_quarter_overview")
      .select("*")
      .eq("plan_id", planId)
      .order("quarter", { ascending: true })
  );
}

/**
 * Get a single quarter target
 */
export async function getQuarterTarget(targetId: string): Promise<QuarterTarget | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("quarter_targets")
      .select("*")
      .eq("id", targetId)
      .single()
  );
}

/**
 * Create a quarter target
 */
export async function createQuarterTarget(target: QuarterTargetInsert): Promise<QuarterTarget> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("quarter_targets")
      .insert(target)
      .select()
      .single()
  );
}

/**
 * Create or update quarter targets for all quarters of a KR
 */
export async function upsertQuarterTargets(
  annualKrId: string,
  targets: { quarter: 1 | 2 | 3 | 4; target_value: number; notes?: string }[]
): Promise<QuarterTarget[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("quarter_targets")
    .upsert(
      targets.map((t) => ({
        annual_kr_id: annualKrId,
        quarter: t.quarter,
        target_value: t.target_value,
        notes: t.notes,
      })),
      { onConflict: "annual_kr_id,quarter" }
    )
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Update a quarter target
 */
export async function updateQuarterTarget(
  targetId: string,
  updates: QuarterTargetUpdate
): Promise<QuarterTarget> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("quarter_targets")
      .update(updates)
      .eq("id", targetId)
      .select()
      .single()
  );
}

/**
 * Delete a quarter target
 */
export async function deleteQuarterTarget(targetId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("quarter_targets")
    .delete()
    .eq("id", targetId);

  if (error) throw error;
}
