-- ============================================================================
-- Migration 027: Task Visibility by Role
-- ============================================================================
-- Critical security feature: Restrict task visibility based on plan role.
--
-- BEFORE: All plan members can see ALL tasks
-- AFTER:
--   - Owners see all tasks in the plan
--   - Non-owners (editors, viewers) see only tasks assigned to them
--
-- This affects: tasks, task_assignees, task_tags, task_recurrence_rules,
--               task_recurrence_instances, comments (on tasks)
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Check if user is plan owner
-- ============================================================================

CREATE OR REPLACE FUNCTION is_plan_owner(p_plan_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.plan_members
    WHERE plan_id = p_plan_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
END;
$$;

COMMENT ON FUNCTION is_plan_owner IS 'Returns true if the current user is an owner of the specified plan';

-- ============================================================================
-- HELPER FUNCTION: Check if user can view a specific task
-- ============================================================================

CREATE OR REPLACE FUNCTION can_view_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Get the plan_id for this task
  SELECT plan_id INTO v_plan_id
  FROM public.tasks
  WHERE id = p_task_id;

  IF v_plan_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Owners can see all tasks
  IF is_plan_owner(v_plan_id) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is assigned to the task (via task_assignees table)
  IF EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = p_task_id
    AND user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check legacy assigned_to column
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = p_task_id
    AND assigned_to = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION can_view_task IS 'Returns true if the current user can view the specified task (owner or assigned)';

-- ============================================================================
-- UPDATE TASKS SELECT POLICY
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Tasks viewable by members" ON tasks;

-- Create new role-based visibility policy
-- Owners see all tasks in the plan
-- Non-owners see only tasks assigned to them
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
    -- User is assigned to task (via task_assignees junction table)
    EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id
      AND ta.user_id = auth.uid()
    )
    OR
    -- User is assigned via legacy assigned_to column
    tasks.assigned_to = auth.uid()
  );

-- ============================================================================
-- UPDATE TASK_ASSIGNEES SELECT POLICY
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Task assignees viewable by members" ON task_assignees;

-- Task assignees visibility should follow task visibility
CREATE POLICY "Task assignees viewable by role"
  ON task_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
      AND (
        -- User is plan owner
        EXISTS (
          SELECT 1 FROM public.plan_members pm
          WHERE pm.plan_id = t.plan_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
        OR
        -- User is assigned to this task (self-reference is allowed)
        EXISTS (
          SELECT 1 FROM public.task_assignees ta2
          WHERE ta2.task_id = t.id
          AND ta2.user_id = auth.uid()
        )
        OR
        -- Legacy assigned_to
        t.assigned_to = auth.uid()
      )
    )
  );

-- ============================================================================
-- UPDATE TASK_TAGS SELECT POLICY
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Task tags viewable by members" ON task_tags;

-- Task tags visibility should follow task visibility
CREATE POLICY "Task tags viewable by role"
  ON task_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_tags.task_id
      AND (
        -- User is plan owner
        EXISTS (
          SELECT 1 FROM public.plan_members pm
          WHERE pm.plan_id = t.plan_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
        OR
        -- User is assigned to this task
        EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = t.id
          AND ta.user_id = auth.uid()
        )
        OR
        -- Legacy assigned_to
        t.assigned_to = auth.uid()
      )
    )
  );

-- ============================================================================
-- UPDATE TASK_RECURRENCE_RULES SELECT POLICY
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Recurrence rules viewable by members" ON task_recurrence_rules;

-- Recurrence rules visibility should follow task visibility
CREATE POLICY "Recurrence rules viewable by role"
  ON task_recurrence_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_recurrence_rules.task_id
      AND (
        -- User is plan owner
        EXISTS (
          SELECT 1 FROM public.plan_members pm
          WHERE pm.plan_id = t.plan_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
        OR
        -- User is assigned to this task
        EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = t.id
          AND ta.user_id = auth.uid()
        )
        OR
        -- Legacy assigned_to
        t.assigned_to = auth.uid()
      )
    )
  );

-- ============================================================================
-- UPDATE TASK_RECURRENCE_INSTANCES SELECT POLICY
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Recurrence instances viewable by members" ON task_recurrence_instances;

-- Recurrence instances visibility should follow task visibility
CREATE POLICY "Recurrence instances viewable by role"
  ON task_recurrence_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.task_recurrence_rules trr
      JOIN public.tasks t ON t.id = trr.task_id
      WHERE trr.id = task_recurrence_instances.recurrence_rule_id
      AND (
        -- User is plan owner
        EXISTS (
          SELECT 1 FROM public.plan_members pm
          WHERE pm.plan_id = t.plan_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
        OR
        -- User is assigned to this task
        EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = t.id
          AND ta.user_id = auth.uid()
        )
        OR
        -- Legacy assigned_to
        t.assigned_to = auth.uid()
      )
    )
  );

-- ============================================================================
-- UPDATE ACTIVITY_EVENTS SELECT POLICY
-- ============================================================================
-- Activity events for tasks should only be visible if the task is visible

-- Drop existing policy
DROP POLICY IF EXISTS "Activity events viewable by members" ON activity_events;

-- Create new policy that filters task events by task visibility
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
      -- Task events: user is plan owner
      EXISTS (
        SELECT 1 FROM public.plan_members pm
        WHERE pm.plan_id = activity_events.plan_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
      )
      OR
      -- Task events: user is assigned to the task
      EXISTS (
        SELECT 1 FROM public.task_assignees ta
        WHERE ta.task_id = activity_events.entity_id
        AND ta.user_id = auth.uid()
      )
      OR
      -- Task events: legacy assigned_to check
      EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = activity_events.entity_id
        AND t.assigned_to = auth.uid()
      )
    )
  );

-- ============================================================================
-- UPDATE COMMENTS SELECT POLICY
-- ============================================================================
-- Comments are attached to tasks, so visibility follows task visibility

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view comments in their plans" ON comments;

-- Create new policy that respects task visibility
CREATE POLICY "Comments viewable by task visibility"
  ON comments FOR SELECT
  TO authenticated
  USING (
    -- User is plan owner - can see all task comments
    EXISTS (
      SELECT 1 FROM public.plan_members pm
      WHERE pm.plan_id = comments.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
    OR
    -- User is assigned to the task (via task_assignees)
    EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = comments.task_id
      AND ta.user_id = auth.uid()
    )
    OR
    -- User is assigned via legacy assigned_to
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = comments.task_id
      AND t.assigned_to = auth.uid()
    )
  );

-- ============================================================================
-- UPDATE COMMENT_MENTIONS SELECT POLICY
-- ============================================================================
-- Mentions follow comment visibility

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view mentions in their plans" ON comment_mentions;

-- Create new policy
CREATE POLICY "Mentions viewable by task visibility"
  ON comment_mentions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_mentions.comment_id
      AND (
        -- User is plan owner
        EXISTS (
          SELECT 1 FROM public.plan_members pm
          WHERE pm.plan_id = c.plan_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
        OR
        -- User is assigned to the task
        EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = c.task_id
          AND ta.user_id = auth.uid()
        )
        OR
        -- Legacy assigned_to
        EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.id = c.task_id
          AND t.assigned_to = auth.uid()
        )
      )
    )
  );

-- ============================================================================
-- Note: Write policies (INSERT, UPDATE, DELETE) remain unchanged.
-- Editors can still modify tasks they have access to through other policies.
-- The visibility restriction only applies to SELECT operations.
-- ============================================================================
