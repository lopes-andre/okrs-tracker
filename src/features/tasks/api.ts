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
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isBefore, 
  isAfter,
  isSameDay,
  parseISO,
  format,
  startOfDay,
} from "date-fns";

// ============================================================================
// DATE UTILITIES FOR TASK FILTERING
// ============================================================================

/**
 * Get the start of the current week (Sunday)
 */
function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 0 }); // 0 = Sunday
}

/**
 * Get the end of the current week (Saturday)
 */
function getWeekEnd(date: Date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 0 }); // 0 = Sunday
}

/**
 * Get date boundaries for list view filters
 */
function getDateBoundaries() {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return {
    today: format(today, 'yyyy-MM-dd'),
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    monthStart: format(monthStart, 'yyyy-MM-dd'),
    monthEnd: format(monthEnd, 'yyyy-MM-dd'),
  };
}

// ============================================================================
// TASKS API
// ============================================================================

/**
 * Apply common filters to a task query
 */
function applyTaskFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters?: TaskFilters
) {
  if (!filters) return query;

  // Status filter
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in("status", statuses);
  }

  // Priority filter
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    query = query.in("priority", priorities);
  }

  // Assignment filter
  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  // Objective filter
  if (filters.objective_id) {
    query = query.eq("objective_id", filters.objective_id);
  }

  // Annual KR filter
  if (filters.annual_kr_id) {
    query = query.eq("annual_kr_id", filters.annual_kr_id);
  }

  // Quarter target filter
  if (filters.quarter_target_id) {
    query = query.eq("quarter_target_id", filters.quarter_target_id);
  }

  // Date range filters
  if (filters.due_date_from) {
    query = query.gte("due_date", filters.due_date_from);
  }

  if (filters.due_date_to) {
    query = query.lte("due_date", filters.due_date_to);
  }

  // Null due date filter (for backlog)
  if (filters.due_date_null === true) {
    query = query.is("due_date", null);
  }

  // List view presets
  if (filters.listView) {
    const dates = getDateBoundaries();
    
    switch (filters.listView) {
      case 'active':
        query = query.not("status", "in", '("completed","cancelled")');
        break;
      case 'overdue':
        query = query
          .not("status", "in", '("completed","cancelled")')
          .lt("due_date", dates.today)
          .not("due_date", "is", null);
        break;
      case 'this_week':
        query = query
          .not("status", "in", '("completed","cancelled")')
          .gte("due_date", dates.today)
          .lte("due_date", dates.weekEnd);
        break;
      case 'this_month':
        query = query
          .not("status", "in", '("completed","cancelled")')
          .gt("due_date", dates.weekEnd)
          .lte("due_date", dates.monthEnd);
        break;
      case 'future':
        query = query
          .not("status", "in", '("completed","cancelled")')
          .gt("due_date", dates.monthEnd);
        break;
      case 'backlog':
        query = query
          .not("status", "in", '("completed","cancelled")')
          .is("due_date", null);
        break;
      case 'completed':
        query = query.eq("status", "completed");
        break;
    }
  }

  return query;
}

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

  query = applyTaskFilters(query, filters);

  // Sort by due_date first (nulls last), then by created_at
  query = query
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

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
      annual_kr:annual_krs(id, name, kr_type, unit, target_value, current_value, objective_id, objective:objectives(id, code, name)),
      quarter_target:quarter_targets(id, quarter, target_value),
      assigned_user:profiles(id, full_name, avatar_url),
      task_tags(tag:tags(*))
    `)
    .eq("plan_id", planId);

  query = applyTaskFilters(query, filters);

  // Sort by due_date first (nulls last), then by created_at
  query = query
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

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
 * Get tasks grouped by list view categories
 * Returns tasks organized for the main tasks page UI
 */
export async function getTasksGrouped(planId: string, filters?: Omit<TaskFilters, 'listView'>): Promise<{
  today: TaskWithDetails[];
  overdue: TaskWithDetails[];
  thisWeek: TaskWithDetails[];
  thisMonth: TaskWithDetails[];
  backlog: TaskWithDetails[];
  completed: TaskWithDetails[];
  counts: {
    active: number;
    today: number;
    overdue: number;
    thisWeek: number;
    thisMonth: number;
    backlog: number;
    completed: number;
  };
}> {
  // Fetch all non-completed tasks with one query for efficiency
  const allTasks = await getTasksWithDetails(planId, filters);
  
  // Get today's date boundaries using local timezone
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Sunday as start
  const monthEnd = endOfMonth(now);

  const result = {
    today: [] as TaskWithDetails[],
    overdue: [] as TaskWithDetails[],
    thisWeek: [] as TaskWithDetails[],
    thisMonth: [] as TaskWithDetails[],
    backlog: [] as TaskWithDetails[],
    completed: [] as TaskWithDetails[],
    counts: {
      active: 0,
      today: 0,
      overdue: 0,
      thisWeek: 0,
      thisMonth: 0,
      backlog: 0,
      completed: 0,
    },
  };

  for (const task of allTasks) {
    if (task.status === 'completed') {
      result.completed.push(task);
      result.counts.completed++;
      continue;
    }

    if (task.status === 'cancelled') {
      continue; // Skip cancelled tasks
    }

    result.counts.active++;

    if (!task.due_date) {
      result.backlog.push(task);
      result.counts.backlog++;
      continue;
    }

    // Parse the due date - task.due_date is in YYYY-MM-DD format
    // Use parseISO to avoid timezone issues
    const dueDate = parseISO(task.due_date);

    // Check categorization
    if (isSameDay(dueDate, todayStart)) {
      // Due today
      result.today.push(task);
      result.counts.today++;
    } else if (isBefore(dueDate, todayStart)) {
      // Overdue (before today)
      result.overdue.push(task);
      result.counts.overdue++;
    } else if (!isAfter(dueDate, weekEnd)) {
      // Rest of this week (after today, up to and including week end)
      result.thisWeek.push(task);
      result.counts.thisWeek++;
    } else if (!isAfter(dueDate, monthEnd)) {
      // This month (after this week, up to month end)
      result.thisMonth.push(task);
      result.counts.thisMonth++;
    } else {
      // Future tasks go into backlog
      result.backlog.push(task);
      result.counts.backlog++;
    }
  }

  return result;
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
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
  );
}

/**
 * Get tasks by annual KR
 */
export async function getTasksByAnnualKr(annualKrId: string): Promise<Task[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("tasks")
      .select("*")
      .eq("annual_kr_id", annualKrId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
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
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
  );
}

/**
 * Get paginated tasks (for large lists like completed tasks logbook)
 */
export async function getTasksPaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: TaskFilters
): Promise<PaginatedResult<TaskWithDetails>> {
  const supabase = createClient();
  const { from, to } = getPaginationRange(page, limit);

  let query = supabase
    .from("tasks")
    .select(`
      *,
      objective:objectives(id, code, name),
      annual_kr:annual_krs(id, name, kr_type, unit),
      quarter_target:quarter_targets(id, quarter, target_value),
      assigned_user:profiles(id, full_name, avatar_url),
      task_tags(tag:tags(*))
    `, { count: "exact" })
    .eq("plan_id", planId);

  query = applyTaskFilters(query, filters);

  // For completed tasks, sort by completed_at descending
  if (filters?.listView === 'completed' || filters?.status === 'completed') {
    query = query.order("completed_at", { ascending: false });
  } else {
    // Default sort: due_date ascending, then created_at
    query = query
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  // Transform to extract tags
  const tasks = (data || []).map((task) => ({
    ...task,
    tags: task.task_tags?.map((t: { tag: unknown }) => t.tag) || [],
    task_tags: undefined,
  })) as TaskWithDetails[];

  return createPaginatedResult(tasks, count || 0, page, limit);
}

/**
 * Get completed tasks for logbook (optimized for performance)
 */
export async function getCompletedTasksPaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: Omit<TaskFilters, 'status' | 'listView'>
): Promise<PaginatedResult<TaskWithDetails>> {
  return getTasksPaginated(planId, page, limit, {
    ...filters,
    status: 'completed',
  });
}

/**
 * Get recent completed tasks (for summary view)
 */
export async function getRecentCompletedTasks(
  planId: string,
  limit: number = 10
): Promise<TaskWithDetails[]> {
  const result = await getTasksPaginated(planId, 1, limit, { status: 'completed' });
  return result.data;
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
 * Get a single task with details
 */
export async function getTaskWithDetails(taskId: string): Promise<TaskWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      objective:objectives(id, code, name),
      annual_kr:annual_krs(id, name, kr_type, unit),
      quarter_target:quarter_targets(id, quarter, target_value),
      assigned_user:profiles(id, full_name, avatar_url),
      task_tags(tag:tags(*))
    `)
    .eq("id", taskId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  return {
    ...data,
    tags: data.task_tags?.map((t: { tag: unknown }) => t.tag) || [],
    task_tags: undefined,
  } as TaskWithDetails;
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
 * Set all tags for a task (replace existing)
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

/**
 * Get tags for a task
 */
export async function getTaskTags(taskId: string): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("task_tags")
    .select("tag_id")
    .eq("task_id", taskId);

  if (error) throw error;
  return (data || []).map((t) => t.tag_id);
}

