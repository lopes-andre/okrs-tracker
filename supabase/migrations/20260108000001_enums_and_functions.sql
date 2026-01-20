-- Migration: Enums and Helper Functions
-- Description: Create all enum types and utility functions used across the schema

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Role enum for plan membership
CREATE TYPE okr_role AS ENUM ('owner', 'editor', 'viewer');

-- Key Result type enum
CREATE TYPE kr_type AS ENUM ('metric', 'count', 'milestone', 'rate', 'average');

-- Direction for KR tracking (are we trying to increase, decrease, or maintain?)
CREATE TYPE kr_direction AS ENUM ('increase', 'decrease', 'maintain');

-- How quarterly targets aggregate
CREATE TYPE kr_aggregation AS ENUM ('reset_quarterly', 'cumulative');

-- Task status enum
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Task priority enum
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Task effort enum (work required)
CREATE TYPE task_effort AS ENUM ('light', 'moderate', 'heavy');

-- Tag categorization
CREATE TYPE tag_kind AS ENUM ('platform', 'funnel_stage', 'initiative', 'category', 'custom');

-- Entity types for activity events
CREATE TYPE event_entity_type AS ENUM (
  'task', 
  'check_in', 
  'member', 
  'objective', 
  'annual_kr', 
  'quarter_target', 
  'plan'
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
  'role_changed'
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get numeric rank for role comparison (higher = more permissions)
CREATE OR REPLACE FUNCTION okr_role_rank(role okr_role)
RETURNS INT AS $$
BEGIN
  RETURN CASE role
    WHEN 'owner' THEN 3
    WHEN 'editor' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get the current user ID from the request (for RLS)
-- This uses Supabase's auth.uid() function
CREATE OR REPLACE FUNCTION request_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION set_updated_at IS 'Trigger function to automatically set updated_at timestamp';
COMMENT ON FUNCTION okr_role_rank IS 'Returns numeric rank for role comparison (owner=3, editor=2, viewer=1)';

-- NOTE: has_plan_access and get_plan_id_from_* functions are created in migration 003
-- after the tables they reference exist.
