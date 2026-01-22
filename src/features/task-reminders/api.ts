import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError } from "@/lib/api-utils";
import type { TaskReminderSettings, TaskReminderSettingsUpdate, Task } from "@/lib/supabase/types";

// ============================================================================
// SETTINGS API
// ============================================================================

/**
 * Get task reminder settings for a plan, creating default if not exists
 */
export async function getOrCreateTaskReminderSettings(
  planId: string
): Promise<TaskReminderSettings> {
  const supabase = createClient();

  // Try to get existing settings
  const { data: existing } = await supabase
    .from("task_reminder_settings")
    .select("*")
    .eq("plan_id", planId)
    .single();

  if (existing) {
    return existing as TaskReminderSettings;
  }

  // Create default settings if none exist
  const defaultSettings = {
    plan_id: planId,
    reminders_enabled: true,
    business_hours_enabled: false,
    business_hours_start: "09:00",
    business_hours_end: "17:00",
    business_days: [1, 2, 3, 4, 5], // Mon-Fri
    sound_enabled: true,
    daily_summary_enabled: true,
    daily_summary_time: "09:00",
    hourly_reminders_enabled: true,
    time_reminder_15min: true,
    time_reminder_10min: true,
    time_reminder_5min: true,
    time_reminder_overdue_30min: true,
  };

  return handleSupabaseError(
    supabase
      .from("task_reminder_settings")
      .insert(defaultSettings)
      .select()
      .single()
  );
}

/**
 * Update task reminder settings for a plan
 */
export async function updateTaskReminderSettings(
  planId: string,
  updates: TaskReminderSettingsUpdate
): Promise<TaskReminderSettings> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("task_reminder_settings")
      .update(updates)
      .eq("plan_id", planId)
      .select()
      .single()
  );
}

// ============================================================================
// TASK QUERIES FOR REMINDERS
// ============================================================================

export interface TaskDueSummary {
  dueToday: number;
  overdue: number;
  dueTodayTasks: Task[];
  overdueTasks: Task[];
}

/**
 * Get tasks due today and overdue for reminder summary
 */
export async function getTasksDueSummary(planId: string): Promise<TaskDueSummary> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  // Get tasks due today (with reminders enabled, not completed/cancelled)
  const { data: dueTodayTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("plan_id", planId)
    .eq("due_date", today)
    .eq("reminder_enabled", true)
    .not("status", "in", '("completed","cancelled")');

  // Get overdue tasks (past due date, with reminders enabled)
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("plan_id", planId)
    .lt("due_date", today)
    .eq("reminder_enabled", true)
    .not("status", "in", '("completed","cancelled")');

  return {
    dueToday: (dueTodayTasks || []).length,
    overdue: (overdueTasks || []).length,
    dueTodayTasks: (dueTodayTasks || []) as Task[],
    overdueTasks: (overdueTasks || []) as Task[],
  };
}

export interface TaskWithDueTime extends Task {
  due_date: string;
  due_time: string;
}

/**
 * Get tasks with specific due times for time-based reminders
 */
export async function getTasksWithDueTime(planId: string): Promise<TaskWithDueTime[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("plan_id", planId)
    .eq("due_date", today)
    .not("due_time", "is", null)
    .eq("reminder_enabled", true)
    .not("status", "in", '("completed","cancelled")');

  return (data || []) as TaskWithDueTime[];
}
