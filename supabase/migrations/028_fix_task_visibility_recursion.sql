-- ============================================================================
-- Migration 028: Fix Task Visibility RLS Recursion
-- ============================================================================
-- Fixes infinite recursion in task visibility policies by using SECURITY DEFINER
-- functions that bypass RLS for internal permission checks.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Get plan_id for a task (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_task_plan_id(p_task_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT plan_id FROM public.tasks WHERE id = p_task_id;
$$;

COMMENT ON FUNCTION get_task_plan_id IS 'Returns the plan_id for a task, bypassing RLS';

-- ============================================================================
-- HELPER FUNCTION: Check if user is assigned to a task (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_task_assignee(p_task_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = p_task_id
    AND user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION is_task_assignee IS 'Returns true if user is assigned to task, bypassing RLS';

-- ============================================================================
-- HELPER FUNCTION: Check if user can view a task (bypasses RLS)
-- ============================================================================

-- Drop and recreate to use SQL instead of plpgsql (avoids nested RLS issues)
DROP FUNCTION IF EXISTS can_view_task(UUID);

CREATE OR REPLACE FUNCTION can_view_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    -- User is plan owner
    EXISTS (
      SELECT 1 FROM public.plan_members pm
      JOIN public.tasks t ON t.plan_id = pm.plan_id
      WHERE t.id = p_task_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
    OR
    -- User is assigned via task_assignees
    EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = p_task_id
      AND ta.user_id = auth.uid()
    )
    OR
    -- User is assigned via legacy assigned_to
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = p_task_id
      AND t.assigned_to = auth.uid()
    );
$$;

COMMENT ON FUNCTION can_view_task IS 'Returns true if user can view task (owner or assigned), bypassing RLS';

-- ============================================================================
-- UPDATE TASKS SELECT POLICY - Use simpler direct checks
-- ============================================================================

DROP POLICY IF EXISTS "Tasks viewable by role" ON tasks;

CREATE POLICY "Tasks viewable by role"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    -- User is plan owner - can see all tasks
    EXISTS (
      SELECT 1 FROM public.plan_members pm
      WHERE pm.plan_id = tasks.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
    OR
    -- User is assigned to task - use SECURITY DEFINER function to avoid recursion
    is_task_assignee(tasks.id, auth.uid())
    OR
    -- User is assigned via legacy assigned_to column
    tasks.assigned_to = auth.uid()
  );

-- ============================================================================
-- UPDATE TASK_ASSIGNEES SELECT POLICY - Use helper function
-- ============================================================================

DROP POLICY IF EXISTS "Task assignees viewable by role" ON task_assignees;

CREATE POLICY "Task assignees viewable by role"
  ON task_assignees FOR SELECT
  TO authenticated
  USING (
    -- Use SECURITY DEFINER function to check visibility without triggering RLS
    can_view_task(task_assignees.task_id)
  );

-- ============================================================================
-- UPDATE TASK_TAGS SELECT POLICY - Use helper function
-- ============================================================================

DROP POLICY IF EXISTS "Task tags viewable by role" ON task_tags;

CREATE POLICY "Task tags viewable by role"
  ON task_tags FOR SELECT
  TO authenticated
  USING (
    can_view_task(task_tags.task_id)
  );

-- ============================================================================
-- UPDATE TASK_RECURRENCE_RULES SELECT POLICY - Use helper function
-- ============================================================================

DROP POLICY IF EXISTS "Recurrence rules viewable by role" ON task_recurrence_rules;

CREATE POLICY "Recurrence rules viewable by role"
  ON task_recurrence_rules FOR SELECT
  TO authenticated
  USING (
    can_view_task(task_recurrence_rules.task_id)
  );

-- ============================================================================
-- UPDATE TASK_RECURRENCE_INSTANCES SELECT POLICY - Use helper function
-- ============================================================================

DROP POLICY IF EXISTS "Recurrence instances viewable by role" ON task_recurrence_instances;

CREATE POLICY "Recurrence instances viewable by role"
  ON task_recurrence_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_recurrence_rules trr
      WHERE trr.id = task_recurrence_instances.recurrence_rule_id
      AND can_view_task(trr.task_id)
    )
  );

-- ============================================================================
-- UPDATE ACTIVITY_EVENTS SELECT POLICY - Use helper function for task events
-- ============================================================================

DROP POLICY IF EXISTS "Activity events viewable by role" ON activity_events;

CREATE POLICY "Activity events viewable by role"
  ON activity_events FOR SELECT
  TO authenticated
  USING (
    -- First check: user has basic plan access
    has_plan_access(plan_id, 'viewer')
    AND
    -- Second check: for task events, verify task visibility
    (
      -- Non-task events are visible to all plan members
      entity_type != 'task'
      OR
      -- Task events: use helper function
      can_view_task(entity_id)
    )
  );

-- ============================================================================
-- UPDATE COMMENTS SELECT POLICY - Use helper function
-- ============================================================================

DROP POLICY IF EXISTS "Comments viewable by task visibility" ON comments;

CREATE POLICY "Comments viewable by task visibility"
  ON comments FOR SELECT
  TO authenticated
  USING (
    can_view_task(comments.task_id)
  );

-- ============================================================================
-- UPDATE COMMENT_MENTIONS SELECT POLICY - Check via comment's task
-- ============================================================================

DROP POLICY IF EXISTS "Mentions viewable by task visibility" ON comment_mentions;

CREATE POLICY "Mentions viewable by task visibility"
  ON comment_mentions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_mentions.comment_id
      AND can_view_task(c.task_id)
    )
  );
