import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type {
  MemberWorkloadStats,
  MemberContributionByPeriod,
  TeamSummaryMetrics,
} from "@/lib/supabase/types";

/**
 * Get workload statistics for all plan members
 */
export async function getMemberWorkloadStats(
  planId: string
): Promise<MemberWorkloadStats[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_member_workload_stats", {
    p_plan_id: planId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get daily contribution breakdown for plan members
 */
export async function getMemberContributions(
  planId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MemberContributionByPeriod[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_member_contributions_by_period", {
    p_plan_id: planId,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Compute team summary metrics from workload stats
 * This is done client-side to avoid another DB round trip
 */
export function computeTeamSummary(
  workloadStats: MemberWorkloadStats[]
): TeamSummaryMetrics {
  if (workloadStats.length === 0) {
    return {
      total_members: 0,
      active_members: 0,
      total_tasks_assigned: 0,
      avg_tasks_per_member: 0,
      workload_balance_score: 100,
      overloaded_members: 0,
      underutilized_members: 0,
      total_check_ins: 0,
    };
  }

  const totalMembers = workloadStats.length;
  const totalTasks = workloadStats.reduce((sum, m) => sum + m.tasks_assigned, 0);
  const totalCheckIns = workloadStats.reduce((sum, m) => sum + m.check_ins_made, 0);
  const avgTasksPerMember = totalMembers > 0 ? totalTasks / totalMembers : 0;

  // Active members: those with any activity in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeMembers = workloadStats.filter((m) => {
    if (!m.last_activity_at) return false;
    return new Date(m.last_activity_at) >= thirtyDaysAgo;
  }).length;

  // Calculate workload balance score
  // Based on coefficient of variation (lower is better, more balanced)
  let workloadBalanceScore = 100;
  let overloadedMembers = 0;
  let underutilizedMembers = 0;

  if (totalTasks > 0 && totalMembers > 1) {
    const taskCounts = workloadStats.map((m) => m.tasks_assigned);
    const mean = avgTasksPerMember;
    const variance = taskCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / totalMembers;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Convert CV to a 0-100 score (CV of 0 = 100, CV of 1+ = 0)
    workloadBalanceScore = Math.max(0, Math.round((1 - Math.min(cv, 1)) * 100));

    // Count overloaded (>150% of average) and underutilized (<50% of average)
    const overloadThreshold = avgTasksPerMember * 1.5;
    const underutilizedThreshold = avgTasksPerMember * 0.5;

    overloadedMembers = workloadStats.filter((m) => m.tasks_assigned > overloadThreshold).length;
    underutilizedMembers = workloadStats.filter(
      (m) => m.tasks_assigned < underutilizedThreshold && m.tasks_assigned > 0
    ).length;
  }

  return {
    total_members: totalMembers,
    active_members: activeMembers,
    total_tasks_assigned: totalTasks,
    avg_tasks_per_member: Math.round(avgTasksPerMember * 10) / 10,
    workload_balance_score: workloadBalanceScore,
    overloaded_members: overloadedMembers,
    underutilized_members: underutilizedMembers,
    total_check_ins: totalCheckIns,
  };
}
