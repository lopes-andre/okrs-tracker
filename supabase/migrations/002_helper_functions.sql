-- ============================================================================
-- Migration 002: Helper Functions
-- ============================================================================
-- Core utility functions used by triggers and RLS policies.
-- These must be created before tables that use them in triggers.
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_updated_at IS 'Trigger function to automatically set updated_at timestamp';

-- ============================================================================
-- HELPER FUNCTION: Role comparison
-- ============================================================================

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

COMMENT ON FUNCTION okr_role_rank IS 'Returns numeric rank for role comparison (owner=3, editor=2, viewer=1)';

-- ============================================================================
-- HELPER FUNCTION: Get current user ID
-- ============================================================================

CREATE OR REPLACE FUNCTION request_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION request_user_id IS 'Returns the current authenticated user ID';
