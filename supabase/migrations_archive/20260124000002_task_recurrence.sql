-- Task Recurrence Tables
-- Implements recurring tasks with iCal RRULE compatibility

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Recurrence frequency types
CREATE TYPE recurrence_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

-- End condition types for recurrence
CREATE TYPE recurrence_end_type AS ENUM (
  'never',      -- Repeats indefinitely
  'count',      -- Ends after N occurrences
  'until'       -- Ends on a specific date
);

-- ============================================================================
-- TASK RECURRENCE RULES TABLE
-- ============================================================================

-- Stores the recurrence pattern for a master task
CREATE TABLE task_recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The master/template task that defines the recurring task
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- iCal RRULE string for interoperability
  -- e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2"
  rrule TEXT NOT NULL,

  -- Parsed recurrence components (for easier querying)
  frequency recurrence_frequency NOT NULL,
  interval_value INT NOT NULL DEFAULT 1 CHECK (interval_value >= 1),

  -- For weekly: days of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  -- Stored as array, e.g., [1, 3, 5] for Mon, Wed, Fri
  days_of_week INT[] DEFAULT NULL,

  -- For monthly: day of month (1-31) OR null if using relative day
  day_of_month INT DEFAULT NULL CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),

  -- For monthly/yearly relative positioning
  -- e.g., "first Monday", "last Friday"
  week_of_month INT DEFAULT NULL CHECK (week_of_month IS NULL OR week_of_month BETWEEN -1 AND 5),
  -- -1 = last, 1 = first, 2 = second, 3 = third, 4 = fourth, 5 = fifth
  day_of_week_for_month INT DEFAULT NULL CHECK (day_of_week_for_month IS NULL OR day_of_week_for_month BETWEEN 0 AND 6),

  -- For yearly: month (1-12)
  month_of_year INT DEFAULT NULL CHECK (month_of_year IS NULL OR month_of_year BETWEEN 1 AND 12),

  -- End conditions
  end_type recurrence_end_type NOT NULL DEFAULT 'never',
  end_count INT DEFAULT NULL CHECK (end_count IS NULL OR end_count >= 1),
  end_date DATE DEFAULT NULL,

  -- Timezone for the recurrence (IANA timezone name)
  timezone TEXT NOT NULL DEFAULT 'UTC',

  -- Track the last date we generated instances up to
  last_generated_date DATE DEFAULT NULL,

  -- Number of instances to pre-generate
  generation_limit INT NOT NULL DEFAULT 20,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each task can only have one recurrence rule
  CONSTRAINT unique_task_recurrence UNIQUE (task_id)
);

-- Index for finding recurrence rules that need instance generation
CREATE INDEX idx_recurrence_rules_last_generated ON task_recurrence_rules(last_generated_date);
CREATE INDEX idx_recurrence_rules_task_id ON task_recurrence_rules(task_id);

-- Trigger for updated_at
CREATE TRIGGER task_recurrence_rules_updated_at
  BEFORE UPDATE ON task_recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- TASK RECURRENCE INSTANCES TABLE
-- ============================================================================

-- Tracks generated instances and exceptions
CREATE TABLE task_recurrence_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the recurrence rule
  recurrence_rule_id UUID NOT NULL REFERENCES task_recurrence_rules(id) ON DELETE CASCADE,

  -- The actual task instance (each instance is a real task in tasks table)
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- The originally scheduled date from the RRULE calculation
  original_date DATE NOT NULL,

  -- If true, this instance has been detached from the series
  -- (edited independently, no longer follows the pattern)
  is_exception BOOLEAN NOT NULL DEFAULT FALSE,

  -- Soft delete for "delete this instance only" - creates an exception date
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one instance per rule per date
  CONSTRAINT unique_instance_per_date UNIQUE (recurrence_rule_id, original_date)
);

-- Indexes for efficient querying
CREATE INDEX idx_recurrence_instances_rule ON task_recurrence_instances(recurrence_rule_id);
CREATE INDEX idx_recurrence_instances_task ON task_recurrence_instances(task_id);
CREATE INDEX idx_recurrence_instances_date ON task_recurrence_instances(original_date);
CREATE INDEX idx_recurrence_instances_not_deleted ON task_recurrence_instances(recurrence_rule_id)
  WHERE is_deleted = FALSE;

-- ============================================================================
-- ADD RECURRENCE FLAG TO TASKS TABLE
-- ============================================================================

-- Add column to tasks to indicate if it's a master recurring task
ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT FALSE;

-- Add column to indicate if this task is an instance of a recurring task
-- (points to the master task)
ALTER TABLE tasks ADD COLUMN recurring_master_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Index for finding recurring tasks
CREATE INDEX idx_tasks_is_recurring ON tasks(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX idx_tasks_recurring_master ON tasks(recurring_master_id) WHERE recurring_master_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE task_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_recurrence_instances ENABLE ROW LEVEL SECURITY;

-- Recurrence rules: access based on task's plan membership
CREATE POLICY "Users can view recurrence rules for tasks in their plans"
  ON task_recurrence_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN plan_members pm ON pm.plan_id = t.plan_id
      WHERE t.id = task_recurrence_rules.task_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage recurrence rules"
  ON task_recurrence_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN plan_members pm ON pm.plan_id = t.plan_id
      WHERE t.id = task_recurrence_rules.task_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- Recurrence instances: access based on task's plan membership
CREATE POLICY "Users can view recurrence instances for tasks in their plans"
  ON task_recurrence_instances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN plan_members pm ON pm.plan_id = t.plan_id
      WHERE t.id = task_recurrence_instances.task_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage recurrence instances"
  ON task_recurrence_instances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN plan_members pm ON pm.plan_id = t.plan_id
      WHERE t.id = task_recurrence_instances.task_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get the master task for a recurring instance
CREATE OR REPLACE FUNCTION get_recurring_master_task(p_task_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(recurring_master_id, id)
  FROM tasks
  WHERE id = p_task_id;
$$;

-- Function to check if a task is part of a recurring series
CREATE OR REPLACE FUNCTION is_recurring_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks
    WHERE id = p_task_id
    AND (is_recurring = TRUE OR recurring_master_id IS NOT NULL)
  );
$$;

-- Function to get recurrence info for a task
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
LANGUAGE SQL
STABLE
AS $$
  SELECT
    t.is_recurring,
    t.recurring_master_id IS NOT NULL AS is_instance,
    COALESCE(t.recurring_master_id, t.id) AS master_task_id,
    trr.id AS recurrence_rule_id,
    trr.rrule,
    trr.frequency,
    trr.end_type,
    tri.original_date AS instance_date,
    COALESCE(tri.is_exception, FALSE) AS is_exception
  FROM tasks t
  LEFT JOIN task_recurrence_rules trr ON trr.task_id = COALESCE(t.recurring_master_id, t.id)
  LEFT JOIN task_recurrence_instances tri ON tri.task_id = t.id
  WHERE t.id = p_task_id;
$$;

GRANT EXECUTE ON FUNCTION get_recurring_master_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_recurring_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_recurrence_info(UUID) TO authenticated;
