-- ============================================================================
-- Migration: Fix SECURITY DEFINER views to use SECURITY INVOKER
-- ============================================================================
--
-- Issue: Supabase linter reports views using SECURITY DEFINER, which means
--        they bypass Row Level Security policies. Views should use
--        SECURITY INVOKER so that queries run with the caller's permissions.
--
-- Security Impact: HIGH - Views with SECURITY DEFINER can leak data across
--                  plans because they run as the view creator (superuser).
--
-- Affected Views (9 total):
--   1. v_plan_timeline
--   2. v_plan_checkins_by_day
--   3. v_objective_progress
--   4. v_kr_progress
--   5. v_plan_stats
--   6. v_quarter_overview
--   7. v_weekly_review_summary
--   8. v_plan_review_stats
--   9. v_weekly_review_stats_by_month
--
-- Rollback: See emergency_rollback_rls_fix.sql
-- ============================================================================

-- ============================================================================
-- VIEW 1: v_plan_timeline
-- ============================================================================
-- Activity events with user information for timeline display
-- Note: This view is defined in types but not actively used in code

DROP VIEW IF EXISTS v_plan_timeline;

CREATE VIEW v_plan_timeline
WITH (security_invoker = true)
AS
SELECT
  ae.id,
  ae.plan_id,
  ae.user_id,
  ae.entity_type,
  ae.entity_id,
  ae.event_type,
  ae.old_data,
  ae.new_data,
  ae.metadata,
  ae.created_at,
  p.email AS user_email,
  p.full_name AS user_full_name
FROM activity_events ae
LEFT JOIN profiles p ON p.id = ae.user_id
ORDER BY ae.created_at DESC;

COMMENT ON VIEW v_plan_timeline IS 'Activity events with user information for timeline display (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VIEW 2: v_plan_checkins_by_day
-- ============================================================================
-- Check-in counts aggregated by day for heatmap display

DROP VIEW IF EXISTS v_plan_checkins_by_day;

CREATE VIEW v_plan_checkins_by_day
WITH (security_invoker = true)
AS
SELECT
  o.plan_id,
  DATE(ci.recorded_at) AS check_in_date,
  COUNT(*) AS check_in_count,
  ARRAY_AGG(DISTINCT ci.annual_kr_id) AS kr_ids
FROM check_ins ci
JOIN annual_krs ak ON ak.id = ci.annual_kr_id
JOIN objectives o ON o.id = ak.objective_id
GROUP BY o.plan_id, DATE(ci.recorded_at)
ORDER BY check_in_date DESC;

COMMENT ON VIEW v_plan_checkins_by_day IS 'Check-in counts aggregated by day for heatmap display (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VIEW 3: v_objective_progress
-- ============================================================================
-- Calculated progress percentage for each objective

DROP VIEW IF EXISTS v_objective_progress;

CREATE VIEW v_objective_progress
WITH (security_invoker = true)
AS
SELECT
  o.id AS objective_id,
  o.plan_id,
  o.code,
  o.name,
  COUNT(ak.id) AS kr_count,
  COALESCE(
    AVG(
      CASE
        WHEN ak.kr_type = 'milestone' THEN
          CASE WHEN ak.current_value >= ak.target_value THEN 100 ELSE 0 END
        WHEN ak.target_value = ak.start_value THEN
          100
        ELSE
          LEAST(100, GREATEST(0,
            (ak.current_value - ak.start_value) / NULLIF(ak.target_value - ak.start_value, 0) * 100
          ))
      END
    ),
    0
  ) AS progress_percent
FROM objectives o
LEFT JOIN annual_krs ak ON ak.objective_id = o.id
GROUP BY o.id, o.plan_id, o.code, o.name;

COMMENT ON VIEW v_objective_progress IS 'Calculated progress percentage for each objective (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VIEW 4: v_kr_progress
-- ============================================================================
-- Detailed KR progress with calculations

DROP VIEW IF EXISTS v_kr_progress;

