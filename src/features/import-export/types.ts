// ============================================================================
// IMPORT/EXPORT TYPES - Schema version 1.0
// ============================================================================

import type {
  KrType,
  KrDirection,
  KrAggregation,
  TaskStatus,
  TaskPriority,
  TaskEffort,
  TagKind,
  WeeklyReviewStatus,
} from "@/lib/supabase/types";

// ============================================================================
// EXPORT SCHEMA VERSION
// ============================================================================

export const EXPORT_SCHEMA_VERSION = "1.0" as const;

// ============================================================================
// METADATA
// ============================================================================

export interface ExportMetadata {
  version: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string; // ISO datetime
  planId: string;
  planName: string;
  planYear: number;
  exportedBy: string; // User email
}

// ============================================================================
// EXPORTED ENTITIES
// ============================================================================

export interface ExportPlan {
  name: string;
  year: number;
  description: string | null;
}

export interface ExportTag {
  _exportId: string;
  name: string;
  kind: TagKind;
  color: string | null;
}

export interface ExportKrGroup {
  _exportId: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
}

export interface ExportQuarterTarget {
  _exportId: string;
  quarter: 1 | 2 | 3 | 4;
  targetValue: number;
  currentValue: number;
  notes: string | null;
}

export interface ExportAnnualKr {
  _exportId: string;
  name: string;
  description: string | null;
  krType: KrType;
  direction: KrDirection;
  aggregation: KrAggregation;
  unit: string | null;
  startValue: number;
  targetValue: number;
  currentValue: number;
  sortOrder: number;
  groupRef: string | null; // Reference to ExportKrGroup._exportId
  quarterTargets: ExportQuarterTarget[];
}

export interface ExportObjective {
  _exportId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  annualKrs: ExportAnnualKr[];
}

export interface ExportTask {
  _exportId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  effort: TaskEffort;
  dueDate: string | null;
  dueTime: string | null;
  completedAt: string | null;
  sortOrder: number;
  // References
  objectiveRef: string | null; // Reference to ExportObjective._exportId
  annualKrRef: string | null; // Reference to ExportAnnualKr._exportId
  quarterTargetRef: string | null; // Reference to ExportQuarterTarget._exportId
  tagRefs: string[]; // References to ExportTag._exportId
}

export interface ExportCheckIn {
  _exportId: string;
  annualKrRef: string; // Reference to ExportAnnualKr._exportId
  quarterTargetRef: string | null; // Reference to ExportQuarterTarget._exportId
  value: number;
  previousValue: number | null;
  note: string | null;
  evidenceUrl: string | null;
  recordedAt: string; // ISO datetime
}

export interface ExportWeeklyReview {
  _exportId: string;
  year: number;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  status: WeeklyReviewStatus;
  startedAt: string | null;
  completedAt: string | null;
  // Reflections
  reflectionWhatWentWell: string | null;
  reflectionWhatToImprove: string | null;
  reflectionLessonsLearned: string | null;
  reflectionNotes: string | null;
  // Stats
  statsKrsUpdated: number;
  statsTasksCompleted: number;
  statsTasksCreated: number;
  statsCheckInsMade: number;
  statsObjectivesOnTrack: number;
  statsObjectivesAtRisk: number;
  statsObjectivesOffTrack: number;
  statsOverallProgress: number;
  statsTotalKrs: number;
  weekRating: number | null;
}

// ============================================================================
// COMPLETE EXPORT STRUCTURE
// ============================================================================

export interface PlanExport {
  metadata: ExportMetadata;
  plan: ExportPlan;
  tags: ExportTag[];
  krGroups: ExportKrGroup[];
  objectives: ExportObjective[];
  tasks: ExportTask[];
  checkIns: ExportCheckIn[];
  weeklyReviews: ExportWeeklyReview[];
}

// ============================================================================
// IMPORT OPTIONS
// ============================================================================

export interface ImportOptions {
  createNewPlan: boolean; // true = create new plan, false = merge into existing
  targetPlanId?: string; // Required if createNewPlan is false
  skipCheckIns?: boolean; // Skip importing check-in history
  skipWeeklyReviews?: boolean; // Skip importing weekly reviews
  resetProgress?: boolean; // Reset current_value to start_value
}

export interface ImportPreview {
  plan: ExportPlan;
  counts: {
    tags: number;
    krGroups: number;
    objectives: number;
    annualKrs: number;
    quarterTargets: number;
    tasks: number;
    checkIns: number;
    weeklyReviews: number;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface ImportResult {
  success: boolean;
  planId: string;
  counts: {
    tags: number;
    krGroups: number;
    objectives: number;
    annualKrs: number;
    quarterTargets: number;
    tasks: number;
    checkIns: number;
    weeklyReviews: number;
  };
  errors: string[];
}

// ============================================================================
// BACKUP TYPES
// ============================================================================

export interface BackupMetadata {
  id: string;
  planId: string;
  planName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
  createdBy: string;
}

export interface BackupListItem {
  id: string;
  name: string;
  planName: string;
  createdAt: string;
  fileSize: number;
}
