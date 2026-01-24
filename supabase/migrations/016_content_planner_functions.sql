-- ============================================================================
-- Migration 016: Content Planner Functions & Triggers
-- ============================================================================
-- Creates functions and triggers for:
-- 1. Auto-updating post status based on distributions
-- 2. Activity timeline integration
-- 3. Auto-mark scheduled posts as posted (helper function)
-- ============================================================================

-- ============================================================================
-- FUNCTION: Update post status based on distributions
-- ============================================================================
-- Status rules:
--   - No distributions → "backlog"
--   - Has distributions, none scheduled/posted → "tagged"
--   - Any distribution scheduled or posted, not all complete → "ongoing"
--   - All distributions posted → "complete"

CREATE OR REPLACE FUNCTION update_content_post_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id UUID;
  v_total_count INTEGER;
  v_posted_count INTEGER;
  v_scheduled_count INTEGER;
  v_new_status content_post_status;
BEGIN
  -- Determine which post to update
  IF TG_OP = 'DELETE' THEN
    v_post_id := OLD.post_id;
  ELSE
    v_post_id := NEW.post_id;
  END IF;

  -- Count distributions by status
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'posted'),
    COUNT(*) FILTER (WHERE status = 'scheduled')
  INTO v_total_count, v_posted_count, v_scheduled_count
  FROM content_distributions
  WHERE post_id = v_post_id;

  -- Determine new status
  IF v_total_count = 0 THEN
    v_new_status := 'backlog';
  ELSIF v_posted_count = v_total_count THEN
    v_new_status := 'complete';
  ELSIF v_posted_count > 0 OR v_scheduled_count > 0 THEN
    v_new_status := 'ongoing';
  ELSE
    v_new_status := 'tagged';
  END IF;

  -- Update post status if changed
  UPDATE content_posts
  SET status = v_new_status
  WHERE id = v_post_id
    AND status IS DISTINCT FROM v_new_status;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER content_distributions_update_post_status
  AFTER INSERT OR UPDATE OR DELETE ON content_distributions
  FOR EACH ROW EXECUTE FUNCTION update_content_post_status();

COMMENT ON FUNCTION update_content_post_status() IS 'Auto-updates content_posts.status based on distribution statuses';

-- ============================================================================
-- FUNCTION: Mark scheduled distributions as posted
-- ============================================================================
-- This function can be called manually or via pg_cron to update distributions
-- where scheduled_at <= NOW() and status = 'scheduled'.
-- Note: For automatic scheduling, configure pg_cron or call from application.

CREATE OR REPLACE FUNCTION mark_scheduled_distributions_as_posted()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE content_distributions
    SET
      status = 'posted',
      posted_at = COALESCE(scheduled_at, NOW()),
      updated_at = NOW()
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;

  RETURN v_updated_count;
END;
$$;

COMMENT ON FUNCTION mark_scheduled_distributions_as_posted() IS 'Updates scheduled distributions to posted when scheduled_at <= NOW(). Call via cron or application.';

-- ============================================================================
-- FUNCTION: Activity events for content posts
-- ============================================================================

