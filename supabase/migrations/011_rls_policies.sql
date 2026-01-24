-- ============================================================================
-- Migration 011: Row Level Security Policies
-- ============================================================================
-- Enables RLS and creates access policies for all tables.
-- These policies work with Supabase Auth (authenticated role).
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;
ALTER TABLE plan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE kr_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_krs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarter_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_kr_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_review_kr_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_review_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_recurrence_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PLANS POLICIES
-- ============================================================================

CREATE POLICY "Plans are viewable by members"
  ON plans FOR SELECT
  TO authenticated
  USING (has_plan_access(id, 'viewer'));

CREATE POLICY "Authenticated users can create plans"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update plans"
  ON plans FOR UPDATE
  TO authenticated
  USING (has_plan_access(id, 'owner'))
  WITH CHECK (has_plan_access(id, 'owner'));

CREATE POLICY "Owners can delete plans"
  ON plans FOR DELETE
  TO authenticated
  USING (has_plan_access(id, 'owner'));

-- ============================================================================
-- PLAN_MEMBERS POLICIES
-- ============================================================================

CREATE POLICY "Plan members are viewable by plan members"
  ON plan_members FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Service role can insert plan members"
  ON plan_members FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Plan creators can add themselves as owner"
  ON plan_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = plan_id
      AND plans.created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can add members"
  ON plan_members FOR INSERT
  TO authenticated
  WITH CHECK (
    has_plan_access(plan_id, 'owner')
    AND user_id != auth.uid()
  );

CREATE POLICY "Owners can update member roles"
  ON plan_members FOR UPDATE
  TO authenticated
  USING (
    has_plan_access(plan_id, 'owner')
    AND user_id != auth.uid()
  )
  WITH CHECK (
    has_plan_access(plan_id, 'owner')
    AND role != 'owner'
  );

CREATE POLICY "Owners can remove members"
  ON plan_members FOR DELETE
  TO authenticated
  USING (
    has_plan_access(plan_id, 'owner')
    AND user_id != auth.uid()
  );

CREATE POLICY "Members can leave plans"
  ON plan_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND role != 'owner'
  );

-- ============================================================================
-- PLAN_INVITES POLICIES
-- ============================================================================

CREATE POLICY "Invites viewable by plan members"
  ON plan_invites FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Users can see their own invites"
  ON plan_invites FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners can create invites"
  ON plan_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    has_plan_access(plan_id, 'owner')
    AND invited_by = auth.uid()
  );

CREATE POLICY "Owners can delete invites"
  ON plan_invites FOR DELETE
  TO authenticated
  USING (has_plan_access(plan_id, 'owner'));

-- ============================================================================
-- OBJECTIVES POLICIES
-- ============================================================================

CREATE POLICY "Objectives viewable by members"
  ON objectives FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Editors can create objectives"
  ON objectives FOR INSERT
  TO authenticated
  WITH CHECK (has_plan_access(plan_id, 'editor'));

CREATE POLICY "Editors can update objectives"
  ON objectives FOR UPDATE
  TO authenticated
  USING (has_plan_access(plan_id, 'editor'))
  WITH CHECK (has_plan_access(plan_id, 'editor'));

CREATE POLICY "Editors can delete objectives"
  ON objectives FOR DELETE
  TO authenticated
  USING (has_plan_access(plan_id, 'editor'));

-- ============================================================================
-- KR_GROUPS POLICIES
-- ============================================================================

CREATE POLICY "KR groups viewable by members"
  ON kr_groups FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Editors can manage KR groups"
  ON kr_groups FOR ALL
  TO authenticated
  USING (has_plan_access(plan_id, 'editor'))
  WITH CHECK (has_plan_access(plan_id, 'editor'));

-- ============================================================================
-- ANNUAL_KRS POLICIES
-- ============================================================================

CREATE POLICY "Annual KRs viewable by members"
  ON annual_krs FOR SELECT
  TO authenticated
  USING (has_plan_access(get_plan_id_from_objective(objective_id), 'viewer'));

CREATE POLICY "Editors can create annual KRs"
  ON annual_krs FOR INSERT
  TO authenticated
  WITH CHECK (has_plan_access(get_plan_id_from_objective(objective_id), 'editor'));

