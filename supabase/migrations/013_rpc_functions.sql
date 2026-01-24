-- ============================================================================
-- Migration 013: RPC Functions
-- ============================================================================
-- Creates client-callable RPC functions for complex queries.
-- ============================================================================

-- ============================================================================
-- FUNCTION: Get Tasks Comment Counts
-- ============================================================================
-- Efficient server-side aggregation for comment counts (total and unread)

CREATE OR REPLACE FUNCTION get_tasks_comment_counts(
  p_task_ids UUID[],
  p_user_id UUID
)
RETURNS TABLE (
  task_id UUID,
  total_count BIGINT,
  unread_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    c.task_id,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (
      WHERE cr.last_read_at IS NULL
      OR c.created_at > cr.last_read_at
    ) AS unread_count
  FROM comments c
  LEFT JOIN comment_reads cr
    ON cr.task_id = c.task_id
    AND cr.user_id = p_user_id
  WHERE c.task_id = ANY(p_task_ids)
  GROUP BY c.task_id;
$$;

GRANT EXECUTE ON FUNCTION get_tasks_comment_counts(UUID[], UUID) TO authenticated;

COMMENT ON FUNCTION get_tasks_comment_counts IS 'Returns total and unread comment counts for a list of tasks';

-- ============================================================================
-- FUNCTION: Get Member Workload Stats
-- ============================================================================
-- Returns per-member workload metrics for a plan

CREATE OR REPLACE FUNCTION get_member_workload_stats(p_plan_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role okr_role,
  tasks_assigned BIGINT,
  tasks_completed BIGINT,
  tasks_in_progress BIGINT,
  tasks_overdue BIGINT,
  tasks_by_priority JSONB,
  tasks_by_effort JSONB,
  check_ins_made BIGINT,
  krs_owned BIGINT,
  activity_count BIGINT,
  last_activity_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  WITH member_tasks AS (
    -- Get tasks assigned to each member (via task_assignees or assigned_to)
    SELECT
      COALESCE(ta.user_id, t.assigned_to) AS member_id,
      t.id AS task_id,
      t.status,
      t.priority,
      t.effort,
      t.due_date
    FROM tasks t
    LEFT JOIN task_assignees ta ON ta.task_id = t.id
    WHERE t.plan_id = p_plan_id
      AND (ta.user_id IS NOT NULL OR t.assigned_to IS NOT NULL)
  ),
  task_stats AS (
    SELECT
      member_id,
      COUNT(*) AS tasks_assigned,
      COUNT(*) FILTER (WHERE status = 'completed') AS tasks_completed,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS tasks_in_progress,
      COUNT(*) FILTER (
        WHERE status NOT IN ('completed', 'cancelled')
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
      ) AS tasks_overdue,
      jsonb_build_object(
        'high', COUNT(*) FILTER (WHERE priority = 'high'),
        'medium', COUNT(*) FILTER (WHERE priority = 'medium'),
        'low', COUNT(*) FILTER (WHERE priority = 'low')
      ) AS tasks_by_priority,
      jsonb_build_object(
        'heavy', COUNT(*) FILTER (WHERE effort = 'heavy'),
        'moderate', COUNT(*) FILTER (WHERE effort = 'moderate'),
        'light', COUNT(*) FILTER (WHERE effort = 'light')
      ) AS tasks_by_effort
    FROM member_tasks
    GROUP BY member_id
  ),
  checkin_stats AS (
    SELECT
      c.recorded_by AS member_id,
      COUNT(*) AS check_ins_made
    FROM check_ins c
    INNER JOIN annual_krs ak ON ak.id = c.annual_kr_id
    INNER JOIN objectives o ON o.id = ak.objective_id
    WHERE o.plan_id = p_plan_id
    GROUP BY c.recorded_by
  ),
  kr_ownership AS (
    SELECT
      ak.owner_id AS member_id,
      COUNT(*) AS krs_owned
    FROM annual_krs ak
    INNER JOIN objectives o ON o.id = ak.objective_id
    WHERE o.plan_id = p_plan_id
      AND ak.owner_id IS NOT NULL
    GROUP BY ak.owner_id
  ),
  activity_stats AS (
    SELECT
      ae.user_id AS member_id,
      COUNT(*) AS activity_count,
      MAX(ae.created_at) AS last_activity_at
    FROM activity_events ae
    WHERE ae.plan_id = p_plan_id
      AND ae.user_id IS NOT NULL
    GROUP BY ae.user_id
  )
  SELECT
    pm.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    pm.role,
    COALESCE(ts.tasks_assigned, 0) AS tasks_assigned,
    COALESCE(ts.tasks_completed, 0) AS tasks_completed,
    COALESCE(ts.tasks_in_progress, 0) AS tasks_in_progress,
    COALESCE(ts.tasks_overdue, 0) AS tasks_overdue,
    COALESCE(ts.tasks_by_priority, '{"high": 0, "medium": 0, "low": 0}'::jsonb) AS tasks_by_priority,
    COALESCE(ts.tasks_by_effort, '{"heavy": 0, "moderate": 0, "light": 0}'::jsonb) AS tasks_by_effort,
    COALESCE(cs.check_ins_made, 0) AS check_ins_made,
    COALESCE(ko.krs_owned, 0) AS krs_owned,
    COALESCE(ast.activity_count, 0) AS activity_count,
    ast.last_activity_at
  FROM plan_members pm
  INNER JOIN profiles p ON p.id = pm.user_id
  LEFT JOIN task_stats ts ON ts.member_id = pm.user_id
  LEFT JOIN checkin_stats cs ON cs.member_id = pm.user_id
  LEFT JOIN kr_ownership ko ON ko.member_id = pm.user_id
  LEFT JOIN activity_stats ast ON ast.member_id = pm.user_id
  WHERE pm.plan_id = p_plan_id
  ORDER BY pm.role, p.full_name;
$$;

GRANT EXECUTE ON FUNCTION get_member_workload_stats(UUID) TO authenticated;

COMMENT ON FUNCTION get_member_workload_stats IS 'Returns per-member workload metrics for team analytics';

-- ============================================================================
-- FUNCTION: Get Member Contributions by Period
-- ============================================================================
-- Returns daily contribution breakdown for each member

CREATE OR REPLACE FUNCTION get_member_contributions_by_period(
  p_plan_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  period_date DATE,
  check_ins_count BIGINT,
  tasks_completed_count BIGINT,
  tasks_created_count BIGINT,
  total_activity BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  WITH date_range AS (
    SELECT
      COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days') AS start_date,
      COALESCE(p_date_to, CURRENT_DATE) AS end_date
  ),
  members AS (
    SELECT user_id FROM plan_members WHERE plan_id = p_plan_id
  ),
  dates AS (
    SELECT generate_series(
      (SELECT start_date FROM date_range),
      (SELECT end_date FROM date_range),
      '1 day'::INTERVAL
    )::DATE AS period_date
  ),
  -- Cross join to get all member-date combinations
  member_dates AS (
    SELECT m.user_id, d.period_date
    FROM members m
    CROSS JOIN dates d
  ),
  -- Check-ins per member per day
  checkins_by_day AS (
    SELECT
      c.recorded_by AS user_id,
      c.recorded_at::DATE AS period_date,
      COUNT(*) AS count
    FROM check_ins c
    INNER JOIN annual_krs ak ON ak.id = c.annual_kr_id
    INNER JOIN objectives o ON o.id = ak.objective_id
    WHERE o.plan_id = p_plan_id
      AND c.recorded_at::DATE >= (SELECT start_date FROM date_range)
      AND c.recorded_at::DATE <= (SELECT end_date FROM date_range)
    GROUP BY c.recorded_by, c.recorded_at::DATE
  ),
  -- Tasks completed per member per day
  tasks_completed_by_day AS (
    SELECT
      COALESCE(ta.user_id, t.assigned_to) AS user_id,
      t.completed_at::DATE AS period_date,
      COUNT(*) AS count
    FROM tasks t
    LEFT JOIN task_assignees ta ON ta.task_id = t.id
    WHERE t.plan_id = p_plan_id
      AND t.status = 'completed'
      AND t.completed_at IS NOT NULL
      AND t.completed_at::DATE >= (SELECT start_date FROM date_range)
      AND t.completed_at::DATE <= (SELECT end_date FROM date_range)
      AND (ta.user_id IS NOT NULL OR t.assigned_to IS NOT NULL)
    GROUP BY COALESCE(ta.user_id, t.assigned_to), t.completed_at::DATE
  ),
  -- Tasks created per member per day (via activity_events)
  tasks_created_by_day AS (
    SELECT
      ae.user_id,
      ae.created_at::DATE AS period_date,
      COUNT(*) AS count
    FROM activity_events ae
    WHERE ae.plan_id = p_plan_id
      AND ae.entity_type = 'task'
      AND ae.event_type = 'created'
      AND ae.created_at::DATE >= (SELECT start_date FROM date_range)
      AND ae.created_at::DATE <= (SELECT end_date FROM date_range)
      AND ae.user_id IS NOT NULL
    GROUP BY ae.user_id, ae.created_at::DATE
  )
  SELECT
    md.user_id,
    md.period_date,
    COALESCE(cbd.count, 0) AS check_ins_count,
    COALESCE(tcd.count, 0) AS tasks_completed_count,
    COALESCE(tcrd.count, 0) AS tasks_created_count,
    COALESCE(cbd.count, 0) + COALESCE(tcd.count, 0) + COALESCE(tcrd.count, 0) AS total_activity
  FROM member_dates md
  LEFT JOIN checkins_by_day cbd ON cbd.user_id = md.user_id AND cbd.period_date = md.period_date
  LEFT JOIN tasks_completed_by_day tcd ON tcd.user_id = md.user_id AND tcd.period_date = md.period_date
  LEFT JOIN tasks_created_by_day tcrd ON tcrd.user_id = md.user_id AND tcrd.period_date = md.period_date
  -- Only return rows where there's at least one member with activity on that date
  WHERE COALESCE(cbd.count, 0) + COALESCE(tcd.count, 0) + COALESCE(tcrd.count, 0) > 0
  ORDER BY md.period_date, md.user_id;
$$;

GRANT EXECUTE ON FUNCTION get_member_contributions_by_period(UUID, DATE, DATE) TO authenticated;

COMMENT ON FUNCTION get_member_contributions_by_period IS 'Returns daily contribution breakdown for team analytics';

