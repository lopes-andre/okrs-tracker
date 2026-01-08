"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { TaskInsert, TaskUpdate, TaskFilters, TaskStatus } from "@/lib/supabase/types";

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
 * Get a single task
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => api.getTask(taskId),
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
      if (data.quarter_target_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byQuarterTarget(data.quarter_target_id) });
      }
      // Invalidate timeline for activity events
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
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
 * Update task status (convenience hook)
 */
export function useUpdateTaskStatus(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      api.updateTaskStatus(taskId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      // Invalidate timeline for activity events
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      
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
 * Complete a task
 */
export function useCompleteTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskId: string) => api.completeTask(taskId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(planId) });
      // Invalidate timeline for activity events
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      toast(successMessages.taskCompleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
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