CREATE POLICY "Editors can update annual KRs"
  ON annual_krs FOR UPDATE
  TO authenticated
  USING (has_plan_access(get_plan_id_from_objective(objective_id), 'editor'))
  WITH CHECK (has_plan_access(get_plan_id_from_objective(objective_id), 'editor'));

CREATE POLICY "Editors can delete annual KRs"
  ON annual_krs FOR DELETE
  TO authenticated
  USING (has_plan_access(get_plan_id_from_objective(objective_id), 'editor'));

-- ============================================================================
-- QUARTER_TARGETS POLICIES
-- ============================================================================

CREATE POLICY "Quarter targets viewable by members"
  ON quarter_targets FOR SELECT
  TO authenticated
  USING (has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'viewer'));

CREATE POLICY "Editors can manage quarter targets"
  ON quarter_targets FOR ALL
  TO authenticated
  USING (has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'editor'))
  WITH CHECK (has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'editor'));

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

CREATE POLICY "Tasks viewable by members"
  ON tasks FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Editors can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (has_plan_access(plan_id, 'editor'));

CREATE POLICY "Editors can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (has_plan_access(plan_id, 'editor'))
  WITH CHECK (has_plan_access(plan_id, 'editor'));

CREATE POLICY "Editors can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (has_plan_access(plan_id, 'editor'));

-- ============================================================================
-- CHECK_INS POLICIES
-- ============================================================================

CREATE POLICY "Check-ins viewable by members"
  ON check_ins FOR SELECT
  TO authenticated
  USING (has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'viewer'));

CREATE POLICY "Editors can create check-ins"
  ON check_ins FOR INSERT
  TO authenticated
  WITH CHECK (
    has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'editor')
    AND recorded_by = auth.uid()
  );

CREATE POLICY "Users can update own check-ins"
  ON check_ins FOR UPDATE
  TO authenticated
  USING (recorded_by = auth.uid())
  WITH CHECK (recorded_by = auth.uid());

-- ============================================================================
-- TAGS POLICIES
-- ============================================================================

CREATE POLICY "Tags viewable by members"
  ON tags FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Editors can manage tags"
  ON tags FOR ALL
  TO authenticated
  USING (has_plan_access(plan_id, 'editor'))
  WITH CHECK (has_plan_access(plan_id, 'editor'));

-- ============================================================================
-- TAG JUNCTION TABLES POLICIES
-- ============================================================================

CREATE POLICY "Annual KR tags viewable by members"
  ON annual_kr_tags FOR SELECT
  TO authenticated
  USING (
    has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'viewer')
  );

CREATE POLICY "Editors can manage annual KR tags"
  ON annual_kr_tags FOR ALL
  TO authenticated
  USING (has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'editor'))
  WITH CHECK (has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'editor'));

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

CREATE POLICY "Editors can manage task tags"
  ON task_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  );

-- ============================================================================
-- DASHBOARDS POLICIES
-- ============================================================================

CREATE POLICY "Dashboards viewable by members"
  ON dashboards FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Editors can create dashboards"
  ON dashboards FOR INSERT
  TO authenticated
  WITH CHECK (
    has_plan_access(plan_id, 'editor')
    AND created_by = auth.uid()
  );

CREATE POLICY "Dashboard creators can update"
  ON dashboards FOR UPDATE
  TO authenticated
  USING (
    has_plan_access(plan_id, 'editor')
    AND (created_by = auth.uid() OR has_plan_access(plan_id, 'owner'))
  );

CREATE POLICY "Dashboard creators can delete"
  ON dashboards FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR has_plan_access(plan_id, 'owner')
  );

CREATE POLICY "Widgets viewable by members"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dashboards d
      WHERE d.id = dashboard_id
      AND has_plan_access(d.plan_id, 'viewer')
    )
  );

CREATE POLICY "Editors can manage widgets"
  ON dashboard_widgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dashboards d
      WHERE d.id = dashboard_id
      AND has_plan_access(d.plan_id, 'editor')
      AND (d.created_by = auth.uid() OR has_plan_access(d.plan_id, 'owner'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dashboards d
      WHERE d.id = dashboard_id
      AND has_plan_access(d.plan_id, 'editor')
    )
  );

