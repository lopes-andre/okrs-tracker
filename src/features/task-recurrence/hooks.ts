"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage } from "@/lib/toast-utils";
import * as api from "./api";
import type { RecurrenceConfig } from "@/lib/recurrence-engine";
import type {
  Task,
  TaskInsert,
} from "@/lib/supabase/types";

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get recurrence rule for a task
 */
export function useRecurrenceRule(taskId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.tasks.detail(taskId || ""), "recurrence"],
    queryFn: () => api.getRecurrenceRule(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Get full recurrence info for a task
 */
export function useTaskRecurrenceInfo(taskId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.tasks.detail(taskId || ""), "recurrenceInfo"],
    queryFn: () => api.getTaskRecurrenceInfo(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Get all recurring tasks for a plan
 */
export function useRecurringTasks(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.tasks.list(planId), "recurring"],
    queryFn: () => api.getRecurringTasks(planId),
    enabled: !!planId,
  });
}

/**
 * Get recurrence instances for a rule
 */
export function useRecurrenceInstances(ruleId: string | null) {
  return useQuery({
    queryKey: ["recurrenceInstances", ruleId],
    queryFn: () => api.getRecurrenceInstances(ruleId!),
    enabled: !!ruleId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a recurring task
 */
export function useCreateRecurringTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      task,
      config,
      tagIds,
      assigneeIds,
    }: {
      task: TaskInsert;
      config: RecurrenceConfig;
      tagIds?: string[];
      assigneeIds?: string[];
    }) => api.createRecurringTask(task, config, tagIds, assigneeIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.stats(planId) });
      toast({
        title: "Recurring task created",
        description: `Created ${result.instances.length + 1} task instances`,
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a recurring task
 */
export function useUpdateRecurringTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
      scope,
    }: {
      taskId: string;
      updates: Partial<Task>;
      scope: "this" | "future" | "all";
    }) => api.updateRecurringTask(taskId, updates, scope),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });

      const scopeText =
        variables.scope === "this"
          ? "This task"
          : variables.scope === "future"
          ? "This and future tasks"
          : "All tasks in series";
      toast({
        title: "Task updated",
        description: scopeText + " updated",
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a recurring task
 */
export function useDeleteRecurringTask(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      taskId,
      scope,
    }: {
      taskId: string;
      scope: "this" | "future" | "all";
    }) => api.deleteRecurringTask(taskId, scope),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.list(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.stats(planId) });

      const scopeText =
        variables.scope === "this"
          ? "Task deleted"
          : variables.scope === "future"
          ? "This and future tasks deleted"
          : "All tasks in series deleted";
      toast({
        title: scopeText,
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update recurrence pattern
 */
export function useUpdateRecurrencePattern() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      taskId,
      config,
    }: {
      taskId: string;
      config: RecurrenceConfig;
    }) => api.updateRecurrencePattern(taskId, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      toast({
        title: "Recurrence pattern updated",
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Generate more instances for a recurring task
 */
export function useGenerateInstances() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      ruleId,
      fromDate,
      count,
    }: {
      ruleId: string;
      fromDate?: Date;
      count?: number;
    }) => api.generateInstances(ruleId, fromDate, count),
    onSuccess: (instances) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (instances.length > 0) {
        toast({
          title: "Instances generated",
          description: `Created ${instances.length} new task instances`,
          variant: "success",
        });
      }
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Check if a task is recurring
 */
export function useIsRecurringTask(taskId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.tasks.detail(taskId || ""), "isRecurring"],
    queryFn: () => api.isRecurringTask(taskId!),
    enabled: !!taskId,
  });
}
