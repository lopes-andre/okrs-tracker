-- ============================================================================
-- Migration 029: Revert Task Visibility RLS Policies
-- ============================================================================
-- Reverts the role-based task visibility changes from migrations 027 and 028.
-- Restores original behavior: all plan members can see all tasks.
-- ============================================================================

-- ============================================================================
-- DROP HELPER FUNCTIONS ADDED IN 027/028
-- ============================================================================

DROP FUNCTION IF EXISTS can_view_task(UUID);
DROP FUNCTION IF EXISTS is_task_assignee(UUID, UUID);
DROP FUNCTION IF EXISTS get_task_plan_id(UUID);
DROP FUNCTION IF EXISTS is_plan_owner(UUID);

-- ============================================================================
-- RESTORE TASKS SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Tasks viewable by role" ON tasks;

CREATE POLICY "Tasks viewable by members"
  ON tasks FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

-- ============================================================================
-- RESTORE TASK_ASSIGNEES SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Task assignees viewable by role" ON task_assignees;

CREATE POLICY "Task assignees viewable by members"
  ON task_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'viewer')
    )
  );

-- ============================================================================
-- RESTORE TASK_TAGS SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Task tags viewable by role" ON task_tags;

CREATE POLICY "Task tags viewable by members"
  ON task_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'viewer')
    )
  );

-- ============================================================================
-- RESTORE TASK_RECURRENCE_RULES SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Recurrence rules viewable by role" ON task_recurrence_rules;

CREATE POLICY "Recurrence rules viewable by members"
  ON task_recurrence_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'viewer')
    )
  );

-- ============================================================================
-- RESTORE TASK_RECURRENCE_INSTANCES SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Recurrence instances viewable by role" ON task_recurrence_instances;

CREATE POLICY "Recurrence instances viewable by members"
  ON task_recurrence_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_recurrence_rules trr
      JOIN tasks t ON t.id = trr.task_id
      WHERE trr.id = recurrence_rule_id
      AND has_plan_access(t.plan_id, 'viewer')
    )
  );

-- ============================================================================
-- RESTORE ACTIVITY_EVENTS SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Activity events viewable by role" ON activity_events;

CREATE POLICY "Activity events viewable by members"
  ON activity_events FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

-- ============================================================================
-- RESTORE COMMENTS SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Comments viewable by task visibility" ON comments;

CREATE POLICY "Users can view comments in their plans"
  ON comments FOR SELECT
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- RESTORE COMMENT_MENTIONS SELECT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Mentions viewable by task visibility" ON comment_mentions;

CREATE POLICY "Users can view mentions in their plans"
  ON comment_mentions FOR SELECT
  USING (
    comment_id IN (
      SELECT id FROM comments WHERE plan_id IN (
        SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
      )
    )
  );
