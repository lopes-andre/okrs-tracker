"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { Task, TaskInsert, TaskUpdate, TaskFilters, TaskStatus } from "@/lib/supabase/types";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get tasks for a plan
 */
export function useTasks(planId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(planId, filters),
    queryFn: () => api.getTasks(planId, filters),
    enabled: !!planId,
  });
}

/**
 * Get tasks with details (related data)
 */
export function useTasksWithDetails(planId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: [...queryKeys.tasks.list(planId, filters), "withDetails"],
    queryFn: () => api.getTasksWithDetails(planId, filters),
    enabled: !!planId,
  });
}

/**
 * Get tasks grouped by list categories (overdue, thisWeek, etc.)
 */
export function useTasksGrouped(planId: string, filters?: Omit<TaskFilters, 'listView'>) {
  return useQuery({
    queryKey: [...queryKeys.tasks.list(planId, filters), "grouped"],
    queryFn: () => api.getTasksGrouped(planId, filters),
    enabled: !!planId,
  });
}

/**
 * Get tasks by objective
 */
export function useTasksByObjective(objectiveId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.byObjective(objectiveId),
    queryFn: () => api.getTasksByObjective(objectiveId),
    enabled: !!objectiveId,
  });
}

/**
 * Get tasks by annual KR
 */
export function useTasksByAnnualKr(annualKrId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.list(""), "byAnnualKr", annualKrId],
    queryFn: () => api.getTasksByAnnualKr(annualKrId),
    enabled: !!annualKrId,
  });
}

/**
 * Get tasks by quarter target
 */
export function useTasksByQuarterTarget(quarterTargetId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.byQuarterTarget(quarterTargetId),
    queryFn: () => api.getTasksByQuarterTarget(quarterTargetId),
    enabled: !!quarterTargetId,
  });
}

/**
 * Get paginated tasks
 */
export function useTasksPaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: TaskFilters
) {
  return useQuery({
    queryKey: [...queryKeys.tasks.list(planId, filters), "paginated", page, limit],
    queryFn: () => api.getTasksPaginated(planId, page, limit, filters),
    enabled: !!planId,
  });
}

/**
 * Get completed tasks paginated (for logbook)
 */
export function useCompletedTasksPaginated(
  planId: string,
  page: number = 1,
  limit: number = 20,
  filters?: Omit<TaskFilters, 'status' | 'listView'>
) {
  return useQuery({
    queryKey: [...queryKeys.tasks.list(planId), "completed", "paginated", page, limit, filters],
    queryFn: () => api.getCompletedTasksPaginated(planId, page, limit, filters),
    enabled: !!planId,
  });
}

/**
 * Get recent completed tasks (for summary view)
 */
export function useRecentCompletedTasks(planId: string, limit: number = 10) {
  return useQuery({
    queryKey: [...queryKeys.tasks.list(planId), "completed", "recent", limit],
    queryFn: () => api.getRecentCompletedTasks(planId, limit),
    enabled: !!planId,
  });
}

/**
 * Get task counts for stats cards
 */
export function useTaskCounts(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.list(planId), "counts"],
    queryFn: () => api.getTaskCounts(planId),
    enabled: !!planId,
  });
}

/**
 * Get a single task
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => api.getTask(taskId),
    enabled: !!taskId,
  });
}

/**
 * Get a single task with details
 */
export function useTaskWithDetails(taskId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.detail(taskId), "withDetails"],
    queryFn: () => api.getTaskWithDetails(taskId),
    enabled: !!taskId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a task (scoped to a plan)
 */
