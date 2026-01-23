import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { queryKeys } from "@/lib/query-client";
import type { RealtimeTable, RealtimeEventType } from "./types";

type PayloadData = Record<string, unknown>;
type QueryKey = readonly unknown[];

/**
 * Maps real-time database events to React Query cache keys that need invalidation.
 * This ensures the UI stays in sync when data changes from other users.
 */
export function getQueryKeysToInvalidate(
  table: RealtimeTable,
  eventType: RealtimeEventType,
  payload: RealtimePostgresChangesPayload<PayloadData>,
  planId: string
): QueryKey[] {
  const newRecord = payload.new as PayloadData | null;
  const oldRecord = payload.old as PayloadData | null;
  const record = newRecord || oldRecord;

  switch (table) {
    case "objectives":
      return [
        queryKeys.objectives.list(planId),
        queryKeys.objectives.withKrs(planId),
        // If we have the specific objective ID, invalidate its detail too
        ...(record?.id ? [queryKeys.objectives.detail(record.id as string)] : []),
      ];

    case "annual_krs":
      return [
        queryKeys.annualKrs.list(planId),
        queryKeys.objectives.withKrs(planId),
        // Specific KR detail
        ...(record?.id ? [queryKeys.annualKrs.detail(record.id as string)] : []),
        // KRs by objective
        ...(record?.objective_id
          ? [queryKeys.annualKrs.byObjective(record.objective_id as string)]
          : []),
      ];

    case "quarter_targets":
      return [
        queryKeys.quarterTargets.list(planId),
        // By specific KR
        ...(record?.annual_kr_id
          ? [queryKeys.quarterTargets.byKr(record.annual_kr_id as string)]
          : []),
        // Also invalidate KR detail since quarter targets affect it
        ...(record?.annual_kr_id
          ? [queryKeys.annualKrs.detail(record.annual_kr_id as string)]
          : []),
      ];

    case "tasks":
      return [
        queryKeys.tasks.all, // Invalidate all task queries for this plan
        // Specific task detail
        ...(record?.id ? [queryKeys.tasks.detail(record.id as string)] : []),
        // Tasks by objective
        ...(record?.objective_id
          ? [queryKeys.tasks.byObjective(record.objective_id as string)]
          : []),
        // Tasks by quarter target
        ...(record?.quarter_target_id
          ? [queryKeys.tasks.byQuarterTarget(record.quarter_target_id as string)]
          : []),
        // Plan stats may be affected
        queryKeys.plans.stats(planId),
      ];

    case "check_ins":
      return [
        queryKeys.checkIns.all, // All check-in queries
        // Check-ins by KR
        ...(record?.annual_kr_id
          ? [
              queryKeys.checkIns.byKr(record.annual_kr_id as string),
              // KR detail needs refresh for current_value
              queryKeys.annualKrs.detail(record.annual_kr_id as string),
            ]
          : []),
        // Recent check-ins
        queryKeys.checkIns.recent(planId),
        // Objectives progress may change
        queryKeys.objectives.withKrs(planId),
      ];

    case "plan_members":
      return [
        queryKeys.plans.members(planId),
        queryKeys.plans.role(planId),
      ];

    case "activity_events":
      return [
        queryKeys.timeline.all, // All timeline queries
        queryKeys.timeline.recent(planId),
      ];

    case "dashboards":
      return [
        queryKeys.dashboards.list(planId),
        ...(record?.id ? [queryKeys.dashboards.detail(record.id as string)] : []),
      ];

    case "dashboard_widgets":
      return [
        // Widget changes need to refresh the dashboard
        ...(record?.dashboard_id
          ? [
              queryKeys.dashboards.widgets(record.dashboard_id as string),
              queryKeys.dashboards.detail(record.dashboard_id as string),
            ]
          : []),
      ];

    case "tags":
      return [
        queryKeys.tags.list(planId),
        queryKeys.tags.withUsage(planId),
      ];

    case "weekly_reviews":
      return [
        // Weekly reviews queries would go here
        // For now, just return empty as there's no specific key
      ];

    default:
      return [];
  }
}

/**
 * Tables that should be subscribed to for real-time updates.
 * Ordered by priority/frequency of updates.
 */
export const DEFAULT_REALTIME_TABLES: RealtimeTable[] = [
  "tasks",
  "check_ins",
  "annual_krs",
  "quarter_targets",
  "objectives",
  "activity_events",
  "plan_members",
  "dashboards",
  "dashboard_widgets",
  "tags",
];