CREATE OR REPLACE FUNCTION content_posts_activity_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity_event(
      NEW.plan_id,
      'content_post'::event_entity_type,
      NEW.id,
      'created'::event_type,
      NULL,
      jsonb_build_object(
        'title', NEW.title,
        'status', NEW.status
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_activity_event(
        NEW.plan_id,
        'content_post'::event_entity_type,
        NEW.id,
        CASE
          WHEN NEW.status = 'complete' THEN 'completed'::event_type
          ELSE 'status_changed'::event_type
        END,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
      );
    -- Log other meaningful updates
    ELSIF OLD.title IS DISTINCT FROM NEW.title
       OR OLD.description IS DISTINCT FROM NEW.description THEN
      PERFORM log_activity_event(
        NEW.plan_id,
        'content_post'::event_entity_type,
        NEW.id,
        'updated'::event_type,
        jsonb_build_object('title', OLD.title),
        jsonb_build_object('title', NEW.title)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity_event(
      OLD.plan_id,
      'content_post'::event_entity_type,
      OLD.id,
      'deleted'::event_type,
      jsonb_build_object('title', OLD.title, 'status', OLD.status),
      NULL
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER content_posts_activity_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION content_posts_activity_events();

COMMENT ON FUNCTION content_posts_activity_events() IS 'Logs content post events to activity_events table';

-- ============================================================================
-- FUNCTION: Activity events for content distributions
-- ============================================================================

CREATE OR REPLACE FUNCTION content_distributions_activity_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id UUID;
  v_post_title TEXT;
  v_account_name TEXT;
  v_platform_name TEXT;
BEGIN
  -- Get context info
  IF TG_OP = 'DELETE' THEN
    SELECT p.plan_id, p.title INTO v_plan_id, v_post_title
    FROM content_posts p WHERE p.id = OLD.post_id;

    SELECT a.account_name, pl.display_name INTO v_account_name, v_platform_name
    FROM content_accounts a
    JOIN content_platforms pl ON a.platform_id = pl.id
    WHERE a.id = OLD.account_id;
  ELSE
    SELECT p.plan_id, p.title INTO v_plan_id, v_post_title
    FROM content_posts p WHERE p.id = NEW.post_id;

    SELECT a.account_name, pl.display_name INTO v_account_name, v_platform_name
    FROM content_accounts a
    JOIN content_platforms pl ON a.platform_id = pl.id
    WHERE a.id = NEW.account_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Log distribution created (scheduled)
    IF NEW.status = 'scheduled' AND NEW.scheduled_at IS NOT NULL THEN
      PERFORM log_activity_event(
        v_plan_id,
        'content_distribution'::event_entity_type,
        NEW.id,
        'created'::event_type,
        NULL,
        jsonb_build_object(
          'post_title', v_post_title,
          'platform', v_platform_name,
          'account', v_account_name,
          'scheduled_at', NEW.scheduled_at,
          'format', NEW.format
        ),
        jsonb_build_object('action', 'scheduled')
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log when distribution is posted
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'posted' THEN
      PERFORM log_activity_event(
        v_plan_id,
        'content_distribution'::event_entity_type,
        NEW.id,
        'completed'::event_type,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object(
          'status', NEW.status,
          'post_title', v_post_title,
          'platform', v_platform_name,
          'account', v_account_name,
          'posted_at', NEW.posted_at,
          'platform_post_url', NEW.platform_post_url
        ),
        jsonb_build_object('action', 'posted')
      );
    -- Log when distribution is scheduled
    ELSIF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at AND NEW.scheduled_at IS NOT NULL THEN
      PERFORM log_activity_event(
        v_plan_id,
        'content_distribution'::event_entity_type,
        NEW.id,
        'updated'::event_type,
        jsonb_build_object('scheduled_at', OLD.scheduled_at),
        jsonb_build_object(
          'scheduled_at', NEW.scheduled_at,
          'post_title', v_post_title,
          'platform', v_platform_name
        ),
        jsonb_build_object('action', 'rescheduled')
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER content_distributions_activity_events_trigger
  AFTER INSERT OR UPDATE ON content_distributions
  FOR EACH ROW EXECUTE FUNCTION content_distributions_activity_events();

COMMENT ON FUNCTION content_distributions_activity_events() IS 'Logs content distribution events to activity_events table';

-- ============================================================================
-- FUNCTION: Activity events for content campaigns
-- ============================================================================

CREATE OR REPLACE FUNCTION content_campaigns_activity_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_platform_name TEXT;
BEGIN
  -- Get platform name
  IF TG_OP = 'DELETE' THEN
    SELECT display_name INTO v_platform_name
    FROM content_platforms WHERE id = OLD.platform_id;
  ELSE
    SELECT display_name INTO v_platform_name
    FROM content_platforms WHERE id = NEW.platform_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity_event(
      NEW.plan_id,
      'content_campaign'::event_entity_type,
      NEW.id,
      'created'::event_type,
      NULL,
      jsonb_build_object(
        'name', NEW.name,
        'platform', v_platform_name,
        'objective', NEW.objective,
        'budget', NEW.budget_allocated
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_activity_event(
        NEW.plan_id,
        'content_campaign'::event_entity_type,
        NEW.id,
        CASE
          WHEN NEW.status = 'completed' THEN 'completed'::event_type
          WHEN NEW.status = 'active' AND OLD.status = 'draft' THEN 'started'::event_type
          ELSE 'status_changed'::event_type
        END,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object(
          'status', NEW.status,
          'name', NEW.name,
          'platform', v_platform_name
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity_event(
      OLD.plan_id,
      'content_campaign'::event_entity_type,
      OLD.id,
      'deleted'::event_type,
      jsonb_build_object('name', OLD.name, 'status', OLD.status),
      NULL
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER content_campaigns_activity_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON content_campaigns
  FOR EACH ROW EXECUTE FUNCTION content_campaigns_activity_events();

COMMENT ON FUNCTION content_campaigns_activity_events() IS 'Logs content campaign events to activity_events table';

-- ============================================================================
-- FUNCTION: Activity events for distribution metrics check-ins
-- ============================================================================

CREATE OR REPLACE FUNCTION content_distribution_metrics_activity_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id UUID;
  v_post_title TEXT;
  v_platform_name TEXT;
BEGIN
  -- Get context info
  SELECT p.plan_id, p.title, pl.display_name
  INTO v_plan_id, v_post_title, v_platform_name
  FROM content_distributions d
  JOIN content_posts p ON d.post_id = p.id
  JOIN content_accounts a ON d.account_id = a.id
  JOIN content_platforms pl ON a.platform_id = pl.id
  WHERE d.id = NEW.distribution_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity_event(
      v_plan_id,
      'content_distribution'::event_entity_type,
      NEW.distribution_id,
      'updated'::event_type,
      NULL,
      jsonb_build_object(
        'post_title', v_post_title,
        'platform', v_platform_name,
        'metrics', NEW.metrics,
        'checked_at', NEW.checked_at
      ),
      jsonb_build_object('action', 'metrics_checkin')
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER content_distribution_metrics_activity_events_trigger
  AFTER INSERT ON content_distribution_metrics
  FOR EACH ROW EXECUTE FUNCTION content_distribution_metrics_activity_events();

COMMENT ON FUNCTION content_distribution_metrics_activity_events() IS 'Logs metrics check-in events to activity_events table';

-- ============================================================================
-- RPC FUNCTION: Get content posts with aggregations
-- ============================================================================
-- Efficient function to get posts with goal names and distribution counts

CREATE OR REPLACE FUNCTION get_content_posts_with_details(p_plan_id UUID)
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
  distribution_count BIGINT,
  scheduled_count BIGINT,
  posted_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
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
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'id', g.id,
          'name', g.name,
          'color', g.color
        ))
        FROM content_post_goals pg
        JOIN content_goals g ON pg.goal_id = g.id
        WHERE pg.post_id = p.id
      ),
      '[]'::jsonb
    ) AS goals,
    (SELECT COUNT(*) FROM content_distributions d WHERE d.post_id = p.id) AS distribution_count,
    (SELECT COUNT(*) FROM content_distributions d WHERE d.post_id = p.id AND d.status = 'scheduled') AS scheduled_count,
    (SELECT COUNT(*) FROM content_distributions d WHERE d.post_id = p.id AND d.status = 'posted') AS posted_count
  FROM content_posts p
  WHERE p.plan_id = p_plan_id
  ORDER BY p.status, p.display_order;
END;
$$;

COMMENT ON FUNCTION get_content_posts_with_details(UUID) IS 'Get content posts with aggregated goals and distribution counts';

-- ============================================================================
-- RPC FUNCTION: Reorder content posts within a status
-- ============================================================================

CREATE OR REPLACE FUNCTION reorder_content_posts(
  p_post_ids UUID[],
  p_status content_post_status
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_order INTEGER := 0;
BEGIN
  FOREACH v_id IN ARRAY p_post_ids
  LOOP
    UPDATE content_posts
    SET display_order = v_order
    WHERE id = v_id AND status = p_status;
    v_order := v_order + 1;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION reorder_content_posts(UUID[], content_post_status) IS 'Reorder content posts within a status column';

-- ============================================================================
-- RPC FUNCTION: Get content calendar data
-- ============================================================================
-- Returns scheduled and posted distributions for a date range

CREATE OR REPLACE FUNCTION get_content_calendar(
  p_plan_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  distribution_id UUID,
  post_id UUID,
  post_title TEXT,
  account_id UUID,
  account_name TEXT,
  platform_name TEXT,
  platform_color TEXT,
  format TEXT,
  status content_distribution_status,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS distribution_id,
    d.post_id,
    p.title AS post_title,
    d.account_id,
    a.account_name,
    pl.display_name AS platform_name,
    pl.color AS platform_color,
    d.format,
    d.status,
    d.scheduled_at,
    d.posted_at
  FROM content_distributions d
  JOIN content_posts p ON d.post_id = p.id
  JOIN content_accounts a ON d.account_id = a.id
  JOIN content_platforms pl ON a.platform_id = pl.id
  WHERE p.plan_id = p_plan_id
    AND (
      (d.scheduled_at IS NOT NULL AND d.scheduled_at::date BETWEEN p_start_date AND p_end_date)
      OR (d.posted_at IS NOT NULL AND d.posted_at::date BETWEEN p_start_date AND p_end_date)
    )
  ORDER BY COALESCE(d.scheduled_at, d.posted_at);
END;
$$;

COMMENT ON FUNCTION get_content_calendar(UUID, DATE, DATE) IS 'Get scheduled and posted distributions for content calendar';
