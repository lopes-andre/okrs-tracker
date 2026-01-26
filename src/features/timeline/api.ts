import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { 
  handleSupabaseError,
  getPaginationRange,
  createPaginatedResult,
  type PaginatedResult,
} from "@/lib/api-utils";
import type {
  ActivityEvent,
  ActivityEventWithUser,
  TimelineFilters,
} from "@/lib/supabase/types";

// ============================================================================
// TIMELINE / ACTIVITY EVENTS API
// ============================================================================

/**
 * Get activity events for a plan (from view with user info)
 */
export async function getTimeline(
  planId: string,
  filters?: TimelineFilters
): Promise<ActivityEventWithUser[]> {
  const supabase = createClient();

  let query = supabase
    .from("activity_events")
    .select(`
      *,
      user:profiles(*)
    `)
    .eq("plan_id", planId);

  // Apply filters
  if (filters?.entity_type) {
    const types = Array.isArray(filters.entity_type) ? filters.entity_type : [filters.entity_type];
    query = query.in("entity_type", types);
  }

  if (filters?.event_type) {
    const types = Array.isArray(filters.event_type) ? filters.event_type : [filters.event_type];
    query = query.in("event_type", types);
  }

  if (filters?.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  query = query.order("created_at", { ascending: false });

  return handleSupabaseError(query);
}

/**
 * Get recent activity events
 */
export async function getRecentActivity(
  planId: string,
  limit: number = 20
): Promise<ActivityEventWithUser[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("activity_events")
      .select(`
        *,
        user:profiles(*)
      `)
      .eq("plan_id", planId)
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

/**
 * Get paginated timeline
 */
export async function getTimelinePaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: TimelineFilters
): Promise<PaginatedResult<ActivityEventWithUser>> {
  const supabase = createClient();
  const { from, to } = getPaginationRange(page, limit);

  let query = supabase
    .from("activity_events")
    .select(`
      *,
      user:profiles(*)
    `, { count: "exact" })
    .eq("plan_id", planId);

  // Apply filters
  if (filters?.entity_type) {
    const types = Array.isArray(filters.entity_type) ? filters.entity_type : [filters.entity_type];
    query = query.in("entity_type", types);
  }

  if (filters?.event_type) {
    const types = Array.isArray(filters.event_type) ? filters.event_type : [filters.event_type];
    query = query.in("event_type", types);
  }

  if (filters?.user_id) {
    query = query.eq("user_id", filters.user_id);
  }

  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return createPaginatedResult(data || [], count || 0, page, limit);
}

/**
 * Get activity for a specific entity
 */
export async function getEntityActivity(
  planId: string,
  entityType: string,
  entityId: string
): Promise<ActivityEvent[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("activity_events")
      .select("*")
      .eq("plan_id", planId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
  );
}

/**
 * Get activity grouped by date.
 * Uses optimized RPC function when date range is provided,
 * falls back to client-side grouping for flexibility with user data.
 */
export async function getActivityByDate(
  planId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ date: string; events: ActivityEventWithUser[] }[]> {
  const supabase = createClient();

  // If we have a date range, use the optimized RPC
  if (dateFrom && dateTo) {
    const { data, error } = await supabase.rpc("get_activity_by_date", {
      p_plan_id: planId,
      p_start_date: dateFrom,
      p_end_date: dateTo,
    });

    if (error) throw error;

    // RPC returns events as JSONB, need to fetch user info separately
    // For now, return basic event data - user info can be joined if needed
    return (data || []).map((row: { activity_date: string; events: ActivityEvent[] }) => ({
      date: row.activity_date,
      events: row.events as unknown as ActivityEventWithUser[],
    }));
  }

  // Fallback to client-side grouping when no date range (needs user joins)
  let query = supabase
    .from("activity_events")
    .select(`
      *,
      user:profiles(*)
    `)
    .eq("plan_id", planId);

  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }

  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  // Group by date
  const grouped = (data || []).reduce((acc, event) => {
    const date = event.created_at.split("T")[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, ActivityEventWithUser[]>);

  // Convert to array and sort by date descending
  return Object.entries(grouped)
    .map(([date, events]) => ({ date, events: events as ActivityEventWithUser[] }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get activity stats for a time period.
 * Uses optimized RPC function that performs SQL aggregation.
 */
export async function getActivityStats(
  planId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_entity: Record<string, number>;
  active_users: number;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_activity_stats", {
    p_plan_id: planId,
    p_start_date: dateFrom || null,
    p_end_date: dateTo || null,
  });

  if (error) throw error;

  // Convert RPC result to expected format
  const eventsByType: Record<string, number> = {};
  const eventsByEntity: Record<string, number> = {};
  let totalEvents = 0;

  for (const row of data || []) {
    const count = Number(row.event_count);
    totalEvents += count;
    eventsByType[row.event_type] = (eventsByType[row.event_type] || 0) + count;
    eventsByEntity[row.entity_type] = (eventsByEntity[row.entity_type] || 0) + count;
  }

  // Note: active_users count requires a separate query since the RPC groups by type
  // For now, return 0 - this could be enhanced if needed
  return {
    total_events: totalEvents,
    events_by_type: eventsByType,
    events_by_entity: eventsByEntity,
    active_users: 0,
  };
}
