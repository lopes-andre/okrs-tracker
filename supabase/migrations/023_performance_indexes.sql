-- ============================================================================
-- Migration 023: Performance Indexes & Optimizations
-- ============================================================================
-- Adds missing indexes based on query pattern analysis.
-- Focuses on: composite indexes for common filters, covering indexes for
-- frequent queries, and partial indexes for filtered datasets.
-- ============================================================================

-- ============================================================================
-- CHECK_INS INDEXES
-- ============================================================================
-- Used in: time-series queries, KR history, productivity stats

-- Composite index for KR check-in history ordered by date (common query pattern)
CREATE INDEX IF NOT EXISTS idx_check_ins_kr_recorded
  ON check_ins(annual_kr_id, recorded_at DESC);

-- Composite index for date-range queries with plan context
CREATE INDEX IF NOT EXISTS idx_check_ins_recorded_at_kr
  ON check_ins(recorded_at, annual_kr_id);

-- ============================================================================
-- ACTIVITY_EVENTS INDEXES
-- ============================================================================
-- Used in: timeline filtering, entity activity, stats aggregation

-- Composite index for filtered timeline queries (entity_type + event_type filters)
CREATE INDEX IF NOT EXISTS idx_activity_events_plan_entity_type
  ON activity_events(plan_id, entity_type, event_type, created_at DESC);

-- Note: Partial index for recent activity removed - CURRENT_DATE is not immutable
-- and cannot be used in index predicates. The composite index above handles
-- timeline queries efficiently.

-- Index for entity-specific activity lookups
CREATE INDEX IF NOT EXISTS idx_activity_events_entity_id
  ON activity_events(entity_id, entity_type, created_at DESC);

-- ============================================================================
-- COMMENTS INDEXES
-- ============================================================================
-- Used in: task comment lists, unread counts

-- Composite index for task comments ordered by date
CREATE INDEX IF NOT EXISTS idx_comments_task_created
  ON comments(task_id, created_at DESC);

-- Composite index for plan comment queries
CREATE INDEX IF NOT EXISTS idx_comments_plan_task
  ON comments(plan_id, task_id);

-- ============================================================================
-- NOTIFICATIONS INDEXES
-- ============================================================================
-- Used in: notification lists, unread counts, mark as read

-- Composite index for user notifications with read status and ordering
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, read, created_at DESC);

-- Index for task-related notifications
CREATE INDEX IF NOT EXISTS idx_notifications_task
  ON notifications(task_id)
  WHERE task_id IS NOT NULL;

-- ============================================================================
-- TASKS INDEXES
-- ============================================================================
-- Used in: task lists, filtering, dashboard widgets

-- Composite index for common task filters (status + due_date + priority)
CREATE INDEX IF NOT EXISTS idx_tasks_plan_status_priority
  ON tasks(plan_id, status, priority, due_date);

-- Index for assigned tasks filtering
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status
  ON tasks(assigned_to, status, due_date)
  WHERE assigned_to IS NOT NULL;

-- Index for objective-linked tasks
CREATE INDEX IF NOT EXISTS idx_tasks_objective_status
  ON tasks(objective_id, status)
  WHERE objective_id IS NOT NULL;

-- Index for KR-linked tasks
CREATE INDEX IF NOT EXISTS idx_tasks_kr_status
  ON tasks(annual_kr_id, status)
  WHERE annual_kr_id IS NOT NULL;

-- Index for quarter target linked tasks
CREATE INDEX IF NOT EXISTS idx_tasks_qt_status
  ON tasks(quarter_target_id, status)
  WHERE quarter_target_id IS NOT NULL;

-- ============================================================================
-- TASK_RECURRENCE_INSTANCES INDEXES
-- ============================================================================
-- Used in: recurrence generation, instance lookups

-- Composite index for active instances by rule and date
CREATE INDEX IF NOT EXISTS idx_recurrence_instances_rule_date_active
  ON task_recurrence_instances(recurrence_rule_id, original_date)
  WHERE is_deleted = FALSE;

-- ============================================================================
-- WEEKLY_REVIEWS INDEXES
-- ============================================================================
-- Used in: review lists, dashboard widgets, analytics

