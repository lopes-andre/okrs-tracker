/**
 * Tasks API Unit Tests
 *
 * Tests for task CRUD operations, filtering, and bulk operations.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";
import { createTask as createTaskFactory } from "@/test/factories";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

// Import API functions after mocking
import * as tasksApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Tasks API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET TASKS
  // ============================================================================

  describe("getTasks", () => {
    it("should fetch tasks for a plan", async () => {
      const task1 = createTaskFactory({ id: "task-1", title: "Task 1", plan_id: "plan-123" });
      const task2 = createTaskFactory({ id: "task-2", title: "Task 2", plan_id: "plan-123" });
      getMock().setMockData("tasks", [task1, task2]);

      const result = await tasksApi.getTasks("plan-123");

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Task 1");
    });

    it("should return empty array when no tasks", async () => {
      getMock().setMockData("tasks", []);

      const result = await tasksApi.getTasks("plan-123");

      expect(result).toEqual([]);
    });

    it("should filter by status", async () => {
      const pendingTask = createTaskFactory({ id: "task-1", status: "pending", plan_id: "plan-123" });
      const completedTask = createTaskFactory({ id: "task-2", status: "completed", plan_id: "plan-123" });
      getMock().setMockData("tasks", [pendingTask, completedTask]);

      const result = await tasksApi.getTasks("plan-123", { status: "pending" });

      // Mock filter applies 'in' for status
      expect(result.every((t) => t.status === "pending")).toBe(true);
    });

    it("should filter by priority", async () => {
      const highTask = createTaskFactory({ id: "task-1", priority: "high", plan_id: "plan-123" });
      const lowTask = createTaskFactory({ id: "task-2", priority: "low", plan_id: "plan-123" });
      getMock().setMockData("tasks", [highTask, lowTask]);

      const result = await tasksApi.getTasks("plan-123", { priority: "high" });

      expect(result.every((t) => t.priority === "high")).toBe(true);
    });

    it("should filter by objective_id", async () => {
      const objTask = createTaskFactory({ id: "task-1", objective_id: "obj-1", plan_id: "plan-123" });
      getMock().setMockData("tasks", [objTask]);

      await tasksApi.getTasks("plan-123", { objective_id: "obj-1" });

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "objective_id")).toBe(true);
    });

    it("should make correct query order calls", async () => {
      getMock().setMockData("tasks", []);

      await tasksApi.getTasks("plan-123");

      const calls = getMock().getMockCalls("tasks");
      const orderCalls = calls.filter((c) => c.method === "order");
      expect(orderCalls).toHaveLength(2); // due_date, created_at
    });
  });

  // ============================================================================
  // GET TASK (SINGLE)
  // ============================================================================

  describe("getTask", () => {
    it("should return task when found", async () => {
      const task = createTaskFactory({ id: "task-123", title: "Test Task" });
      getMock().setMockData("tasks", [task]);

      const result = await tasksApi.getTask("task-123");

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Test Task");
    });

    it("should return null when not found", async () => {
      getMock().setMockData("tasks", []);

      const result = await tasksApi.getTask("non-existent");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // GET TASKS BY OBJECTIVE
  // ============================================================================

  describe("getTasksByObjective", () => {
    it("should fetch tasks for an objective", async () => {
      const task1 = createTaskFactory({ id: "task-1", objective_id: "obj-123" });
      const task2 = createTaskFactory({ id: "task-2", objective_id: "obj-123" });
      getMock().setMockData("tasks", [task1, task2]);

      const result = await tasksApi.getTasksByObjective("obj-123");

      expect(result).toHaveLength(2);

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "objective_id")).toBe(true);
    });
  });

  // ============================================================================
  // GET TASKS BY ANNUAL KR
  // ============================================================================

  describe("getTasksByAnnualKr", () => {
    it("should fetch tasks for a KR", async () => {
      const task1 = createTaskFactory({ id: "task-1", annual_kr_id: "kr-123" });
      getMock().setMockData("tasks", [task1]);

      const result = await tasksApi.getTasksByAnnualKr("kr-123");

      expect(result).toHaveLength(1);

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "annual_kr_id")).toBe(true);
    });
  });

  // ============================================================================
  // GET TASKS BY QUARTER TARGET
  // ============================================================================

  describe("getTasksByQuarterTarget", () => {
    it("should fetch tasks for a quarter target", async () => {
      const task = createTaskFactory({ id: "task-1", quarter_target_id: "qt-123" });
      getMock().setMockData("tasks", [task]);

      const result = await tasksApi.getTasksByQuarterTarget("qt-123");

      expect(result).toHaveLength(1);

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "quarter_target_id")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE TASK
  // ============================================================================

  describe("createTask", () => {
    it("should create task and return it", async () => {
      const newTask = createTaskFactory({
        id: "new-task-id",
        title: "New Task",
        plan_id: "plan-123",
      });
      getMock().setMockData("tasks", [newTask]);

      const result = await tasksApi.createTask({
        title: "New Task",
        plan_id: "plan-123",
      });

      expect(result.title).toBe("New Task");

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should create task with all fields", async () => {
      const newTask = createTaskFactory({
        id: "new-task-id",
        title: "Full Task",
        description: "A detailed description",
        status: "in_progress",
        priority: "high",
        due_date: "2026-03-15",
        plan_id: "plan-123",
        objective_id: "obj-1",
        annual_kr_id: "kr-1",
      });
      getMock().setMockData("tasks", [newTask]);

      const result = await tasksApi.createTask({
        title: "Full Task",
        description: "A detailed description",
        status: "in_progress",
        priority: "high",
        due_date: "2026-03-15",
        plan_id: "plan-123",
        objective_id: "obj-1",
        annual_kr_id: "kr-1",
      });

      expect(result.title).toBe("Full Task");
      expect(result.priority).toBe("high");
      expect(result.status).toBe("in_progress");
    });
  });

  // ============================================================================
  // UPDATE TASK
  // ============================================================================

  describe("updateTask", () => {
    it("should update task fields", async () => {
      const updatedTask = createTaskFactory({
        id: "task-123",
        title: "Updated Title",
        status: "in_progress",
      });
      getMock().setMockData("tasks", [updatedTask]);

      const result = await tasksApi.updateTask("task-123", {
        title: "Updated Title",
        status: "in_progress",
      });

      expect(result.title).toBe("Updated Title");
      expect(result.status).toBe("in_progress");

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "update")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE TASK STATUS
  // ============================================================================

  describe("updateTaskStatus", () => {
    it("should update only the status", async () => {
      const updatedTask = createTaskFactory({
        id: "task-123",
        status: "completed",
      });
      getMock().setMockData("tasks", [updatedTask]);

      const result = await tasksApi.updateTaskStatus("task-123", "completed");

      expect(result.status).toBe("completed");
    });
  });

  // ============================================================================
  // COMPLETE TASK
  // ============================================================================

  describe("completeTask", () => {
    it("should mark task as completed", async () => {
      const completedTask = createTaskFactory({
        id: "task-123",
        status: "completed",
      });
      getMock().setMockData("tasks", [completedTask]);

      const result = await tasksApi.completeTask("task-123");

      expect(result.status).toBe("completed");
    });
  });

  // ============================================================================
  // DELETE TASK
  // ============================================================================

  describe("deleteTask", () => {
    it("should delete task", async () => {
      const task = createTaskFactory({ id: "task-123" });
      getMock().setMockData("tasks", [task]);

      await tasksApi.deleteTask("task-123");

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // REORDER TASKS
  // ============================================================================

  describe("reorderTasks", () => {
    it("should update sort_order for each task", async () => {
      const task1 = createTaskFactory({ id: "task-1", sort_order: 0, plan_id: "plan-123" });
      const task2 = createTaskFactory({ id: "task-2", sort_order: 1, plan_id: "plan-123" });
      getMock().setMockData("tasks", [task1, task2]);

      await tasksApi.reorderTasks("plan-123", ["task-2", "task-1"]);

      const calls = getMock().getMockCalls("tasks");
      const updateCalls = calls.filter((c) => c.method === "update");
      expect(updateCalls.length).toBe(2);
    });
  });

  // ============================================================================
  // TASK TAGS
  // ============================================================================

  describe("Task Tags", () => {
    describe("addTagToTask", () => {
      it("should insert tag association", async () => {
        getMock().setMockData("task_tags", []);

        await tasksApi.addTagToTask("task-123", "tag-456");

        const calls = getMock().getMockCalls("task_tags");
        expect(calls.some((c) => c.method === "insert")).toBe(true);
      });
    });

    describe("removeTagFromTask", () => {
      it("should delete tag association", async () => {
        getMock().setMockData("task_tags", [{ task_id: "task-123", tag_id: "tag-456" }]);

        await tasksApi.removeTagFromTask("task-123", "tag-456");

        const calls = getMock().getMockCalls("task_tags");
        expect(calls.some((c) => c.method === "delete")).toBe(true);
      });
    });

    describe("getTaskTags", () => {
      it("should return tag IDs for a task", async () => {
        getMock().setMockData("task_tags", [
          { task_id: "task-123", tag_id: "tag-1" },
          { task_id: "task-123", tag_id: "tag-2" },
        ]);

        const result = await tasksApi.getTaskTags("task-123");

        expect(result).toHaveLength(2);
        expect(result).toContain("tag-1");
        expect(result).toContain("tag-2");
      });
    });

    describe("setTaskTags", () => {
      it("should replace existing tags", async () => {
        getMock().setMockData("task_tags", [{ task_id: "task-123", tag_id: "old-tag" }]);

        await tasksApi.setTaskTags("task-123", ["new-tag-1", "new-tag-2"]);

        const calls = getMock().getMockCalls("task_tags");
        expect(calls.some((c) => c.method === "delete")).toBe(true);
        expect(calls.some((c) => c.method === "insert")).toBe(true);
      });

      it("should only delete when setting empty tags", async () => {
        getMock().setMockData("task_tags", [{ task_id: "task-123", tag_id: "old-tag" }]);

        await tasksApi.setTaskTags("task-123", []);

        const calls = getMock().getMockCalls("task_tags");
        expect(calls.some((c) => c.method === "delete")).toBe(true);
        // No insert when empty
      });
    });
  });

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  describe("Bulk Operations", () => {
    describe("bulkUpdateTaskStatus", () => {
      it("should update status for multiple tasks", async () => {
        const task1 = createTaskFactory({ id: "task-1", status: "completed" });
        const task2 = createTaskFactory({ id: "task-2", status: "completed" });
        getMock().setMockData("tasks", [task1, task2]);

        const result = await tasksApi.bulkUpdateTaskStatus(["task-1", "task-2"], "completed");

        expect(result).toHaveLength(2);

        const calls = getMock().getMockCalls("tasks");
        expect(calls.some((c) => c.method === "update")).toBe(true);
        expect(calls.some((c) => c.method === "in")).toBe(true);
      });
    });

    describe("bulkDeleteTasks", () => {
      it("should delete tags and tasks", async () => {
        getMock().setMockData("task_tags", []);
        getMock().setMockData("tasks", []);

        await tasksApi.bulkDeleteTasks(["task-1", "task-2"]);

        const tagCalls = getMock().getMockCalls("task_tags");
        const taskCalls = getMock().getMockCalls("tasks");

        expect(tagCalls.some((c) => c.method === "delete")).toBe(true);
        expect(taskCalls.some((c) => c.method === "delete")).toBe(true);
      });
    });

    describe("bulkAddTagToTasks", () => {
      it("should upsert tag for multiple tasks", async () => {
        getMock().setMockData("task_tags", []);

        await tasksApi.bulkAddTagToTasks(["task-1", "task-2"], "tag-123");

        const calls = getMock().getMockCalls("task_tags");
        expect(calls.some((c) => c.method === "upsert")).toBe(true);
      });
    });

    describe("bulkRemoveTagFromTasks", () => {
      it("should delete tag from multiple tasks", async () => {
        getMock().setMockData("task_tags", []);

        await tasksApi.bulkRemoveTagFromTasks(["task-1", "task-2"], "tag-123");

        const calls = getMock().getMockCalls("task_tags");
        expect(calls.some((c) => c.method === "delete")).toBe(true);
        expect(calls.some((c) => c.method === "in")).toBe(true);
      });
    });
  });

  // ============================================================================
  // TASK ASSIGNEES
  // ============================================================================

  describe("Task Assignees", () => {
    describe("getTaskAssignees", () => {
      it("should return user IDs for a task", async () => {
        getMock().setMockData("task_assignees", [
          { task_id: "task-123", user_id: "user-1" },
          { task_id: "task-123", user_id: "user-2" },
        ]);

        const result = await tasksApi.getTaskAssignees("task-123");

        expect(result).toHaveLength(2);
        expect(result).toContain("user-1");
        expect(result).toContain("user-2");
      });
    });

    describe("addTaskAssignee", () => {
      it("should insert assignee", async () => {
        getMock().setMockData("task_assignees", []);
        getMock().mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: "current-user-id" } },
          error: null,
        });

        await tasksApi.addTaskAssignee("task-123", "user-456");

        const calls = getMock().getMockCalls("task_assignees");
        expect(calls.some((c) => c.method === "insert")).toBe(true);
      });
    });

    describe("removeTaskAssignee", () => {
      it("should delete assignee", async () => {
        getMock().setMockData("task_assignees", [{ task_id: "task-123", user_id: "user-456" }]);

        await tasksApi.removeTaskAssignee("task-123", "user-456");

        const calls = getMock().getMockCalls("task_assignees");
        expect(calls.some((c) => c.method === "delete")).toBe(true);
      });
    });
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe("Tasks API - Integration Scenarios", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
    getMock().mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  describe("task CRUD workflow", () => {
    it("should handle create, update, complete, and delete flow", async () => {
      // Create
      const newTask = createTaskFactory({
        id: "crud-task-1",
        title: "CRUD Test Task",
        status: "pending",
        plan_id: "plan-123",
      });
      getMock().setMockData("tasks", [newTask]);

      const created = await tasksApi.createTask({
        title: "CRUD Test Task",
        plan_id: "plan-123",
      });
      expect(created.title).toBe("CRUD Test Task");

      // Update
      const updatedTask = { ...newTask, title: "Updated CRUD Task", status: "in_progress" as const };
      getMock().setMockData("tasks", [updatedTask]);

      const updated = await tasksApi.updateTask("crud-task-1", {
        title: "Updated CRUD Task",
        status: "in_progress",
      });
      expect(updated.title).toBe("Updated CRUD Task");

      // Complete
      const completedTask = { ...updatedTask, status: "completed" as const };
      getMock().setMockData("tasks", [completedTask]);

      const completed = await tasksApi.completeTask("crud-task-1");
      expect(completed.status).toBe("completed");

      // Delete
      await tasksApi.deleteTask("crud-task-1");

      const deleteCalls = getMock().getMockCalls("tasks");
      expect(deleteCalls.some((c) => c.method === "delete")).toBe(true);
    });
  });

  describe("task with tags workflow", () => {
    it("should handle adding and removing tags", async () => {
      const task = createTaskFactory({ id: "task-123", plan_id: "plan-123" });
      getMock().setMockData("tasks", [task]);
      getMock().setMockData("task_tags", []);

      // Add tags
      await tasksApi.addTagToTask("task-123", "tag-1");
      await tasksApi.addTagToTask("task-123", "tag-2");

      // Set mock data for retrieval
      getMock().setMockData("task_tags", [
        { task_id: "task-123", tag_id: "tag-1" },
        { task_id: "task-123", tag_id: "tag-2" },
      ]);

      const tags = await tasksApi.getTaskTags("task-123");
      expect(tags).toHaveLength(2);

      // Remove one tag
      await tasksApi.removeTagFromTask("task-123", "tag-1");

      const removeCalls = getMock().getMockCalls("task_tags");
      expect(removeCalls.filter((c) => c.method === "delete").length).toBeGreaterThan(0);
    });
  });
});
