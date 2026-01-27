-- ============================================================================
-- Migration 030: Private Tasks Feature
-- ============================================================================
-- Adds is_private flag to tasks. Private tasks are only visible to plan owners.
-- ============================================================================

-- ============================================================================
-- ADD is_private COLUMN
-- ============================================================================

ALTER TABLE tasks ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient filtering of private tasks
CREATE INDEX idx_tasks_is_private ON tasks(plan_id, is_private) WHERE is_private = true;

COMMENT ON COLUMN tasks.is_private IS 'When true, task is only visible to plan owners';

-- ============================================================================
-- UPDATE TASKS SELECT POLICY
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Tasks viewable by members" ON tasks;

-- New policy: Task visible if (not private) OR (user is owner)
CREATE POLICY "Tasks viewable with privacy"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    -- User must have plan access first
    has_plan_access(plan_id, 'viewer')
    AND (
      -- Task is not private - all members can see
      is_private = false
      OR
      -- Task is private - only owners can see
      EXISTS (
        SELECT 1 FROM public.plan_members pm
        WHERE pm.plan_id = tasks.plan_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
      )
    )
  );

-- ============================================================================
-- UPDATE ACTIVITY_EVENTS SELECT POLICY
-- ============================================================================
-- Activity events for private tasks should only be visible to owners

DROP POLICY IF EXISTS "Activity events viewable by members" ON activity_events;

CREATE POLICY "Activity events viewable with privacy"
  ON activity_events FOR SELECT
  TO authenticated
  USING (
    has_plan_access(plan_id, 'viewer')
    AND (
      -- Non-task events visible to all members
      entity_type != 'task'
      OR
      -- Task events: check if the task is visible to user
      -- Task exists and is not private
      EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = activity_events.entity_id
        AND t.is_private = false
      )
      OR
      -- Task exists and is private but user is owner
      EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = activity_events.entity_id
        AND t.is_private = true
        AND EXISTS (
          SELECT 1 FROM public.plan_members pm
          WHERE pm.plan_id = t.plan_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
      )
      OR
      -- Task was deleted - show to owners only (they could see anything)
      (
        NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = activity_events.entity_id)
        AND EXISTS (
          SELECT 1 FROM public.plan_members pm
          WHERE pm.plan_id = activity_events.plan_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
      )
    )
  );

-- ============================================================================
-- Note: Related table policies (task_tags, task_assignees, comments, etc.)
-- already reference tasks table, so they automatically inherit private
-- task filtering through their JOIN conditions.
-- ============================================================================
