-- ============================================================================
-- Migration 008: Weekly Reviews
-- ============================================================================
-- Creates weekly review tables, triggers, and activity logging.
-- ============================================================================

-- ============================================================================
-- WEEKLY REVIEWS TABLE
-- ============================================================================
-- One review per plan per week

CREATE TABLE weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status weekly_review_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reflection_what_went_well TEXT DEFAULT '',
  reflection_what_to_improve TEXT DEFAULT '',
  reflection_lessons_learned TEXT DEFAULT '',
  reflection_notes TEXT DEFAULT '',
  stats_krs_updated INTEGER DEFAULT 0,
  stats_tasks_completed INTEGER DEFAULT 0,
  stats_tasks_created INTEGER DEFAULT 0,
  stats_check_ins_made INTEGER DEFAULT 0,
  stats_objectives_on_track INTEGER DEFAULT 0,
  stats_objectives_at_risk INTEGER DEFAULT 0,
  stats_objectives_off_track INTEGER DEFAULT 0,
  stats_overall_progress INTEGER DEFAULT 0,
  stats_total_krs INTEGER DEFAULT 0,
  week_rating INTEGER CHECK (week_rating IS NULL OR week_rating BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, year, week_number)
);

CREATE INDEX idx_weekly_reviews_plan_id ON weekly_reviews(plan_id);
CREATE INDEX idx_weekly_reviews_status ON weekly_reviews(status);
CREATE INDEX idx_weekly_reviews_year_week ON weekly_reviews(year, week_number);
CREATE INDEX idx_weekly_reviews_week_start ON weekly_reviews(week_start);

CREATE TRIGGER weekly_reviews_updated_at
  BEFORE UPDATE ON weekly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE weekly_reviews IS 'Weekly review records for structured reflection and progress tracking';

-- ============================================================================
-- WEEKLY REVIEW SETTINGS TABLE
-- ============================================================================

CREATE TABLE weekly_review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE UNIQUE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_day INTEGER NOT NULL DEFAULT 5 CHECK (reminder_day BETWEEN 0 AND 6),
  reminder_time TIME NOT NULL DEFAULT '17:00',
  auto_create_reviews BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER weekly_review_settings_updated_at
  BEFORE UPDATE ON weekly_review_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE weekly_review_settings IS 'Per-plan settings for weekly review reminders and automation';

-- ============================================================================
-- WEEKLY REVIEW KR UPDATES TABLE
-- ============================================================================

CREATE TABLE weekly_review_kr_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_review_id UUID NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  annual_kr_id UUID NOT NULL REFERENCES annual_krs(id) ON DELETE CASCADE,
  value_before DECIMAL,
  value_after DECIMAL,
  progress_before DECIMAL,
  progress_after DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(weekly_review_id, annual_kr_id)
);

CREATE INDEX idx_weekly_review_kr_updates_review ON weekly_review_kr_updates(weekly_review_id);
CREATE INDEX idx_weekly_review_kr_updates_kr ON weekly_review_kr_updates(annual_kr_id);

COMMENT ON TABLE weekly_review_kr_updates IS 'Tracks KR value changes made during weekly reviews';

-- ============================================================================
-- WEEKLY REVIEW TASKS TABLE
-- ============================================================================

CREATE TABLE weekly_review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_review_id UUID NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status_at_review TEXT NOT NULL,
  was_completed_this_week BOOLEAN DEFAULT FALSE,
  was_created_this_week BOOLEAN DEFAULT FALSE,
  was_overdue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(weekly_review_id, task_id)
);

CREATE INDEX idx_weekly_review_tasks_review ON weekly_review_tasks(weekly_review_id);

COMMENT ON TABLE weekly_review_tasks IS 'Snapshot of task states during weekly reviews';

-- ============================================================================
-- TRIGGER: Weekly Reviews activity events
-- ============================================================================

CREATE OR REPLACE FUNCTION weekly_reviews_activity_events()
RETURNS TRIGGER AS $$
DECLARE
  v_new_data JSONB;
  v_old_data JSONB;
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

    ELSIF OLD.started_at IS NULL AND NEW.started_at IS NOT NULL THEN
      v_new_data := jsonb_build_object(
        'year', NEW.year,
        'week_number', NEW.week_number,
        'status', NEW.status
      );

      PERFORM log_activity_event(
        NEW.plan_id, 'weekly_review'::event_entity_type, NEW.id,
        'started'::event_type, NULL, v_new_data,
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

COMMENT ON FUNCTION weekly_reviews_activity_events IS 'Logs activity events for weekly review changes';
