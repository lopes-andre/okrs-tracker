// ============================================================================
// DATABASE TYPES - Generated from Supabase schema
// ============================================================================

// Enum Types
export type OkrRole = 'owner' | 'editor' | 'viewer';
export type KrType = 'metric' | 'count' | 'milestone' | 'rate' | 'average';
export type KrDirection = 'increase' | 'decrease' | 'maintain';
export type KrAggregation = 'reset_quarterly' | 'cumulative';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskEffort = 'light' | 'moderate' | 'heavy';
export type TagKind = 'platform' | 'funnel_stage' | 'initiative' | 'category' | 'custom';
export type EventEntityType = 'task' | 'check_in' | 'member' | 'objective' | 'annual_kr' | 'quarter_target' | 'plan' | 'weekly_review';
export type EventType = 'created' | 'updated' | 'deleted' | 'status_changed' | 'completed' | 'joined' | 'left' | 'role_changed' | 'started';
export type WeeklyReviewStatus = 'open' | 'pending' | 'late' | 'complete';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  year: number;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanMember {
  id: string;
  plan_id: string;
  user_id: string;
  role: OkrRole;
  created_at: string;
  updated_at: string;
}

export interface PlanInvite {
  id: string;
  plan_id: string;
  email: string;
  role: OkrRole;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Objective {
  id: string;
  plan_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface KrGroup {
  id: string;
  plan_id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AnnualKr {
  id: string;
  objective_id: string;
  group_id: string | null;
  owner_id: string | null;
  name: string;
  description: string | null;
  kr_type: KrType;
  direction: KrDirection;
  aggregation: KrAggregation;
  unit: string | null;
  start_value: number;
  target_value: number;
  current_value: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuarterTarget {
  id: string;
  annual_kr_id: string;
  quarter: 1 | 2 | 3 | 4;
  target_value: number;
  current_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  plan_id: string;
  objective_id: string | null;
  annual_kr_id: string | null;
  quarter_target_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  effort: TaskEffort;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  reminder_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  annual_kr_id: string;
  quarter_target_id: string | null;
  value: number;
  previous_value: number | null;
  note: string | null;
  evidence_url: string | null;
  recorded_at: string;
  recorded_by: string;
  created_at: string;
}

export interface Tag {
  id: string;
  plan_id: string;
  name: string;
  kind: TagKind;
  color: string | null;
  created_at: string;
}

export interface AnnualKrTag {
  annual_kr_id: string;
  tag_id: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}

export interface Dashboard {
  id: string;
  plan_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  widget_type: string;
  title: string | null;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export interface SavedView {
  id: string;
  plan_id: string;
  user_id: string;
  name: string;
  view_type: string;
  filters: Record<string, unknown>;
  sort_by: string | null;
  sort_order: 'asc' | 'desc' | null;
  columns: string[] | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  plan_id: string;
  user_id: string | null;
  entity_type: EventEntityType;
  entity_id: string;
  event_type: EventType;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// WEEKLY REVIEW TYPES
// ============================================================================

export interface WeeklyReview {
  id: string;
  plan_id: string;
  year: number;
  week_number: number;
  week_start: string;
  week_end: string;
  status: WeeklyReviewStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  reflection_what_went_well: string | null;
  reflection_what_to_improve: string | null;
  reflection_lessons_learned: string | null;
  reflection_notes: string | null;
  stats_krs_updated: number;
  stats_tasks_completed: number;
  stats_tasks_created: number;
  stats_check_ins_made: number;
  stats_objectives_on_track: number;
  stats_objectives_at_risk: number;
  stats_objectives_off_track: number;
  stats_overall_progress: number; // 0-100 percentage at completion
  stats_total_krs: number;
  week_rating: number | null;
  updated_at: string;
}

export interface WeeklyReviewSettings {
  id: string;
  plan_id: string;
  reminder_enabled: boolean;
  reminder_day: number; // 0-6 (Sun-Sat)
  reminder_time: string; // HH:MM format
  auto_create_reviews: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TASK REMINDER TYPES
// ============================================================================

export interface TaskReminderSettings {
  id: string;
  plan_id: string;
  // Master toggle
  reminders_enabled: boolean;
  // Business hours
  business_hours_enabled: boolean;
  business_hours_start: string; // HH:MM format
  business_hours_end: string; // HH:MM format
  business_days: number[]; // 1-7, 1=Monday
  // Notification preferences
  sound_enabled: boolean;
  // Daily summary
  daily_summary_enabled: boolean;
  daily_summary_time: string; // HH:MM format
  // Hourly reminders for due today tasks
  hourly_reminders_enabled: boolean;
  // Time-specific task reminders
  time_reminder_15min: boolean;
  time_reminder_10min: boolean;
  time_reminder_5min: boolean;
  time_reminder_on_time: boolean;
  time_reminder_overdue_30min: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface WeeklyReviewKrUpdate {
  id: string;
  weekly_review_id: string;
  annual_kr_id: string;
  value_before: number | null;
  value_after: number | null;
  progress_before: number | null;
  progress_after: number | null;
  notes: string | null;
  created_at: string;
}

export interface WeeklyReviewTask {
  id: string;
  weekly_review_id: string;
  task_id: string;
  status_at_review: string;
  was_completed_this_week: boolean;
  was_created_this_week: boolean;
  was_overdue: boolean;
  created_at: string;
}

// ============================================================================
// INSERT/UPDATE TYPES (without auto-generated fields)
// ============================================================================

export type PlanInsert = Omit<Plan, 'id' | 'created_at' | 'updated_at'>;
export type PlanUpdate = Partial<Omit<Plan, 'id' | 'created_by' | 'created_at' | 'updated_at'>>;

export type ObjectiveInsert = Omit<Objective, 'id' | 'created_at' | 'updated_at'>;
export type ObjectiveUpdate = Partial<Omit<Objective, 'id' | 'plan_id' | 'created_at' | 'updated_at'>>;

export type AnnualKrInsert = Omit<AnnualKr, 'id' | 'created_at' | 'updated_at'>;
export type AnnualKrUpdate = Partial<Omit<AnnualKr, 'id' | 'objective_id' | 'created_at' | 'updated_at'>>;

export type QuarterTargetInsert = Omit<QuarterTarget, 'id' | 'created_at' | 'updated_at'>;
export type QuarterTargetUpdate = Partial<Omit<QuarterTarget, 'id' | 'annual_kr_id' | 'quarter' | 'created_at' | 'updated_at'>>;

export type TaskInsert = Omit<Task, 'id' | 'completed_at' | 'created_at' | 'updated_at'>;
export type TaskUpdate = Partial<Omit<Task, 'id' | 'plan_id' | 'completed_at' | 'created_at' | 'updated_at'>>;

export type CheckInInsert = Omit<CheckIn, 'id' | 'previous_value' | 'created_at'>;
export type CheckInUpdate = Partial<Pick<CheckIn, 'note' | 'evidence_url'>>;

export type TagInsert = Omit<Tag, 'id' | 'created_at'>;
export type TagUpdate = Partial<Omit<Tag, 'id' | 'plan_id' | 'created_at'>>;

export type KrGroupInsert = Omit<KrGroup, 'id' | 'created_at' | 'updated_at'>;
export type KrGroupUpdate = Partial<Omit<KrGroup, 'id' | 'plan_id' | 'created_at' | 'updated_at'>>;

export type DashboardInsert = Omit<Dashboard, 'id' | 'created_at' | 'updated_at'>;
export type DashboardUpdate = Partial<Omit<Dashboard, 'id' | 'plan_id' | 'created_by' | 'created_at' | 'updated_at'>>;

export type DashboardWidgetInsert = Omit<DashboardWidget, 'id' | 'created_at' | 'updated_at'>;
export type DashboardWidgetUpdate = Partial<Omit<DashboardWidget, 'id' | 'dashboard_id' | 'created_at' | 'updated_at'>>;

export type PlanInviteInsert = Omit<PlanInvite, 'id' | 'expires_at' | 'accepted_at' | 'created_at'>;

// Weekly Review Insert/Update Types
export type WeeklyReviewInsert = Omit<WeeklyReview, 'id' | 'created_at' | 'updated_at' | 'started_at' | 'completed_at' | 
  'stats_krs_updated' | 'stats_tasks_completed' | 'stats_tasks_created' | 'stats_check_ins_made' | 
  'stats_objectives_on_track' | 'stats_objectives_at_risk' | 'stats_objectives_off_track'>;
export type WeeklyReviewUpdate = Partial<Pick<WeeklyReview,
  'status' | 'started_at' | 'completed_at' |
  'reflection_what_went_well' | 'reflection_what_to_improve' | 'reflection_lessons_learned' | 'reflection_notes' |
  'stats_krs_updated' | 'stats_tasks_completed' | 'stats_tasks_created' | 'stats_check_ins_made' |
  'stats_objectives_on_track' | 'stats_objectives_at_risk' | 'stats_objectives_off_track' |
  'stats_overall_progress' | 'stats_total_krs' | 'week_rating'>>;

export type WeeklyReviewSettingsInsert = Omit<WeeklyReviewSettings, 'id' | 'created_at' | 'updated_at'>;
export type WeeklyReviewSettingsUpdate = Partial<Pick<WeeklyReviewSettings,
  'reminder_enabled' | 'reminder_day' | 'reminder_time' | 'auto_create_reviews'>>;

// Task Reminder Settings Types
export type TaskReminderSettingsInsert = Omit<TaskReminderSettings, 'id' | 'created_at' | 'updated_at'>;
export type TaskReminderSettingsUpdate = Partial<Omit<TaskReminderSettings, 'id' | 'plan_id' | 'created_at' | 'updated_at'>>;

export type WeeklyReviewKrUpdateInsert = Omit<WeeklyReviewKrUpdate, 'id' | 'created_at'>;
export type WeeklyReviewTaskInsert = Omit<WeeklyReviewTask, 'id' | 'created_at'>;

// ============================================================================
// EXTENDED TYPES (with joined data)
// ============================================================================

export interface PlanWithMembership extends Plan {
  role: OkrRole;
  member_count?: number;
}

export interface PlanMemberWithProfile extends PlanMember {
  profile: Profile;
}

export interface AnnualKrWithOwner extends AnnualKr {
  owner?: Profile | null;
  quarter_targets?: QuarterTarget[];
}

export interface ObjectiveWithKrs extends Objective {
  annual_krs: AnnualKrWithOwner[];
  progress?: number;
}

export interface AnnualKrWithDetails extends AnnualKr {
  objective?: Objective;
  group?: KrGroup;
  owner?: Profile;
  quarter_targets?: QuarterTarget[];
  tags?: Tag[];
  progress?: number;
}

export interface TaskWithDetails extends Task {
  objective?: Objective;
  annual_kr?: AnnualKr;
  quarter_target?: QuarterTarget;
  assigned_user?: Profile;
  tags?: Tag[];
}

export interface CheckInWithDetails extends CheckIn {
  annual_kr?: AnnualKr;
  recorded_by_user?: Profile;
}

export interface ActivityEventWithUser extends ActivityEvent {
  user?: Profile;
}

// Weekly Review Extended Types
export interface WeeklyReviewSummary extends WeeklyReview {
  days_overdue: number;
  has_reflections: boolean;
}

export interface WeeklyReviewWithKrUpdates extends WeeklyReview {
  kr_updates: (WeeklyReviewKrUpdate & { annual_kr?: AnnualKr })[];
}

export interface WeeklyReviewWithTasks extends WeeklyReview {
  task_snapshots: (WeeklyReviewTask & { task?: Task })[];
}

export interface PlanReviewStats {
  plan_id: string;
  total_reviews: number;
  completed_on_time: number;
  completed_late: number;
  pending: number;
  avg_rating: number | null;
  current_streak: number;
}

// ============================================================================
// FILTER/QUERY TYPES
// ============================================================================

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  effort?: TaskEffort | TaskEffort[];
  assigned_to?: string;
  objective_id?: string;
  annual_kr_id?: string;
  quarter_target_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  due_date_null?: boolean; // For "Ideas Backlog" - tasks without due date
  tag_ids?: string[];
  // Quick filter presets
  listView?: 'all' | 'active' | 'overdue' | 'this_week' | 'this_month' | 'future' | 'backlog' | 'completed';
}

export interface CheckInFilters {
  annual_kr_id?: string;
  quarter_target_id?: string;
  recorded_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface TimelineFilters {
  entity_type?: EventEntityType | EventEntityType[];
  event_type?: EventType | EventType[];
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// DATABASE SCHEMA TYPE (for Supabase client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      plans: {
        Row: Plan;
        Insert: PlanInsert;
        Update: PlanUpdate;
      };
      plan_members: {
        Row: PlanMember;
        Insert: Omit<PlanMember, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Pick<PlanMember, 'role'>>;
      };
      plan_invites: {
        Row: PlanInvite;
        Insert: PlanInviteInsert;
        Update: never;
      };
      objectives: {
        Row: Objective;
        Insert: ObjectiveInsert;
        Update: ObjectiveUpdate;
      };
      kr_groups: {
        Row: KrGroup;
        Insert: KrGroupInsert;
        Update: KrGroupUpdate;
      };
      annual_krs: {
        Row: AnnualKr;
        Insert: AnnualKrInsert;
        Update: AnnualKrUpdate;
      };
      quarter_targets: {
        Row: QuarterTarget;
        Insert: QuarterTargetInsert;
        Update: QuarterTargetUpdate;
      };
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: TaskUpdate;
      };
      check_ins: {
        Row: CheckIn;
        Insert: CheckInInsert;
        Update: CheckInUpdate;
      };
      tags: {
        Row: Tag;
        Insert: TagInsert;
        Update: TagUpdate;
      };
      annual_kr_tags: {
        Row: AnnualKrTag;
        Insert: AnnualKrTag;
        Update: never;
      };
      task_tags: {
        Row: TaskTag;
        Insert: TaskTag;
        Update: never;
      };
      dashboards: {
        Row: Dashboard;
        Insert: DashboardInsert;
        Update: DashboardUpdate;
      };
      dashboard_widgets: {
        Row: DashboardWidget;
        Insert: DashboardWidgetInsert;
        Update: DashboardWidgetUpdate;
      };
      saved_views: {
        Row: SavedView;
        Insert: Omit<SavedView, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SavedView, 'id' | 'plan_id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      activity_events: {
        Row: ActivityEvent;
        Insert: never; // Created by triggers only
        Update: never;
      };
      weekly_reviews: {
        Row: WeeklyReview;
        Insert: WeeklyReviewInsert;
        Update: WeeklyReviewUpdate;
      };
      weekly_review_settings: {
        Row: WeeklyReviewSettings;
        Insert: WeeklyReviewSettingsInsert;
        Update: WeeklyReviewSettingsUpdate;
      };
      weekly_review_kr_updates: {
        Row: WeeklyReviewKrUpdate;
        Insert: WeeklyReviewKrUpdateInsert;
        Update: never;
      };
      weekly_review_tasks: {
        Row: WeeklyReviewTask;
        Insert: WeeklyReviewTaskInsert;
        Update: never;
      };
    };
    Views: {
      v_plan_timeline: {
        Row: ActivityEventWithUser;
      };
      v_plan_checkins_by_day: {
        Row: {
          plan_id: string;
          date: string;
          check_in_count: number;
          total_value_change: number;
        };
      };
      v_objective_progress: {
        Row: {
          id: string;
          plan_id: string;
          code: string;
          name: string;
          progress: number;
          kr_count: number;
        };
      };
      v_kr_progress: {
        Row: AnnualKr & { progress: number; objective_code: string };
      };
      v_plan_stats: {
        Row: {
          plan_id: string;
          objective_count: number;
          kr_count: number;
          task_count: number;
          completed_task_count: number;
          check_in_count: number;
        };
      };
      v_quarter_overview: {
        Row: {
          plan_id: string;
          quarter: number;
          target_count: number;
          avg_progress: number;
        };
      };
      v_weekly_review_summary: {
        Row: WeeklyReviewSummary;
      };
      v_plan_review_stats: {
        Row: PlanReviewStats;
      };
    };
    Enums: {
      okr_role: OkrRole;
      kr_type: KrType;
      kr_direction: KrDirection;
      kr_aggregation: KrAggregation;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      tag_kind: TagKind;
      event_entity_type: EventEntityType;
      event_type: EventType;
      weekly_review_status: WeeklyReviewStatus;
    };
  };
}
