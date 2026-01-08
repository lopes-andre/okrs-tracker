import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { 
  handleSupabaseError, 
  handleSupabaseQuery,
  getPaginationRange,
  createPaginatedResult,
  type PaginatedResult,
} from "@/lib/api-utils";
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskWithDetails,
  TaskFilters,
  TaskStatus,
} from "@/lib/supabase/types";

// ============================================================================
// TASKS API
// ============================================================================

/**
 * Get tasks for a plan with optional filters
 */
export async function getTasks(
  planId: string,
  filters?: TaskFilters
): Promise<Task[]> {
  const supabase = createClient();

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("plan_id", planId);

  // Apply filters
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }

  if (filters?.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    query = query.in("priority", priorities);
  }

  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.objective_id) {
    query = query.eq("objective_id", filters.objective_id);
  }

  if (filters?.quarter_target_id) {
    query = query.eq("quarter_target_id", filters.quarter_target_id);
  }

  if (filters?.due_date_from) {
    query = query.gte("due_date", filters.due_date_from);
  }

  if (filters?.due_date_to) {
    query = query.lte("due_date", filters.due_date_to);
  }

  query = query.order("sort_order", { ascending: true });

  return handleSupabaseError(query);
}

/**
 * Get tasks with related data
 */
export async function getTasksWithDetails(
  planId: string,
  filters?: TaskFilters
): Promise<TaskWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from("tasks")
    .select(`
      *,
      objective:objectives(id, code, name),
      quarter_target:quarter_targets(id, quarter, target_value),
      assigned_user:profiles(id, full_name, avatar_url),
      task_tags(tag:tags(*))
    `)
    .eq("plan_id", planId);

  // Apply same filters as getTasks
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }

  if (filters?.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    query = query.in("priority", priorities);
  }

  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.objective_id) {
    query = query.eq("objective_id", filters.objective_id);
  }

  if (filters?.quarter_target_id) {
    query = query.eq("quarter_target_id", filters.quarter_target_id);
  }

  if (filters?.due_date_from) {
    query = query.gte("due_date", filters.due_date_from);
  }

  if (filters?.due_date_to) {
    query = query.lte("due_date", filters.due_date_to);
  }

  query = query.order("sort_order", { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  // Transform to extract tags
  return (data || []).map((task) => ({
    ...task,
    tags: task.task_tags?.map((t: { tag: unknown }) => t.tag) || [],
    task_tags: undefined,
  })) as TaskWithDetails[];
}

/**
 * Get tasks by objective
 */
export async function getTasksByObjective(objectiveId: string): Promise<Task[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tasks")
      .select("*")
      .eq("objective_id", objectiveId)
      .order("sort_order", { ascending: true })
  );
}

/**
 * Get tasks by quarter target
 */
export async function getTasksByQuarterTarget(quarterTargetId: string): Promise<Task[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tasks")
      .select("*")
      .eq("quarter_target_id", quarterTargetId)
      .order("sort_order", { ascending: true })
  );
}

/**
 * Get paginated tasks (for large lists)
 */
export async function getTasksPaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: TaskFilters
): Promise<PaginatedResult<Task>> {
  const supabase = createClient();
  const { from, to } = getPaginationRange(page, limit);

  let query = supabase
    .from("tasks")
    .select("*", { count: "exact" })
    .eq("plan_id", planId);

  // Apply filters
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }

  query = query
    .order("sort_order", { ascending: true })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return createPaginatedResult(data || [], count || 0, page, limit);
}

/**
 * Get a single task
 */
export async function getTask(taskId: string): Promise<Task | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single()
  );
}

/**
 * Create a task
 */
export async function createTask(task: TaskInsert): Promise<Task> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tasks")
      .insert(task)
      .select()
      .single()
  );
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: TaskUpdate
): Promise<Task> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single()
  );
}

/**
 * Update task status (convenience method)
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  return updateTask(taskId, { status });
}

/**
 * Complete a task
 */
export async function completeTask(taskId: string): Promise<Task> {
  return updateTaskStatus(taskId, "completed");
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
}

/**
 * Reorder tasks
 */
export async function reorderTasks(
  planId: string,
  taskIds: string[]
): Promise<void> {
  const supabase = createClient();

  const updates = taskIds.map((id, index) =>
    supabase
      .from("tasks")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("plan_id", planId)
  );

  await Promise.all(updates);
}

// ============================================================================
// TASK TAGS API
// ============================================================================

/**
 * Add a tag to a task
 */
export async function addTagToTask(taskId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("task_tags")
    .insert({ task_id: taskId, tag_id: tagId });

  if (error) throw error;
}

/**
 * Remove a tag from a task
 */
export async function removeTagFromTask(taskId: string, tagId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("task_tags")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId);

  if (error) throw error;
}

/**
 * Set all tags for a task
 */
export async function setTaskTags(taskId: string, tagIds: string[]): Promise<void> {
  const supabase = createClient();

  // Delete existing
  await supabase
    .from("task_tags")
    .delete()
    .eq("task_id", taskId);

  // Insert new
  if (tagIds.length > 0) {
    const { error } = await supabase
      .from("task_tags")
      .insert(tagIds.map((tagId) => ({ task_id: taskId, tag_id: tagId })));

    if (error) throw error;
  }
}
