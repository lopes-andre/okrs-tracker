/**
 * Test Data Factories
 *
 * Type-safe factory functions for creating test data that matches the database schema.
 * Each factory creates a valid entity with sensible defaults that can be overridden.
 *
 * Usage:
 *   const plan = createPlan({ name: "My Plan" });
 *   const objective = createObjective({ plan_id: plan.id });
 *   const kr = createAnnualKr({ objective_id: objective.id, kr_type: "count" });
 */

import type {
  Profile,
  Plan,
  PlanMember,
  PlanInvite,
  Objective,
  AnnualKr,
  QuarterTarget,
  Task,
  CheckIn,
  Tag,
  KrGroup,
  Dashboard,
  DashboardWidget,
  ActivityEvent,
  WeeklyReview,
  Comment,
  Notification,
  OkrRole,
  KrType,
  KrDirection,
  KrAggregation,
  TaskStatus,
  TaskPriority,
  TaskEffort,
  WeeklyReviewStatus,
  NotificationType,
  EventEntityType,
  EventType,
  TagKind,
} from "@/lib/supabase/types";

// ============================================================================
// ID GENERATORS
// ============================================================================

let idCounter = 0;

export function generateId(prefix = "id"): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

export function isoDate(daysFromNow = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

export function dateString(daysFromNow = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

// ============================================================================
// PROFILE FACTORY
// ============================================================================

export function createProfile(overrides: Partial<Profile> = {}): Profile {
  const id = overrides.id || generateId("user");
  return {
    id,
    email: `user-${id}@example.com`,
    full_name: `Test User ${id}`,
    avatar_url: null,
    created_at: isoDate(-30),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// PLAN FACTORY
// ============================================================================

export function createPlan(overrides: Partial<Plan> = {}): Plan {
  const id = overrides.id || generateId("plan");
  return {
    id,
    name: `Test Plan ${id}`,
    year: new Date().getFullYear(),
    description: null,
    created_by: generateId("user"),
    created_at: isoDate(-30),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// PLAN MEMBER FACTORY
// ============================================================================

export function createPlanMember(overrides: Partial<PlanMember> = {}): PlanMember {
  return {
    id: generateId("member"),
    plan_id: generateId("plan"),
    user_id: generateId("user"),
    role: "editor" as OkrRole,
    created_at: isoDate(-30),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// PLAN INVITE FACTORY
// ============================================================================

export function createPlanInvite(overrides: Partial<PlanInvite> = {}): PlanInvite {
  return {
    id: generateId("invite"),
    plan_id: generateId("plan"),
    email: `invitee-${Date.now()}@example.com`,
    role: "editor" as OkrRole,
    invited_by: generateId("user"),
    expires_at: isoDate(7),
    accepted_at: null,
    created_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// OBJECTIVE FACTORY
// ============================================================================

export function createObjective(overrides: Partial<Objective> = {}): Objective {
  const id = overrides.id || generateId("obj");
  const sortOrder = overrides.sort_order ?? 1;
  return {
    id,
    plan_id: generateId("plan"),
    code: `O${sortOrder}`,
    name: `Test Objective ${id}`,
    description: null,
    sort_order: sortOrder,
    created_at: isoDate(-30),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// ANNUAL KR FACTORY
// ============================================================================

export interface CreateAnnualKrOptions extends Partial<AnnualKr> {
  /** Preset for common KR configurations */
  preset?: "increase" | "decrease" | "count" | "milestone" | "rate" | "average";
}

export function createAnnualKr(options: CreateAnnualKrOptions = {}): AnnualKr {
  const { preset, ...overrides } = options;
  const id = overrides.id || generateId("kr");

  // Default values
  let defaults: Partial<AnnualKr> = {
    kr_type: "metric" as KrType,
    direction: "increase" as KrDirection,
    aggregation: "cumulative" as KrAggregation,
    unit: "units",
    start_value: 0,
    target_value: 100,
    current_value: 0,
  };

  // Apply presets
  switch (preset) {
    case "increase":
      defaults = {
        ...defaults,
        kr_type: "metric",
        direction: "increase",
        start_value: 0,
        target_value: 100,
        unit: "$",
      };
      break;
    case "decrease":
      defaults = {
        ...defaults,
        kr_type: "metric",
        direction: "decrease",
        start_value: 100,
        target_value: 20,
        unit: "%",
      };
      break;
    case "count":
      defaults = {
        ...defaults,
        kr_type: "count",
        direction: "increase",
        aggregation: "cumulative",
        start_value: 0,
        target_value: 12,
        unit: "articles",
      };
      break;
    case "milestone":
      defaults = {
        ...defaults,
        kr_type: "milestone",
        direction: "increase",
        start_value: 0,
        target_value: 1,
        unit: null,
      };
      break;
    case "rate":
      defaults = {
        ...defaults,
        kr_type: "rate",
        direction: "increase",
        start_value: 0,
        target_value: 50,
        unit: "%",
      };
      break;
    case "average":
      defaults = {
        ...defaults,
        kr_type: "average",
        direction: "increase",
        start_value: 0,
        target_value: 90,
        unit: "score",
      };
      break;
  }

  // Merge defaults with overrides, filtering out undefined values from overrides
  const merged = {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([, v]) => v !== undefined)
    ),
  };

  return {
    id,
    objective_id: overrides.objective_id ?? generateId("obj"),
    group_id: overrides.group_id ?? null,
    owner_id: overrides.owner_id ?? null,
    name: overrides.name ?? `Test KR ${id}`,
    description: overrides.description ?? null,
    sort_order: overrides.sort_order ?? 1,
    created_at: overrides.created_at ?? isoDate(-30),
    updated_at: overrides.updated_at ?? isoDate(),
    // Ensure required fields have valid values (can't be undefined)
    kr_type: merged.kr_type ?? ("metric" as KrType),
    direction: merged.direction ?? ("increase" as KrDirection),
    aggregation: merged.aggregation ?? ("cumulative" as KrAggregation),
    unit: merged.unit ?? "units",
    start_value: merged.start_value ?? 0,
    target_value: merged.target_value ?? 100,
    current_value: merged.current_value ?? 0,
  };
}

// ============================================================================
// QUARTER TARGET FACTORY
// ============================================================================

export function createQuarterTarget(overrides: Partial<QuarterTarget> = {}): QuarterTarget {
  return {
    id: generateId("qt"),
    annual_kr_id: generateId("kr"),
    quarter: 1 as 1 | 2 | 3 | 4,
    target_value: 25,
    current_value: 0,
    notes: null,
    created_at: isoDate(-30),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// TASK FACTORY
// ============================================================================

export interface CreateTaskOptions extends Partial<Task> {
  /** Preset for common task configurations */
  preset?: "pending" | "in_progress" | "completed" | "overdue" | "high_priority";
}

export function createTask(options: CreateTaskOptions = {}): Task {
  const { preset, ...overrides } = options;
  const id = overrides.id || generateId("task");

  let defaults: Partial<Task> = {
    status: "pending" as TaskStatus,
    priority: "medium" as TaskPriority,
    effort: "moderate" as TaskEffort,
    due_date: null,
    due_time: null,
    completed_at: null,
  };

  switch (preset) {
    case "pending":
      defaults = { ...defaults, status: "pending" };
      break;
    case "in_progress":
      defaults = { ...defaults, status: "in_progress" };
      break;
    case "completed":
      defaults = {
        ...defaults,
        status: "completed",
        completed_at: isoDate(),
      };
      break;
    case "overdue":
      defaults = {
        ...defaults,
        status: "pending",
        due_date: dateString(-7),
      };
      break;
    case "high_priority":
      defaults = { ...defaults, priority: "high" };
      break;
  }

  // Merge defaults with overrides, filtering out undefined values
  const merged = {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([, v]) => v !== undefined)
    ),
  };

  return {
    id,
    plan_id: overrides.plan_id ?? generateId("plan"),
    objective_id: overrides.objective_id ?? null,
    annual_kr_id: overrides.annual_kr_id ?? null,
    quarter_target_id: overrides.quarter_target_id ?? null,
    title: overrides.title ?? `Test Task ${id}`,
    description: overrides.description ?? null,
    assigned_to: overrides.assigned_to ?? null,
    reminder_enabled: overrides.reminder_enabled ?? false,
    sort_order: overrides.sort_order ?? 1,
    is_recurring: overrides.is_recurring ?? false,
    recurring_master_id: overrides.recurring_master_id ?? null,
    created_at: overrides.created_at ?? isoDate(-7),
    updated_at: overrides.updated_at ?? isoDate(),
    // Ensure required fields have valid values
    status: merged.status ?? ("pending" as TaskStatus),
    priority: merged.priority ?? ("medium" as TaskPriority),
    effort: merged.effort ?? ("moderate" as TaskEffort),
    due_date: merged.due_date ?? null,
    due_time: merged.due_time ?? null,
    completed_at: merged.completed_at ?? null,
    is_private: overrides.is_private ?? false,
  };
}

// ============================================================================
// CHECK-IN FACTORY
// ============================================================================

export function createCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: generateId("checkin"),
    annual_kr_id: generateId("kr"),
    quarter_target_id: null,
    value: 50,
    previous_value: null,
    note: null,
    evidence_url: null,
    recorded_at: isoDate(),
    recorded_by: generateId("user"),
    created_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// TAG FACTORY
// ============================================================================

export function createTag(overrides: Partial<Tag> = {}): Tag {
  const id = overrides.id || generateId("tag");
  return {
    id,
    plan_id: generateId("plan"),
    name: `Tag ${id}`,
    kind: "custom" as TagKind,
    color: "#3B82F6",
    created_at: isoDate(-30),
    ...overrides,
  };
}

// ============================================================================
// KR GROUP FACTORY
// ============================================================================

export function createKrGroup(overrides: Partial<KrGroup> = {}): KrGroup {
  const id = overrides.id || generateId("group");
  return {
    id,
    plan_id: generateId("plan"),
    name: `KR Group ${id}`,
    description: null,
    color: "#10B981",
    sort_order: 1,
    created_at: isoDate(-30),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// DASHBOARD FACTORY
// ============================================================================

export function createDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  const id = overrides.id || generateId("dashboard");
  return {
    id,
    plan_id: generateId("plan"),
    name: `Dashboard ${id}`,
    description: null,
    is_default: true,
    created_by: generateId("user"),
    created_at: isoDate(-30),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// DASHBOARD WIDGET FACTORY
// ============================================================================

export function createDashboardWidget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return {
    id: generateId("widget"),
    dashboard_id: generateId("dashboard"),
    widget_type: "summary_cards",
    title: null,
    config: {},
    position_x: 0,
    position_y: 0,
    width: 2,
    height: 1,
    created_at: isoDate(-30),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// ACTIVITY EVENT FACTORY
// ============================================================================

export function createActivityEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: generateId("event"),
    plan_id: generateId("plan"),
    user_id: generateId("user"),
    entity_type: "task" as EventEntityType,
    entity_id: generateId("task"),
    event_type: "created" as EventType,
    old_data: null,
    new_data: null,
    metadata: null,
    created_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// WEEKLY REVIEW FACTORY
// ============================================================================

export function createWeeklyReview(overrides: Partial<WeeklyReview> = {}): WeeklyReview {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Saturday

  return {
    id: generateId("review"),
    plan_id: generateId("plan"),
    year: now.getFullYear(),
    week_number: Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
    week_start: weekStart.toISOString().split("T")[0],
    week_end: weekEnd.toISOString().split("T")[0],
    status: "open" as WeeklyReviewStatus,
    created_at: isoDate(),
    started_at: null,
    completed_at: null,
    reflection_what_went_well: null,
    reflection_what_to_improve: null,
    reflection_lessons_learned: null,
    reflection_notes: null,
    stats_krs_updated: 0,
    stats_tasks_completed: 0,
    stats_tasks_created: 0,
    stats_check_ins_made: 0,
    stats_objectives_on_track: 0,
    stats_objectives_at_risk: 0,
    stats_objectives_off_track: 0,
    stats_overall_progress: 0,
    stats_total_krs: 0,
    week_rating: null,
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// COMMENT FACTORY
// ============================================================================

export function createComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: generateId("comment"),
    plan_id: generateId("plan"),
    task_id: generateId("task"),
    user_id: generateId("user"),
    content: "Test comment content",
    created_at: isoDate(),
    updated_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// NOTIFICATION FACTORY
// ============================================================================

export function createNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: generateId("notification"),
    user_id: generateId("user"),
    type: "comment" as NotificationType,
    plan_id: generateId("plan"),
    task_id: generateId("task"),
    comment_id: null,
    actor_id: generateId("user"),
    read: false,
    created_at: isoDate(),
    ...overrides,
  };
}

// ============================================================================
// COMPLEX SCENARIO BUILDERS
// ============================================================================

/**
 * Creates a complete OKR hierarchy: Plan -> Objective -> KR -> Quarter Targets
 */
export function createOkrHierarchy(options: {
  planId?: string;
  objectiveCount?: number;
  krsPerObjective?: number;
  includeQuarterTargets?: boolean;
} = {}) {
  const {
    planId = generateId("plan"),
    objectiveCount = 2,
    krsPerObjective = 2,
    includeQuarterTargets = true,
  } = options;

  const plan = createPlan({ id: planId });
  const objectives: Objective[] = [];
  const krs: AnnualKr[] = [];
  const quarterTargets: QuarterTarget[] = [];

  for (let i = 0; i < objectiveCount; i++) {
    const objective = createObjective({
      plan_id: plan.id,
      code: `O${i + 1}`,
      sort_order: i + 1,
    });
    objectives.push(objective);

    for (let j = 0; j < krsPerObjective; j++) {
      const kr = createAnnualKr({
        objective_id: objective.id,
        sort_order: j + 1,
        preset: j % 2 === 0 ? "increase" : "count",
      });
      krs.push(kr);

      if (includeQuarterTargets) {
        for (let q = 1; q <= 4; q++) {
          const qt = createQuarterTarget({
            annual_kr_id: kr.id,
            quarter: q as 1 | 2 | 3 | 4,
            target_value: (kr.target_value / 4) * q,
          });
          quarterTargets.push(qt);
        }
      }
    }
  }

  return { plan, objectives, krs, quarterTargets };
}

/**
 * Creates a KR with a series of check-ins over time
 */
export function createKrWithCheckIns(options: {
  krOverrides?: Partial<AnnualKr>;
  checkInValues: number[];
  startDate?: Date;
  intervalDays?: number;
} = { checkInValues: [] }) {
  const {
    krOverrides = {},
    checkInValues,
    startDate = new Date(),
    intervalDays = 7,
  } = options;

  const kr = createAnnualKr(krOverrides);
  const checkIns: CheckIn[] = [];

  checkInValues.forEach((value, index) => {
    const recordedAt = new Date(startDate);
    recordedAt.setDate(startDate.getDate() + index * intervalDays);

    const checkIn = createCheckIn({
      annual_kr_id: kr.id,
      value,
      previous_value: index > 0 ? checkInValues[index - 1] : null,
      recorded_at: recordedAt.toISOString(),
    });
    checkIns.push(checkIn);
  });

  // Update current value to latest check-in
  if (checkInValues.length > 0) {
    kr.current_value = checkInValues[checkInValues.length - 1];
  }

  return { kr, checkIns };
}
