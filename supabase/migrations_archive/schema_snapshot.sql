-- ============================================================================
-- SCHEMA SNAPSHOT - Pre-Consolidation State
-- ============================================================================
-- Date: 2026-01-24
-- Purpose: Document the complete database schema before migration cleanup
--
-- This file is for REFERENCE ONLY - do not run this migration.
-- It documents what existed before consolidation.
-- ============================================================================

-- ============================================================================
-- ENUMS (13 total)
-- ============================================================================

-- CREATE TYPE okr_role AS ENUM ('owner', 'editor', 'viewer');
-- CREATE TYPE kr_type AS ENUM ('metric', 'count', 'milestone', 'rate', 'average');
-- CREATE TYPE kr_direction AS ENUM ('increase', 'decrease', 'maintain');
-- CREATE TYPE kr_aggregation AS ENUM ('reset_quarterly', 'cumulative');
-- CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
-- CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
-- CREATE TYPE task_effort AS ENUM ('light', 'moderate', 'heavy');
-- CREATE TYPE tag_kind AS ENUM ('platform', 'funnel_stage', 'initiative', 'category', 'custom');
-- CREATE TYPE event_entity_type AS ENUM ('task', 'check_in', 'member', 'objective', 'annual_kr', 'quarter_target', 'plan', 'weekly_review', 'comment');
-- CREATE TYPE event_type AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'completed', 'joined', 'left', 'role_changed');
-- CREATE TYPE weekly_review_status AS ENUM ('open', 'pending', 'late', 'complete');
-- CREATE TYPE notification_type AS ENUM ('mentioned', 'comment', 'assigned', 'unassigned', 'task_completed', 'task_updated');
-- CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
-- CREATE TYPE recurrence_end_type AS ENUM ('never', 'count', 'until');

-- ============================================================================
-- TABLES (29 total - 1 will be removed)
-- ============================================================================

