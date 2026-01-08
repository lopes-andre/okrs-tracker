import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError, handleSupabaseQuery } from "@/lib/api-utils";
import type {
  Plan,
  PlanInsert,
  PlanUpdate,
  PlanWithMembership,
  PlanMember,
  PlanMemberWithProfile,
  PlanInvite,
  OkrRole,
} from "@/lib/supabase/types";

// ============================================================================
// PLANS API
// ============================================================================

/**
 * Get all plans the current user has access to
 */
export async function getPlans(): Promise<PlanWithMembership[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("plans")
    .select(`
      *,
      plan_members!inner(role)
    `)
    .order("year", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;

  // Transform to include role at top level
  return (data || []).map((plan) => ({
    ...plan,
    role: plan.plan_members[0]?.role as OkrRole,
    plan_members: undefined,
  })) as PlanWithMembership[];
}

/**
 * Get a single plan by ID
 */
export async function getPlan(planId: string): Promise<Plan | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single()
  );
}

/**
 * Get the current user's role for a plan
 */
export async function getPlanRole(planId: string): Promise<OkrRole | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("plan_members")
    .select("role")
    .eq("plan_id", planId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data?.role as OkrRole | null;
}

/**
 * Create a new plan
 */
export async function createPlan(plan: Omit<PlanInsert, "created_by">): Promise<Plan> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return handleSupabaseError(
    supabase
      .from("plans")
      .insert({ ...plan, created_by: user.id })
      .select()
      .single()
  );
}

/**
 * Update a plan
 */
export async function updatePlan(planId: string, updates: PlanUpdate): Promise<Plan> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("plans")
      .update(updates)
      .eq("id", planId)
      .select()
      .single()
  );
}

/**
 * Delete a plan
 */
export async function deletePlan(planId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("id", planId);

  if (error) throw error;
}

// ============================================================================
// PLAN MEMBERS API
// ============================================================================

/**
 * Get all members of a plan
 */
export async function getPlanMembers(planId: string): Promise<PlanMemberWithProfile[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("plan_members")
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq("plan_id", planId)
      .order("created_at", { ascending: true })
  );
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  planId: string,
  userId: string,
  role: OkrRole
): Promise<PlanMember> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("plan_members")
      .update({ role })
      .eq("plan_id", planId)
      .eq("user_id", userId)
      .select()
      .single()
  );
}

/**
 * Remove a member from a plan
 */
export async function removePlanMember(planId: string, userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("plan_members")
    .delete()
    .eq("plan_id", planId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Leave a plan (remove yourself)
 */
export async function leavePlan(planId: string): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("plan_members")
    .delete()
    .eq("plan_id", planId)
    .eq("user_id", user.id);

  if (error) throw error;
}

// ============================================================================
// PLAN INVITES API
// ============================================================================

/**
 * Get pending invites for a plan
 */
export async function getPlanInvites(planId: string): Promise<PlanInvite[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("plan_invites")
      .select("*")
      .eq("plan_id", planId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
  );
}

/**
 * Create an invite
 */
export async function createPlanInvite(
  planId: string,
  email: string,
  role: OkrRole = "viewer"
): Promise<PlanInvite> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return handleSupabaseError(
    supabase
      .from("plan_invites")
      .insert({
        plan_id: planId,
        email,
        role,
        invited_by: user.id,
      })
      .select()
      .single()
  );
}

/**
 * Delete an invite
 */
export async function deletePlanInvite(inviteId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("plan_invites")
    .delete()
    .eq("id", inviteId);

  if (error) throw error;
}

// ============================================================================
// PLAN STATS
// ============================================================================

/**
 * Get plan statistics from the view
 */
export async function getPlanStats(planId: string): Promise<{
  objective_count: number;
  kr_count: number;
  task_count: number;
  completed_task_count: number;
  check_in_count: number;
} | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("v_plan_stats")
    .select("*")
    .eq("plan_id", planId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}
