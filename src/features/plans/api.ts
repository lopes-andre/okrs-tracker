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

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("plan_members")
    .select("role")
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data?.role as OkrRole | null;
}

/**
 * Create a new plan
 * Note: A database trigger automatically adds the creator as owner in plan_members
 */
export async function createPlan(plan: Omit<PlanInsert, "created_by">): Promise<Plan> {
  const supabase = createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) throw new Error("Authentication failed");
  if (!user) throw new Error("Not authenticated");

  // Create the plan (trigger handles adding creator as owner)
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

/**
 * Get pending invites for the current user's email
 */
export async function getMyPendingInvites(): Promise<(PlanInvite & { plan: Plan })[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("plan_invites")
    .select(`
      *,
      plan:plans(*)
    `)
    .eq("email", user.email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Accept a plan invite (creates membership, marks as accepted)
 */
export async function acceptPlanInvite(inviteId: string): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from("plan_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (inviteError) throw inviteError;
  if (!invite) throw new Error("Invite not found");

  // Create membership
  const { error: memberError } = await supabase
    .from("plan_members")
    .insert({
      plan_id: invite.plan_id,
      user_id: user.id,
      role: invite.role,
    });

  if (memberError) throw memberError;

  // Mark invite as accepted
  const { error: updateError } = await supabase
    .from("plan_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (updateError) throw updateError;
}

/**
 * Decline a plan invite (just deletes it)
 */
export async function declinePlanInvite(inviteId: string): Promise<void> {
  await deletePlanInvite(inviteId);
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

// ============================================================================
// CURRENT USER
// ============================================================================

/**
 * Get the current authenticated user's ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
