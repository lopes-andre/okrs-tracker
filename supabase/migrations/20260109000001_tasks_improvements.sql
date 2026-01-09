-- Migration: Tasks Improvements
-- Description: Add annual_kr_id to tasks, update constraints, add performance indexes
-- Version: 2.0 - Fixed to work with existing schema

-- ============================================================================
-- ADD annual_kr_id COLUMN TO TASKS
-- ============================================================================

-- Add the new column (allow NULL for existing tasks)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS annual_kr_id UUID REFERENCES annual_krs(id) ON DELETE CASCADE;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tasks_annual_kr_id ON tasks(annual_kr_id);

COMMENT ON COLUMN tasks.annual_kr_id IS 'Optional link to an annual KR for more granular task-KR relationship';

-- ============================================================================
-- UPDATE CHECK CONSTRAINT
-- ============================================================================
-- Now tasks can link to: objective_id, annual_kr_id, quarter_target_id, or none
-- But only one parent link at a time (or none for plan-level tasks)

-- Drop any existing constraints
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_parent_check;

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
CREATE INDEX IF NOT EXISTS idx_tasks_plan_status_due ON tasks(plan_id, status, due_date);

-- Composite index for completed tasks (for logbook queries)
CREATE INDEX IF NOT EXISTS idx_tasks_plan_completed ON tasks(plan_id, completed_at DESC) 
WHERE status = 'completed';

-- Composite index for active tasks sorted by due date
CREATE INDEX IF NOT EXISTS idx_tasks_plan_active_due ON tasks(plan_id, due_date, created_at)
WHERE status NOT IN ('completed', 'cancelled');

-- ============================================================================
-- UPDATE TASK ACTIVITY EVENTS TRIGGER
-- ============================================================================
-- Update the existing trigger function to include annual_kr_id in the event data

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
      'due_date', NEW.due_date,
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
      'due_date', OLD.due_date,
      'objective_id', OLD.objective_id,
      'annual_kr_id', OLD.annual_kr_id,
      'quarter_target_id', OLD.quarter_target_id
    );
    v_new_data := jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'priority', NEW.priority,
      'due_date', NEW.due_date,
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

-- Note: The trigger already exists from migration 20260108000006_activity_events.sql
-- We just updated the function, so the trigger will use the new version

-- ============================================================================
-- RLS POLICIES FOR task_tags
-- ============================================================================

-- Enable RLS on task_tags
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "task_tags_select" ON task_tags;
DROP POLICY IF EXISTS "task_tags_insert" ON task_tags;
DROP POLICY IF EXISTS "task_tags_delete" ON task_tags;

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
