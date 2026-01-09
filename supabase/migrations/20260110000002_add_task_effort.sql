-- Migration: Add effort field to tasks
-- Description: Add effort estimation to complement priority for better task planning
-- The combination of Priority (impact) + Effort (work) helps identify quick wins

-- ============================================================================
-- CREATE EFFORT ENUM
-- ============================================================================
-- Using different terminology from priority to avoid confusion:
-- Priority: low, medium, high (impact/urgency)
-- Effort: light, moderate, heavy (work required)

CREATE TYPE task_effort AS ENUM ('light', 'moderate', 'heavy');

COMMENT ON TYPE task_effort IS 'Estimated effort/work required: light (<30min), moderate (few hours), heavy (half-day+)';

-- ============================================================================
-- ADD EFFORT COLUMN TO TASKS
-- ============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS effort task_effort DEFAULT 'moderate';

COMMENT ON COLUMN tasks.effort IS 'Estimated effort required to complete the task';

-- Create index for filtering by effort (useful for finding quick wins)
CREATE INDEX IF NOT EXISTS idx_tasks_effort ON tasks(effort);

-- Composite index for priority + effort queries (quick wins = high priority + light effort)
CREATE INDEX IF NOT EXISTS idx_tasks_priority_effort ON tasks(priority, effort);

-- ============================================================================
-- UPDATE ACTIVITY EVENTS TRIGGER TO INCLUDE EFFORT
-- ============================================================================

CREATE OR REPLACE FUNCTION tasks_activity_events()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_event_type event_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_data := jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'priority', NEW.priority,
      'effort', NEW.effort,
      'due_date', NEW.due_date,
      'due_time', NEW.due_time,
      'objective_id', NEW.objective_id,
      'annual_kr_id', NEW.annual_kr_id,
      'quarter_target_id', NEW.quarter_target_id
    );
    
    PERFORM log_activity_event(
      NEW.plan_id, 'task'::event_entity_type, NEW.id,
      'created'::event_type, NULL, v_new_data
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := jsonb_build_object(
      'title', OLD.title,
      'status', OLD.status,
      'priority', OLD.priority,
      'effort', OLD.effort,
      'due_date', OLD.due_date,
      'due_time', OLD.due_time,
      'objective_id', OLD.objective_id,
      'annual_kr_id', OLD.annual_kr_id,
      'quarter_target_id', OLD.quarter_target_id
    );
    v_new_data := jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'priority', NEW.priority,
      'effort', NEW.effort,
      'due_date', NEW.due_date,
      'due_time', NEW.due_time,
      'objective_id', NEW.objective_id,
      'annual_kr_id', NEW.annual_kr_id,
      'quarter_target_id', NEW.quarter_target_id
    );
    
    -- Determine specific event type
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'completed' THEN
        v_event_type := 'completed'::event_type;
      ELSE
        v_event_type := 'status_changed'::event_type;
      END IF;
    ELSE
      v_event_type := 'updated'::event_type;
    END IF;
    
    PERFORM log_activity_event(
      NEW.plan_id, 'task'::event_entity_type, NEW.id,
      v_event_type, v_old_data, v_new_data
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := jsonb_build_object(
      'title', OLD.title,
      'status', OLD.status,
      'priority', OLD.priority,
      'effort', OLD.effort,
      'objective_id', OLD.objective_id,
      'annual_kr_id', OLD.annual_kr_id,
      'quarter_target_id', OLD.quarter_target_id
    );
    
    PERFORM log_activity_event(
      OLD.plan_id, 'task'::event_entity_type, OLD.id,
      'deleted'::event_type, v_old_data, NULL
    );
    
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger already exists, we just updated the function
