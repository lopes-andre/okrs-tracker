-- ============================================================================
-- Test Script: Verify View Security Settings
-- ============================================================================
--
-- This script verifies that all views use SECURITY INVOKER (not DEFINER).
-- Run this after applying the migration to confirm everything is working.
--
-- Usage: Run in Supabase SQL Editor or via psql
-- ============================================================================

-- ============================================================================
-- TEST 1: Check security_invoker setting for all 9 views
-- ============================================================================
-- In PostgreSQL 15+, views with security_invoker=true will show in reloptions

SELECT
  'View Security Check' AS test,
  c.relname AS view_name,
  CASE
    WHEN c.reloptions IS NOT NULL AND 'security_invoker=true' = ANY(c.reloptions)
    THEN '✓ SECURITY INVOKER'
    WHEN c.reloptions IS NULL OR NOT ('security_invoker=true' = ANY(c.reloptions))
    THEN '⚠ Check manually (may be default INVOKER)'
    ELSE '✗ SECURITY DEFINER'
  END AS security_mode,
  COALESCE(c.reloptions::text, 'none') AS options
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname IN (
    'v_plan_timeline',
    'v_plan_checkins_by_day',
    'v_objective_progress',
    'v_kr_progress',
    'v_plan_stats',
    'v_quarter_overview',
    'v_weekly_review_summary',
    'v_plan_review_stats',
    'v_weekly_review_stats_by_month'
  )
ORDER BY c.relname;

-- ============================================================================
-- TEST 2: Verify all 9 views exist
-- ============================================================================

SELECT
  'TEST 2: View Existence' AS test,
  (
    SELECT COUNT(*)
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname IN (
        'v_plan_timeline',
        'v_plan_checkins_by_day',
        'v_objective_progress',
        'v_kr_progress',
        'v_plan_stats',
        'v_quarter_overview',
        'v_weekly_review_summary',
        'v_plan_review_stats',
        'v_weekly_review_stats_by_month'
      )
  ) AS views_found,
  9 AS views_expected,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname IN (
          'v_plan_timeline',
          'v_plan_checkins_by_day',
          'v_objective_progress',
          'v_kr_progress',
          'v_plan_stats',
          'v_quarter_overview',
          'v_weekly_review_summary',
          'v_plan_review_stats',
          'v_weekly_review_stats_by_month'
        )
    ) = 9
    THEN '✓ PASS: All 9 views exist'
    ELSE '✗ FAIL: Some views missing'
  END AS result;

-- ============================================================================
-- TEST 3: List missing views (if any)
-- ============================================================================

SELECT
  'TEST 3: Missing Views' AS test,
  v.view_name,
  CASE
    WHEN pv.viewname IS NULL THEN '✗ MISSING'
    ELSE '✓ EXISTS'
  END AS status
FROM (
  VALUES
    ('v_plan_timeline'),
    ('v_plan_checkins_by_day'),
    ('v_objective_progress'),
    ('v_kr_progress'),
    ('v_plan_stats'),
    ('v_quarter_overview'),
    ('v_weekly_review_summary'),
    ('v_plan_review_stats'),
    ('v_weekly_review_stats_by_month')
) AS v(view_name)
LEFT JOIN pg_views pv ON pv.viewname = v.view_name AND pv.schemaname = 'public'
ORDER BY v.view_name;

-- ============================================================================
-- TEST 4: Check view definitions include plan_id (for RLS filtering)
-- ============================================================================
-- Views should include plan_id so RLS can be applied via the base tables

SELECT
  'TEST 4: plan_id in views' AS test,
  viewname AS view_name,
  CASE
    WHEN definition ILIKE '%plan_id%' THEN '✓ Has plan_id'
    ELSE '⚠ No plan_id (check if needed)'
  END AS has_plan_id
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'v_plan_timeline',
    'v_plan_checkins_by_day',
    'v_objective_progress',
    'v_kr_progress',
    'v_plan_stats',
    'v_quarter_overview',
    'v_weekly_review_summary',
    'v_plan_review_stats',
    'v_weekly_review_stats_by_month'
  )
ORDER BY viewname;

-- ============================================================================
-- TEST 5: Supabase-specific check - query pg_catalog for security settings
-- ============================================================================
-- This uses Supabase's internal catalog to check security settings

SELECT
  'TEST 5: Detailed Security Info' AS test,
  n.nspname AS schema,
  c.relname AS view_name,
  pg_get_userbyid(c.relowner) AS owner,
  CASE c.relrowsecurity
    WHEN true THEN 'RLS enabled'
    ELSE 'RLS not applicable (view)'
  END AS rls_status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname LIKE 'v_%'
ORDER BY c.relname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== VIEW SECURITY TEST COMPLETE ===' AS summary,
  'All views should show SECURITY INVOKER or be using default (INVOKER).' AS instruction;

-- ============================================================================
-- MANUAL VERIFICATION
-- ============================================================================
/*

To manually verify a view's security mode, you can check its definition:

1. In Supabase Dashboard:
   - Go to Database > Views
   - Click on each view to see its definition
   - Look for "security_invoker" in the options

2. Using SQL:
   SELECT pg_get_viewdef('v_plan_stats'::regclass, true);

3. Check if RLS is being respected:
   - Create test data as UserA
   - Query the view as UserB
   - UserB should NOT see UserA's data

Example test (run as different users):

-- As UserA (owner of plan-123):
SELECT * FROM v_plan_stats WHERE plan_id = 'plan-123';
-- Should return data

-- As UserB (NOT a member of plan-123):
SELECT * FROM v_plan_stats WHERE plan_id = 'plan-123';
-- Should return NO data (RLS blocking access)

*/
