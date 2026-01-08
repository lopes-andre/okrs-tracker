/**
 * Database types for Supabase
 * 
 * These types are manually maintained to match the database schema.
 * In production, you can generate these automatically using:
 * npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/types.ts
 */

// Enum Types
export type OkrRole = "owner" | "editor" | "viewer";
export type KrType = "metric" | "count" | "milestone" | "rate" | "average";
export type KrDirection = "increase" | "decrease" | "maintain";
export type KrAggregation = "reset_quarterly" | "cumulative";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type TagKind = "platform" | "funnel_stage" | "initiative" | "category" | "custom";
export type MindmapEntityType = "plan" | "objective" | "annual_kr" | "quarter_target";
export type EventEntityType = "task" | "check_in" | "member" | "objective" | "annual_kr" | "quarter_target" | "plan";
export type EventType = "created" | "updated" | "deleted" | "status_changed" | "completed" | "joined" | "left" | "role_changed";

// Table Row Types
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
  quarter_target_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
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
  sort_order: "asc" | "desc" | null;
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

// View Types
export interface PlanTimelineEvent extends ActivityEvent {
  user_email: string | null;
  user_full_name: string | null;
}

export interface PlanCheckInsByDay {
  plan_id: string;
  check_in_date: string;
  check_in_count: number;
  kr_ids: string[];
}

// Database Type Definition
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      plans: {
        Row: Plan;
        Insert: Omit<Plan, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Plan, "id" | "created_at" | "created_by">>;
      };
      plan_members: {
        Row: PlanMember;
        Insert: Omit<PlanMember, "id" | "created_at" | "updated_at">;
        Update: Partial<Pick<PlanMember, "role">>;
      };
      plan_invites: {
        Row: PlanInvite;
        Insert: Omit<PlanInvite, "id" | "created_at" | "accepted_at">;
        Update: Partial<Pick<PlanInvite, "accepted_at">>;
      };
      objectives: {
        Row: Objective;
        Insert: Omit<Objective, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Objective, "id" | "plan_id" | "created_at">>;
      };
      kr_groups: {
        Row: KrGroup;
        Insert: Omit<KrGroup, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<KrGroup, "id" | "plan_id" | "created_at">>;
      };
      annual_krs: {
        Row: AnnualKr;
        Insert: Omit<AnnualKr, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AnnualKr, "id" | "objective_id" | "created_at">>;
      };
      quarter_targets: {
        Row: QuarterTarget;
        Insert: Omit<QuarterTarget, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<QuarterTarget, "id" | "annual_kr_id" | "quarter" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at" | "completed_at">;
        Update: Partial<Omit<Task, "id" | "plan_id" | "created_at">>;
      };
      check_ins: {
        Row: CheckIn;
        Insert: Omit<CheckIn, "id" | "created_at">;
        Update: Partial<Omit<CheckIn, "id" | "annual_kr_id" | "created_at" | "recorded_by">>;
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, "id" | "created_at">;
        Update: Partial<Omit<Tag, "id" | "plan_id" | "created_at">>;
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
        Insert: Omit<MindmapView, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<MindmapView, "id" | "plan_id" | "user_id" | "created_at">>;
      };
      mindmap_nodes: {
        Row: MindmapNode;
        Insert: Omit<MindmapNode, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<MindmapNode, "id" | "mindmap_view_id" | "entity_type" | "entity_id" | "created_at">>;
      };
      mindmap_edges: {
        Row: MindmapEdge;
        Insert: Omit<MindmapEdge, "id" | "created_at">;
        Update: never;
      };
      dashboards: {
        Row: Dashboard;
        Insert: Omit<Dashboard, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Dashboard, "id" | "plan_id" | "created_by" | "created_at">>;
      };
      dashboard_widgets: {
        Row: DashboardWidget;
        Insert: Omit<DashboardWidget, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DashboardWidget, "id" | "dashboard_id" | "created_at">>;
      };
      saved_views: {
        Row: SavedView;
        Insert: Omit<SavedView, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SavedView, "id" | "plan_id" | "user_id" | "created_at">>;
      };
      activity_events: {
        Row: ActivityEvent;
        Insert: Omit<ActivityEvent, "id" | "created_at">;
        Update: never;
      };
    };
    Views: {
      v_plan_timeline: {
        Row: PlanTimelineEvent;
      };
      v_plan_checkins_by_day: {
        Row: PlanCheckInsByDay;
      };
    };
    Functions: {
      has_plan_access: {
        Args: { p_plan_id: string; p_min_role?: OkrRole };
        Returns: boolean;
      };
      okr_role_rank: {
        Args: { role: OkrRole };
        Returns: number;
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
