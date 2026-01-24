-- Migration: Add on-time reminder setting
-- Description: Adds the "right on time" reminder option

ALTER TABLE task_reminder_settings
ADD COLUMN IF NOT EXISTS time_reminder_on_time boolean DEFAULT true;
