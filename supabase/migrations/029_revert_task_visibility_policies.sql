-- ============================================================================
-- Migration 029: Revert Task Visibility RLS Policies
-- ============================================================================
-- Reverts the role-based task visibility changes from migrations 027 and 028.
-- Restores original behavior: all plan members can see all tasks.
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL POLICIES THAT DEPEND ON THE HELPER FUNCTIONS
-- ============================================================================
-- Must drop policies BEFORE dropping functions they depend on

DROP POLICY IF EXISTS "Tasks viewable by role" ON tasks;
DROP POLICY IF EXISTS "Task assignees viewable by role" ON task_assignees;
DROP POLICY IF EXISTS "Task tags viewable by role" ON task_tags;
DROP POLICY IF EXISTS "Recurrence rules viewable by role" ON task_recurrence_rules;
DROP POLICY IF EXISTS "Recurrence instances viewable by role" ON task_recurrence_instances;
DROP POLICY IF EXISTS "Activity events viewable by role" ON activity_events;
DROP POLICY IF EXISTS "Comments viewable by task visibility" ON comments;
DROP POLICY IF EXISTS "Mentions viewable by task visibility" ON comment_mentions;

-- ============================================================================
-- STEP 2: DROP HELPER FUNCTIONS ADDED IN 027/028
-- ============================================================================

DROP FUNCTION IF EXISTS can_view_task(UUID);
DROP FUNCTION IF EXISTS is_task_assignee(UUID, UUID);
DROP FUNCTION IF EXISTS get_task_plan_id(UUID);
DROP FUNCTION IF EXISTS is_plan_owner(UUID);

-- ============================================================================
-- STEP 3: RESTORE ORIGINAL POLICIES
-- ============================================================================

-- TASKS: All members can see all tasks
CREATE POLICY "Tasks viewable by members"
  ON tasks FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

-- TASK_ASSIGNEES: All members can see assignees
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

-- TASK_TAGS: All members can see task tags
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

-- TASK_RECURRENCE_RULES: All members can see recurrence rules
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

-- TASK_RECURRENCE_INSTANCES: All members can see recurrence instances
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

-- ACTIVITY_EVENTS: All members can see activity events
CREATE POLICY "Activity events viewable by members"
  ON activity_events FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

-- COMMENTS: All members can see comments
CREATE POLICY "Users can view comments in their plans"
  ON comments FOR SELECT
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

-- COMMENT_MENTIONS: All members can see mentions
CREATE POLICY "Users can view mentions in their plans"
  ON comment_mentions FOR SELECT
  USING (
    comment_id IN (
      SELECT id FROM comments WHERE plan_id IN (
        SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
      )
    )
  );