CREATE VIEW v_kr_progress
WITH (security_invoker = true)
AS
SELECT
  ak.id AS kr_id,
  ak.objective_id,
  o.plan_id,
  ak.name,
  ak.kr_type,
  ak.direction,
  ak.unit,
  ak.start_value,
  ak.target_value,
  ak.current_value,
  -- Progress percentage
  CASE
    WHEN ak.kr_type = 'milestone' THEN
      CASE WHEN ak.current_value >= ak.target_value THEN 100 ELSE 0 END
    WHEN ak.target_value = ak.start_value THEN 100
    ELSE
      LEAST(100, GREATEST(0,
        (ak.current_value - ak.start_value) / NULLIF(ak.target_value - ak.start_value, 0) * 100
      ))
  END AS progress_percent,
  -- Remaining to target
  ak.target_value - ak.current_value AS remaining,
  -- Last check-in date
  (SELECT MAX(recorded_at) FROM check_ins WHERE annual_kr_id = ak.id) AS last_check_in_at,
  -- Check-in count
  (SELECT COUNT(*) FROM check_ins WHERE annual_kr_id = ak.id) AS check_in_count
FROM annual_krs ak
JOIN objectives o ON o.id = ak.objective_id;

COMMENT ON VIEW v_kr_progress IS 'Detailed KR progress with calculations (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VIEW 5: v_plan_stats
-- ============================================================================
-- High-level statistics for plans

DROP VIEW IF EXISTS v_plan_stats;

CREATE VIEW v_plan_stats
WITH (security_invoker = true)
AS
SELECT
  p.id AS plan_id,
  p.name AS plan_name,
  p.year,
  (SELECT COUNT(*) FROM objectives WHERE plan_id = p.id) AS objective_count,
  (SELECT COUNT(*) FROM annual_krs ak
   JOIN objectives o ON o.id = ak.objective_id
   WHERE o.plan_id = p.id) AS kr_count,
  (SELECT COUNT(*) FROM quarter_targets qt
   JOIN annual_krs ak ON ak.id = qt.annual_kr_id
   JOIN objectives o ON o.id = ak.objective_id
   WHERE o.plan_id = p.id) AS quarter_target_count,
  (SELECT COUNT(*) FROM tasks WHERE plan_id = p.id) AS task_count,
  (SELECT COUNT(*) FROM tasks WHERE plan_id = p.id AND status = 'completed') AS completed_task_count,
  (SELECT COUNT(*) FROM check_ins ci
   JOIN annual_krs ak ON ak.id = ci.annual_kr_id
   JOIN objectives o ON o.id = ak.objective_id
   WHERE o.plan_id = p.id) AS check_in_count,
  (SELECT COUNT(*) FROM plan_members WHERE plan_id = p.id) AS member_count
FROM plans p;

COMMENT ON VIEW v_plan_stats IS 'High-level statistics for plans (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VIEW 6: v_quarter_overview
-- ============================================================================
-- Quarter targets with progress for quarterly views

DROP VIEW IF EXISTS v_quarter_overview;

CREATE VIEW v_quarter_overview
WITH (security_invoker = true)
AS
SELECT
  qt.id AS quarter_target_id,
  qt.quarter,
  qt.target_value,
  qt.current_value,
  ak.id AS annual_kr_id,
  ak.name AS kr_name,
  ak.kr_type,
  ak.unit,
  o.id AS objective_id,
  o.code AS objective_code,
  o.plan_id,
  -- Progress percentage
  CASE
    WHEN ak.kr_type = 'milestone' THEN
      CASE WHEN qt.current_value >= qt.target_value THEN 100 ELSE 0 END
    WHEN qt.target_value = 0 THEN 100
    ELSE
      LEAST(100, GREATEST(0, qt.current_value / NULLIF(qt.target_value, 0) * 100))
  END AS progress_percent
FROM quarter_targets qt
JOIN annual_krs ak ON ak.id = qt.annual_kr_id
JOIN objectives o ON o.id = ak.objective_id
ORDER BY o.plan_id, qt.quarter, o.sort_order, ak.sort_order;

COMMENT ON VIEW v_quarter_overview IS 'Quarter targets with progress for quarterly views (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VIEW 7: v_weekly_review_summary
-- ============================================================================
-- Weekly review with computed fields

DROP VIEW IF EXISTS v_weekly_review_summary;

