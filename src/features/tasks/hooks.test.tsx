/**
 * Tasks Hooks Unit Tests
 *
 * Tests for React Query hooks wrapping the tasks API.
 * Uses renderHook with QueryClientProvider for testing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createTask, createProfile } from "@/test/factories";

// Mock the API modules
vi.mock("./api", () => ({
  getTasks: vi.fn(),
  getTasksWithDetails: vi.fn(),
  getTasksGrouped: vi.fn(),
  getTasksByObjective: vi.fn(),
  getTasksByAnnualKr: vi.fn(),
  getTasksByQuarterTarget: vi.fn(),
  getTasksPaginated: vi.fn(),
  getCompletedTasksPaginated: vi.fn(),
  getRecentCompletedTasks: vi.fn(),
  getFutureTasks: vi.fn(),
  getTaskCounts: vi.fn(),
  getTask: vi.fn(),
  getTaskWithDetails: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  completeTask: vi.fn(),
  deleteTask: vi.fn(),
  reorderTasks: vi.fn(),
  setTaskTags: vi.fn(),
  bulkUpdateTaskStatus: vi.fn(),
  bulkDeleteTasks: vi.fn(),
  bulkAddTagToTasks: vi.fn(),
  bulkRemoveTagFromTasks: vi.fn(),
  getTaskAssignees: vi.fn(),
  setTaskAssignees: vi.fn(),
  addTaskAssignee: vi.fn(),
  removeTaskAssignee: vi.fn(),
}));

vi.mock("@/features/notifications/api", () => ({
  createNotifications: vi.fn(),
}));

// Mock the toast hook
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Import after mocking
import * as api from "./api";
import {
  useTasks,
  useTasksWithDetails,
  useTasksGrouped,
  useTasksByObjective,
  useTasksByAnnualKr,
  useTasksByQuarterTarget,
  useTasksPaginated,
  useCompletedTasksPaginated,
  useRecentCompletedTasks,
  useFutureTasks,
  useTaskCounts,
  useTask,
  useTaskWithDetails,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useCompleteTask,
  useDeleteTask,
  useReorderTasks,
  useSetTaskTags,
  useBulkUpdateTaskStatus,
  useBulkDeleteTasks,
  useBulkAddTagToTasks,
  useBulkRemoveTagFromTasks,
  useTaskAssignees,
  useSetTaskAssignees,
  useAddTaskAssignee,
  useRemoveTaskAssignee,
} from "./hooks";

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================================================
// QUERY HOOKS TESTS
// ============================================================================

describe("Tasks Query Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useTasks", () => {
    it("should fetch tasks for a plan", async () => {
      const mockTasks = [
        createTask({ id: "task-1", title: "Task A", plan_id: "plan-123" }),
        createTask({ id: "task-2", title: "Task B", plan_id: "plan-123" }),
      ];
      vi.mocked(api.getTasks).mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTasks("plan-123"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTasks);
      expect(api.getTasks).toHaveBeenCalledWith("plan-123", undefined);
    });

    it("should pass filters to API", async () => {
      vi.mocked(api.getTasks).mockResolvedValue([]);

      const filters = { status: "todo" as const, priority: "high" as const };
      const { result } = renderHook(() => useTasks("plan-123", filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTasks).toHaveBeenCalledWith("plan-123", filters);
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useTasks(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getTasks).not.toHaveBeenCalled();
    });
  });

  describe("useTasksWithDetails", () => {
    it("should fetch tasks with details", async () => {
      const mockTasks = [
        { ...createTask({ id: "task-1" }), objective: null, annual_kr: null, tags: [] },
      ];
      vi.mocked(api.getTasksWithDetails).mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTasksWithDetails("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTasks);
    });
  });

  describe("useTasksGrouped", () => {
    it("should fetch tasks grouped by category", async () => {
      const mockGrouped = {
        overdue: [createTask({ id: "task-1" })],
        today: [],
        thisWeek: [createTask({ id: "task-2" })],
        thisMonth: [],
        later: [],
        noDueDate: [],
      };
      vi.mocked(api.getTasksGrouped).mockResolvedValue(mockGrouped);

      const { result } = renderHook(() => useTasksGrouped("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.overdue).toHaveLength(1);
      expect(result.current.data?.thisWeek).toHaveLength(1);
    });
  });

  describe("useTasksByObjective", () => {
    it("should fetch tasks by objective", async () => {
      const mockTasks = [createTask({ objective_id: "obj-123" })];
      vi.mocked(api.getTasksByObjective).mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTasksByObjective("obj-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTasksByObjective).toHaveBeenCalledWith("obj-123");
    });

    it("should not fetch when objectiveId is empty", async () => {
      const { result } = renderHook(() => useTasksByObjective(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useTasksByAnnualKr", () => {
    it("should fetch tasks by annual KR", async () => {
      const mockTasks = [createTask({ annual_kr_id: "kr-123" })];
      vi.mocked(api.getTasksByAnnualKr).mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTasksByAnnualKr("kr-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTasksByAnnualKr).toHaveBeenCalledWith("kr-123");
    });
  });

  describe("useTasksByQuarterTarget", () => {
    it("should fetch tasks by quarter target", async () => {
      const mockTasks = [createTask({ quarter_target_id: "qt-123" })];
      vi.mocked(api.getTasksByQuarterTarget).mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTasksByQuarterTarget("qt-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTasksByQuarterTarget).toHaveBeenCalledWith("qt-123");
    });
  });

  describe("useTasksPaginated", () => {
    it("should fetch paginated tasks", async () => {
      const mockResult = {
        tasks: [createTask({ id: "task-1" })],
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      };
      vi.mocked(api.getTasksPaginated).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useTasksPaginated("plan-123", 1, 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.total).toBe(25);
      expect(result.current.data?.totalPages).toBe(2);
      expect(api.getTasksPaginated).toHaveBeenCalledWith("plan-123", 1, 20, undefined);
    });
  });

  describe("useCompletedTasksPaginated", () => {
    it("should fetch completed tasks paginated", async () => {
      const mockResult = {
        tasks: [createTask({ status: "completed" })],
        total: 10,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      vi.mocked(api.getCompletedTasksPaginated).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCompletedTasksPaginated("plan-123", 1, 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getCompletedTasksPaginated).toHaveBeenCalledWith("plan-123", 1, 20, undefined);
    });
  });

  describe("useRecentCompletedTasks", () => {
    it("should fetch recent completed tasks", async () => {
      const mockTasks = [createTask({ status: "completed" })];
      vi.mocked(api.getRecentCompletedTasks).mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useRecentCompletedTasks("plan-123", 5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getRecentCompletedTasks).toHaveBeenCalledWith("plan-123", 5);
    });
  });

  describe("useFutureTasks", () => {
    it("should fetch future tasks", async () => {
      const mockResult = { tasks: [createTask()], totalCount: 15 };
      vi.mocked(api.getFutureTasks).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useFutureTasks("plan-123", 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.totalCount).toBe(15);
    });
  });

  describe("useTaskCounts", () => {
    it("should fetch task counts", async () => {
      const mockCounts = {
        total: 50,
        completed: 20,
        inProgress: 15,
        todo: 10,
        overdue: 5,
      };
      vi.mocked(api.getTaskCounts).mockResolvedValue(mockCounts);

      const { result } = renderHook(() => useTaskCounts("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.total).toBe(50);
      expect(result.current.data?.overdue).toBe(5);
    });
  });

  describe("useTask", () => {
    it("should fetch single task", async () => {
      const mockTask = createTask({ id: "task-123" });
      vi.mocked(api.getTask).mockResolvedValue(mockTask);

      const { result } = renderHook(() => useTask("task-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTask).toHaveBeenCalledWith("task-123");
    });

    it("should not fetch when taskId is empty", async () => {
      const { result } = renderHook(() => useTask(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useTaskWithDetails", () => {
    it("should fetch task with details", async () => {
      const mockTask = { ...createTask({ id: "task-123" }), objective: null, tags: [] };
      vi.mocked(api.getTaskWithDetails).mockResolvedValue(mockTask);

      const { result } = renderHook(() => useTaskWithDetails("task-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTaskWithDetails).toHaveBeenCalledWith("task-123");
    });
  });

  describe("useTaskAssignees", () => {
    it("should fetch task assignees", async () => {
      const mockAssignees = [
        { task_id: "task-123", user_id: "user-1", profile: createProfile({ id: "user-1" }) },
      ];
      vi.mocked(api.getTaskAssignees).mockResolvedValue(mockAssignees);

      const { result } = renderHook(() => useTaskAssignees("task-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.getTaskAssignees).toHaveBeenCalledWith("task-123");
    });

    it("should not fetch when taskId is null", async () => {
      const { result } = renderHook(() => useTaskAssignees(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });
});

// ============================================================================
// MUTATION HOOKS TESTS
// ============================================================================

describe("Tasks Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreateTask", () => {
    it("should create a task", async () => {
      const newTask = createTask({ id: "new-task", title: "New Task", plan_id: "plan-123" });
      vi.mocked(api.createTask).mockResolvedValue(newTask);

      const { result } = renderHook(() => useCreateTask("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: "New Task", status: "todo" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createTask).toHaveBeenCalledWith({
        title: "New Task",
        status: "todo",
        plan_id: "plan-123",
      });
    });

    it("should handle error", async () => {
      const error = new Error("Failed to create");
      vi.mocked(api.createTask).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateTask("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: "New Task", status: "todo" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useUpdateTask", () => {
    it("should update a task", async () => {
      const updatedTask = createTask({ id: "task-123", title: "Updated Title", plan_id: "plan-123" });
      vi.mocked(api.updateTask).mockResolvedValue(updatedTask);

      const { result } = renderHook(() => useUpdateTask("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "task-123", data: { title: "Updated Title" } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateTask).toHaveBeenCalledWith("task-123", { title: "Updated Title" });
    });

    it("should show completed toast when status changes to completed", async () => {
      const updatedTask = createTask({ id: "task-123", status: "completed" });
      vi.mocked(api.updateTask).mockResolvedValue(updatedTask);

      const { result } = renderHook(() => useUpdateTask("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "task-123", data: { status: "completed" } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useUpdateTaskStatus", () => {
    it("should update task status", async () => {
      const updatedTask = createTask({ id: "task-123", status: "in_progress" });
      vi.mocked(api.updateTaskStatus).mockResolvedValue(updatedTask);

      const { result } = renderHook(() => useUpdateTaskStatus("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ taskId: "task-123", status: "in_progress" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateTaskStatus).toHaveBeenCalledWith("task-123", "in_progress");
    });
  });

  describe("useCompleteTask", () => {
    it("should complete a task", async () => {
      const completedTask = createTask({ id: "task-123", status: "completed" });
      vi.mocked(api.completeTask).mockResolvedValue(completedTask);

      const { result } = renderHook(() => useCompleteTask("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate("task-123");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.completeTask).toHaveBeenCalledWith("task-123");
    });
  });

  describe("useDeleteTask", () => {
    it("should delete a task", async () => {
      vi.mocked(api.deleteTask).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTask("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate("task-123");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.deleteTask).toHaveBeenCalledWith("task-123");
    });
  });

  describe("useReorderTasks", () => {
    it("should reorder tasks", async () => {
      vi.mocked(api.reorderTasks).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReorderTasks("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate(["task-3", "task-1", "task-2"]);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.reorderTasks).toHaveBeenCalledWith("plan-123", ["task-3", "task-1", "task-2"]);
    });
  });

  describe("useSetTaskTags", () => {
    it("should set tags for a task", async () => {
      vi.mocked(api.setTaskTags).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetTaskTags("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ taskId: "task-123", tagIds: ["tag-1", "tag-2"] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.setTaskTags).toHaveBeenCalledWith("task-123", ["tag-1", "tag-2"]);
    });
  });
});

// ============================================================================
// BULK MUTATION HOOKS TESTS
// ============================================================================

describe("Tasks Bulk Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useBulkUpdateTaskStatus", () => {
    it("should bulk update task status", async () => {
      const updatedTasks = [
        createTask({ id: "task-1", status: "completed" }),
        createTask({ id: "task-2", status: "completed" }),
      ];
      vi.mocked(api.bulkUpdateTaskStatus).mockResolvedValue(updatedTasks);

      const { result } = renderHook(() => useBulkUpdateTaskStatus("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ taskIds: ["task-1", "task-2"], status: "completed" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.bulkUpdateTaskStatus).toHaveBeenCalledWith(["task-1", "task-2"], "completed");
    });
  });

  describe("useBulkDeleteTasks", () => {
    it("should bulk delete tasks", async () => {
      vi.mocked(api.bulkDeleteTasks).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBulkDeleteTasks("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate(["task-1", "task-2", "task-3"]);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.bulkDeleteTasks).toHaveBeenCalledWith(["task-1", "task-2", "task-3"]);
    });
  });

  describe("useBulkAddTagToTasks", () => {
    it("should bulk add tag to tasks", async () => {
      vi.mocked(api.bulkAddTagToTasks).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBulkAddTagToTasks("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ taskIds: ["task-1", "task-2"], tagId: "tag-123" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.bulkAddTagToTasks).toHaveBeenCalledWith(["task-1", "task-2"], "tag-123");
    });
  });

  describe("useBulkRemoveTagFromTasks", () => {
    it("should bulk remove tag from tasks", async () => {
      vi.mocked(api.bulkRemoveTagFromTasks).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBulkRemoveTagFromTasks("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ taskIds: ["task-1", "task-2"], tagId: "tag-123" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.bulkRemoveTagFromTasks).toHaveBeenCalledWith(["task-1", "task-2"], "tag-123");
    });
  });
});

// ============================================================================
// ASSIGNEE MUTATION HOOKS TESTS
// ============================================================================

describe("Tasks Assignee Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useSetTaskAssignees", () => {
    it("should set task assignees", async () => {
      vi.mocked(api.setTaskAssignees).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetTaskAssignees("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ taskId: "task-123", userIds: ["user-1", "user-2"] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.setTaskAssignees).toHaveBeenCalledWith("task-123", ["user-1", "user-2"]);
    });
  });

  describe("useAddTaskAssignee", () => {
    it("should add task assignee", async () => {
      vi.mocked(api.addTaskAssignee).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAddTaskAssignee("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ taskId: "task-123", userId: "user-1" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.addTaskAssignee).toHaveBeenCalledWith("task-123", "user-1");
    });
  });

  describe("useRemoveTaskAssignee", () => {
    it("should remove task assignee", async () => {
      vi.mocked(api.removeTaskAssignee).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRemoveTaskAssignee("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ taskId: "task-123", userId: "user-1" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.removeTaskAssignee).toHaveBeenCalledWith("task-123", "user-1");
    });
  });
});
