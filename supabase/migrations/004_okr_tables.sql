-- ============================================================================
-- Migration 004: OKR Tables
-- ============================================================================
-- Creates the OKR structure: objectives, kr_groups, annual_krs, quarter_targets, tasks.
-- All columns from later migrations are included here.
-- ============================================================================

-- ============================================================================
-- OBJECTIVES TABLE
-- ============================================================================
-- Annual objectives within a plan

CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, code)
);

CREATE INDEX idx_objectives_plan_id ON objectives(plan_id);
CREATE INDEX idx_objectives_sort_order ON objectives(plan_id, sort_order);

CREATE TRIGGER objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE objectives IS 'Annual objectives within a plan';

-- ============================================================================
-- KR_GROUPS TABLE
-- ============================================================================
-- Groups for organizing KRs

CREATE TABLE kr_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, name)
);

CREATE INDEX idx_kr_groups_plan_id ON kr_groups(plan_id);

CREATE TRIGGER kr_groups_updated_at
  BEFORE UPDATE ON kr_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE kr_groups IS 'Groups for organizing key results';

-- ============================================================================
-- ANNUAL_KRS TABLE
-- ============================================================================
-- Annual Key Results linked to objectives
-- Includes owner_id from later migration

CREATE TABLE annual_krs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  group_id UUID REFERENCES kr_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  kr_type kr_type NOT NULL DEFAULT 'metric',
  direction kr_direction NOT NULL DEFAULT 'increase',
  aggregation kr_aggregation NOT NULL DEFAULT 'reset_quarterly',
  unit TEXT,
  start_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_annual_krs_objective_id ON annual_krs(objective_id);
CREATE INDEX idx_annual_krs_group_id ON annual_krs(group_id);
CREATE INDEX idx_annual_krs_kr_type ON annual_krs(kr_type);
CREATE INDEX idx_annual_krs_owner_id ON annual_krs(owner_id);

CREATE TRIGGER annual_krs_updated_at
  BEFORE UPDATE ON annual_krs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE annual_krs IS 'Annual key results linked to objectives';
COMMENT ON COLUMN annual_krs.kr_type IS 'Type: metric, count, milestone, rate, average';
COMMENT ON COLUMN annual_krs.direction IS 'Goal direction: increase, decrease, or maintain';
COMMENT ON COLUMN annual_krs.aggregation IS 'How quarters aggregate: reset_quarterly or cumulative';
COMMENT ON COLUMN annual_krs.owner_id IS 'User responsible for this Key Result';

-- ============================================================================
-- QUARTER_TARGETS TABLE
-- ============================================================================
-- Quarterly targets for annual KRs

CREATE TABLE quarter_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_kr_id UUID NOT NULL REFERENCES annual_krs(id) ON DELETE CASCADE,
  quarter INT NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(annual_kr_id, quarter)
);

CREATE INDEX idx_quarter_targets_annual_kr_id ON quarter_targets(annual_kr_id);
CREATE INDEX idx_quarter_targets_quarter ON quarter_targets(quarter);

CREATE TRIGGER quarter_targets_updated_at
  BEFORE UPDATE ON quarter_targets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE quarter_targets IS 'Quarterly targets for annual key results';

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
-- Tasks can belong to objectives or quarter targets
-- Includes all columns from later migrations

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
  annual_kr_id UUID REFERENCES annual_krs(id) ON DELETE CASCADE,
  quarter_target_id UUID REFERENCES quarter_targets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  effort task_effort DEFAULT 'moderate',
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_master_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_parent_check CHECK (
    (
      (objective_id IS NOT NULL)::int +
      (annual_kr_id IS NOT NULL)::int +
      (quarter_target_id IS NOT NULL)::int
    ) <= 1
  )
);

-- Basic indexes
CREATE INDEX idx_tasks_plan_id ON tasks(plan_id);
CREATE INDEX idx_tasks_objective_id ON tasks(objective_id);
CREATE INDEX idx_tasks_annual_kr_id ON tasks(annual_kr_id);
CREATE INDEX idx_tasks_quarter_target_id ON tasks(quarter_target_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_effort ON tasks(effort);

-- Performance indexes
CREATE INDEX idx_tasks_plan_status_due ON tasks(plan_id, status, due_date);
CREATE INDEX idx_tasks_plan_completed ON tasks(plan_id, completed_at DESC) WHERE status = 'completed';
CREATE INDEX idx_tasks_plan_active_due ON tasks(plan_id, due_date, created_at) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_tasks_priority_effort ON tasks(priority, effort);
CREATE INDEX idx_tasks_due_time ON tasks(due_date, due_time) WHERE due_time IS NOT NULL;
CREATE INDEX idx_tasks_reminder_enabled ON tasks(reminder_enabled) WHERE reminder_enabled = TRUE AND status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_tasks_is_recurring ON tasks(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX idx_tasks_recurring_master ON tasks(recurring_master_id) WHERE recurring_master_id IS NOT NULL;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE tasks IS 'Tasks linked to objectives or quarter targets';

-- ============================================================================
-- TRIGGER FUNCTION: Auto-set completed_at
-- ============================================================================

CREATE OR REPLACE FUNCTION tasks_set_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_set_completed_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION tasks_set_completed_at();

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_id_from_objective(p_objective_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT plan_id FROM public.objectives WHERE id = p_objective_id;
$$;

CREATE OR REPLACE FUNCTION get_plan_id_from_annual_kr(p_annual_kr_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT o.plan_id
  FROM public.annual_krs ak
  JOIN public.objectives o ON o.id = ak.objective_id
  WHERE ak.id = p_annual_kr_id;
$$;

CREATE OR REPLACE FUNCTION get_plan_id_from_quarter_target(p_quarter_target_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT o.plan_id
  FROM public.quarter_targets qt
  JOIN public.annual_krs ak ON ak.id = qt.annual_kr_id
  JOIN public.objectives o ON o.id = ak.objective_id
  WHERE qt.id = p_quarter_target_id;
$$;

COMMENT ON FUNCTION get_plan_id_from_objective IS 'Get plan_id from an objective ID';
COMMENT ON FUNCTION get_plan_id_from_annual_kr IS 'Get plan_id from an annual KR ID';
COMMENT ON FUNCTION get_plan_id_from_quarter_target IS 'Get plan_id from a quarter target ID';
