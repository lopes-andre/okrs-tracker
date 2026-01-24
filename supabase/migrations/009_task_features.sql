-- ============================================================================
-- Migration 009: Task Features
-- ============================================================================
-- Creates task reminders, assignees, and recurrence tables.
-- ============================================================================

-- ============================================================================
-- TASK REMINDER SETTINGS TABLE
-- ============================================================================

CREATE TABLE task_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  reminders_enabled BOOLEAN DEFAULT TRUE,
  business_hours_enabled BOOLEAN DEFAULT FALSE,
  business_hours_start TIME DEFAULT '09:00',
  business_hours_end TIME DEFAULT '17:00',
  business_days INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5],
  sound_enabled BOOLEAN DEFAULT TRUE,
  daily_summary_enabled BOOLEAN DEFAULT TRUE,
  daily_summary_time TIME DEFAULT '09:00',
  hourly_reminders_enabled BOOLEAN DEFAULT TRUE,
  time_reminder_15min BOOLEAN DEFAULT TRUE,
  time_reminder_10min BOOLEAN DEFAULT TRUE,
  time_reminder_5min BOOLEAN DEFAULT TRUE,
  time_reminder_on_time BOOLEAN DEFAULT TRUE,
  time_reminder_overdue_30min BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT task_reminder_settings_plan_unique UNIQUE (plan_id)
);

CREATE INDEX idx_task_reminder_settings_plan ON task_reminder_settings(plan_id);

CREATE TRIGGER task_reminder_settings_updated_at
  BEFORE UPDATE ON task_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE task_reminder_settings IS 'Per-plan settings for task reminders';

-- ============================================================================
-- TASK ASSIGNEES TABLE
-- ============================================================================
-- Multi-user task assignment

CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);

COMMENT ON TABLE task_assignees IS 'Junction table for multi-user task assignments';

-- ============================================================================
-- TASK RECURRENCE RULES TABLE
-- ============================================================================

CREATE TABLE task_recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  rrule TEXT NOT NULL,
  frequency recurrence_frequency NOT NULL,
  interval_value INT NOT NULL DEFAULT 1 CHECK (interval_value >= 1),
  days_of_week INT[] DEFAULT NULL,
  day_of_month INT DEFAULT NULL CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  week_of_month INT DEFAULT NULL CHECK (week_of_month IS NULL OR week_of_month BETWEEN -1 AND 5),
  day_of_week_for_month INT DEFAULT NULL CHECK (day_of_week_for_month IS NULL OR day_of_week_for_month BETWEEN 0 AND 6),
  month_of_year INT DEFAULT NULL CHECK (month_of_year IS NULL OR month_of_year BETWEEN 1 AND 12),
  end_type recurrence_end_type NOT NULL DEFAULT 'never',
  end_count INT DEFAULT NULL CHECK (end_count IS NULL OR end_count >= 1),
  end_date DATE DEFAULT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  last_generated_date DATE DEFAULT NULL,
  generation_limit INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_task_recurrence UNIQUE (task_id)
);

CREATE INDEX idx_recurrence_rules_last_generated ON task_recurrence_rules(last_generated_date);
CREATE INDEX idx_recurrence_rules_task_id ON task_recurrence_rules(task_id);

CREATE TRIGGER task_recurrence_rules_updated_at
  BEFORE UPDATE ON task_recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE task_recurrence_rules IS 'Stores recurrence patterns for recurring tasks';

-- ============================================================================
-- TASK RECURRENCE INSTANCES TABLE
-- ============================================================================

CREATE TABLE task_recurrence_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_rule_id UUID NOT NULL REFERENCES task_recurrence_rules(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  is_exception BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_instance_per_date UNIQUE (recurrence_rule_id, original_date)
);

CREATE INDEX idx_recurrence_instances_rule ON task_recurrence_instances(recurrence_rule_id);
CREATE INDEX idx_recurrence_instances_task ON task_recurrence_instances(task_id);
CREATE INDEX idx_recurrence_instances_date ON task_recurrence_instances(original_date);
CREATE INDEX idx_recurrence_instances_not_deleted ON task_recurrence_instances(recurrence_rule_id)
  WHERE is_deleted = FALSE;

COMMENT ON TABLE task_recurrence_instances IS 'Tracks generated instances and exceptions for recurring tasks';

-- ============================================================================
-- RECURRENCE HELPER FUNCTIONS
-- ============================================================================

-- Get the master task ID for a task (returns itself if it's the master)
CREATE OR REPLACE FUNCTION get_recurring_master_task(p_task_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_master_id UUID;
BEGIN
  SELECT COALESCE(t.recurring_master_id, t.id) INTO v_master_id
  FROM public.tasks t
  WHERE t.id = p_task_id;

  RETURN v_master_id;
END;
$$;

COMMENT ON FUNCTION get_recurring_master_task IS 'Returns the master task ID for a recurring task instance';

-- Check if a task is part of a recurring series
CREATE OR REPLACE FUNCTION is_recurring_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_is_recurring BOOLEAN;
BEGIN
  SELECT (t.is_recurring = TRUE OR t.recurring_master_id IS NOT NULL) INTO v_is_recurring
  FROM public.tasks t
  WHERE t.id = p_task_id;

  RETURN COALESCE(v_is_recurring, FALSE);
END;
$$;

COMMENT ON FUNCTION is_recurring_task IS 'Returns true if the task is part of a recurring series';

-- Get full recurrence info for a task
CREATE OR REPLACE FUNCTION get_task_recurrence_info(p_task_id UUID)
RETURNS TABLE (
  is_recurring BOOLEAN,
  is_instance BOOLEAN,
  master_task_id UUID,
  recurrence_rule_id UUID,
  rrule TEXT,
  frequency recurrence_frequency,
  end_type recurrence_end_type,
  instance_date DATE,
  is_exception BOOLEAN
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH task_info AS (
    SELECT
      t.id,
      t.is_recurring AS is_master,
      t.recurring_master_id,
      COALESCE(t.recurring_master_id, t.id) AS master_id
    FROM public.tasks t
    WHERE t.id = p_task_id
  ),
  rule_info AS (
    SELECT
      trr.id AS rule_id,
      trr.rrule,
      trr.frequency,
      trr.end_type
    FROM public.task_recurrence_rules trr
    JOIN task_info ti ON trr.task_id = ti.master_id
  ),
  instance_info AS (
    SELECT
      tri.original_date,
      tri.is_exception
    FROM public.task_recurrence_instances tri
    WHERE tri.task_id = p_task_id
  )
  SELECT
    (ti.is_master OR ti.recurring_master_id IS NOT NULL) AS is_recurring,
    (ti.recurring_master_id IS NOT NULL) AS is_instance,
    ti.master_id AS master_task_id,
    ri.rule_id AS recurrence_rule_id,
    ri.rrule,
    ri.frequency,
    ri.end_type,
    ii.original_date AS instance_date,
    COALESCE(ii.is_exception, FALSE) AS is_exception
  FROM task_info ti
  LEFT JOIN rule_info ri ON TRUE
  LEFT JOIN instance_info ii ON TRUE;
END;
$$;

COMMENT ON FUNCTION get_task_recurrence_info IS 'Returns complete recurrence information for a task';

GRANT EXECUTE ON FUNCTION get_recurring_master_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_recurring_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_recurrence_info(UUID) TO authenticated;
