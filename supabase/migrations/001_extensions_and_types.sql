-- ============================================================================
-- Migration 001: Extensions and Types
-- ============================================================================
-- Creates all enum types used across the schema.
-- These must be created before any tables that reference them.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Role in a plan (owner has full control, editor can modify, viewer read-only)
CREATE TYPE okr_role AS ENUM ('owner', 'editor', 'viewer');

-- Key Result type (how the KR is measured)
CREATE TYPE kr_type AS ENUM ('metric', 'count', 'milestone', 'rate', 'average');

-- Direction for KR tracking
CREATE TYPE kr_direction AS ENUM ('increase', 'decrease', 'maintain');

-- How quarterly targets aggregate
CREATE TYPE kr_aggregation AS ENUM ('reset_quarterly', 'cumulative');

-- Task status
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Task priority
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Task effort (work estimate)
CREATE TYPE task_effort AS ENUM ('light', 'moderate', 'heavy');

-- Tag categorization
CREATE TYPE tag_kind AS ENUM ('platform', 'funnel_stage', 'initiative', 'category', 'custom');

-- Entity types for activity events (includes all entity types)
CREATE TYPE event_entity_type AS ENUM (
  'task',
  'check_in',
  'member',
  'objective',
  'annual_kr',
  'quarter_target',
  'plan',
  'weekly_review',
  'comment'
);

-- Event types for activity timeline
CREATE TYPE event_type AS ENUM (
  'created',
  'updated',
  'deleted',
  'status_changed',
  'completed',
  'joined',
  'left',
  'role_changed',
  'started'
);

-- Weekly review status
CREATE TYPE weekly_review_status AS ENUM (
  'open',      -- Current week, review in progress
  'pending',   -- Past week, review not done
  'late',      -- Completed after the week ended
  'complete'   -- Completed on time
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'mentioned',       -- @mentioned in a comment
  'comment',         -- Someone commented on your task
  'assigned',        -- Assigned to a task
  'unassigned',      -- Removed from a task
  'task_completed',  -- Task you're assigned to was completed
  'task_updated'     -- Task you're assigned to was updated
);

-- Recurrence frequency types
CREATE TYPE recurrence_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

-- End condition types for recurrence
CREATE TYPE recurrence_end_type AS ENUM (
  'never',    -- Repeats indefinitely
  'count',    -- Ends after N occurrences
  'until'     -- Ends on a specific date
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TYPE okr_role IS 'Plan membership role: owner (full control), editor (modify), viewer (read-only)';
COMMENT ON TYPE kr_type IS 'Key Result measurement type';
COMMENT ON TYPE kr_direction IS 'Goal direction: increase, decrease, or maintain the metric';
COMMENT ON TYPE kr_aggregation IS 'How quarters aggregate: reset each quarter or cumulative';
COMMENT ON TYPE task_status IS 'Task workflow status';
COMMENT ON TYPE task_priority IS 'Task priority level';
COMMENT ON TYPE task_effort IS 'Estimated work effort for a task';
COMMENT ON TYPE tag_kind IS 'Tag category for filtering and organization';
COMMENT ON TYPE event_entity_type IS 'Entity types tracked in activity timeline';
COMMENT ON TYPE event_type IS 'Activity event types';
COMMENT ON TYPE weekly_review_status IS 'Weekly review completion status';
COMMENT ON TYPE notification_type IS 'User notification categories';
COMMENT ON TYPE recurrence_frequency IS 'Task recurrence frequency';
COMMENT ON TYPE recurrence_end_type IS 'Task recurrence end condition';
