-- Migration: Row Level Security Policies
-- Description: Enable RLS and create access policies for all tables

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE mindmap_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read all profiles (needed for displaying names/avatars)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile (fallback if trigger fails)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Service role can insert profiles (used by auth triggers)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PLANS POLICIES
-- ============================================================================

-- Members can view plans they belong to
CREATE POLICY "Plans are viewable by members"
  ON plans FOR SELECT
  TO authenticated
  USING (has_plan_access(id, 'viewer'));

-- Authenticated users can create plans
CREATE POLICY "Authenticated users can create plans"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Owners can update their plans
CREATE POLICY "Owners can update plans"
  ON plans FOR UPDATE
  TO authenticated
  USING (has_plan_access(id, 'owner'))
  WITH CHECK (has_plan_access(id, 'owner'));

-- Owners can delete their plans
CREATE POLICY "Owners can delete plans"
  ON plans FOR DELETE
  TO authenticated
  USING (has_plan_access(id, 'owner'));

-- ============================================================================
-- PLAN_MEMBERS POLICIES
-- ============================================================================

-- Members can view other members of their plans
CREATE POLICY "Plan members are viewable by plan members"
  ON plan_members FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

-- Owners can add members
CREATE POLICY "Owners can add members"
  ON plan_members FOR INSERT
  TO authenticated
  WITH CHECK (has_plan_access(plan_id, 'owner'));

-- Owners can update member roles (but not their own)
CREATE POLICY "Owners can update member roles"
  ON plan_members FOR UPDATE
  TO authenticated
  USING (
    has_plan_access(plan_id, 'owner') 
    AND user_id != auth.uid() -- Can't change own role
  )
  WITH CHECK (
    has_plan_access(plan_id, 'owner')
    AND role != 'owner' -- Can't make someone else owner
  );

-- Owners can remove members (but not themselves)
CREATE POLICY "Owners can remove members"
  ON plan_members FOR DELETE
  TO authenticated
  USING (
    has_plan_access(plan_id, 'owner')
    AND user_id != auth.uid() -- Can't remove self
  );

-- Members can leave plans (remove themselves, except owners)
CREATE POLICY "Members can leave plans"
  ON plan_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND role != 'owner' -- Owners can't leave
  );

-- ============================================================================
-- PLAN_INVITES POLICIES
-- ============================================================================

-- Members can view invites for their plans
CREATE POLICY "Invites viewable by plan members"
  ON plan_invites FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

-- Users can see invites sent to their email
CREATE POLICY "Users can see their own invites"
  ON plan_invites FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Owners can create invites
CREATE POLICY "Owners can create invites"
  ON plan_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    has_plan_access(plan_id, 'owner')
    AND invited_by = auth.uid()
  );

-- Owners can delete invites
CREATE POLICY "Owners can delete invites"
  ON plan_invites FOR DELETE
  TO authenticated
  USING (has_plan_access(plan_id, 'owner'));

-- ============================================================================
-- OBJECTIVES POLICIES
-- ============================================================================

-- Members can view objectives
CREATE POLICY "Objectives viewable by members"
  ON objectives FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

-- Editors can create objectives
CREATE POLICY "Editors can create objectives"
  ON objectives FOR INSERT
  TO authenticated
  WITH CHECK (has_plan_access(plan_id, 'editor'));

-- Editors can update objectives
CREATE POLICY "Editors can update objectives"
  ON objectives FOR UPDATE
  TO authenticated
  USING (has_plan_access(plan_id, 'editor'))
  WITH CHECK (has_plan_access(plan_id, 'editor'));

-- Editors can delete objectives
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

-- Editors can create check-ins
CREATE POLICY "Editors can create check-ins"
  ON check_ins FOR INSERT
  TO authenticated
  WITH CHECK (
    has_plan_access(get_plan_id_from_annual_kr(annual_kr_id), 'editor')
    AND recorded_by = auth.uid()
  );

-- Users can update their own check-ins
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

-- Annual KR Tags
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

-- Task Tags
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
-- MINDMAP TABLES POLICIES
-- ============================================================================

-- Mindmap views (user-specific)
CREATE POLICY "Users can view own mindmap views"
  ON mindmap_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Users can manage own mindmap views"
  ON mindmap_views FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND has_plan_access(plan_id, 'viewer'))
  WITH CHECK (user_id = auth.uid() AND has_plan_access(plan_id, 'viewer'));

-- Mindmap nodes
CREATE POLICY "Users can view own mindmap nodes"
  ON mindmap_nodes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmap_views mv 
      WHERE mv.id = mindmap_view_id 
      AND mv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own mindmap nodes"
  ON mindmap_nodes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmap_views mv 
      WHERE mv.id = mindmap_view_id 
      AND mv.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mindmap_views mv 
      WHERE mv.id = mindmap_view_id 
      AND mv.user_id = auth.uid()
    )
  );

-- Mindmap edges
CREATE POLICY "Users can view own mindmap edges"
  ON mindmap_edges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmap_views mv 
      WHERE mv.id = mindmap_view_id 
      AND mv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own mindmap edges"
  ON mindmap_edges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmap_views mv 
      WHERE mv.id = mindmap_view_id 
      AND mv.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mindmap_views mv 
      WHERE mv.id = mindmap_view_id 
      AND mv.user_id = auth.uid()
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

-- Dashboard widgets
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
-- SAVED_VIEWS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own saved views"
  ON saved_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND has_plan_access(plan_id, 'viewer'));

CREATE POLICY "Users can manage own saved views"
  ON saved_views FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND has_plan_access(plan_id, 'viewer'))
  WITH CHECK (user_id = auth.uid() AND has_plan_access(plan_id, 'viewer'));

-- ============================================================================
-- ACTIVITY_EVENTS POLICIES
-- ============================================================================

CREATE POLICY "Activity events viewable by members"
  ON activity_events FOR SELECT
  TO authenticated
  USING (has_plan_access(plan_id, 'viewer'));

-- Activity events are created by triggers, not directly by users
-- No INSERT/UPDATE/DELETE policies needed for regular users
