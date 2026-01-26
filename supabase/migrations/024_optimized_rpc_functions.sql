-- ============================================================================
-- Migration 024: Optimized RPC Functions
-- ============================================================================
-- Creates optimized RPC functions to eliminate N+1 query patterns.
-- These functions replace multiple round-trips with single efficient queries.
-- ============================================================================

-- ============================================================================
-- FUNCTION: Get tags with usage counts (replaces N+1 in tags/api.ts)
-- ============================================================================
-- Original: Two queries + in-memory counting
-- Optimized: Single query with SQL aggregation

CREATE OR REPLACE FUNCTION get_tags_with_usage(p_plan_id UUID)
RETURNS TABLE (
  id UUID,
  plan_id UUID,
  name TEXT,
  kind tag_kind,
  color TEXT,
  created_at TIMESTAMPTZ,
  task_count BIGINT,
  kr_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    t.id,
    t.plan_id,
    t.name,
    t.kind,
    t.color,
    t.created_at,
    COALESCE(tt.task_count, 0) AS task_count,
    COALESCE(kt.kr_count, 0) AS kr_count
  FROM tags t
  LEFT JOIN (
    SELECT tag_id, COUNT(*) AS task_count
    FROM task_tags
    GROUP BY tag_id
  ) tt ON tt.tag_id = t.id
  LEFT JOIN (
    SELECT tag_id, COUNT(*) AS kr_count
    FROM annual_kr_tags
    GROUP BY tag_id
  ) kt ON kt.tag_id = t.id
  WHERE t.plan_id = p_plan_id
  ORDER BY t.kind, t.name;
$$;

COMMENT ON FUNCTION get_tags_with_usage(UUID) IS 'Get tags with usage counts in a single query';

-- ============================================================================
-- FUNCTION: Get content post with full details (replaces N+1 in content/api.ts)
-- ============================================================================
-- Original: Fetches post, then media, then links, then distributions separately
-- Optimized: Returns all data as JSONB in single query

CREATE OR REPLACE FUNCTION get_content_post_full(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  plan_id UUID,
  title TEXT,
  description TEXT,
  status content_post_status,
  created_by UUID,
  display_order INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  goals JSONB,
  media JSONB,
  links JSONB,
  distributions JSONB
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    p.id,
    p.plan_id,
    p.title,
    p.description,
    p.status,
    p.created_by,
    p.display_order,
    p.created_at,
    p.updated_at,
    -- Goals
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'color', g.color
      ) ORDER BY g.display_order)
      FROM content_post_goals pg
      JOIN content_goals g ON pg.goal_id = g.id
      WHERE pg.post_id = p.id),
      '[]'::jsonb
    ) AS goals,
    -- Media
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'file_type', m.file_type,
        'file_name', m.file_name,
        'file_url', m.file_url,
        'file_size', m.file_size,
        'mime_type', m.mime_type,
        'display_order', m.display_order,
        'alt_text', m.alt_text
      ) ORDER BY m.display_order)
      FROM content_post_media m
      WHERE m.post_id = p.id),
      '[]'::jsonb
    ) AS media,
    -- Links
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'url', l.url,
        'title', l.title,
        'description', l.description,
        'display_order', l.display_order
      ) ORDER BY l.display_order)
      FROM content_post_links l
      WHERE l.post_id = p.id),
      '[]'::jsonb
    ) AS links,
    -- Distributions with account/platform info
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'account_id', d.account_id,
        'status', d.status,
        'format', d.format,
        'caption', d.caption,
        'scheduled_at', d.scheduled_at,
        'posted_at', d.posted_at,
        'platform_post_url', d.platform_post_url,
        'account_name', a.account_name,
        'platform_id', pl.id,
        'platform_name', pl.display_name,
        'platform_icon', pl.icon,
        'platform_color', pl.color
      ) ORDER BY d.created_at)
      FROM content_distributions d
      JOIN content_accounts a ON d.account_id = a.id
      JOIN content_platforms pl ON a.platform_id = pl.id
      WHERE d.post_id = p.id),
      '[]'::jsonb
    ) AS distributions
  FROM content_posts p
  WHERE p.id = p_post_id;
$$;

COMMENT ON FUNCTION get_content_post_full(UUID) IS 'Get complete content post with all related data in single query';

-- ============================================================================
-- FUNCTION: Get annual KRs for plan (replaces N+1 in annual-krs/api.ts)
-- ============================================================================
-- Original: Query objectives, then query KRs for each
-- Optimized: Single join query

