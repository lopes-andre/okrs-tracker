-- ============================================================================
-- Migration: Fix Plans SELECT Policy
-- Description: Allow plan creators to view their plans immediately after creation
--
-- This fixes a chicken-and-egg RLS problem where:
-- 1. User creates a plan
-- 2. Trigger tries to add user to plan_members
-- 3. The plan_members INSERT policy checks if plan exists via SELECT
-- 4. But the plans SELECT policy required user to be a member first
--
-- The fix allows creators to SELECT their own plans even before being a member.
-- The original trigger (on_plan_created -> handle_new_plan) in 003_core_tables.sql
-- handles adding the creator as owner.
-- ============================================================================

-- Update plans SELECT policy to allow creators to view their plans
DROP POLICY IF EXISTS "Plans are viewable by members" ON plans;
DROP POLICY IF EXISTS "Plans are viewable by members or creator" ON plans;

CREATE POLICY "Plans are viewable by members or creator"
  ON plans FOR SELECT
  TO authenticated
  USING (
    has_plan_access(id, 'viewer')
    OR created_by = auth.uid()
  );