// ============================================================================
// TASK STATISTICS
// ============================================================================

// ============================================================================
// BULK TASK OPERATIONS
// ============================================================================

/**
 * Bulk update task status
 */
export async function bulkUpdateTaskStatus(
  taskIds: string[],
  status: TaskStatus
): Promise<Task[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .in("id", taskIds)
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Bulk delete tasks
 */
export async function bulkDeleteTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient();

  // First delete associated task_tags
  await supabase
    .from("task_tags")
    .delete()
    .in("task_id", taskIds);

  // Then delete the tasks
  const { error } = await supabase
    .from("tasks")
    .delete()
    .in("id", taskIds);

  if (error) throw error;
}

/**
 * Bulk add a tag to multiple tasks
 */
export async function bulkAddTagToTasks(
  taskIds: string[],
  tagId: string
): Promise<void> {
  const supabase = createClient();

  // Insert tag for each task (ignore duplicates with onConflict)
  const inserts = taskIds.map((taskId) => ({ task_id: taskId, tag_id: tagId }));

  const { error } = await supabase
    .from("task_tags")
    .upsert(inserts, { onConflict: "task_id,tag_id", ignoreDuplicates: true });

  if (error) throw error;
}

/**
 * Bulk remove a tag from multiple tasks
 */
export async function bulkRemoveTagFromTasks(
  taskIds: string[],
  tagId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("task_tags")
    .delete()
    .in("task_id", taskIds)
    .eq("tag_id", tagId);

  if (error) throw error;
}

// ============================================================================
// TASK STATISTICS
// ============================================================================

/**
 * Get task counts for a plan
 */
export async function getTaskCounts(planId: string): Promise<{
  total: number;
  active: number;
  today: number;
  overdue: number;
  thisWeek: number;
  thisMonth: number;
  backlog: number;
  completed: number;
}> {
  const grouped = await getTasksGrouped(planId);
  
  return {
    total: grouped.counts.active + grouped.counts.completed,
    active: grouped.counts.active,
    today: grouped.counts.today,
    overdue: grouped.counts.overdue,
    thisWeek: grouped.counts.thisWeek,
    thisMonth: grouped.counts.thisMonth,
    backlog: grouped.counts.backlog,
    completed: grouped.counts.completed,
  };
}
