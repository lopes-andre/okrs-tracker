-- ============================================================================
-- Comprehensive RLS Test Script
-- ============================================================================
--
-- This script tests all RLS configurations after applying the security fix.
-- Run this in Supabase SQL Editor after applying migrations.
--
-- Note: Some tests require running as different authenticated users.
--       Tests marked [MANUAL] need to be run from the browser console.
-- ============================================================================

-- ============================================================================
-- SECTION 1: Database State Verification
-- ============================================================================

\echo '=== SECTION 1: Database State Verification ==='

-- Test 1.1: RLS enabled on plans
SELECT
  '1.1 Plans RLS Status' AS test,
  CASE WHEN relrowsecurity THEN '✓ PASS' ELSE '✗ FAIL' END AS result,
  'RLS should be enabled' AS expected
FROM pg_class
WHERE relname = 'plans' AND relnamespace = 'public'::regnamespace;

-- Test 1.2: RLS forced on plans
SELECT
  '1.2 Plans RLS Forced' AS test,
  CASE WHEN relforcerowsecurity THEN '✓ PASS' ELSE '⚠ WARNING' END AS result,
  'RLS FORCE should be enabled' AS expected
FROM pg_class
WHERE relname = 'plans' AND relnamespace = 'public'::regnamespace;

-- Test 1.3: Plans policies exist
SELECT
  '1.3 Plans Policies Count' AS test,
  CASE WHEN COUNT(*) >= 4 THEN '✓ PASS' ELSE '✗ FAIL' END AS result,
  COUNT(*) || ' policies found (need >= 4)' AS details
FROM pg_policies
WHERE tablename = 'plans' AND schemaname = 'public';

-- Test 1.4: All required policies exist
SELECT
  '1.4 Required Policies' AS test,
  CASE
    WHEN COUNT(DISTINCT cmd) = 4 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS result,
  string_agg(DISTINCT cmd, ', ') AS operations_covered
FROM pg_policies
WHERE tablename = 'plans' AND schemaname = 'public';

-- ============================================================================
-- SECTION 2: View Security Verification
-- ============================================================================

\echo ''
\echo '=== SECTION 2: View Security Verification ==='

-- Test 2.1: All views exist
WITH expected_views AS (
  SELECT unnest(ARRAY[
    'v_plan_timeline',
    'v_plan_checkins_by_day',
    'v_objective_progress',
    'v_kr_progress',
    'v_plan_stats',
    'v_quarter_overview',
    'v_weekly_review_summary',
    'v_plan_review_stats',
    'v_weekly_review_stats_by_month'
  ]) AS view_name
),
found_views AS (
  SELECT viewname FROM pg_views WHERE schemaname = 'public'
)
SELECT
  '2.1 Views Existence' AS test,
  CASE
    WHEN COUNT(*) FILTER (WHERE f.viewname IS NULL) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE f.viewname IS NULL) || ' missing'
  END AS result
FROM expected_views e
LEFT JOIN found_views f ON e.view_name = f.viewname;

-- Test 2.2: Views have security_invoker option
SELECT
  '2.2 View: ' || c.relname AS test,
  CASE
    WHEN c.reloptions IS NOT NULL AND 'security_invoker=true' = ANY(c.reloptions) THEN '✓ PASS'
    ELSE '⚠ CHECK'
  END AS result,
  COALESCE(c.reloptions::text, 'no options set') AS options
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname LIKE 'v_%'
ORDER BY c.relname;

-- ============================================================================
-- SECTION 3: Policy Details
-- ============================================================================

\echo ''
\echo '=== SECTION 3: Policy Details ==='

-- Test 3.1: List all plans policies with details
SELECT
  '3.1 Policy: ' || policyname AS test,
  cmd AS operation,
  CASE permissive WHEN 'PERMISSIVE' THEN 'permissive' ELSE 'restrictive' END AS type,
  roles::text AS roles
FROM pg_policies
WHERE tablename = 'plans' AND schemaname = 'public'
ORDER BY cmd;

-- ============================================================================
-- SECTION 4: Helper Functions
-- ============================================================================

\echo ''
\echo '=== SECTION 4: Helper Functions ==='

-- Test 4.1: has_plan_access function exists
SELECT
  '4.1 has_plan_access function' AS test,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_plan_access')
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS result;

-- Test 4.2: get_plan_id_from_objective function exists
SELECT
  '4.2 get_plan_id_from_objective function' AS test,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_plan_id_from_objective')
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS result;

-- Test 4.3: get_plan_id_from_annual_kr function exists
SELECT
  '4.3 get_plan_id_from_annual_kr function' AS test,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_plan_id_from_annual_kr')
    THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS result;

-- ============================================================================
-- SECTION 5: RLS on Related Tables
-- ============================================================================

\echo ''
\echo '=== SECTION 5: RLS on Related Tables ==='

-- Check RLS status on all OKR-related tables
SELECT
  '5.x ' || relname AS test,
  CASE WHEN relrowsecurity THEN '✓ RLS ON' ELSE '✗ RLS OFF' END AS status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'plans', 'plan_members', 'objectives', 'annual_krs',
    'quarter_targets', 'tasks', 'check_ins', 'tags',
    'activity_events', 'weekly_reviews'
  )
ORDER BY c.relname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo ''
\echo '=== TEST SUMMARY ==='

SELECT
  'Total tables with RLS enabled' AS metric,
  COUNT(*) FILTER (WHERE relrowsecurity)::text || ' / ' || COUNT(*)::text AS value
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'plans', 'plan_members', 'objectives', 'annual_krs',
    'quarter_targets', 'tasks', 'check_ins', 'tags',
    'activity_events', 'weekly_reviews'
  );

SELECT
  'Views with security_invoker' AS metric,
  COUNT(*) FILTER (WHERE c.reloptions IS NOT NULL AND 'security_invoker=true' = ANY(c.reloptions))::text
    || ' / 9' AS value
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname LIKE 'v_%';

\echo ''
\echo '=== END OF TESTS ==='
\echo 'Review results above. All tests should show ✓ PASS.'
\echo 'Tests showing ⚠ CHECK may need manual verification.'
\echo 'Tests showing ✗ FAIL indicate a problem that needs fixing.'