-- profiles (5 columns)
--   id UUID PRIMARY KEY REFERENCES auth.users(id)
--   email TEXT NOT NULL
--   full_name TEXT
--   avatar_url TEXT
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- plans (6 columns)
--   id UUID PRIMARY KEY
--   name TEXT NOT NULL
--   year INT NOT NULL
--   description TEXT
--   created_by UUID NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- plan_members (5 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   user_id UUID NOT NULL
--   role okr_role NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- plan_invites (7 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   email TEXT NOT NULL
--   role okr_role NOT NULL
--   invited_by UUID NOT NULL
--   expires_at TIMESTAMPTZ NOT NULL
--   accepted_at TIMESTAMPTZ
--   created_at TIMESTAMPTZ

-- objectives (7 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   code TEXT NOT NULL
--   name TEXT NOT NULL
--   description TEXT
--   sort_order INT NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- kr_groups (7 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   name TEXT NOT NULL
--   description TEXT
--   color TEXT
--   sort_order INT NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- annual_krs (14 columns including owner_id added later)
--   id UUID PRIMARY KEY
--   objective_id UUID NOT NULL
--   group_id UUID
--   name TEXT NOT NULL
--   description TEXT
--   kr_type kr_type NOT NULL
--   direction kr_direction NOT NULL
--   aggregation kr_aggregation NOT NULL
--   unit TEXT
--   start_value NUMERIC NOT NULL
--   target_value NUMERIC NOT NULL
--   current_value NUMERIC NOT NULL
--   sort_order INT NOT NULL
--   owner_id UUID  -- Added in 20260123000002
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- quarter_targets (7 columns)
--   id UUID PRIMARY KEY
--   annual_kr_id UUID NOT NULL
--   quarter INT NOT NULL
--   target_value NUMERIC NOT NULL
--   current_value NUMERIC NOT NULL
--   notes TEXT
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- tasks (18 columns including columns added later)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   objective_id UUID
--   annual_kr_id UUID
--   quarter_target_id UUID
--   title TEXT NOT NULL
--   description TEXT
--   status task_status NOT NULL
--   priority task_priority NOT NULL
--   effort task_effort
--   due_date DATE
--   due_time TIME
--   completed_at TIMESTAMPTZ
--   assigned_to UUID
--   sort_order INT NOT NULL
--   reminder_enabled BOOLEAN  -- Added in 20260122000001
--   is_recurring BOOLEAN  -- Added in 20260124000002
--   recurring_master_id UUID  -- Added in 20260124000002
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- check_ins (9 columns)
--   id UUID PRIMARY KEY
--   annual_kr_id UUID NOT NULL
--   quarter_target_id UUID
--   value NUMERIC NOT NULL
--   previous_value NUMERIC
--   note TEXT
--   evidence_url TEXT
--   recorded_at TIMESTAMPTZ NOT NULL
--   recorded_by UUID NOT NULL
--   created_at TIMESTAMPTZ

-- tags (5 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   name TEXT NOT NULL
--   kind tag_kind NOT NULL
--   color TEXT
--   created_at TIMESTAMPTZ

-- annual_kr_tags (2 columns)
--   annual_kr_id UUID NOT NULL
--   tag_id UUID NOT NULL
--   PRIMARY KEY (annual_kr_id, tag_id)

-- task_tags (2 columns)
--   task_id UUID NOT NULL
--   tag_id UUID NOT NULL
--   PRIMARY KEY (task_id, tag_id)

-- dashboards (7 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   name TEXT NOT NULL
--   description TEXT
--   is_default BOOLEAN NOT NULL
--   created_by UUID NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- dashboard_widgets (9 columns)
--   id UUID PRIMARY KEY
--   dashboard_id UUID NOT NULL
--   widget_type TEXT NOT NULL
--   title TEXT
--   config JSONB NOT NULL
--   position_x INT NOT NULL
--   position_y INT NOT NULL
--   width INT NOT NULL
--   height INT NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- saved_views (11 columns) -- REMOVED: Never used in codebase
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   user_id UUID NOT NULL
--   name TEXT NOT NULL
--   view_type TEXT NOT NULL
--   filters JSONB NOT NULL
--   sort_by TEXT
--   sort_order TEXT
--   columns TEXT[]
--   is_default BOOLEAN NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- activity_events (9 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   user_id UUID
--   entity_type event_entity_type NOT NULL
--   entity_id UUID NOT NULL
--   event_type event_type NOT NULL
--   old_data JSONB
--   new_data JSONB
--   metadata JSONB
--   created_at TIMESTAMPTZ

-- weekly_reviews (20 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   year INTEGER NOT NULL
--   week_number INTEGER NOT NULL
--   week_start DATE NOT NULL
--   week_end DATE NOT NULL
--   status weekly_review_status NOT NULL
--   created_at TIMESTAMPTZ
--   started_at TIMESTAMPTZ
--   completed_at TIMESTAMPTZ
--   reflection_what_went_well TEXT
--   reflection_what_to_improve TEXT
--   reflection_lessons_learned TEXT
--   reflection_notes TEXT
--   stats_krs_updated INTEGER
--   stats_tasks_completed INTEGER
--   stats_tasks_created INTEGER
--   stats_check_ins_made INTEGER
--   stats_objectives_on_track INTEGER
--   stats_objectives_at_risk INTEGER
--   stats_objectives_off_track INTEGER
--   stats_overall_progress INTEGER
--   stats_total_krs INTEGER
--   week_rating INTEGER
--   updated_at TIMESTAMPTZ

-- weekly_review_settings (8 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   reminder_enabled BOOLEAN NOT NULL
--   reminder_day INTEGER NOT NULL
--   reminder_time TIME NOT NULL
--   auto_create_reviews BOOLEAN NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- weekly_review_kr_updates (7 columns)
--   id UUID PRIMARY KEY
--   weekly_review_id UUID NOT NULL
--   annual_kr_id UUID NOT NULL
--   value_before DECIMAL
--   value_after DECIMAL
--   progress_before DECIMAL
--   progress_after DECIMAL
--   notes TEXT
--   created_at TIMESTAMPTZ

-- weekly_review_tasks (7 columns)
--   id UUID PRIMARY KEY
--   weekly_review_id UUID NOT NULL
--   task_id UUID NOT NULL
--   status_at_review TEXT NOT NULL
--   was_completed_this_week BOOLEAN
--   was_created_this_week BOOLEAN
--   was_overdue BOOLEAN
--   created_at TIMESTAMPTZ

-- task_reminder_settings (15 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   reminders_enabled BOOLEAN
--   business_hours_enabled BOOLEAN
--   business_hours_start TIME
--   business_hours_end TIME
--   business_days INTEGER[]
--   sound_enabled BOOLEAN
--   daily_summary_enabled BOOLEAN
--   daily_summary_time TIME
--   hourly_reminders_enabled BOOLEAN
--   time_reminder_15min BOOLEAN
--   time_reminder_10min BOOLEAN
--   time_reminder_5min BOOLEAN
--   time_reminder_on_time BOOLEAN  -- Added in 20260122000002
--   time_reminder_overdue_30min BOOLEAN
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- task_assignees (5 columns)
--   id UUID PRIMARY KEY
--   task_id UUID NOT NULL
--   user_id UUID NOT NULL
--   assigned_at TIMESTAMPTZ NOT NULL
--   assigned_by UUID

-- comments (6 columns)
--   id UUID PRIMARY KEY
--   plan_id UUID NOT NULL
--   task_id UUID NOT NULL
--   user_id UUID NOT NULL
--   content TEXT NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- comment_mentions (4 columns)
--   id UUID PRIMARY KEY
--   comment_id UUID NOT NULL
--   user_id UUID NOT NULL
--   created_at TIMESTAMPTZ

-- notifications (9 columns)
--   id UUID PRIMARY KEY
--   user_id UUID NOT NULL
--   type notification_type NOT NULL
--   plan_id UUID NOT NULL
--   task_id UUID
--   comment_id UUID
--   actor_id UUID
--   read BOOLEAN
--   created_at TIMESTAMPTZ

-- comment_reads (4 columns)
--   id UUID PRIMARY KEY
--   task_id UUID NOT NULL
--   user_id UUID NOT NULL
--   last_read_at TIMESTAMPTZ NOT NULL

-- task_recurrence_rules (17 columns)
--   id UUID PRIMARY KEY
--   task_id UUID NOT NULL
--   rrule TEXT NOT NULL
--   frequency recurrence_frequency NOT NULL
--   interval_value INT NOT NULL
--   days_of_week INT[]
--   day_of_month INT
--   week_of_month INT
--   day_of_week_for_month INT
--   month_of_year INT
--   end_type recurrence_end_type NOT NULL
--   end_count INT
--   end_date DATE
--   timezone TEXT NOT NULL
--   last_generated_date DATE
--   generation_limit INT NOT NULL
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ

-- task_recurrence_instances (7 columns)
--   id UUID PRIMARY KEY
--   recurrence_rule_id UUID NOT NULL
--   task_id UUID NOT NULL
--   original_date DATE NOT NULL
--   is_exception BOOLEAN NOT NULL
--   is_deleted BOOLEAN NOT NULL
--   created_at TIMESTAMPTZ

-- ============================================================================
-- VIEWS (9 total - 2 will be removed)
-- ============================================================================

-- v_plan_timeline -- REMOVED: Not used in codebase
-- v_plan_checkins_by_day -- KEPT
-- v_objective_progress -- KEPT
-- v_kr_progress -- KEPT
-- v_plan_stats -- KEPT
-- v_quarter_overview -- KEPT
-- v_weekly_review_summary -- KEPT
-- v_plan_review_stats -- KEPT
-- v_weekly_review_stats_by_month -- REMOVED: Not used in codebase

-- ============================================================================
-- FUNCTIONS (25+ total)
-- ============================================================================

-- Helper Functions:
-- - set_updated_at() -- Trigger function
-- - update_updated_at_column() -- REMOVED: Duplicate of set_updated_at()
-- - okr_role_rank(okr_role) -- Returns numeric rank for role
-- - request_user_id() -- Returns auth.uid()
-- - has_plan_access(UUID, okr_role) -- RLS helper
-- - get_plan_id_from_objective(UUID) -- RLS helper
-- - get_plan_id_from_annual_kr(UUID) -- RLS helper
-- - get_plan_id_from_quarter_target(UUID) -- RLS helper

-- Auth Triggers:
-- - handle_new_user() -- Creates profile on signup
-- - handle_new_plan() -- Adds owner as member
-- - accept_pending_invites() -- Auto-accepts invites

-- Business Logic:
-- - tasks_set_completed_at() -- Sets completed_at
-- - update_kr_on_checkin() -- Updates KR value
-- - log_activity_event() -- Logs activity

-- Activity Triggers:
-- - tasks_activity_events()
-- - checkins_activity_events()
-- - plan_members_activity_events()
-- - objectives_activity_events()
-- - annual_krs_activity_events()
-- - weekly_reviews_activity_events()

-- RPC Functions:
-- - get_or_create_weekly_review() -- REMOVED: Logic in app code
-- - get_tasks_comment_counts() -- KEPT
-- - get_member_workload_stats() -- KEPT
-- - get_member_contributions_by_period() -- KEPT
-- - get_recurring_master_task() -- KEPT
-- - is_recurring_task() -- KEPT
-- - get_task_recurrence_info() -- KEPT

-- ============================================================================
-- KNOWN ISSUES FIXED
-- ============================================================================

-- 1. RLS Policy Bug (Line 494 of 20260108000007):
--    Original: AND (actor_id = auth.uid() OR actor_id IS NULL)
--    Fixed: AND (user_id = auth.uid() OR user_id IS NULL)
--    Reason: actor_id column doesn't exist on activity_events

-- 2. Duplicate Function:
--    update_updated_at_column() removed, using set_updated_at() consistently

-- 3. SECURITY DEFINER Views:
--    All views converted to SECURITY INVOKER

-- 4. RLS on plans table:
--    Added FORCE ROW LEVEL SECURITY

-- ============================================================================
-- END OF SCHEMA SNAPSHOT
-- ============================================================================
