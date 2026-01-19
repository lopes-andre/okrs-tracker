// ============================================================================
// ZOD VALIDATION SCHEMAS - For import validation
// ============================================================================

import { z } from "zod";
import { EXPORT_SCHEMA_VERSION } from "./types";

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

const krTypeSchema = z.enum(["metric", "count", "milestone", "rate", "average"]);
const krDirectionSchema = z.enum(["increase", "decrease", "maintain"]);
const krAggregationSchema = z.enum(["reset_quarterly", "cumulative"]);
const taskStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);
const taskPrioritySchema = z.enum(["low", "medium", "high"]);
const taskEffortSchema = z.enum(["light", "moderate", "heavy"]);
const tagKindSchema = z.enum(["platform", "funnel_stage", "initiative", "category", "custom"]);
const weeklyReviewStatusSchema = z.enum(["open", "pending", "late", "complete"]);
const quarterSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

// ============================================================================
// ENTITY SCHEMAS
// ============================================================================

export const exportMetadataSchema = z.object({
  version: z.literal(EXPORT_SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  planId: z.string().uuid(),
  planName: z.string().min(1),
  planYear: z.number().int().min(2020).max(2100),
  exportedBy: z.string().email(),
});

export const exportPlanSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  description: z.string().nullable(),
});

export const exportTagSchema = z.object({
  _exportId: z.string().min(1),
  name: z.string().min(1),
  kind: tagKindSchema,
  color: z.string().nullable(),
});

export const exportKrGroupSchema = z.object({
  _exportId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  color: z.string().nullable(),
  sortOrder: z.number().int().min(0),
});

export const exportQuarterTargetSchema = z.object({
  _exportId: z.string().min(1),
  quarter: quarterSchema,
  targetValue: z.number(),
  currentValue: z.number(),
  notes: z.string().nullable(),
});

export const exportAnnualKrSchema = z.object({
  _exportId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  krType: krTypeSchema,
  direction: krDirectionSchema,
  aggregation: krAggregationSchema,
  unit: z.string().nullable(),
  startValue: z.number(),
  targetValue: z.number(),
  currentValue: z.number(),
  sortOrder: z.number().int().min(0),
  groupRef: z.string().nullable(),
  quarterTargets: z.array(exportQuarterTargetSchema),
});

export const exportObjectiveSchema = z.object({
  _exportId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  sortOrder: z.number().int().min(0),
  annualKrs: z.array(exportAnnualKrSchema),
});

export const exportTaskSchema = z.object({
  _exportId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  effort: taskEffortSchema,
  dueDate: z.string().nullable(),
  dueTime: z.string().nullable(),
  completedAt: z.string().nullable(),
  sortOrder: z.number().int().min(0),
  objectiveRef: z.string().nullable(),
  annualKrRef: z.string().nullable(),
  quarterTargetRef: z.string().nullable(),
  tagRefs: z.array(z.string()),
});

export const exportCheckInSchema = z.object({
  _exportId: z.string().min(1),
  annualKrRef: z.string().min(1),
  quarterTargetRef: z.string().nullable(),
  value: z.number(),
  previousValue: z.number().nullable(),
  note: z.string().nullable(),
  evidenceUrl: z.string().url().nullable().or(z.literal("")),
  recordedAt: z.string(),
});

export const exportWeeklyReviewSchema = z.object({
  _exportId: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  weekNumber: z.number().int().min(1).max(53),
  weekStart: z.string(),
  weekEnd: z.string(),
  status: weeklyReviewStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  reflectionWhatWentWell: z.string().nullable(),
  reflectionWhatToImprove: z.string().nullable(),
  reflectionLessonsLearned: z.string().nullable(),
  reflectionNotes: z.string().nullable(),
  statsKrsUpdated: z.number().int().min(0),
  statsTasksCompleted: z.number().int().min(0),
  statsTasksCreated: z.number().int().min(0),
  statsCheckInsMade: z.number().int().min(0),
  statsObjectivesOnTrack: z.number().int().min(0),
  statsObjectivesAtRisk: z.number().int().min(0),
  statsObjectivesOffTrack: z.number().int().min(0),
  statsOverallProgress: z.number().min(0).max(100),
  statsTotalKrs: z.number().int().min(0),
  weekRating: z.number().int().min(1).max(5).nullable(),
});

