/**
 * Task Recurrence API
 *
 * Database operations for recurring tasks.
 */

import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError } from "@/lib/api-utils";
import { format, parseISO, addDays } from "date-fns";
import {
  getNextOccurrences,
  configToRuleInsert,
  ruleToConfig,
  type RecurrenceConfig,
} from "@/lib/recurrence-engine";
import type {
  Task,
  TaskInsert,
  TaskRecurrenceRule,
  TaskRecurrenceRuleInsert,
  TaskRecurrenceRuleUpdate,
  TaskRecurrenceInstance,
  TaskRecurrenceInstanceInsert,
  RecurrenceInfo,
} from "@/lib/supabase/types";

// ============================================================================
// RECURRENCE RULE OPERATIONS
// ============================================================================

/**
 * Get recurrence rule for a task
 */
export async function getRecurrenceRule(taskId: string): Promise<TaskRecurrenceRule | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("task_recurrence_rules")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get recurrence rule by ID
 */
export async function getRecurrenceRuleById(ruleId: string): Promise<TaskRecurrenceRule | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("task_recurrence_rules")
    .select("*")
    .eq("id", ruleId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a recurrence rule for a task
 */
export async function createRecurrenceRule(
  rule: TaskRecurrenceRuleInsert
): Promise<TaskRecurrenceRule> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase.from("task_recurrence_rules").insert(rule).select().single()
  );
}

/**
 * Update a recurrence rule
 */
export async function updateRecurrenceRule(
  ruleId: string,
  updates: TaskRecurrenceRuleUpdate
): Promise<TaskRecurrenceRule> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("task_recurrence_rules")
      .update(updates)
      .eq("id", ruleId)
      .select()
      .single()
  );
}

/**
 * Delete a recurrence rule (cascades to instances)
 */
export async function deleteRecurrenceRule(ruleId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("task_recurrence_rules")
    .delete()
    .eq("id", ruleId);

  if (error) throw error;
}

// ============================================================================
// RECURRENCE INSTANCE OPERATIONS
// ============================================================================

/**
 * Get all instances for a recurrence rule
 */
export async function getRecurrenceInstances(
  ruleId: string
): Promise<TaskRecurrenceInstance[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("task_recurrence_instances")
      .select("*")
      .eq("recurrence_rule_id", ruleId)
      .eq("is_deleted", false)
      .order("original_date", { ascending: true })
  );
}

/**
 * Get instance for a specific task
 */
export async function getInstanceForTask(
  taskId: string
): Promise<TaskRecurrenceInstance | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("task_recurrence_instances")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a recurrence instance
 */
export async function createRecurrenceInstance(
  instance: TaskRecurrenceInstanceInsert
): Promise<TaskRecurrenceInstance> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase.from("task_recurrence_instances").insert(instance).select().single()
  );
}

/**
 * Mark an instance as an exception (detached from series)
 */
export async function markInstanceAsException(instanceId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("task_recurrence_instances")
    .update({ is_exception: true })
    .eq("id", instanceId);

  if (error) throw error;
}

/**
 * Soft delete an instance (marks as deleted, doesn't remove)
 */
export async function softDeleteInstance(instanceId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("task_recurrence_instances")
    .update({ is_deleted: true })
    .eq("id", instanceId);

  if (error) throw error;
}

/**
 * Get deleted instance dates for a rule (exception dates)
 */
export async function getExceptionDates(ruleId: string): Promise<Date[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("task_recurrence_instances")
    .select("original_date")
    .eq("recurrence_rule_id", ruleId)
    .eq("is_deleted", true);

  if (error) throw error;
  return (data || []).map((d) => parseISO(d.original_date));
}

// ============================================================================
// RECURRING TASK INFO
// ============================================================================

/**
 * Get full recurrence info for a task using the database function
 */
export async function getTaskRecurrenceInfo(taskId: string): Promise<RecurrenceInfo | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_task_recurrence_info", {
    p_task_id: taskId,
  });

  if (error) throw error;
  return data?.[0] || null;
}

/**
 * Check if a task is part of a recurring series
 */
export async function isRecurringTask(taskId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("is_recurring_task", {
    p_task_id: taskId,
  });

  if (error) throw error;
  return data || false;
}

/**
 * Get the master task for a recurring instance
 */
export async function getMasterTaskId(taskId: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_recurring_master_task", {
    p_task_id: taskId,
  });

  if (error) throw error;
  return data || taskId;
}

// ============================================================================
// INSTANCE GENERATION
// ============================================================================

/**
 * Generate task instances for a recurrence rule
 *
 * Creates actual task rows and instance records up to the generation limit.
 */
