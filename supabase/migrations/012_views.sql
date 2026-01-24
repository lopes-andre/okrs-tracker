-- ============================================================================
-- Migration 012: Database Views
-- ============================================================================
-- Creates helper views for common queries.
-- All views use SECURITY INVOKER to respect RLS policies.
-- ============================================================================

-- ============================================================================
-- VIEW: Check-ins by Day
-- ============================================================================
-- Aggregated check-in counts per day per plan (for heatmaps)

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

COMMENT ON VIEW v_plan_checkins_by_day IS 'Check-in counts aggregated by day for heatmap display';

-- ============================================================================
-- VIEW: Objective Progress Summary
-- ============================================================================
-- Calculates progress for each objective based on its KRs

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

COMMENT ON VIEW v_objective_progress IS 'Calculated progress percentage for each objective';

-- ============================================================================
-- VIEW: KR Progress Details
-- ============================================================================
-- Detailed KR progress with pace calculations

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

COMMENT ON VIEW v_kr_progress IS 'Detailed KR progress with calculations';

-- ============================================================================
-- VIEW: Plan Summary Stats
-- ============================================================================
-- High-level statistics for a plan

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

COMMENT ON VIEW v_plan_stats IS 'High-level statistics for plans';

-- ============================================================================
-- VIEW: Quarter Overview
-- ============================================================================
-- Quarter targets with progress for a plan

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

COMMENT ON VIEW v_quarter_overview IS 'Quarter targets with progress for quarterly views';

-- ============================================================================
-- VIEW: Weekly Review Summary
-- ============================================================================
-- Weekly review with computed fields

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

COMMENT ON VIEW v_weekly_review_summary IS 'Weekly review with computed fields';

-- ============================================================================
-- VIEW: Plan Review Stats
-- ============================================================================
-- Plan review statistics for analytics

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

COMMENT ON VIEW v_plan_review_stats IS 'Plan review statistics for analytics';