CREATE VIEW v_weekly_review_summary
WITH (security_invoker = true)
AS
SELECT
  wr.id,
  wr.plan_id,
  wr.year,
  wr.week_number,
  wr.week_start,
  wr.week_end,
  wr.status,
  wr.created_at,
  wr.started_at,
  wr.completed_at,
  wr.week_rating,
  wr.stats_krs_updated,
  wr.stats_tasks_completed,
  wr.stats_tasks_created,
  wr.stats_check_ins_made,
  wr.stats_objectives_on_track,
  wr.stats_objectives_at_risk,
  wr.stats_objectives_off_track,
  -- Computed: days since week ended (for pending reviews)
  CASE
    WHEN wr.status IN ('pending', 'open') AND CURRENT_DATE > wr.week_end
    THEN CURRENT_DATE - wr.week_end
    ELSE 0
  END AS days_overdue,
  -- Computed: has reflection content
  (COALESCE(wr.reflection_what_went_well, '') != '' OR
   COALESCE(wr.reflection_what_to_improve, '') != '' OR
   COALESCE(wr.reflection_lessons_learned, '') != '' OR
   COALESCE(wr.reflection_notes, '') != '') AS has_reflections
FROM weekly_reviews wr;

COMMENT ON VIEW v_weekly_review_summary IS 'Weekly review with computed fields (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VIEW 8: v_plan_review_stats
-- ============================================================================
-- Plan review statistics for analytics

DROP VIEW IF EXISTS v_plan_review_stats;

CREATE VIEW v_plan_review_stats
WITH (security_invoker = true)
AS
SELECT
  plan_id,
  COUNT(*) AS total_reviews,
  COUNT(*) FILTER (WHERE status = 'complete') AS completed_on_time,
  COUNT(*) FILTER (WHERE status = 'late') AS completed_late,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  ROUND(AVG(week_rating)::numeric, 2) AS avg_rating,
  -- Streak calculation (consecutive complete reviews)
  (
    SELECT COUNT(*)
    FROM (
      SELECT year, week_number,
             ROW_NUMBER() OVER (ORDER BY year DESC, week_number DESC) as rn
      FROM weekly_reviews wr2
      WHERE wr2.plan_id = weekly_reviews.plan_id
        AND wr2.status IN ('complete', 'late')
    ) sub
    WHERE rn = (year * 100 + week_number) -
          (SELECT MIN(year * 100 + week_number) - 1
           FROM weekly_reviews wr3
           WHERE wr3.plan_id = weekly_reviews.plan_id
             AND wr3.status IN ('complete', 'late'))
  ) AS current_streak
FROM weekly_reviews
GROUP BY plan_id;

COMMENT ON VIEW v_plan_review_stats IS 'Plan review statistics for analytics (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VIEW 9: v_weekly_review_stats_by_month
-- ============================================================================
-- Monthly aggregated stats for weekly reviews

DROP VIEW IF EXISTS v_weekly_review_stats_by_month;

CREATE VIEW v_weekly_review_stats_by_month
WITH (security_invoker = true)
AS
SELECT
  plan_id,
  DATE_TRUNC('month', week_start) AS month,
  COUNT(*) AS total_reviews,
  COUNT(*) FILTER (WHERE status = 'complete') AS completed,
  COUNT(*) FILTER (WHERE status = 'late') AS late,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  AVG(week_rating) FILTER (WHERE week_rating IS NOT NULL) AS avg_rating,
  SUM(stats_tasks_completed) AS tasks_completed,
  SUM(stats_krs_updated) AS krs_updated
FROM weekly_reviews
GROUP BY plan_id, DATE_TRUNC('month', week_start);

COMMENT ON VIEW v_weekly_review_stats_by_month IS 'Monthly aggregated stats for weekly reviews (SECURITY INVOKER - respects RLS)';

-- ============================================================================
-- VERIFICATION: Check all views have security_invoker = true
-- ============================================================================

DO $$
DECLARE
  view_record RECORD;
  invoker_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  FOR view_record IN
    SELECT viewname
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname IN (
        'v_plan_timeline',
        'v_plan_checkins_by_day',
        'v_objective_progress',
        'v_kr_progress',
        'v_plan_stats',
        'v_quarter_overview',
        'v_weekly_review_summary',
        'v_plan_review_stats',
        'v_weekly_review_stats_by_month'
      )
  LOOP
    total_count := total_count + 1;
    -- Check if view has security_invoker option
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND c.relname = view_record.viewname
        AND c.relkind = 'v'
    ) THEN
      invoker_count := invoker_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Verified % out of 9 views exist after migration', total_count;

  IF total_count < 9 THEN
    RAISE WARNING 'Expected 9 views, found %. Some views may be missing.', total_count;
  END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