export function useCreateTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (task: Omit<TaskInsert, "plan_id">) => 
      api.createTask({ ...task, plan_id: planId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      if (data.objective_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byObjective(data.objective_id) });
      }
      if (data.annual_kr_id) {
        queryClient.invalidateQueries({ queryKey: [...queryKeys.tasks.list(""), "byAnnualKr", data.annual_kr_id] });
      }
      if (data.quarter_target_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byQuarterTarget(data.quarter_target_id) });
      }
      // Invalidate timeline for activity events
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      // Invalidate plan stats to update counters
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      toast(successMessages.taskCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a task (scoped to a plan for cache invalidation)
 */
export function useUpdateTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdate }) =>
      api.updateTask(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      // Invalidate timeline for activity events
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      // Invalidate plan stats to update counters
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      
      if (data.status === "completed") {
        toast(successMessages.taskCompleted);
      } else {
        toast(successMessages.taskUpdated);
      }
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update task status (convenience hook) with optimistic updates
 */
export function useUpdateTaskStatus(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      api.updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(planId) });

      // Snapshot the previous task detail
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(taskId));

      // Optimistically update the task detail
      if (previousTask) {
        queryClient.setQueryData<Task>(queryKeys.tasks.detail(taskId), {
          ...previousTask,
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        });
      }

      // Optimistically update in list queries (grouped and regular)
      const listQueryKey = queryKeys.tasks.list(planId);
      queryClient.setQueriesData<Task[]>(
        { queryKey: listQueryKey, exact: false },
        (old) => old?.map((task) =>
          task.id === taskId
            ? { ...task, status, completed_at: status === "completed" ? new Date().toISOString() : null }
            : task
        )
      );

      return { previousTask, taskId };
    },
    onError: (error, { taskId }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask);
      }
      toast(formatErrorMessage(error));
    },
    onSuccess: (data) => {
      if (data.status === "completed") {
        toast(successMessages.taskCompleted);
      } else {
        toast(successMessages.taskUpdated);
      }
    },
    onSettled: (_data, _error, { taskId }) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
    },
  });
}

/**
 * Complete a task with optimistic updates
 */
export function useCompleteTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskId: string) => api.completeTask(taskId),
    onMutate: async (taskId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(planId) });

      // Snapshot the previous task detail
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(taskId));

      // Optimistically update the task detail
      if (previousTask) {
        queryClient.setQueryData<Task>(queryKeys.tasks.detail(taskId), {
          ...previousTask,
          status: "completed" as TaskStatus,
          completed_at: new Date().toISOString(),
        });
      }

      // Optimistically update in list queries
      const listQueryKey = queryKeys.tasks.list(planId);
      queryClient.setQueriesData<Task[]>(
        { queryKey: listQueryKey, exact: false },
        (old) => old?.map((task) =>
          task.id === taskId
            ? { ...task, status: "completed" as TaskStatus, completed_at: new Date().toISOString() }
            : task
        )
      );

      return { previousTask, taskId };
    },
    onError: (error, taskId, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask);
      }
      toast(formatErrorMessage(error));
    },
    onSuccess: () => {
      toast(successMessages.taskCompleted);
    },
    onSettled: (_data, _error, taskId) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
    },
  });
}

/**
 * Delete a task (scoped to a plan)
 */
export function useDeleteTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      // Invalidate timeline for activity events
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      // Invalidate plan stats to update counters
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      toast(successMessages.taskDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Reorder tasks
 */
export function useReorderTasks(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: string[]) => api.reorderTasks(planId, taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
    },
  });
}

/**
 * Set tags for a task
 */
export function useSetTaskTags(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, tagIds }: { taskId: string; tagIds: string[] }) =>
      api.setTaskTags(taskId, tagIds),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
    },
  });
}

// ============================================================================
// BULK MUTATIONS
// ============================================================================

/**
 * Bulk update task status
 */
export function useBulkUpdateTaskStatus(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskIds, status }: { taskIds: string[]; status: TaskStatus }) =>
      api.bulkUpdateTaskStatus(taskIds, status),
    onSuccess: (data) => {
      // Invalidate all affected task details
      data.forEach((task) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(task.id) });
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });

      const statusLabel = data[0]?.status === "completed" ? "completed" : "updated";
      toast({
        title: `${data.length} tasks ${statusLabel}`,
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Bulk delete tasks
 */
export function useBulkDeleteTasks(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskIds: string[]) => api.bulkDeleteTasks(taskIds),
    onSuccess: (_, taskIds) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });

      toast({
        title: `${taskIds.length} tasks deleted`,
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Bulk add a tag to multiple tasks
 */
export function useBulkAddTagToTasks(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskIds, tagId }: { taskIds: string[]; tagId: string }) =>
      api.bulkAddTagToTasks(taskIds, tagId),
    onSuccess: (_, { taskIds }) => {
      taskIds.forEach((taskId) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });

      toast({
        title: `Tag added to ${taskIds.length} tasks`,
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Bulk remove a tag from multiple tasks
 */
export function useBulkRemoveTagFromTasks(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskIds, tagId }: { taskIds: string[]; tagId: string }) =>
      api.bulkRemoveTagFromTasks(taskIds, tagId),
    onSuccess: (_, { taskIds }) => {
      taskIds.forEach((taskId) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });

      toast({
        title: `Tag removed from ${taskIds.length} tasks`,
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}
