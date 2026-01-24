-- ============================================================================
-- Test Script: Verify RLS on plans table
-- ============================================================================
--
-- This script verifies that RLS is properly configured on the plans table.
-- Run this after applying the migration to confirm everything is working.
--
-- Usage: Run in Supabase SQL Editor or via psql
-- ============================================================================

-- ============================================================================
-- TEST 1: Verify RLS is enabled
-- ============================================================================

SELECT
  'TEST 1: RLS Status' AS test,
  CASE
    WHEN relrowsecurity THEN '✓ PASS: RLS is ENABLED'
    ELSE '✗ FAIL: RLS is DISABLED'
  END AS result,
  CASE
    WHEN relforcerowsecurity THEN '(FORCED)'
    ELSE '(not forced)'
  END AS force_status
FROM pg_class
WHERE relname = 'plans' AND relnamespace = 'public'::regnamespace;

-- ============================================================================
-- TEST 2: List all policies on plans table
-- ============================================================================

SELECT
  'TEST 2: Policies' AS test,
  policyname AS policy_name,
  cmd AS operation,
  CASE
    WHEN permissive = 'PERMISSIVE' THEN 'permissive'
    ELSE 'restrictive'
  END AS type,
  roles::text AS applies_to
FROM pg_policies
WHERE tablename = 'plans' AND schemaname = 'public'
ORDER BY
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- TEST 3: Verify expected policies exist
-- ============================================================================

SELECT
  'TEST 3: Required Policies' AS test,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND cmd = 'SELECT')
    THEN '✓ SELECT policy exists'
    ELSE '✗ SELECT policy MISSING'
  END AS select_policy,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND cmd = 'INSERT')
    THEN '✓ INSERT policy exists'
    ELSE '✗ INSERT policy MISSING'
  END AS insert_policy,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND cmd = 'UPDATE')
    THEN '✓ UPDATE policy exists'
    ELSE '✗ UPDATE policy MISSING'
  END AS update_policy,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND cmd = 'DELETE')
    THEN '✓ DELETE policy exists'
    ELSE '✗ DELETE policy MISSING'
  END AS delete_policy;

-- ============================================================================
-- TEST 4: Count total plans (as service_role - should see all)
-- ============================================================================
-- Note: This runs as the current user. If run in Supabase SQL Editor,
-- it runs as postgres (superuser) which bypasses RLS.
-- The real test is in the application with authenticated users.

SELECT
  'TEST 4: Total Plans Count' AS test,
  COUNT(*) AS total_plans,
  'Run as service_role/postgres to see all plans' AS note
FROM plans;

-- ============================================================================
-- TEST 5: Verify has_plan_access function exists
-- ============================================================================

SELECT
  'TEST 5: has_plan_access function' AS test,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'has_plan_access'
    )
    THEN '✓ Function exists'
    ELSE '✗ Function MISSING - policies may not work!'
  END AS result;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== RLS TEST COMPLETE ===' AS summary,
  'Review results above. All tests should show ✓ PASS.' AS instruction;

-- ============================================================================
-- MANUAL TESTING GUIDE
-- ============================================================================
/*

To fully test RLS, you need to test as different authenticated users:

1. Create two test users (UserA and UserB) in Supabase Auth

2. Have UserA create a plan:
   - Log in as UserA in the app
   - Create a new plan "UserA's Plan"

3. Verify UserB cannot see UserA's plan:
   - Log in as UserB in the app
   - Go to plans list - should NOT see "UserA's Plan"

4. Test via Supabase client (in browser console):

   // As UserA (should see their plan)
   const { data } = await supabase.from('plans').select('*');
   console.log(data); // Should include "UserA's Plan"

   // As UserB (should NOT see UserA's plan)
   const { data } = await supabase.from('plans').select('*');
   console.log(data); // Should NOT include "UserA's Plan"

5. Test policy enforcement:

   // As UserB, try to update UserA's plan (should fail)
   const { error } = await supabase
     .from('plans')
     .update({ name: 'Hacked!' })
     .eq('id', 'userA-plan-id');
   console.log(error); // Should have permission error

*/