// ============================================================================
// COMPLETE EXPORT SCHEMA
// ============================================================================

export const planExportSchema = z.object({
  metadata: exportMetadataSchema,
  plan: exportPlanSchema,
  tags: z.array(exportTagSchema),
  krGroups: z.array(exportKrGroupSchema),
  objectives: z.array(exportObjectiveSchema),
  tasks: z.array(exportTaskSchema),
  checkIns: z.array(exportCheckInSchema),
  weeklyReviews: z.array(exportWeeklyReviewSchema),
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export interface ValidationResult {
  success: boolean;
  data?: z.infer<typeof planExportSchema>;
  errors: string[];
  warnings: string[];
}

/**
 * Validate an import file and extract cross-reference validation warnings
 */
export function validateImportFile(data: unknown): ValidationResult {
  const result = planExportSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `${path}: ${issue.message}`;
    });
    return { success: false, errors, warnings: [] };
  }

  // Cross-reference validation
  const warnings: string[] = [];
  const parsed = result.data;

  // Collect all export IDs
  const tagIds = new Set(parsed.tags.map((t) => t._exportId));
  const groupIds = new Set(parsed.krGroups.map((g) => g._exportId));
  const objectiveIds = new Set(parsed.objectives.map((o) => o._exportId));
  const annualKrIds = new Set<string>();
  const quarterTargetIds = new Set<string>();

  // Collect nested IDs
  for (const obj of parsed.objectives) {
    for (const kr of obj.annualKrs) {
      annualKrIds.add(kr._exportId);
      for (const qt of kr.quarterTargets) {
        quarterTargetIds.add(qt._exportId);
      }
    }
  }

  // Validate KR group references
  for (const obj of parsed.objectives) {
    for (const kr of obj.annualKrs) {
      if (kr.groupRef && !groupIds.has(kr.groupRef)) {
        warnings.push(`KR "${kr.name}" references unknown group: ${kr.groupRef}`);
      }
    }
  }

  // Validate task references
  for (const task of parsed.tasks) {
    if (task.objectiveRef && !objectiveIds.has(task.objectiveRef)) {
      warnings.push(`Task "${task.title}" references unknown objective: ${task.objectiveRef}`);
    }
    if (task.annualKrRef && !annualKrIds.has(task.annualKrRef)) {
      warnings.push(`Task "${task.title}" references unknown KR: ${task.annualKrRef}`);
    }
    if (task.quarterTargetRef && !quarterTargetIds.has(task.quarterTargetRef)) {
      warnings.push(`Task "${task.title}" references unknown quarter target: ${task.quarterTargetRef}`);
    }
    for (const tagRef of task.tagRefs) {
      if (!tagIds.has(tagRef)) {
        warnings.push(`Task "${task.title}" references unknown tag: ${tagRef}`);
      }
    }
  }

  // Validate check-in references
  for (const checkIn of parsed.checkIns) {
    if (!annualKrIds.has(checkIn.annualKrRef)) {
      warnings.push(`Check-in references unknown KR: ${checkIn.annualKrRef}`);
    }
    if (checkIn.quarterTargetRef && !quarterTargetIds.has(checkIn.quarterTargetRef)) {
      warnings.push(`Check-in references unknown quarter target: ${checkIn.quarterTargetRef}`);
    }
  }

  return { success: true, data: parsed, errors: [], warnings };
}

/**
 * Count all entities in an export for preview
 */
export function countExportEntities(data: z.infer<typeof planExportSchema>) {
  let annualKrsCount = 0;
  let quarterTargetsCount = 0;

  for (const obj of data.objectives) {
    annualKrsCount += obj.annualKrs.length;
    for (const kr of obj.annualKrs) {
      quarterTargetsCount += kr.quarterTargets.length;
    }
  }

  return {
    tags: data.tags.length,
    krGroups: data.krGroups.length,
    objectives: data.objectives.length,
    annualKrs: annualKrsCount,
    quarterTargets: quarterTargetsCount,
    tasks: data.tasks.length,
    checkIns: data.checkIns.length,
    weeklyReviews: data.weeklyReviews.length,
  };
}