export async function generateInstances(
  ruleId: string,
  fromDate: Date = new Date(),
  count?: number
): Promise<Task[]> {
  const supabase = createClient();

  // Get the rule and master task
  const rule = await getRecurrenceRuleById(ruleId);
  if (!rule) throw new Error("Recurrence rule not found");

  // Get the master task to use as template
  const { data: masterTask, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", rule.task_id)
    .single();

  if (taskError) throw taskError;
  if (!masterTask) throw new Error("Master task not found");

  // Get exception dates (deleted instances)
  const exceptionDates = await getExceptionDates(ruleId);

  // Get existing instances to avoid duplicates
  const existingInstances = await getRecurrenceInstances(ruleId);
  const existingDates = new Set(
    existingInstances.map((i) => i.original_date.split("T")[0])
  );

  // Calculate how many instances to generate
  const limit = count || rule.generation_limit;

  // Get next occurrence dates
  const occurrences = getNextOccurrences(
    rule.rrule,
    fromDate,
    limit + existingInstances.length, // Get extra to account for existing
    exceptionDates
  );

  // Filter out already existing instances
  const newOccurrences = occurrences.filter(
    (date) => !existingDates.has(format(date, "yyyy-MM-dd"))
  ).slice(0, limit);

  if (newOccurrences.length === 0) {
    return [];
  }

  // Create tasks and instances for each occurrence
  const createdTasks: Task[] = [];

  for (const occurrenceDate of newOccurrences) {
    const dateStr = format(occurrenceDate, "yyyy-MM-dd");

    // Create the task instance (copy from master task)
    const taskInsert: TaskInsert = {
      plan_id: masterTask.plan_id,
      objective_id: masterTask.objective_id,
      annual_kr_id: masterTask.annual_kr_id,
      quarter_target_id: masterTask.quarter_target_id,
      title: masterTask.title,
      description: masterTask.description,
      status: "pending",
      priority: masterTask.priority,
      effort: masterTask.effort,
      due_date: dateStr,
      due_time: masterTask.due_time,
      assigned_to: masterTask.assigned_to,
      reminder_enabled: masterTask.reminder_enabled,
      sort_order: masterTask.sort_order,
      is_recurring: false,
      recurring_master_id: masterTask.id,
    };

    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert(taskInsert)
      .select()
      .single();

    if (insertError) throw insertError;

    // Create the instance record
    const instanceInsert: TaskRecurrenceInstanceInsert = {
      recurrence_rule_id: ruleId,
      task_id: newTask.id,
      original_date: dateStr,
      is_exception: false,
      is_deleted: false,
    };

    await createRecurrenceInstance(instanceInsert);

    // Copy tags from master task
    const { data: masterTags } = await supabase
      .from("task_tags")
      .select("tag_id")
      .eq("task_id", masterTask.id);

    if (masterTags && masterTags.length > 0) {
      const tagInserts = masterTags.map((t) => ({
        task_id: newTask.id,
        tag_id: t.tag_id,
      }));
      await supabase.from("task_tags").insert(tagInserts);
    }

    // Copy assignees from master task
    const { data: masterAssignees } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", masterTask.id);

    if (masterAssignees && masterAssignees.length > 0) {
      const assigneeInserts = masterAssignees.map((a) => ({
        task_id: newTask.id,
        user_id: a.user_id,
        assigned_by: null,
      }));
      await supabase.from("task_assignees").insert(assigneeInserts);
    }

    createdTasks.push(newTask);
  }

  // Update last_generated_date on the rule
  if (newOccurrences.length > 0) {
    const lastDate = newOccurrences[newOccurrences.length - 1];
    await updateRecurrenceRule(ruleId, {
      last_generated_date: format(lastDate, "yyyy-MM-dd"),
    });
  }

  return createdTasks;
}

// ============================================================================
// HIGH-LEVEL OPERATIONS
// ============================================================================

/**
 * Create a recurring task with its rule and initial instances
 */
export async function createRecurringTask(
  task: TaskInsert,
  config: RecurrenceConfig,
  tagIds?: string[],
  assigneeIds?: string[]
): Promise<{ masterTask: Task; rule: TaskRecurrenceRule; instances: Task[] }> {
  const supabase = createClient();

  // 1. Create the master task
  const masterTaskInsert: TaskInsert = {
    ...task,
    is_recurring: true,
    recurring_master_id: null,
  };

  const { data: masterTask, error: taskError } = await supabase
    .from("tasks")
    .insert(masterTaskInsert)
    .select()
    .single();

  if (taskError) throw taskError;

  // 2. Add tags to master task
  if (tagIds && tagIds.length > 0) {
    const tagInserts = tagIds.map((tagId) => ({
      task_id: masterTask.id,
      tag_id: tagId,
    }));
    await supabase.from("task_tags").insert(tagInserts);
  }

  // 3. Add assignees to master task
  if (assigneeIds && assigneeIds.length > 0) {
    const assigneeInserts = assigneeIds.map((userId) => ({
      task_id: masterTask.id,
      user_id: userId,
      assigned_by: null,
    }));
    await supabase.from("task_assignees").insert(assigneeInserts);
  }

  // 4. Create the recurrence rule
  const startDate = task.due_date ? parseISO(task.due_date) : new Date();
  const ruleInsert = configToRuleInsert(config, masterTask.id, startDate);

  const rule = await createRecurrenceRule(ruleInsert);

  // 5. Generate initial instances
  const instances = await generateInstances(rule.id, startDate);

  return { masterTask, rule, instances };
}

/**
 * Update a recurring task series
 *
 * @param scope - 'this' = only this instance, 'future' = this and future, 'all' = entire series
 */
export async function updateRecurringTask(
  taskId: string,
  updates: Partial<Task>,
  scope: "this" | "future" | "all"
): Promise<void> {
  const supabase = createClient();

  const info = await getTaskRecurrenceInfo(taskId);
  if (!info) throw new Error("Task recurrence info not found");

  if (scope === "this") {
    // Mark this instance as an exception and update only this task
    const instance = await getInstanceForTask(taskId);
    if (instance) {
      await markInstanceAsException(instance.id);
    }

    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) throw error;
  } else if (scope === "future" || scope === "all") {
    const masterId = info.master_task_id;

    // Update master task
    const { error: masterError } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", masterId);
    if (masterError) throw masterError;

    // Get all instances
    const instances = await getRecurrenceInstances(info.recurrence_rule_id!);
    const today = format(new Date(), "yyyy-MM-dd");

    for (const instance of instances) {
      if (instance.is_exception) continue; // Skip exceptions

      // For 'future', only update instances on or after today
      if (scope === "future" && instance.original_date < today) continue;

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", instance.task_id);
      if (error) throw error;
    }
  }
}

