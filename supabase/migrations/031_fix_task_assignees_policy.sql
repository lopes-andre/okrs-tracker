-- ============================================================================
-- Migration 031: Fix Task Assignees and Task Tags RLS Policies
-- ============================================================================
-- Fixes broken policies that have no roles assigned (roles: {-}), which
-- prevents editors from managing task assignments and tags.
-- ============================================================================

-- ============================================================================
-- FIX TASK_ASSIGNEES POLICIES
-- ============================================================================

-- Drop all task_assignees policies to start fresh
DROP POLICY IF EXISTS "Editors can manage task assignees" ON task_assignees;
DROP POLICY IF EXISTS "Users can view task assignees in their plans" ON task_assignees;
DROP POLICY IF EXISTS "Task assignees viewable by role" ON task_assignees;
DROP POLICY IF EXISTS "Task assignees viewable by members" ON task_assignees;

-- Recreate correct policies

-- SELECT: All members can view task assignees
CREATE POLICY "Task assignees viewable by members"
  ON task_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND has_plan_access(t.plan_id, 'viewer')
    )
  );

-- INSERT/UPDATE/DELETE: Editors can manage task assignees
CREATE POLICY "Editors can manage task assignees"
  ON task_assignees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  );

-- ============================================================================
-- FIX TASK_TAGS POLICIES
-- ============================================================================

-- Drop stale/broken policies (these have roles: {-})
DROP POLICY IF EXISTS "task_tags_delete" ON task_tags;
DROP POLICY IF EXISTS "task_tags_insert" ON task_tags;
DROP POLICY IF EXISTS "task_tags_select" ON task_tags;

-- The correct policies should already exist, but recreate them to be safe
DROP POLICY IF EXISTS "Task tags viewable by members" ON task_tags;
DROP POLICY IF EXISTS "Editors can manage task tags" ON task_tags;

-- SELECT: All members can view task tags
CREATE POLICY "Task tags viewable by members"
  ON task_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tags.task_id
      AND has_plan_access(t.plan_id, 'viewer')
    )
  );

-- INSERT/UPDATE/DELETE: Editors can manage task tags
CREATE POLICY "Editors can manage task tags"
  ON task_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tags.task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_tags.task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  );

-- ============================================================================
-- FIX NOTIFICATIONS POLICIES
-- ============================================================================

-- Drop all broken policies (all have roles: {-})
DROP POLICY IF EXISTS "Plan members can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

-- Recreate with proper roles

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Plan members can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