-- ============================================================================
-- ACTIVITY_EVENTS POLICIES
-- ============================================================================

CREATE POLICY "Activity events viewable by members"
  ON activity_events FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Service role can insert activity events"
  ON activity_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Note: Fixed from original - uses user_id not actor_id (column doesn't exist)
CREATE POLICY "Users can insert activity events"
  ON activity_events FOR INSERT
  TO authenticated
  WITH CHECK (
    has_plan_access(plan_id, 'viewer')
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- ============================================================================
-- WEEKLY REVIEWS POLICIES
-- ============================================================================

CREATE POLICY "Users can view weekly reviews for their plans"
  ON weekly_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_reviews.plan_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create weekly reviews"
  ON weekly_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_reviews.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update weekly reviews"
  ON weekly_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_reviews.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners can delete weekly reviews"
  ON weekly_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_reviews.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- ============================================================================
-- WEEKLY REVIEW SETTINGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view review settings for their plans"
  ON weekly_review_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_review_settings.plan_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage review settings"
  ON weekly_review_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plan_members pm
      WHERE pm.plan_id = weekly_review_settings.plan_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- WEEKLY REVIEW KR UPDATES POLICIES
-- ============================================================================

CREATE POLICY "Users can view KR updates for their plans"
  ON weekly_review_kr_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reviews wr
      JOIN plan_members pm ON pm.plan_id = wr.plan_id
      WHERE wr.id = weekly_review_kr_updates.weekly_review_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage KR updates"
  ON weekly_review_kr_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reviews wr
      JOIN plan_members pm ON pm.plan_id = wr.plan_id
      WHERE wr.id = weekly_review_kr_updates.weekly_review_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- WEEKLY REVIEW TASKS POLICIES
-- ============================================================================

CREATE POLICY "Users can view task snapshots for their plans"
  ON weekly_review_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reviews wr
      JOIN plan_members pm ON pm.plan_id = wr.plan_id
      WHERE wr.id = weekly_review_tasks.weekly_review_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage task snapshots"
  ON weekly_review_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM weekly_reviews wr
      JOIN plan_members pm ON pm.plan_id = wr.plan_id
      WHERE wr.id = weekly_review_tasks.weekly_review_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- TASK REMINDER SETTINGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view reminder settings for their plans"
  ON task_reminder_settings FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Editors can manage reminder settings"
  ON task_reminder_settings FOR ALL
  TO authenticated
  USING (has_plan_access(plan_id, 'editor'))
  WITH CHECK (has_plan_access(plan_id, 'editor'));

-- ============================================================================
-- TASK ASSIGNEES POLICIES
-- ============================================================================

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

CREATE POLICY "Editors can manage task assignees"
  ON task_assignees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  );

-- ============================================================================
-- TASK RECURRENCE POLICIES
-- ============================================================================

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

CREATE POLICY "Editors can manage recurrence rules"
  ON task_recurrence_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  );

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

CREATE POLICY "Editors can manage recurrence instances"
  ON task_recurrence_instances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_recurrence_rules trr
      JOIN tasks t ON t.id = trr.task_id
      WHERE trr.id = recurrence_rule_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_recurrence_rules trr
      JOIN tasks t ON t.id = trr.task_id
      WHERE trr.id = recurrence_rule_id
      AND has_plan_access(t.plan_id, 'editor')
    )
  );

-- ============================================================================
-- COMMENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view comments in their plans"
  ON comments FOR SELECT
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments or owners can delete any"
  ON comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR plan_id IN (
      SELECT plan_id FROM plan_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================================================
-- COMMENT MENTIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view mentions in their plans"
  ON comment_mentions FOR SELECT
  USING (
    comment_id IN (
      SELECT id FROM comments WHERE plan_id IN (
        SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Comment authors can create mentions"
  ON comment_mentions FOR INSERT
  WITH CHECK (
    comment_id IN (
      SELECT id FROM comments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Comment authors can delete mentions"
  ON comment_mentions FOR DELETE
  USING (
    comment_id IN (
      SELECT id FROM comments WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Plan members can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- COMMENT READS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own comment reads"
  ON comment_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own comment reads"
  ON comment_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comment reads"
  ON comment_reads FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comment reads"
  ON comment_reads FOR DELETE
  USING (user_id = auth.uid());

