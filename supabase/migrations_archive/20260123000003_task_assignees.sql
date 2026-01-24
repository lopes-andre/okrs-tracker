-- Migration: Multi-user Task Assignment
-- Description: Allow assigning tasks to multiple users

-- Create junction table for task assignees
CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Each user can only be assigned once per task
  UNIQUE(task_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);

-- Enable RLS
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view/modify assignees for tasks in their plans
CREATE POLICY "Users can view task assignees in their plans" ON task_assignees
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.plan_id IN (
        SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Editors can manage task assignees" ON task_assignees
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.plan_id IN (
        SELECT plan_id FROM plan_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'editor')
      )
    )
  );

-- Migrate existing assigned_to data to the new table
INSERT INTO task_assignees (task_id, user_id, assigned_at)
SELECT id, assigned_to, created_at
FROM tasks
WHERE assigned_to IS NOT NULL;

-- Add comment
COMMENT ON TABLE task_assignees IS 'Junction table for multi-user task assignments';
