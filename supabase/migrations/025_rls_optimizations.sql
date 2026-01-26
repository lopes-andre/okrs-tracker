-- ============================================================================
-- Migration 025: RLS Policy Optimizations & Schema Improvements
-- ============================================================================
-- Optimizes RLS policies for better performance and adds schema constraints.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Fast plan access check using materialized user plans
-- ============================================================================
-- This function is more efficient for repeated access checks as it can be
-- inlined by the query planner.

CREATE OR REPLACE FUNCTION get_user_plan_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT plan_id FROM public.plan_members WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION get_user_plan_ids() IS 'Get all plan IDs the current user has access to';

CREATE OR REPLACE FUNCTION get_user_editor_plan_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT plan_id FROM public.plan_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'editor');
$$;

COMMENT ON FUNCTION get_user_editor_plan_ids() IS 'Get plan IDs where current user has editor or owner access';

-- ============================================================================
-- HELPER FUNCTION: Check if post belongs to user's plan
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_id_from_content_post(p_post_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT plan_id FROM public.content_posts WHERE id = p_post_id;
$$;

COMMENT ON FUNCTION get_plan_id_from_content_post(UUID) IS 'Get plan_id from a content post';

-- ============================================================================
-- HELPER FUNCTION: Check if distribution belongs to user's plan
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_id_from_content_distribution(p_distribution_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.plan_id
  FROM public.content_distributions d
  JOIN public.content_posts p ON d.post_id = p.id
  WHERE d.id = p_distribution_id;
$$;

COMMENT ON FUNCTION get_plan_id_from_content_distribution(UUID) IS 'Get plan_id from a content distribution';

-- ============================================================================
-- HELPER FUNCTION: Check if campaign belongs to user's plan
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_id_from_content_campaign(p_campaign_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT plan_id FROM public.content_campaigns WHERE id = p_campaign_id;
$$;

COMMENT ON FUNCTION get_plan_id_from_content_campaign(UUID) IS 'Get plan_id from a content campaign';

-- ============================================================================
-- DROP OLD CONTENT POLICIES (will be recreated with optimizations)
-- ============================================================================

-- content_post_goals
DROP POLICY IF EXISTS "Plan members can view post goals" ON content_post_goals;
DROP POLICY IF EXISTS "Editors can manage post goals" ON content_post_goals;

-- content_post_media
DROP POLICY IF EXISTS "Plan members can view post media" ON content_post_media;
DROP POLICY IF EXISTS "Editors can manage post media" ON content_post_media;

-- content_post_links
DROP POLICY IF EXISTS "Plan members can view post links" ON content_post_links;
DROP POLICY IF EXISTS "Editors can manage post links" ON content_post_links;

-- content_distributions
DROP POLICY IF EXISTS "Plan members can view distributions" ON content_distributions;
DROP POLICY IF EXISTS "Editors can manage distributions" ON content_distributions;

-- content_distribution_metrics
DROP POLICY IF EXISTS "Plan members can view distribution metrics" ON content_distribution_metrics;
DROP POLICY IF EXISTS "Editors can manage distribution metrics" ON content_distribution_metrics;

-- content_campaign_posts
DROP POLICY IF EXISTS "Plan members can view campaign posts" ON content_campaign_posts;
DROP POLICY IF EXISTS "Editors can manage campaign posts" ON content_campaign_posts;

-- content_campaign_checkins
DROP POLICY IF EXISTS "Plan members can view campaign checkins" ON content_campaign_checkins;
DROP POLICY IF EXISTS "Editors can manage campaign checkins" ON content_campaign_checkins;

-- ============================================================================
-- OPTIMIZED CONTENT_POST_GOALS POLICIES
-- ============================================================================
-- Using helper function instead of nested subqueries

CREATE POLICY "Plan members can view post goals"
  ON content_post_goals FOR SELECT
  USING (
    has_plan_access(get_plan_id_from_content_post(post_id), 'viewer')
  );

CREATE POLICY "Editors can manage post goals"
  ON content_post_goals FOR ALL
  USING (
    has_plan_access(get_plan_id_from_content_post(post_id), 'editor')
  );

-- ============================================================================
-- OPTIMIZED CONTENT_POST_MEDIA POLICIES
-- ============================================================================

CREATE POLICY "Plan members can view post media"
  ON content_post_media FOR SELECT
  USING (
    has_plan_access(get_plan_id_from_content_post(post_id), 'viewer')
  );

CREATE POLICY "Editors can manage post media"
  ON content_post_media FOR ALL
  USING (
    has_plan_access(get_plan_id_from_content_post(post_id), 'editor')
  );

-- ============================================================================
-- OPTIMIZED CONTENT_POST_LINKS POLICIES
-- ============================================================================

CREATE POLICY "Plan members can view post links"
  ON content_post_links FOR SELECT
  USING (
    has_plan_access(get_plan_id_from_content_post(post_id), 'viewer')
  );

CREATE POLICY "Editors can manage post links"
  ON content_post_links FOR ALL
  USING (
    has_plan_access(get_plan_id_from_content_post(post_id), 'editor')
  );

-- ============================================================================
-- OPTIMIZED CONTENT_DISTRIBUTIONS POLICIES
-- ============================================================================

CREATE POLICY "Plan members can view distributions"
  ON content_distributions FOR SELECT
  USING (
    has_plan_access(get_plan_id_from_content_post(post_id), 'viewer')
  );

CREATE POLICY "Editors can manage distributions"
  ON content_distributions FOR ALL
  USING (
    has_plan_access(get_plan_id_from_content_post(post_id), 'editor')
  );

-- ============================================================================
-- OPTIMIZED CONTENT_DISTRIBUTION_METRICS POLICIES
-- ============================================================================

CREATE POLICY "Plan members can view distribution metrics"
  ON content_distribution_metrics FOR SELECT
  USING (
    has_plan_access(get_plan_id_from_content_distribution(distribution_id), 'viewer')
  );

CREATE POLICY "Editors can manage distribution metrics"
  ON content_distribution_metrics FOR ALL
  USING (
    has_plan_access(get_plan_id_from_content_distribution(distribution_id), 'editor')
  );

-- ============================================================================
-- OPTIMIZED CONTENT_CAMPAIGN_POSTS POLICIES
-- ============================================================================

CREATE POLICY "Plan members can view campaign posts"
  ON content_campaign_posts FOR SELECT
  USING (
    has_plan_access(get_plan_id_from_content_campaign(campaign_id), 'viewer')
  );

CREATE POLICY "Editors can manage campaign posts"
  ON content_campaign_posts FOR ALL
  USING (
    has_plan_access(get_plan_id_from_content_campaign(campaign_id), 'editor')
  );

-- ============================================================================
-- OPTIMIZED CONTENT_CAMPAIGN_CHECKINS POLICIES
-- ============================================================================

CREATE POLICY "Plan members can view campaign checkins"
  ON content_campaign_checkins FOR SELECT
  USING (
    has_plan_access(get_plan_id_from_content_campaign(campaign_id), 'viewer')
  );

CREATE POLICY "Editors can manage campaign checkins"
  ON content_campaign_checkins FOR ALL
  USING (
    has_plan_access(get_plan_id_from_content_campaign(campaign_id), 'editor')
  );

-- ============================================================================
-- SCHEMA IMPROVEMENTS: Add missing NOT NULL constraints where appropriate
-- ============================================================================

-- Ensure content_posts.status has a sensible default
ALTER TABLE content_posts
  ALTER COLUMN status SET DEFAULT 'backlog';

-- Ensure content_distributions.status has a sensible default
ALTER TABLE content_distributions
  ALTER COLUMN status SET DEFAULT 'draft';

-- ============================================================================
-- SCHEMA IMPROVEMENTS: Add CHECK constraints for data validation
-- ============================================================================

-- Ensure week_rating is within valid range (already exists but verify)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_reviews_week_rating_check'
  ) THEN
    ALTER TABLE weekly_reviews
      ADD CONSTRAINT weekly_reviews_week_rating_check
      CHECK (week_rating IS NULL OR (week_rating >= 1 AND week_rating <= 5));
  END IF;
END $$;

-- Ensure content_post_media file_size is positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_post_media_file_size_check'
  ) THEN
    ALTER TABLE content_post_media
      ADD CONSTRAINT content_post_media_file_size_check
      CHECK (file_size IS NULL OR file_size >= 0);
  END IF;
END $$;

-- Ensure campaign budget is non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_campaigns_budget_check'
  ) THEN
    ALTER TABLE content_campaigns
      ADD CONSTRAINT content_campaigns_budget_check
      CHECK (budget_allocated IS NULL OR budget_allocated >= 0);
  END IF;
END $$;

-- Ensure campaign dates are valid (start <= end)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_campaigns_dates_check'
  ) THEN
    ALTER TABLE content_campaigns
      ADD CONSTRAINT content_campaigns_dates_check
      CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);
  END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS FOR NEW FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_plan_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_editor_plan_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_plan_id_from_content_post(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_plan_id_from_content_distribution(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_plan_id_from_content_campaign(UUID) TO authenticated;

-- ============================================================================
-- ANALYZE TABLES (helps query planner after index changes)
-- ============================================================================
-- Note: In production, these will be run automatically by autovacuum.
-- Running manually here ensures immediate statistics updates.

ANALYZE content_posts;
ANALYZE content_distributions;
ANALYZE content_post_goals;
ANALYZE content_post_media;
ANALYZE content_post_links;
ANALYZE content_campaigns;
ANALYZE content_campaign_posts;
ANALYZE content_campaign_checkins;
ANALYZE content_distribution_metrics;
ANALYZE tasks;
ANALYZE check_ins;
ANALYZE activity_events;
ANALYZE notifications;
ANALYZE comments;
