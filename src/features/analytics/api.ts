import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type {
  ObjectiveWithKrs,
  CheckIn,
  Task,
} from "@/lib/supabase/types";

// ============================================================================
// ANALYTICS DATA TYPES
// ============================================================================

export interface AnalyticsSummary {
  overallProgress: number;
  objectivesOnTrack: number;
  objectivesAtRisk: number;
  objectivesBehind: number;
  totalObjectives: number;
  krsCompleted: number;
  totalKrs: number;
  checkInsThisWeek: number;
  checkInsLastWeek: number;
  tasksCompletedThisWeek: number;
  tasksCompletedLastWeek: number;
}

export interface KrPerformanceRow {
  id: string;
  name: string;
  description: string | null;
  objectiveId: string;
  objectiveName: string;
  krType: string;
  direction: string;
  aggregation: string;
  unit: string | null;
  startValue: number;
  targetValue: number;
  currentValue: number;
  progress: number; // 0-1
  paceStatus: string;
  expectedValue: number;
  forecast: number | null;
  lastCheckInDate: string | null;
  checkInCount: number;
  trend: "up" | "down" | "stable";
}

export interface ChartDataPoint {
  date: string;
  value: number;
  target?: number;
  expected?: number;
}

export interface CheckInsByDay {
  date: string;
  count: number;
  totalValueChange: number;
}

export interface TaskMetrics {
  totalActive: number;
  completedThisWeek: number;
  completedThisMonth: number;
  overdueCount: number;
  avgCompletionDays: number;
  quickWinsCompleted: number;
  tasksLinkedToKrs: number;
  orphanTasks: number;
}

export interface ProductivityStats {
  mostProductiveDay: string;
  avgCheckInsPerWeek: number;
  currentStreak: number;
  checkInsByDayOfWeek: Record<string, number>;
}

// ============================================================================
// ANALYTICS API FUNCTIONS
// ============================================================================

/**
 * Get objectives with KRs and check-ins for analytics
 */
