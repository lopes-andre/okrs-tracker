-- Migration: Weekly Review Activity Events
-- Description: Add weekly_review to activity events and create triggers

-- ============================================================================
-- ADD weekly_review TO event_entity_type ENUM
-- ============================================================================

ALTER TYPE event_entity_type ADD VALUE IF NOT EXISTS 'weekly_review';

-- ============================================================================
-- TRIGGER: Weekly Reviews activity events
-- ============================================================================

CREATE OR REPLACE FUNCTION weekly_reviews_activity_events()
RETURNS TRIGGER AS $$
DECLARE
  v_new_data JSONB;
  v_old_data JSONB;
  v_event_type event_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_data := jsonb_build_object(
      'year', NEW.year,
      'week_number', NEW.week_number,
      'status', NEW.status,
      'week_start', NEW.week_start,
      'week_end', NEW.week_end
    );
    
    PERFORM log_activity_event(
      NEW.plan_id, 'weekly_review'::event_entity_type, NEW.id,
      'created'::event_type, NULL, v_new_data
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log when status changes to 'complete'
    IF OLD.status != NEW.status AND NEW.status = 'complete' THEN
      v_old_data := jsonb_build_object(
        'status', OLD.status,
        'week_rating', OLD.week_rating
      );
      v_new_data := jsonb_build_object(
        'year', NEW.year,
        'week_number', NEW.week_number,
        'status', NEW.status,
        'week_rating', NEW.week_rating,
        'stats_tasks_completed', NEW.stats_tasks_completed,
        'stats_objectives_on_track', NEW.stats_objectives_on_track,
        'stats_objectives_at_risk', NEW.stats_objectives_at_risk
      );
      
      PERFORM log_activity_event(
        NEW.plan_id, 'weekly_review'::event_entity_type, NEW.id,
        'completed'::event_type, v_old_data, v_new_data
      );
      
    -- Log when review is started
    ELSIF OLD.started_at IS NULL AND NEW.started_at IS NOT NULL THEN
      v_new_data := jsonb_build_object(
        'year', NEW.year,
        'week_number', NEW.week_number,
        'status', NEW.status
      );
      
      PERFORM log_activity_event(
        NEW.plan_id, 'weekly_review'::event_entity_type, NEW.id,
        'updated'::event_type, NULL, v_new_data,
        jsonb_build_object('action', 'started')
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := jsonb_build_object(
      'year', OLD.year,
      'week_number', OLD.week_number,
      'status', OLD.status
    );
    
    PERFORM log_activity_event(
      OLD.plan_id, 'weekly_review'::event_entity_type, OLD.id,
      'deleted'::event_type, v_old_data, NULL
    );
    
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER weekly_reviews_activity_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON weekly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION weekly_reviews_activity_events();

-- ============================================================================
-- VIEW: Weekly Review Stats by Month
-- ============================================================================

CREATE OR REPLACE VIEW v_weekly_review_stats_by_month AS
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
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION weekly_reviews_activity_events IS 'Logs activity events for weekly review changes';
COMMENT ON VIEW v_weekly_review_stats_by_month IS 'Monthly aggregated stats for weekly reviews';
