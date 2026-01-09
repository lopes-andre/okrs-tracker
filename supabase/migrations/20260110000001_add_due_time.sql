-- Migration: Add due_time column to tasks
-- This allows users to optionally set a specific time for task deadlines

-- Add the due_time column (TIME without timezone, e.g., "14:30")
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TIME;

-- Add comment for documentation
COMMENT ON COLUMN tasks.due_time IS 'Optional time component for task due dates (HH:MM:SS format)';

-- Index for potential future reminder queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_time ON tasks(due_date, due_time) WHERE due_time IS NOT NULL;
