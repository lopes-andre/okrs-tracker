-- Migration: Add task reminders support
-- Description: Adds reminder_enabled field to tasks and creates task_reminder_settings table

-- ============================================================================
-- 1. Add reminder_enabled column to tasks table
-- ============================================================================
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT true;

-- Index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_enabled
ON tasks(reminder_enabled)
WHERE reminder_enabled = true AND status NOT IN ('completed', 'cancelled');

-- ============================================================================
-- 2. Create task_reminder_settings table (per-plan settings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,

  -- Master toggle
  reminders_enabled boolean DEFAULT true,

  -- Business hours (no reminders outside these hours)
  business_hours_enabled boolean DEFAULT false,
  business_hours_start time DEFAULT '09:00',
  business_hours_end time DEFAULT '17:00',
  business_days integer[] DEFAULT ARRAY[1, 2, 3, 4, 5], -- Mon-Fri (1-7, 1=Monday)

  -- Notification preferences
  sound_enabled boolean DEFAULT true,

  -- Daily summary notification (for tasks due today)
  daily_summary_enabled boolean DEFAULT true,
  daily_summary_time time DEFAULT '09:00',

  -- Hourly reminders for due today tasks
  hourly_reminders_enabled boolean DEFAULT true,

  -- Time-specific task reminders (minutes before due)
  time_reminder_15min boolean DEFAULT true,
  time_reminder_10min boolean DEFAULT true,
  time_reminder_5min boolean DEFAULT true,
  time_reminder_overdue_30min boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One settings row per plan
  CONSTRAINT task_reminder_settings_plan_unique UNIQUE (plan_id)
);

-- Index for plan lookup
CREATE INDEX IF NOT EXISTS idx_task_reminder_settings_plan
ON task_reminder_settings(plan_id);

-- Updated_at trigger
CREATE TRIGGER update_task_reminder_settings_updated_at
  BEFORE UPDATE ON task_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. RLS Policies for task_reminder_settings
-- ============================================================================
ALTER TABLE task_reminder_settings ENABLE ROW LEVEL SECURITY;

-- Select: Plan members can view settings
CREATE POLICY "Plan members can view task reminder settings"
  ON task_reminder_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = task_reminder_settings.plan_id
      AND plan_members.user_id = auth.uid()
    )
  );

-- Insert: Plan owners and editors can create settings
CREATE POLICY "Plan owners and editors can create task reminder settings"
  ON task_reminder_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = task_reminder_settings.plan_id
      AND plan_members.user_id = auth.uid()
      AND plan_members.role IN ('owner', 'editor')
    )
  );

-- Update: Plan owners and editors can update settings
CREATE POLICY "Plan owners and editors can update task reminder settings"
  ON task_reminder_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = task_reminder_settings.plan_id
      AND plan_members.user_id = auth.uid()
      AND plan_members.role IN ('owner', 'editor')
    )
  );

-- Delete: Only plan owners can delete settings
CREATE POLICY "Plan owners can delete task reminder settings"
  ON task_reminder_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = task_reminder_settings.plan_id
      AND plan_members.user_id = auth.uid()
      AND plan_members.role = 'owner'
    )
  );