export async function getAnalyticsData(planId: string): Promise<{
  objectives: ObjectiveWithKrs[];
  checkIns: CheckIn[];
  tasks: Task[];
}> {
  const supabase = createClient();

  const [objectivesRes, checkInsRes, tasksRes] = await Promise.all([
    supabase
      .from("objectives")
      .select(`
        *,
        annual_krs(
          *,
          quarter_targets(*)
        )
      `)
      .eq("plan_id", planId)
      .order("sort_order", { ascending: true }),
    // Check-ins don't have plan_id directly - query via annual_krs relationship
    supabase
      .from("check_ins")
      .select(`
        *,
        annual_krs!inner(
          objectives!inner(plan_id)
        )
      `)
      .eq("annual_krs.objectives.plan_id", planId)
      .order("recorded_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("plan_id", planId),
  ]);

  if (objectivesRes.error) throw objectivesRes.error;
  if (checkInsRes.error) throw checkInsRes.error;
  if (tasksRes.error) throw tasksRes.error;

  return {
    objectives: objectivesRes.data || [],
    checkIns: checkInsRes.data || [],
    tasks: tasksRes.data || [],
  };
}

/**
 * Get check-ins aggregated by day using the view
 */
export async function getCheckInsByDay(
  planId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<CheckInsByDay[]> {
  const supabase = createClient();

  let query = supabase
    .from("v_plan_checkins_by_day")
    .select("*")
    .eq("plan_id", planId);

  if (dateFrom) {
    query = query.gte("check_in_date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("check_in_date", dateTo);
  }

  query = query.order("check_in_date", { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    date: row.check_in_date,
    count: row.check_in_count,
    totalValueChange: 0, // View doesn't track value change, just count
  }));
}

/**
 * Get check-ins for specific KRs within a date range
 */
export async function getKrCheckIns(
  krIds: string[],
  dateFrom?: string,
  dateTo?: string
): Promise<CheckIn[]> {
  const supabase = createClient();

  let query = supabase
    .from("check_ins")
    .select("*")
    .in("annual_kr_id", krIds);

  if (dateFrom) {
    query = query.gte("recorded_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("recorded_at", dateTo);
  }

  query = query.order("recorded_at", { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get task completion metrics.
 * Uses optimized RPC function for basic metrics, with additional client-side
 * calculations for time-sensitive data (this week/month).
 */
export async function getTaskMetrics(planId: string): Promise<TaskMetrics> {
  const supabase = createClient();

  // Use RPC for basic metrics (total counts, quick wins, overdue)
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_task_metrics", {
    p_plan_id: planId,
    p_start_date: null,
    p_end_date: null,
  });

  if (rpcError) throw rpcError;

  const metrics = rpcData?.[0] || {
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    overdue_tasks: 0,
    quick_wins: 0,
  };

  // For time-sensitive metrics (this week/month), query completed tasks
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: completedTasks, error: completedError } = await supabase
    .from("tasks")
    .select("completed_at, created_at, annual_kr_id, objective_id")
    .eq("plan_id", planId)
    .eq("status", "completed");

  if (completedError) throw completedError;

  const completed = completedTasks || [];
  const completedThisWeek = completed.filter((t) =>
    t.completed_at && new Date(t.completed_at) >= weekStart
  );
  const completedThisMonth = completed.filter((t) =>
    t.completed_at && new Date(t.completed_at) >= monthStart
  );

  // Calculate average completion time
  let totalCompletionDays = 0;
  let completedWithDates = 0;
  completed.forEach((t) => {
    if (t.completed_at && t.created_at) {
      const days = (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
      totalCompletionDays += days;
      completedWithDates++;
    }
  });

  // Count linked tasks
  const linkedCount = completed.filter((t) => t.annual_kr_id || t.objective_id).length;
  const krLinkedCount = completed.filter((t) => t.annual_kr_id).length;

  return {
    totalActive: Number(metrics.pending_tasks) + Number(metrics.in_progress_tasks),
    completedThisWeek: completedThisWeek.length,
    completedThisMonth: completedThisMonth.length,
    overdueCount: Number(metrics.overdue_tasks),
    avgCompletionDays: completedWithDates > 0 ? Math.round(totalCompletionDays / completedWithDates) : 0,
    quickWinsCompleted: Number(metrics.quick_wins),
    tasksLinkedToKrs: krLinkedCount,
    orphanTasks: Number(metrics.total_tasks) - linkedCount,
  };
}

/**
 * Get productivity statistics from activity events.
 * Uses optimized RPC function for streak calculation.
 */
export async function getProductivityStats(planId: string): Promise<ProductivityStats> {
  const supabase = createClient();

  // Get check-ins from the last 90 days for day-of-week analysis
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Run queries in parallel
  const [checkInsResult, streakResult] = await Promise.all([
    // Check-ins for day-of-week analysis
    supabase
      .from("check_ins")
      .select(`
        recorded_at,
        annual_krs!inner(
          objectives!inner(plan_id)
        )
      `)
      .eq("annual_krs.objectives.plan_id", planId)
      .gte("recorded_at", ninetyDaysAgo.toISOString())
      .order("recorded_at", { ascending: true }),
    // Use RPC for streak calculation
    supabase.rpc("get_checkin_streak", { p_plan_id: planId }),
  ]);

  if (checkInsResult.error) throw checkInsResult.error;
  if (streakResult.error) throw streakResult.error;

  const checkIns = checkInsResult.data || [];
  const streakData = streakResult.data?.[0] || { current_streak: 0, longest_streak: 0 };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const checkInsByDay: Record<string, number> = {
    Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0,
  };

  checkIns.forEach((c) => {
    const day = dayNames[new Date(c.recorded_at).getDay()];
    checkInsByDay[day]++;
  });

  // Find most productive day
  let maxDay = "Monday";
  let maxCount = 0;
  Object.entries(checkInsByDay).forEach(([day, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxDay = day;
    }
  });

  // Calculate average per week (over 13 weeks = ~90 days)
  const totalCheckIns = checkIns.length;
  const avgPerWeek = Math.round((totalCheckIns / 13) * 10) / 10;

  return {
    mostProductiveDay: maxDay,
    avgCheckInsPerWeek: avgPerWeek,
    currentStreak: Number(streakData.current_streak),
    checkInsByDayOfWeek: checkInsByDay,
  };
}
