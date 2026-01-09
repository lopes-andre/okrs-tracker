import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type { 
  ObjectiveWithKrs,
  AnnualKr,
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
  forecast: number;
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
      .order("occurred_at", { ascending: true }),
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
    query = query.gte("occurred_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("occurred_at", dateTo);
  }

  query = query.order("occurred_at", { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get task completion metrics
 */
export async function getTaskMetrics(planId: string): Promise<TaskMetrics> {
  const supabase = createClient();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("plan_id", planId);

  if (error) throw error;

  const allTasks = tasks || [];
  const activeTasks = allTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const completedTasks = allTasks.filter((t) => t.status === "completed");
  const overdueTasks = activeTasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < now;
  });

  const completedThisWeek = completedTasks.filter((t) => {
    if (!t.completed_at) return false;
    return new Date(t.completed_at) >= weekStart;
  });

  const completedThisMonth = completedTasks.filter((t) => {
    if (!t.completed_at) return false;
    return new Date(t.completed_at) >= monthStart;
  });

  // Calculate average completion time
  let totalCompletionDays = 0;
  let completedWithDates = 0;
  completedTasks.forEach((t) => {
    if (t.completed_at && t.created_at) {
      const days = (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
      totalCompletionDays += days;
      completedWithDates++;
    }
  });

  const quickWins = completedTasks.filter((t) => 
    (t.priority === "high" || t.priority === "critical") && 
    (t.effort === "light" || t.effort === "medium")
  );

  const linkedTasks = allTasks.filter((t) => t.annual_kr_id || t.objective_id);

  return {
    totalActive: activeTasks.length,
    completedThisWeek: completedThisWeek.length,
    completedThisMonth: completedThisMonth.length,
    overdueCount: overdueTasks.length,
    avgCompletionDays: completedWithDates > 0 ? Math.round(totalCompletionDays / completedWithDates) : 0,
    quickWinsCompleted: quickWins.length,
    tasksLinkedToKrs: linkedTasks.filter((t) => t.annual_kr_id).length,
    orphanTasks: allTasks.length - linkedTasks.length,
  };
}

/**
 * Get productivity statistics from activity events
 */
export async function getProductivityStats(planId: string): Promise<ProductivityStats> {
  const supabase = createClient();

  // Get check-ins from the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Check-ins don't have plan_id directly - query via annual_krs relationship
  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select(`
      occurred_at,
      annual_krs!inner(
        objectives!inner(plan_id)
      )
    `)
    .eq("annual_krs.objectives.plan_id", planId)
    .gte("occurred_at", ninetyDaysAgo.toISOString())
    .order("occurred_at", { ascending: true });

  if (error) throw error;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const checkInsByDay: Record<string, number> = {
    Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0,
  };

  (checkIns || []).forEach((c) => {
    const day = dayNames[new Date(c.occurred_at).getDay()];
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
  const totalCheckIns = checkIns?.length || 0;
  const avgPerWeek = Math.round((totalCheckIns / 13) * 10) / 10;

  // Calculate current streak
  let streak = 0;
  if (checkIns && checkIns.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkInDates = new Set(
      checkIns.map((c) => new Date(c.occurred_at).toISOString().split("T")[0])
    );
    
    let currentDate = new Date(today);
    while (true) {
      const dateStr = currentDate.toISOString().split("T")[0];
      if (checkInDates.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    mostProductiveDay: maxDay,
    avgCheckInsPerWeek: avgPerWeek,
    currentStreak: streak,
    checkInsByDayOfWeek: checkInsByDay,
  };
}
