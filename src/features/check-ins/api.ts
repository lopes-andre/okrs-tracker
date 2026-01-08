import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { 
  handleSupabaseError, 
  getPaginationRange,
  createPaginatedResult,
  type PaginatedResult,
} from "@/lib/api-utils";
import type {
  CheckIn,
  CheckInInsert,
  CheckInUpdate,
  CheckInWithDetails,
  CheckInFilters,
} from "@/lib/supabase/types";

// ============================================================================
// CHECK-INS API
// ============================================================================

/**
 * Get check-ins for a plan with optional filters
 */
export async function getCheckIns(
  planId: string,
  filters?: CheckInFilters
): Promise<CheckIn[]> {
  const supabase = createClient();

  let query = supabase
    .from("check_ins")
    .select(`
      *,
      annual_krs!inner(
        objectives!inner(plan_id)
      )
    `)
    .eq("annual_krs.objectives.plan_id", planId);

  if (filters?.annual_kr_id) {
    query = query.eq("annual_kr_id", filters.annual_kr_id);
  }

  if (filters?.quarter_target_id) {
    query = query.eq("quarter_target_id", filters.quarter_target_id);
  }

  if (filters?.recorded_by) {
    query = query.eq("recorded_by", filters.recorded_by);
  }

  if (filters?.date_from) {
    query = query.gte("recorded_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("recorded_at", filters.date_to);
  }

  query = query.order("recorded_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get check-ins with user and KR details
 */
export async function getCheckInsWithDetails(
  planId: string,
  filters?: CheckInFilters
): Promise<CheckInWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from("check_ins")
    .select(`
      *,
      annual_kr:annual_krs!inner(
        *,
        objectives!inner(plan_id, code, name)
      ),
      recorded_by_user:profiles(*)
    `)
    .eq("annual_krs.objectives.plan_id", planId);

  if (filters?.annual_kr_id) {
    query = query.eq("annual_kr_id", filters.annual_kr_id);
  }

  if (filters?.date_from) {
    query = query.gte("recorded_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("recorded_at", filters.date_to);
  }

  query = query.order("recorded_at", { ascending: false });

  return handleSupabaseError(query);
}

/**
 * Get check-ins for a specific KR
 */
export async function getCheckInsByKr(annualKrId: string): Promise<CheckIn[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("check_ins")
      .select("*")
      .eq("annual_kr_id", annualKrId)
      .order("recorded_at", { ascending: false })
  );
}

/**
 * Get recent check-ins for a plan
 */
export async function getRecentCheckIns(
  planId: string,
  limit: number = 10
): Promise<CheckInWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("check_ins")
    .select(`
      *,
      annual_kr:annual_krs!inner(
        *,
        objectives!inner(plan_id, code, name)
      ),
      recorded_by_user:profiles(*)
    `)
    .eq("annual_krs.objectives.plan_id", planId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get paginated check-ins
 */
export async function getCheckInsPaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: CheckInFilters
): Promise<PaginatedResult<CheckInWithDetails>> {
  const supabase = createClient();
  const { from, to } = getPaginationRange(page, limit);

  let query = supabase
    .from("check_ins")
    .select(`
      *,
      annual_kr:annual_krs!inner(
        *,
        objectives!inner(plan_id)
      ),
      recorded_by_user:profiles(*)
    `, { count: "exact" })
    .eq("annual_krs.objectives.plan_id", planId);

  if (filters?.annual_kr_id) {
    query = query.eq("annual_kr_id", filters.annual_kr_id);
  }

  if (filters?.date_from) {
    query = query.gte("recorded_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("recorded_at", filters.date_to);
  }

  query = query
    .order("recorded_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return createPaginatedResult(data || [], count || 0, page, limit);
}

/**
 * Get check-ins aggregated by day (from view)
 */
export async function getCheckInsByDay(planId: string): Promise<{
  date: string;
  check_in_count: number;
  total_value_change: number;
}[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("v_plan_checkins_by_day")
      .select("*")
      .eq("plan_id", planId)
      .order("date", { ascending: false })
  );
}

/**
 * Create a check-in (records progress update)
 */
export async function createCheckIn(checkIn: CheckInInsert): Promise<CheckIn> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return handleSupabaseError(
    supabase
      .from("check_ins")
      .insert({
        ...checkIn,
        recorded_by: user.id,
        recorded_at: checkIn.recorded_at || new Date().toISOString(),
      })
      .select()
      .single()
  );
}

/**
 * Quick check-in: update a KR's current value
 */
export async function quickCheckIn(
  annualKrId: string,
  value: number,
  note?: string,
  evidenceUrl?: string,
  quarterTargetId?: string
): Promise<CheckIn> {
  return createCheckIn({
    annual_kr_id: annualKrId,
    value,
    note: note || null,
    evidence_url: evidenceUrl || null,
    quarter_target_id: quarterTargetId || null,
    recorded_at: new Date().toISOString(),
    recorded_by: "", // Will be set by createCheckIn
  });
}

/**
 * Update a check-in (only note and evidence can be updated)
 */
export async function updateCheckIn(
  checkInId: string,
  updates: CheckInUpdate
): Promise<CheckIn> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("check_ins")
      .update(updates)
      .eq("id", checkInId)
      .select()
      .single()
  );
}
