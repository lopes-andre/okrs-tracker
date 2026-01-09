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
export type MindmapEntityType = 'plan' | 'objective' | 'annual_kr' | 'quarter_target';
export type EventEntityType = 'task' | 'check_in' | 'member' | 'objective' | 'annual_kr' | 'quarter_target' | 'plan';
export type EventType = 'created' | 'updated' | 'deleted' | 'status_changed' | 'completed' | 'joined' | 'left' | 'role_changed';

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
  weight: number;
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
  name: string;
  description: string | null;
  kr_type: KrType;
  direction: KrDirection;
  aggregation: KrAggregation;
  unit: string | null;
  start_value: number;
  target_value: number;
  current_value: number;
  weight: number;
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

export interface MindmapView {
  id: string;
  plan_id: string;
  user_id: string;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  created_at: string;
  updated_at: string;
}

export interface MindmapNode {
  id: string;
  mindmap_view_id: string;
  entity_type: MindmapEntityType;
  entity_id: string;
  position_x: number;
  position_y: number;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MindmapEdge {
  id: string;
  mindmap_view_id: string;
  source_node_id: string;
  target_node_id: string;
  created_at: string;
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

export interface ObjectiveWithKrs extends Objective {
  annual_krs: AnnualKr[];
  progress?: number;
}

export interface AnnualKrWithDetails extends AnnualKr {
  objective?: Objective;
  group?: KrGroup;
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
      mindmap_views: {
        Row: MindmapView;
        Insert: Omit<MindmapView, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Pick<MindmapView, 'viewport_x' | 'viewport_y' | 'viewport_zoom'>>;
      };
      mindmap_nodes: {
        Row: MindmapNode;
        Insert: Omit<MindmapNode, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Pick<MindmapNode, 'position_x' | 'position_y' | 'is_collapsed'>>;
      };
      mindmap_edges: {
        Row: MindmapEdge;
        Insert: Omit<MindmapEdge, 'id' | 'created_at'>;
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
    };
    Enums: {
      okr_role: OkrRole;
      kr_type: KrType;
      kr_direction: KrDirection;
      kr_aggregation: KrAggregation;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      tag_kind: TagKind;
      mindmap_entity_type: MindmapEntityType;
      event_entity_type: EventEntityType;
      event_type: EventType;
    };
  };
}