CREATE OR REPLACE FUNCTION get_annual_krs_for_plan(p_plan_id UUID)
RETURNS TABLE (
  id UUID,
  objective_id UUID,
  objective_code TEXT,
  objective_name TEXT,
  group_id UUID,
  name TEXT,
  description TEXT,
  kr_type kr_type,
  direction kr_direction,
  aggregation kr_aggregation,
  unit TEXT,
  start_value NUMERIC,
  target_value NUMERIC,
  current_value NUMERIC,
  sort_order INTEGER,
  owner_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  check_in_count BIGINT,
  last_check_in_at TIMESTAMPTZ,
  quarter_targets JSONB
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ak.id,
    ak.objective_id,
    o.code AS objective_code,
    o.name AS objective_name,
    ak.group_id,
    ak.name,
    ak.description,
    ak.kr_type,
    ak.direction,
    ak.aggregation,
    ak.unit,
    ak.start_value,
    ak.target_value,
    ak.current_value,
    ak.sort_order,
    ak.owner_id,
    ak.created_at,
    ak.updated_at,
    COALESCE(ci.check_in_count, 0) AS check_in_count,
    ci.last_check_in_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', qt.id,
        'quarter', qt.quarter,
        'target_value', qt.target_value,
        'current_value', qt.current_value,
        'notes', qt.notes
      ) ORDER BY qt.quarter)
      FROM quarter_targets qt
      WHERE qt.annual_kr_id = ak.id),
      '[]'::jsonb
    ) AS quarter_targets
  FROM annual_krs ak
  JOIN objectives o ON o.id = ak.objective_id
  LEFT JOIN (
    SELECT
      annual_kr_id,
      COUNT(*) AS check_in_count,
      MAX(recorded_at) AS last_check_in_at
    FROM check_ins
    GROUP BY annual_kr_id
  ) ci ON ci.annual_kr_id = ak.id
  WHERE o.plan_id = p_plan_id
  ORDER BY o.sort_order, ak.sort_order;
$$;

COMMENT ON FUNCTION get_annual_krs_for_plan(UUID) IS 'Get all KRs for a plan with objective info and aggregations';

-- ============================================================================
-- FUNCTION: Get activity stats (replaces in-memory aggregation in timeline/api.ts)
-- ============================================================================
-- Original: Fetches all events then aggregates in JavaScript
-- Optimized: SQL aggregation

CREATE OR REPLACE FUNCTION get_activity_stats(
  p_plan_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  entity_type event_entity_type,
  event_type event_type,
  event_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ae.entity_type,
    ae.event_type,
    COUNT(*) AS event_count
  FROM activity_events ae
  WHERE ae.plan_id = p_plan_id
    AND (p_start_date IS NULL OR ae.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ae.created_at < p_end_date + INTERVAL '1 day')
  GROUP BY ae.entity_type, ae.event_type
  ORDER BY ae.entity_type, ae.event_type;
$$;

COMMENT ON FUNCTION get_activity_stats(UUID, DATE, DATE) IS 'Get activity event counts grouped by type';

-- ============================================================================
-- FUNCTION: Get activity by date (replaces in-memory grouping in timeline/api.ts)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_activity_by_date(
  p_plan_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  activity_date DATE,
  event_count BIGINT,
  events JSONB
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ae.created_at::date AS activity_date,
    COUNT(*) AS event_count,
    jsonb_agg(jsonb_build_object(
      'id', ae.id,
      'entity_type', ae.entity_type,
      'entity_id', ae.entity_id,
      'event_type', ae.event_type,
      'user_id', ae.user_id,
      'new_data', ae.new_data,
      'old_data', ae.old_data,
      'metadata', ae.metadata,
      'created_at', ae.created_at
    ) ORDER BY ae.created_at DESC) AS events
  FROM activity_events ae
  WHERE ae.plan_id = p_plan_id
    AND ae.created_at >= p_start_date
    AND ae.created_at < p_end_date + INTERVAL '1 day'
  GROUP BY ae.created_at::date
  ORDER BY activity_date DESC;
$$;

COMMENT ON FUNCTION get_activity_by_date(UUID, DATE, DATE) IS 'Get activity events grouped by date';

-- ============================================================================
-- FUNCTION: Get task metrics (replaces in-memory filtering in analytics/api.ts)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_task_metrics(
  p_plan_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  in_progress_tasks BIGINT,
  cancelled_tasks BIGINT,
  overdue_tasks BIGINT,
  tasks_by_priority JSONB,
  tasks_by_effort JSONB,
  quick_wins BIGINT,
  completion_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH task_stats AS (
    SELECT
      COUNT(*) AS total_tasks,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tasks,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_tasks,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND due_date < CURRENT_DATE) AS overdue_tasks,
      COUNT(*) FILTER (WHERE priority = 'high' AND effort = 'light') AS quick_wins
    FROM tasks
    WHERE plan_id = p_plan_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at < p_end_date + INTERVAL '1 day')
  ),
  priority_counts AS (
    SELECT jsonb_object_agg(priority, cnt) AS tasks_by_priority
    FROM (
      SELECT priority::text, COUNT(*) AS cnt
      FROM tasks
      WHERE plan_id = p_plan_id
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at < p_end_date + INTERVAL '1 day')
      GROUP BY priority
    ) p
  ),
  effort_counts AS (
    SELECT jsonb_object_agg(COALESCE(effort::text, 'unset'), cnt) AS tasks_by_effort
    FROM (
      SELECT effort::text, COUNT(*) AS cnt
      FROM tasks
      WHERE plan_id = p_plan_id
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at < p_end_date + INTERVAL '1 day')
      GROUP BY effort
    ) e
  )
  SELECT
    ts.total_tasks,
    ts.completed_tasks,
    ts.pending_tasks,
    ts.in_progress_tasks,
    ts.cancelled_tasks,
    ts.overdue_tasks,
    COALESCE(pc.tasks_by_priority, '{}'::jsonb),
    COALESCE(ec.tasks_by_effort, '{}'::jsonb),
    ts.quick_wins,
    CASE WHEN ts.total_tasks > 0
      THEN ROUND(ts.completed_tasks::numeric / ts.total_tasks * 100, 2)
      ELSE 0
    END AS completion_rate
  FROM task_stats ts
  CROSS JOIN priority_counts pc
  CROSS JOIN effort_counts ec;
