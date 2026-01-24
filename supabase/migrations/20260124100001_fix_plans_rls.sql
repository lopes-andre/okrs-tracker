-- ============================================================================
-- Migration: Fix RLS on plans table
-- ============================================================================
--
-- Issue: Supabase linter reports RLS is disabled on plans table despite
--        policies being defined. This migration ensures RLS is enabled.
--
-- Security Impact: HIGH - Without RLS, any authenticated user could
--                  potentially access all plans in the system.
--
-- Rollback: See emergency_rollback_rls_fix.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify required policies exist before enabling RLS
-- ============================================================================
-- This prevents enabling RLS without policies (which would lock everyone out)

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count existing policies on plans table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'plans' AND schemaname = 'public';

  -- We expect at least 4 policies (SELECT, INSERT, UPDATE, DELETE)
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 policies on plans table, found %. Aborting migration.', policy_count;
  END IF;

  RAISE NOTICE 'Found % policies on plans table. Proceeding with RLS enable.', policy_count;
END $$;

-- ============================================================================
-- STEP 2: Enable RLS on plans table
-- ============================================================================
-- This enables Row Level Security. If already enabled, this is a no-op.

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Force RLS for table owner
-- ============================================================================
-- FORCE ensures RLS applies even to the table owner and superusers.
-- This is important because Supabase service_role bypasses RLS by default,
-- but we want to ensure the authenticated role always goes through RLS.

ALTER TABLE plans FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Verify RLS is enabled
-- ============================================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
  rls_forced BOOLEAN;
BEGIN
  SELECT relrowsecurity, relforcerowsecurity
  INTO rls_enabled, rls_forced
  FROM pg_class
  WHERE relname = 'plans' AND relnamespace = 'public'::regnamespace;

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS is still not enabled on plans table after migration!';
  END IF;

  IF NOT rls_forced THEN
    RAISE WARNING 'RLS FORCE may not be set on plans table';
  END IF;

  RAISE NOTICE 'SUCCESS: RLS is enabled on plans table (forced: %)', rls_forced;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE plans IS 'OKR plans with RLS enabled. Access controlled via plan_members.';
