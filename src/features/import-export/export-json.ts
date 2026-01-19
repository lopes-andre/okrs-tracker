// ============================================================================
// JSON EXPORT - Export plan data to JSON format
// ============================================================================

import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type {
  PlanExport,
  ExportMetadata,
  ExportPlan,
  ExportTag,
  ExportKrGroup,
  ExportObjective,
  ExportAnnualKr,
  ExportQuarterTarget,
  ExportTask,
  ExportCheckIn,
  ExportWeeklyReview,
  EXPORT_SCHEMA_VERSION,
} from "./types";
import type {
  Plan,
  Tag,
  KrGroup,
  Objective,
  AnnualKr,
  QuarterTarget,
  Task,
  CheckIn,
  WeeklyReview,
} from "@/lib/supabase/types";

// ============================================================================
// ID GENERATION
// ============================================================================

function generateExportId(prefix: string, index: number): string {
  return `${prefix}_${(index + 1).toString().padStart(4, "0")}`;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

interface PlanData {
  plan: Plan;
  tags: Tag[];
  krGroups: KrGroup[];
  objectives: Objective[];
  annualKrs: AnnualKr[];
  quarterTargets: QuarterTarget[];
  tasks: Task[];
  taskTags: { task_id: string; tag_id: string }[];
  checkIns: CheckIn[];
  weeklyReviews: WeeklyReview[];
  userEmail: string;
}

async function fetchPlanData(planId: string): Promise<PlanData> {
  const supabase = createClient();

  // Fetch all data in parallel
  const [
    planResult,
    tagsResult,
    krGroupsResult,
    objectivesResult,
    annualKrsResult,
    quarterTargetsResult,
    tasksResult,
    taskTagsResult,
    checkInsResult,
    weeklyReviewsResult,
    userResult,
  ] = await Promise.all([
    supabase.from("plans").select("*").eq("id", planId).single(),
    supabase.from("tags").select("*").eq("plan_id", planId).order("name"),
    supabase.from("kr_groups").select("*").eq("plan_id", planId).order("sort_order"),
    supabase.from("objectives").select("*").eq("plan_id", planId).order("sort_order"),
    supabase.from("annual_krs").select("*, objectives!inner(plan_id)").eq("objectives.plan_id", planId),
    supabase.from("quarter_targets").select("*, annual_krs!inner(objectives!inner(plan_id))").eq("annual_krs.objectives.plan_id", planId),
    supabase.from("tasks").select("*").eq("plan_id", planId).order("sort_order"),
    supabase.from("task_tags").select("task_id, tag_id, tasks!inner(plan_id)").eq("tasks.plan_id", planId),
    supabase.from("check_ins").select("*, annual_krs!inner(objectives!inner(plan_id))").eq("annual_krs.objectives.plan_id", planId).order("recorded_at"),
    supabase.from("weekly_reviews").select("*").eq("plan_id", planId).order("week_start"),
    supabase.auth.getUser(),
  ]);

  if (planResult.error) throw new Error(`Failed to fetch plan: ${planResult.error.message}`);
  if (!planResult.data) throw new Error("Plan not found");

  return {
    plan: planResult.data,
    tags: tagsResult.data || [],
    krGroups: krGroupsResult.data || [],
    objectives: objectivesResult.data || [],
    annualKrs: annualKrsResult.data || [],
    quarterTargets: quarterTargetsResult.data || [],
    tasks: tasksResult.data || [],
    taskTags: taskTagsResult.data || [],
    checkIns: checkInsResult.data || [],
    weeklyReviews: weeklyReviewsResult.data || [],
    userEmail: userResult.data?.user?.email || "unknown",
  };
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function transformTag(tag: Tag, index: number): ExportTag {
  return {
    _exportId: generateExportId("tag", index),
    name: tag.name,
    kind: tag.kind,
    color: tag.color,
  };
}

function transformKrGroup(group: KrGroup, index: number): ExportKrGroup {
  return {
    _exportId: generateExportId("grp", index),
    name: group.name,
    description: group.description,
    color: group.color,
    sortOrder: group.sort_order,
  };
}

function transformQuarterTarget(
  qt: QuarterTarget,
  index: number
): ExportQuarterTarget {
  return {
    _exportId: generateExportId("qt", index),
    quarter: qt.quarter,
    targetValue: qt.target_value,
    currentValue: qt.current_value,
    notes: qt.notes,
  };
}

function transformAnnualKr(
  kr: AnnualKr,
  index: number,
  quarterTargets: QuarterTarget[],
  groupIdMap: Map<string, string>,
  qtStartIndex: number
): { kr: ExportAnnualKr; qtCount: number } {
  const krQuarterTargets = quarterTargets
    .filter((qt) => qt.annual_kr_id === kr.id)
    .sort((a, b) => a.quarter - b.quarter);

  return {
    kr: {
      _exportId: generateExportId("kr", index),
      name: kr.name,
      description: kr.description,
      krType: kr.kr_type,
      direction: kr.direction,
      aggregation: kr.aggregation,
      unit: kr.unit,
      startValue: kr.start_value,
      targetValue: kr.target_value,
      currentValue: kr.current_value,
      sortOrder: kr.sort_order,
      groupRef: kr.group_id ? groupIdMap.get(kr.group_id) || null : null,
      quarterTargets: krQuarterTargets.map((qt, qtIdx) =>
        transformQuarterTarget(qt, qtStartIndex + qtIdx)
      ),
    },
    qtCount: krQuarterTargets.length,
  };
}

function transformObjective(
  objective: Objective,
  index: number,
  annualKrs: AnnualKr[],
  quarterTargets: QuarterTarget[],
  groupIdMap: Map<string, string>,
  krStartIndex: number,
  qtStartIndex: number
): { objective: ExportObjective; krCount: number; qtCount: number } {
  const objectiveKrs = annualKrs
    .filter((kr) => kr.objective_id === objective.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  let currentQtIndex = qtStartIndex;
  const exportKrs: ExportAnnualKr[] = [];

  for (let i = 0; i < objectiveKrs.length; i++) {
    const { kr, qtCount } = transformAnnualKr(
      objectiveKrs[i],
      krStartIndex + i,
      quarterTargets,
      groupIdMap,
      currentQtIndex
    );
    exportKrs.push(kr);
    currentQtIndex += qtCount;
  }

  return {
    objective: {
      _exportId: generateExportId("obj", index),
      code: objective.code,
      name: objective.name,
      description: objective.description,
      sortOrder: objective.sort_order,
      annualKrs: exportKrs,
    },
    krCount: objectiveKrs.length,
    qtCount: currentQtIndex - qtStartIndex,
  };
}

function transformTask(
  task: Task,
  index: number,
  taskTagIds: string[],
  objectiveIdMap: Map<string, string>,
  krIdMap: Map<string, string>,
  qtIdMap: Map<string, string>,
  tagIdMap: Map<string, string>
): ExportTask {
  return {
    _exportId: generateExportId("task", index),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    effort: task.effort,
    dueDate: task.due_date,
    dueTime: task.due_time,
    completedAt: task.completed_at,
    sortOrder: task.sort_order,
    objectiveRef: task.objective_id ? objectiveIdMap.get(task.objective_id) || null : null,
    annualKrRef: task.annual_kr_id ? krIdMap.get(task.annual_kr_id) || null : null,
    quarterTargetRef: task.quarter_target_id ? qtIdMap.get(task.quarter_target_id) || null : null,
    tagRefs: taskTagIds
      .map((tagId) => tagIdMap.get(tagId))
      .filter((id): id is string => id !== undefined),
  };
}

function transformCheckIn(
  checkIn: CheckIn,
  index: number,
  krIdMap: Map<string, string>,
  qtIdMap: Map<string, string>
): ExportCheckIn | null {
  const krRef = krIdMap.get(checkIn.annual_kr_id);
  if (!krRef) return null; // Skip if KR not found

  return {
    _exportId: generateExportId("ci", index),
    annualKrRef: krRef,
    quarterTargetRef: checkIn.quarter_target_id
      ? qtIdMap.get(checkIn.quarter_target_id) || null
      : null,
    value: checkIn.value,
    previousValue: checkIn.previous_value,
    note: checkIn.note,
    evidenceUrl: checkIn.evidence_url,
    recordedAt: checkIn.recorded_at,
  };
}

function transformWeeklyReview(
  review: WeeklyReview,
  index: number
): ExportWeeklyReview {
  return {
    _exportId: generateExportId("wr", index),
    year: review.year,
    weekNumber: review.week_number,
    weekStart: review.week_start,
    weekEnd: review.week_end,
    status: review.status,
    startedAt: review.started_at,
    completedAt: review.completed_at,
    reflectionWhatWentWell: review.reflection_what_went_well,
    reflectionWhatToImprove: review.reflection_what_to_improve,
    reflectionLessonsLearned: review.reflection_lessons_learned,
    reflectionNotes: review.reflection_notes,
    statsKrsUpdated: review.stats_krs_updated,
    statsTasksCompleted: review.stats_tasks_completed,
    statsTasksCreated: review.stats_tasks_created,
    statsCheckInsMade: review.stats_check_ins_made,
    statsObjectivesOnTrack: review.stats_objectives_on_track,
    statsObjectivesAtRisk: review.stats_objectives_at_risk,
    statsObjectivesOffTrack: review.stats_objectives_off_track,
    statsOverallProgress: review.stats_overall_progress,
    statsTotalKrs: review.stats_total_krs,
    weekRating: review.week_rating,
  };
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function exportPlanToJson(planId: string): Promise<PlanExport> {
  const data = await fetchPlanData(planId);

  // Build ID maps for references
  const tagIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();
  const objectiveIdMap = new Map<string, string>();
  const krIdMap = new Map<string, string>();
  const qtIdMap = new Map<string, string>();

  // Transform tags
  const exportTags = data.tags.map((tag, index) => {
    const exportTag = transformTag(tag, index);
    tagIdMap.set(tag.id, exportTag._exportId);
    return exportTag;
  });

  // Transform KR groups
  const exportGroups = data.krGroups.map((group, index) => {
    const exportGroup = transformKrGroup(group, index);
    groupIdMap.set(group.id, exportGroup._exportId);
    return exportGroup;
  });

  // Transform objectives with nested KRs and quarter targets
  let krIndex = 0;
  let qtIndex = 0;
  const exportObjectives: ExportObjective[] = [];

  for (let i = 0; i < data.objectives.length; i++) {
    const { objective, krCount, qtCount } = transformObjective(
      data.objectives[i],
      i,
      data.annualKrs,
      data.quarterTargets,
      groupIdMap,
      krIndex,
      qtIndex
    );

    // Build ID maps from transformed objective
    objectiveIdMap.set(data.objectives[i].id, objective._exportId);

    const objectiveKrs = data.annualKrs.filter(
      (kr) => kr.objective_id === data.objectives[i].id
    );
    for (let k = 0; k < objectiveKrs.length; k++) {
      const exportKr = objective.annualKrs[k];
      krIdMap.set(objectiveKrs[k].id, exportKr._exportId);

      const krQts = data.quarterTargets.filter(
        (qt) => qt.annual_kr_id === objectiveKrs[k].id
      );
      for (let q = 0; q < exportKr.quarterTargets.length; q++) {
        if (krQts[q]) {
          qtIdMap.set(krQts[q].id, exportKr.quarterTargets[q]._exportId);
        }
      }
    }

    exportObjectives.push(objective);
    krIndex += krCount;
    qtIndex += qtCount;
  }

  // Build task tag lookup
  const taskTagsLookup = new Map<string, string[]>();
  for (const tt of data.taskTags) {
    const existing = taskTagsLookup.get(tt.task_id) || [];
    existing.push(tt.tag_id);
    taskTagsLookup.set(tt.task_id, existing);
  }

  // Transform tasks
  const exportTasks = data.tasks.map((task, index) =>
    transformTask(
      task,
      index,
      taskTagsLookup.get(task.id) || [],
      objectiveIdMap,
      krIdMap,
      qtIdMap,
      tagIdMap
    )
  );

  // Transform check-ins
  const exportCheckIns = data.checkIns
    .map((checkIn, index) => transformCheckIn(checkIn, index, krIdMap, qtIdMap))
    .filter((ci): ci is ExportCheckIn => ci !== null);

  // Transform weekly reviews
  const exportWeeklyReviews = data.weeklyReviews.map((review, index) =>
    transformWeeklyReview(review, index)
  );

  // Build metadata
  const metadata: ExportMetadata = {
    version: "1.0" as typeof EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    planId: data.plan.id,
    planName: data.plan.name,
    planYear: data.plan.year,
    exportedBy: data.userEmail,
  };

  // Build plan
  const plan: ExportPlan = {
    name: data.plan.name,
    year: data.plan.year,
    description: data.plan.description,
  };

  return {
    metadata,
    plan,
    tags: exportTags,
    krGroups: exportGroups,
    objectives: exportObjectives,
    tasks: exportTasks,
    checkIns: exportCheckIns,
    weeklyReviews: exportWeeklyReviews,
  };
}

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================

export function downloadJsonExport(exportData: PlanExport): void {
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const filename = `${exportData.plan.name.replace(/[^a-zA-Z0-9-_]/g, "_")}_${exportData.plan.year}_export.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
