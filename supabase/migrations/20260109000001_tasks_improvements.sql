-- Migration: Tasks Improvements
-- Description: Add annual_kr_id to tasks, update constraints, add performance indexes

-- ============================================================================
-- ADD annual_kr_id COLUMN TO TASKS
-- ============================================================================

-- Add the new column
ALTER TABLE tasks 
ADD COLUMN annual_kr_id UUID REFERENCES annual_krs(id) ON DELETE CASCADE;

-- Add index for efficient queries
CREATE INDEX idx_tasks_annual_kr_id ON tasks(annual_kr_id);

COMMENT ON COLUMN tasks.annual_kr_id IS 'Optional link to an annual KR for more granular task-KR relationship';

-- ============================================================================
-- UPDATE CHECK CONSTRAINT
-- ============================================================================
-- Now tasks can link to: objective_id, annual_kr_id, quarter_target_id, or none
-- But only one parent link at a time (or none for plan-level tasks)

-- Drop the old constraint
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_check;

-- Add the new constraint allowing annual_kr_id
ALTER TABLE tasks ADD CONSTRAINT tasks_parent_check CHECK (
  (
    -- Only one parent link at a time (or all null)
    (objective_id IS NOT NULL)::int + 
    (annual_kr_id IS NOT NULL)::int + 
    (quarter_target_id IS NOT NULL)::int
  ) <= 1
);

COMMENT ON CONSTRAINT tasks_parent_check ON tasks 
IS 'Task can link to at most one parent: objective, annual_kr, or quarter_target';

-- ============================================================================
-- PERFORMANCE INDEXES FOR TASK QUERIES
-- ============================================================================

-- Composite index for date-based task lists (most common query pattern)
CREATE INDEX idx_tasks_plan_status_due ON tasks(plan_id, status, due_date);

-- Composite index for completed tasks (for logbook queries)
CREATE INDEX idx_tasks_plan_completed ON tasks(plan_id, completed_at DESC) 
WHERE status = 'completed';

-- Composite index for active tasks sorted by due date
CREATE INDEX idx_tasks_plan_active_due ON tasks(plan_id, due_date, created_at)
WHERE status NOT IN ('completed', 'cancelled');

-- ============================================================================
-- HELPER FUNCTION: Get plan_id from annual_kr
-- ============================================================================
-- Already exists in okr_tables.sql as get_plan_id_from_annual_kr

-- ============================================================================
-- UPDATE ACTIVITY EVENTS TRIGGER FOR TASKS
-- ============================================================================
-- The existing trigger should work, but let's ensure the new column is captured

-- Drop and recreate the task trigger to include annual_kr_id in payload
CREATE OR REPLACE FUNCTION log_task_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_payload jsonb;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'task_created';
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'task_deleted';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      v_event_type := 'task_completed';
    ELSE
      v_event_type := 'task_updated';
    END IF;
  END IF;

  -- Build payload with task details
  IF TG_OP = 'DELETE' THEN
    v_payload := jsonb_build_object(
      'title', OLD.title,
      'status', OLD.status,
      'priority', OLD.priority,
      'objective_id', OLD.objective_id,
      'annual_kr_id', OLD.annual_kr_id,
      'quarter_target_id', OLD.quarter_target_id
    );
    
    INSERT INTO activity_events (plan_id, user_id, entity_type, entity_id, event_type, payload)
    VALUES (OLD.plan_id, auth.uid(), 'task', OLD.id, v_event_type, v_payload);
  ELSE
    v_payload := jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'priority', NEW.priority,
      'objective_id', NEW.objective_id,
      'annual_kr_id', NEW.annual_kr_id,
      'quarter_target_id', NEW.quarter_target_id,
      'due_date', NEW.due_date
    );
    
    -- Include changes for updates
    IF TG_OP = 'UPDATE' THEN
      v_payload := v_payload || jsonb_build_object(
        'previous_status', OLD.status,
        'previous_priority', OLD.priority
      );
    END IF;
    
    INSERT INTO activity_events (plan_id, user_id, entity_type, entity_id, event_type, payload)
    VALUES (NEW.plan_id, auth.uid(), 'task', NEW.id, v_event_type, v_payload);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate triggers (if they exist, drop them first)
DROP TRIGGER IF EXISTS task_insert_event ON tasks;
DROP TRIGGER IF EXISTS task_update_event ON tasks;
DROP TRIGGER IF EXISTS task_delete_event ON tasks;

CREATE TRIGGER task_insert_event
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_event();

CREATE TRIGGER task_update_event
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_event();

CREATE TRIGGER task_delete_event
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_event();

-- ============================================================================
-- RLS POLICIES FOR task_tags (ensure they exist)
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "task_tags_select" ON task_tags;
DROP POLICY IF EXISTS "task_tags_insert" ON task_tags;
DROP POLICY IF EXISTS "task_tags_delete" ON task_tags;

-- Enable RLS
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Select: Anyone with plan access can view task tags
CREATE POLICY "task_tags_select" ON task_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN plan_members pm ON pm.plan_id = t.plan_id
    WHERE t.id = task_tags.task_id
    AND pm.user_id = auth.uid()
  )
);

-- Insert: Editors and owners can add tags
CREATE POLICY "task_tags_insert" ON task_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN plan_members pm ON pm.plan_id = t.plan_id
    WHERE t.id = task_tags.task_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'editor')
  )
);

-- Delete: Editors and owners can remove tags
CREATE POLICY "task_tags_delete" ON task_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN plan_members pm ON pm.plan_id = t.plan_id
    WHERE t.id = task_tags.task_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('owner', 'editor')
  )
);
