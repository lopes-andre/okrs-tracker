import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError } from "@/lib/api-utils";
import type { Objective, AnnualKr, Task } from "@/lib/supabase/types";

export interface SearchResults {
  objectives: (Objective & { plan_id: string; plan_name?: string })[];
  annualKrs: (AnnualKr & { objective_name?: string; plan_id: string })[];
  tasks: (Task & { objective_name?: string; kr_name?: string })[];
}

/**
 * Search across objectives, KRs, and tasks within a plan
 * Uses ILIKE for simple pattern matching
 */
export async function searchPlan(
  planId: string,
  query: string,
  limit: number = 10
): Promise<SearchResults> {
  const supabase = createClient();
  const searchPattern = `%${query}%`;

  // Search objectives
  const objectivesPromise = handleSupabaseError(
    supabase
      .from("objectives")
      .select("*, plans!inner(name)")
      .eq("plan_id", planId)
      .or(`name.ilike.${searchPattern},code.ilike.${searchPattern}`)
      .limit(limit)
  );

  // Search annual KRs
  const krsPromise = handleSupabaseError(
    supabase
      .from("annual_krs")
      .select("*, objectives!inner(name, plan_id)")
      .eq("objectives.plan_id", planId)
      .ilike("name", searchPattern)
      .limit(limit)
  );

  // Search tasks
  const tasksPromise = handleSupabaseError(
    supabase
      .from("tasks")
      .select("*, objectives(name), annual_krs(name)")
      .eq("plan_id", planId)
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .limit(limit)
  );

  const [objectivesRaw, krsRaw, tasksRaw] = await Promise.all([
    objectivesPromise,
    krsPromise,
    tasksPromise,
  ]);

  // Transform results to flatten nested data
  const objectives = (objectivesRaw || []).map((obj: Record<string, unknown>) => ({
    ...obj,
    plan_name: (obj.plans as { name: string } | null)?.name,
  })) as SearchResults["objectives"];

  const annualKrs = (krsRaw || []).map((kr: Record<string, unknown>) => ({
    ...kr,
    objective_name: (kr.objectives as { name: string } | null)?.name,
    plan_id: (kr.objectives as { plan_id: string } | null)?.plan_id,
  })) as SearchResults["annualKrs"];

  const tasks = (tasksRaw || []).map((task: Record<string, unknown>) => ({
    ...task,
    objective_name: (task.objectives as { name: string } | null)?.name,
    kr_name: (task.annual_krs as { name: string } | null)?.name,
  })) as SearchResults["tasks"];

  return { objectives, annualKrs, tasks };
}

/**
 * Global search across all user's plans
 * Uses ILIKE for simple pattern matching
 */
export async function searchGlobal(
  query: string,
  limit: number = 5
): Promise<SearchResults> {
  const supabase = createClient();
  const searchPattern = `%${query}%`;

  // Search objectives (will be RLS-filtered to user's plans)
  const objectivesPromise = handleSupabaseError(
    supabase
      .from("objectives")
      .select("*, plans!inner(name)")
      .or(`name.ilike.${searchPattern},code.ilike.${searchPattern}`)
      .limit(limit)
  );

  // Search annual KRs
  const krsPromise = handleSupabaseError(
    supabase
      .from("annual_krs")
      .select("*, objectives!inner(name, plan_id, plans!inner(name))")
      .ilike("name", searchPattern)
      .limit(limit)
  );

  // Search tasks
  const tasksPromise = handleSupabaseError(
    supabase
      .from("tasks")
      .select("*, objectives(name), annual_krs(name)")
      .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .limit(limit)
  );

  const [objectivesRaw, krsRaw, tasksRaw] = await Promise.all([
    objectivesPromise,
    krsPromise,
    tasksPromise,
  ]);

  // Transform results
  const objectives = (objectivesRaw || []).map((obj: Record<string, unknown>) => ({
    ...obj,
    plan_name: (obj.plans as { name: string } | null)?.name,
  })) as SearchResults["objectives"];

  const annualKrs = (krsRaw || []).map((kr: Record<string, unknown>) => {
    const objectiveData = kr.objectives as { name: string; plan_id: string; plans?: { name: string } } | null;
    return {
      ...kr,
      objective_name: objectiveData?.name,
      plan_id: objectiveData?.plan_id || "",
    };
  }) as SearchResults["annualKrs"];

  const tasks = (tasksRaw || []).map((task: Record<string, unknown>) => ({
    ...task,
    objective_name: (task.objectives as { name: string } | null)?.name,
    kr_name: (task.annual_krs as { name: string } | null)?.name,
  })) as SearchResults["tasks"];

  return { objectives, annualKrs, tasks };
}