/**
 * Delete a recurring task series
 *
 * @param scope - 'this' = only this instance, 'future' = this and future, 'all' = entire series
 */
export async function deleteRecurringTask(
  taskId: string,
  scope: "this" | "future" | "all"
): Promise<void> {
  const supabase = createClient();

  const info = await getTaskRecurrenceInfo(taskId);
  if (!info) throw new Error("Task recurrence info not found");

  if (scope === "this") {
    // Soft delete just this instance
    const instance = await getInstanceForTask(taskId);
    if (instance) {
      await softDeleteInstance(instance.id);
    }

    // Also delete the task itself
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) throw error;
  } else if (scope === "future") {
    // Delete this and all future instances
    const instances = await getRecurrenceInstances(info.recurrence_rule_id!);
    const today = format(new Date(), "yyyy-MM-dd");

    for (const instance of instances) {
      if (instance.original_date >= today) {
        await softDeleteInstance(instance.id);
        await supabase.from("tasks").delete().eq("id", instance.task_id);
      }
    }

    // Update the rule to end today
    await updateRecurrenceRule(info.recurrence_rule_id!, {
      end_type: "until",
      end_date: today,
    });
  } else if (scope === "all") {
    // Delete the master task (cascades to rule and instances)
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", info.master_task_id);
    if (error) throw error;
  }
}

/**
 * Update recurrence pattern for a series
 */
export async function updateRecurrencePattern(
  taskId: string,
  config: RecurrenceConfig
): Promise<void> {
  const info = await getTaskRecurrenceInfo(taskId);
  if (!info || !info.recurrence_rule_id) {
    throw new Error("Task is not recurring");
  }

  const rule = await getRecurrenceRuleById(info.recurrence_rule_id);
  if (!rule) throw new Error("Recurrence rule not found");

  // Get the master task's due date as start date
  const supabase = createClient();
  const { data: masterTask } = await supabase
    .from("tasks")
    .select("due_date")
    .eq("id", info.master_task_id)
    .single();

  const startDate = masterTask?.due_date ? parseISO(masterTask.due_date) : new Date();
  const ruleUpdate = configToRuleInsert(config, info.master_task_id, startDate);

  await updateRecurrenceRule(info.recurrence_rule_id, {
    rrule: ruleUpdate.rrule,
    frequency: ruleUpdate.frequency,
    interval_value: ruleUpdate.interval_value,
    days_of_week: ruleUpdate.days_of_week,
    day_of_month: ruleUpdate.day_of_month,
    week_of_month: ruleUpdate.week_of_month,
    day_of_week_for_month: ruleUpdate.day_of_week_for_month,
    month_of_year: ruleUpdate.month_of_year,
    end_type: ruleUpdate.end_type,
    end_count: ruleUpdate.end_count,
    end_date: ruleUpdate.end_date,
    timezone: ruleUpdate.timezone,
  });
}

/**
 * Get all recurring tasks for a plan (master tasks only)
 */
export async function getRecurringTasks(planId: string): Promise<Task[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tasks")
      .select("*")
      .eq("plan_id", planId)
      .eq("is_recurring", true)
      .order("created_at", { ascending: false })
  );
}