$$;

COMMENT ON FUNCTION get_task_metrics(UUID, DATE, DATE) IS 'Get comprehensive task metrics with aggregations';

-- ============================================================================
-- FUNCTION: Get check-in streak (replaces in-memory date iteration)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_checkin_streak(p_plan_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  last_checkin_date DATE
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_streak INTEGER := 0;
  v_prev_date DATE;
  rec RECORD;
BEGIN
  -- Get distinct check-in dates ordered
  FOR rec IN
    SELECT DISTINCT ci.recorded_at::date AS checkin_date
    FROM check_ins ci
    JOIN annual_krs ak ON ci.annual_kr_id = ak.id
    JOIN objectives o ON ak.objective_id = o.id
    WHERE o.plan_id = p_plan_id
    ORDER BY checkin_date DESC
  LOOP
    IF v_prev_date IS NULL THEN
      v_streak := 1;
      v_last_date := rec.checkin_date;
    ELSIF v_prev_date - rec.checkin_date = 1 THEN
      v_streak := v_streak + 1;
    ELSE
      IF v_streak > v_longest_streak THEN
        v_longest_streak := v_streak;
      END IF;
      IF v_current_streak = 0 AND v_prev_date = CURRENT_DATE THEN
        v_current_streak := v_streak;
      END IF;
      v_streak := 1;
    END IF;
    v_prev_date := rec.checkin_date;
  END LOOP;

  -- Final check for last streak
  IF v_streak > v_longest_streak THEN
    v_longest_streak := v_streak;
  END IF;
  IF v_current_streak = 0 AND (v_prev_date = CURRENT_DATE OR v_prev_date = CURRENT_DATE - 1) THEN
    v_current_streak := v_streak;
  END IF;

  current_streak := v_current_streak;
  longest_streak := v_longest_streak;
  last_checkin_date := v_last_date;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION get_checkin_streak(UUID) IS 'Calculate check-in streak efficiently in SQL';

-- ============================================================================
-- FUNCTION: Batch update widget positions (replaces Promise.all individual updates)
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_update_widget_positions(
  p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_update JSONB;
BEGIN
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE dashboard_widgets
    SET
      "order" = (v_update->>'order')::integer,
      updated_at = NOW()
    WHERE id = (v_update->>'id')::uuid;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION batch_update_widget_positions(JSONB) IS 'Batch update widget positions in single transaction';

-- ============================================================================
-- FUNCTION: Batch update task sort orders (replaces Promise.all individual updates)
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_update_task_orders(
  p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_update JSONB;
BEGIN
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE tasks
    SET
      sort_order = (v_update->>'sort_order')::integer,
      status = COALESCE((v_update->>'status')::task_status, status),
      updated_at = NOW()
    WHERE id = (v_update->>'id')::uuid;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION batch_update_task_orders(JSONB) IS 'Batch update task sort orders and status';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_tags_with_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_content_post_full(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_annual_krs_for_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_stats(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_by_date(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_metrics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_checkin_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_widget_positions(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_task_orders(JSONB) TO authenticated;
