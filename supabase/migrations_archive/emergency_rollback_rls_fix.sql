-- ============================================================================
-- EMERGENCY ROLLBACK SCRIPT: RLS & Views Security Fix
-- ============================================================================
--
-- Purpose: Reverts all changes made by the RLS security fix if issues occur.
-- This script restores the database to its pre-fix state.
--
-- USAGE: Only run this if the security fix causes application issues!
--        Run with: psql -f emergency_rollback_rls_fix.sql
--
-- Created: 2026-01-24
-- ============================================================================

-- ============================================================================
-- PART 1: ROLLBACK - Disable RLS on plans table (if it was re-enabled)
-- ============================================================================
-- NOTE: Only uncomment and run this if RLS on plans was causing issues

-- ALTER TABLE plans DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: ROLLBACK - Restore SECURITY DEFINER on views
-- ============================================================================
-- These statements restore views to their original SECURITY DEFINER state
-- (if they were changed to SECURITY INVOKER)

-- View: v_plan_timeline
CREATE OR REPLACE VIEW v_plan_timeline
WITH (security_barrier = false)
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

-- View: v_plan_checkins_by_day
CREATE OR REPLACE VIEW v_plan_checkins_by_day
WITH (security_barrier = false)
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

-- View: v_objective_progress
CREATE OR REPLACE VIEW v_objective_progress
WITH (security_barrier = false)
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

-- View: v_kr_progress
CREATE OR REPLACE VIEW v_kr_progress
WITH (security_barrier = false)
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
  CASE
    WHEN ak.kr_type = 'milestone' THEN
      CASE WHEN ak.current_value >= ak.target_value THEN 100 ELSE 0 END
    WHEN ak.target_value = ak.start_value THEN 100
    ELSE
      LEAST(100, GREATEST(0,
        (ak.current_value - ak.start_value) / NULLIF(ak.target_value - ak.start_value, 0) * 100
      ))
  END AS progress_percent,
  ak.target_value - ak.current_value AS remaining,
  (SELECT MAX(recorded_at) FROM check_ins WHERE annual_kr_id = ak.id) AS last_check_in_at,
  (SELECT COUNT(*) FROM check_ins WHERE annual_kr_id = ak.id) AS check_in_count
FROM annual_krs ak
JOIN objectives o ON o.id = ak.objective_id;

-- View: v_plan_stats
CREATE OR REPLACE VIEW v_plan_stats
WITH (security_barrier = false)
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

-- View: v_quarter_overview
CREATE OR REPLACE VIEW v_quarter_overview
WITH (security_barrier = false)
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

-- View: v_weekly_review_summary
CREATE OR REPLACE VIEW v_weekly_review_summary
WITH (security_barrier = false)
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
  CASE
    WHEN wr.status IN ('pending', 'open') AND CURRENT_DATE > wr.week_end
    THEN CURRENT_DATE - wr.week_end
    ELSE 0
  END AS days_overdue,
  (COALESCE(wr.reflection_what_went_well, '') != '' OR
   COALESCE(wr.reflection_what_to_improve, '') != '' OR
   COALESCE(wr.reflection_lessons_learned, '') != '' OR
   COALESCE(wr.reflection_notes, '') != '') AS has_reflections
FROM weekly_reviews wr;

-- View: v_plan_review_stats
CREATE OR REPLACE VIEW v_plan_review_stats
WITH (security_barrier = false)
AS
SELECT
  plan_id,
  COUNT(*) AS total_reviews,
  COUNT(*) FILTER (WHERE status = 'complete') AS completed_on_time,
  COUNT(*) FILTER (WHERE status = 'late') AS completed_late,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  ROUND(AVG(week_rating)::numeric, 2) AS avg_rating,
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

-- View: v_weekly_review_stats_by_month
CREATE OR REPLACE VIEW v_weekly_review_stats_by_month
WITH (security_barrier = false)
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

-- ============================================================================
-- END OF ROLLBACK SCRIPT
-- ============================================================================
-- After running this script, verify:
-- 1. Application loads correctly
-- 2. Users can see their plans
-- 3. Check the Supabase dashboard for the database state
-- ============================================================================
