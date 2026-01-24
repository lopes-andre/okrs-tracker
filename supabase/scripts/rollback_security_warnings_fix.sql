-- ============================================================================
-- ROLLBACK SCRIPT: Security Warnings Fix
-- ============================================================================
-- This script reverses the changes made to fix Supabase security warnings.
-- Run this if the security fix migration causes issues.
-- ============================================================================

-- ============================================================================
-- 1. ROLLBACK PLANS INSERT POLICY
-- ============================================================================
-- Restore the original permissive policy

DROP POLICY IF EXISTS "Authenticated users can create plans" ON plans;

CREATE POLICY "Authenticated users can create plans"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 2. ROLLBACK FUNCTION SEARCH PATHS
-- ============================================================================
-- Note: We cannot easily remove search_path from functions without knowing
-- the original function bodies. The functions with search_path should still
-- work correctly. If issues arise, the database can be reset with the
-- original migrations from migrations_archive/.
-- ============================================================================

-- ============================================================================
-- 3. REMOVE ADDED RECURRENCE FUNCTIONS (if needed)
-- ============================================================================
-- Uncomment these if the recurrence functions cause issues:

-- DROP FUNCTION IF EXISTS get_recurring_master_task(UUID);
-- DROP FUNCTION IF EXISTS is_recurring_task(UUID);
-- DROP FUNCTION IF EXISTS get_task_recurrence_info(UUID);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this rollback, verify:
-- 1. Users can still create plans
-- 2. All triggers still work
-- 3. Application functionality is restored
-- ============================================================================
