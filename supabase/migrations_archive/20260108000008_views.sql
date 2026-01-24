-- Migration: Database Views
-- Description: Create helpful views for common queries

-- ============================================================================
-- VIEW: Plan Timeline
-- ============================================================================
-- Activity events with user information joined

CREATE OR REPLACE VIEW v_plan_timeline AS
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

COMMENT ON VIEW v_plan_timeline IS 'Activity events with user information for timeline display';

-- ============================================================================
-- VIEW: Check-ins by Day
-- ============================================================================
-- Aggregated check-in counts per day per plan

CREATE OR REPLACE VIEW v_plan_checkins_by_day AS
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

CREATE OR REPLACE VIEW v_objective_progress AS
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

COMMENT ON VIEW v_objective_progress IS 'Calculated progress percentage for each objective (simple average of KRs)';

-- ============================================================================
-- VIEW: KR Progress Details
-- ============================================================================
-- Detailed KR progress with pace calculations

CREATE OR REPLACE VIEW v_kr_progress AS
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

CREATE OR REPLACE VIEW v_plan_stats AS
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

CREATE OR REPLACE VIEW v_quarter_overview AS
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
