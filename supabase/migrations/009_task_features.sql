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