-- Composite index for plan reviews by status
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_plan_status_week
  ON weekly_reviews(plan_id, status, year DESC, week_number DESC);

-- Index for pending/late reviews
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_pending
  ON weekly_reviews(plan_id, week_end)
  WHERE status IN ('open', 'pending');

-- ============================================================================
-- CONTENT_POSTS INDEXES
-- ============================================================================
-- Used in: Kanban board, post lists, filtering

-- Composite index for Kanban column queries with ordering
CREATE INDEX IF NOT EXISTS idx_content_posts_plan_status_order
  ON content_posts(plan_id, status, display_order);

-- Index for user's posts
CREATE INDEX IF NOT EXISTS idx_content_posts_created_by_status
  ON content_posts(created_by, status);

-- ============================================================================
-- CONTENT_DISTRIBUTIONS INDEXES
-- ============================================================================
-- Used in: calendar views, distribution lists, scheduling

-- Composite index for calendar date range queries
CREATE INDEX IF NOT EXISTS idx_content_distributions_scheduled
  ON content_distributions(scheduled_at, status)
  WHERE scheduled_at IS NOT NULL;

-- Composite index for account distributions
CREATE INDEX IF NOT EXISTS idx_content_distributions_account_status
  ON content_distributions(account_id, status);

-- ============================================================================
-- CONTENT_ACCOUNTS INDEXES
-- ============================================================================
-- Used in: account lookups, platform filtering

-- Composite index for plan+platform lookups
CREATE INDEX IF NOT EXISTS idx_content_accounts_plan_platform
  ON content_accounts(plan_id, platform_id, is_active);

-- ============================================================================
-- CONTENT_CAMPAIGNS INDEXES
-- ============================================================================
-- Used in: campaign lists, date filtering

-- Composite index for active campaigns in date range
CREATE INDEX IF NOT EXISTS idx_content_campaigns_active_dates
  ON content_campaigns(plan_id, status, start_date, end_date)
  WHERE status IN ('active', 'draft');

-- ============================================================================
-- CONTENT_CAMPAIGN_POSTS INDEXES
-- ============================================================================
-- Used in: campaign-distribution linking

-- Index for distribution lookups (reverse lookup)
CREATE INDEX IF NOT EXISTS idx_content_campaign_posts_distribution
  ON content_campaign_posts(distribution_id);

-- ============================================================================
-- ANNUAL_KRS INDEXES
-- ============================================================================
-- Used in: KR lists, objective rollups

-- Composite index for objective KRs with sorting
CREATE INDEX IF NOT EXISTS idx_annual_krs_objective_sort
  ON annual_krs(objective_id, sort_order);

-- Index for KRs by owner
CREATE INDEX IF NOT EXISTS idx_annual_krs_owner_active
  ON annual_krs(owner_id)
  WHERE owner_id IS NOT NULL;

-- ============================================================================
-- QUARTER_TARGETS INDEXES
-- ============================================================================
-- Used in: quarter views, target lookups

-- Composite index for KR quarter targets
CREATE INDEX IF NOT EXISTS idx_quarter_targets_kr_quarter
  ON quarter_targets(annual_kr_id, quarter);

-- ============================================================================
-- PLAN_MEMBERS INDEXES
-- ============================================================================
-- Critical for RLS policy performance

-- Composite index for role-based access checks (used heavily in RLS)
CREATE INDEX IF NOT EXISTS idx_plan_members_user_role
  ON plan_members(user_id, role, plan_id);

-- ============================================================================
-- COMMENT: Index Analysis Summary
-- ============================================================================
--
-- This migration adds 30+ indexes targeting:
-- 1. N+1 query reduction via composite indexes
-- 2. Common filter patterns (status + date + priority)
-- 3. Partial indexes for hot data subsets
-- 4. RLS policy optimization (plan_members lookups)
--
-- Expected impact:
-- - Faster timeline/activity queries (idx_activity_events_*)
-- - Faster task filtering (idx_tasks_plan_status_*)
-- - Faster notification queries (idx_notifications_user_*)
-- - Faster content calendar queries (idx_content_distributions_*)
-- - Improved RLS policy execution (idx_plan_members_user_role)
-- ============================================================================
