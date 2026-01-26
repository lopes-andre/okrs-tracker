/**
 * Task Recurrence API Unit Tests
 *
 * Tests for task recurrence rule and instance operations.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

// Import API functions after mocking
import * as taskRecurrenceApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST HELPERS
// ============================================================================

function createRecurrenceRule(overrides: Partial<{
  id: string;
  task_id: string;
  rrule: string;
  frequency: string;
  interval_value: number;
  days_of_week: number[] | null;
  day_of_month: number | null;
  start_date: string;
  end_type: string;
  generation_limit: number;
  last_generated_date: string | null;
  created_at: string;
}> = {}) {
  return {
    id: overrides.id || `rule-${Math.random().toString(36).slice(2)}`,
    task_id: overrides.task_id || "task-123",
    rrule: overrides.rrule || "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO",
    frequency: overrides.frequency || "weekly",
    interval_value: overrides.interval_value || 1,
    days_of_week: overrides.days_of_week || [1], // Monday
    day_of_month: overrides.day_of_month || null,
    start_date: overrides.start_date || "2025-01-06",
    end_type: overrides.end_type || "never",
    generation_limit: overrides.generation_limit || 10,
    last_generated_date: overrides.last_generated_date || null,
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

function createRecurrenceInstance(overrides: Partial<{
  id: string;
  recurrence_rule_id: string;
  task_id: string;
  original_date: string;
  is_exception: boolean;
  is_deleted: boolean;
}> = {}) {
  return {
    id: overrides.id || `instance-${Math.random().toString(36).slice(2)}`,
    recurrence_rule_id: overrides.recurrence_rule_id || "rule-123",
    task_id: overrides.task_id || "task-123",
    original_date: overrides.original_date || "2025-01-13",
    is_exception: overrides.is_exception ?? false,
    is_deleted: overrides.is_deleted ?? false,
  };
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Task Recurrence API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET RECURRENCE RULE
  // ============================================================================

  describe("getRecurrenceRule", () => {
    it("should fetch recurrence rule for a task", async () => {
      const rule = createRecurrenceRule({ task_id: "task-123" });
      getMock().setMockData("task_recurrence_rules", [rule]);

      const result = await taskRecurrenceApi.getRecurrenceRule("task-123");

      expect(result).not.toBeNull();
      expect(result!.task_id).toBe("task-123");
    });

    it("should return null when no rule exists", async () => {
      getMock().setMockData("task_recurrence_rules", []);

      const result = await taskRecurrenceApi.getRecurrenceRule("task-123");

      expect(result).toBeNull();
    });

    it("should filter by task_id", async () => {
      getMock().setMockData("task_recurrence_rules", []);

      await taskRecurrenceApi.getRecurrenceRule("task-123");

      const calls = getMock().getMockCalls("task_recurrence_rules");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "task_id")).toBe(true);
    });
  });

  // ============================================================================
  // GET RECURRENCE RULE BY ID
  // ============================================================================

  describe("getRecurrenceRuleById", () => {
    it("should fetch recurrence rule by ID", async () => {
      const rule = createRecurrenceRule({ id: "rule-123" });
      getMock().setMockData("task_recurrence_rules", [rule]);

      const result = await taskRecurrenceApi.getRecurrenceRuleById("rule-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("rule-123");
    });

    it("should return null when not found", async () => {
      getMock().setMockData("task_recurrence_rules", []);

      const result = await taskRecurrenceApi.getRecurrenceRuleById("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CREATE RECURRENCE RULE
  // ============================================================================

  describe("createRecurrenceRule", () => {
    it("should create a recurrence rule", async () => {
      const newRule = {
        task_id: "task-123",
        rrule: "FREQ=DAILY;INTERVAL=1",
        frequency: "daily",
        interval_value: 1,
        start_date: "2025-01-15",
        end_type: "never",
        generation_limit: 10,
      };
      getMock().setMockData("task_recurrence_rules", []);

      const result = await taskRecurrenceApi.createRecurrenceRule(newRule);

      expect(result.task_id).toBe("task-123");
      expect(result.frequency).toBe("daily");
    });

    it("should make insert and select calls", async () => {
      const newRule = {
        task_id: "task-123",
        rrule: "FREQ=WEEKLY",
        frequency: "weekly",
        interval_value: 1,
        start_date: "2025-01-15",
        end_type: "never",
        generation_limit: 10,
      };
      getMock().setMockData("task_recurrence_rules", []);

      await taskRecurrenceApi.createRecurrenceRule(newRule);

      const calls = getMock().getMockCalls("task_recurrence_rules");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE RECURRENCE RULE
  // ============================================================================

  describe("updateRecurrenceRule", () => {
    it("should update a recurrence rule", async () => {
      const existingRule = createRecurrenceRule({ id: "rule-123", interval_value: 1 });
      getMock().setMockData("task_recurrence_rules", [existingRule]);

      const result = await taskRecurrenceApi.updateRecurrenceRule("rule-123", {
        interval_value: 2,
      });

      expect(result.interval_value).toBe(2);
    });

    it("should make update, eq, select, and single calls", async () => {
      const existingRule = createRecurrenceRule({ id: "rule-123" });
      getMock().setMockData("task_recurrence_rules", [existingRule]);

      await taskRecurrenceApi.updateRecurrenceRule("rule-123", { interval_value: 3 });

      const calls = getMock().getMockCalls("task_recurrence_rules");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // DELETE RECURRENCE RULE
  // ============================================================================

  describe("deleteRecurrenceRule", () => {
    it("should delete a recurrence rule", async () => {
      const existingRule = createRecurrenceRule({ id: "rule-123" });
      getMock().setMockData("task_recurrence_rules", [existingRule]);

      await taskRecurrenceApi.deleteRecurrenceRule("rule-123");

      const calls = getMock().getMockCalls("task_recurrence_rules");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // GET RECURRENCE INSTANCES
  // ============================================================================

  describe("getRecurrenceInstances", () => {
    it("should fetch instances for a rule", async () => {
      const inst1 = createRecurrenceInstance({ id: "i-1", recurrence_rule_id: "rule-123" });
      const inst2 = createRecurrenceInstance({ id: "i-2", recurrence_rule_id: "rule-123" });
      getMock().setMockData("task_recurrence_instances", [inst1, inst2]);

      const result = await taskRecurrenceApi.getRecurrenceInstances("rule-123");

      expect(result).toHaveLength(2);
    });

    it("should filter out deleted instances", async () => {
      const activeInst = createRecurrenceInstance({ id: "i-1", recurrence_rule_id: "rule-123", is_deleted: false });
      const deletedInst = createRecurrenceInstance({ id: "i-2", recurrence_rule_id: "rule-123", is_deleted: true });
      getMock().setMockData("task_recurrence_instances", [activeInst, deletedInst]);

      const result = await taskRecurrenceApi.getRecurrenceInstances("rule-123");

      expect(result).toHaveLength(1);
      expect(result[0].is_deleted).toBe(false);
    });

    it("should order by original_date ascending", async () => {
      getMock().setMockData("task_recurrence_instances", []);

      await taskRecurrenceApi.getRecurrenceInstances("rule-123");

      const calls = getMock().getMockCalls("task_recurrence_instances");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "original_date")).toBe(true);
    });
  });

  // ============================================================================
  // GET INSTANCE FOR TASK
  // ============================================================================

  describe("getInstanceForTask", () => {
    it("should fetch instance for a task", async () => {
      const instance = createRecurrenceInstance({ task_id: "task-123" });
      getMock().setMockData("task_recurrence_instances", [instance]);

      const result = await taskRecurrenceApi.getInstanceForTask("task-123");

      expect(result).not.toBeNull();
      expect(result!.task_id).toBe("task-123");
    });

    it("should return null when no instance exists", async () => {
      getMock().setMockData("task_recurrence_instances", []);

      const result = await taskRecurrenceApi.getInstanceForTask("task-123");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CREATE RECURRENCE INSTANCE
  // ============================================================================

  describe("createRecurrenceInstance", () => {
    it("should create an instance", async () => {
      const newInstance = {
        recurrence_rule_id: "rule-123",
        task_id: "task-456",
        original_date: "2025-01-20",
        is_exception: false,
        is_deleted: false,
      };
      getMock().setMockData("task_recurrence_instances", []);

      const result = await taskRecurrenceApi.createRecurrenceInstance(newInstance);

      expect(result.task_id).toBe("task-456");
      expect(result.original_date).toBe("2025-01-20");
    });
  });

  // ============================================================================
  // MARK INSTANCE AS EXCEPTION
  // ============================================================================

  describe("markInstanceAsException", () => {
    it("should mark instance as exception", async () => {
      const instance = createRecurrenceInstance({ id: "i-123", is_exception: false });
      getMock().setMockData("task_recurrence_instances", [instance]);

      await taskRecurrenceApi.markInstanceAsException("i-123");

      const calls = getMock().getMockCalls("task_recurrence_instances");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // SOFT DELETE INSTANCE
  // ============================================================================

  describe("softDeleteInstance", () => {
    it("should soft delete an instance", async () => {
      const instance = createRecurrenceInstance({ id: "i-123", is_deleted: false });
      getMock().setMockData("task_recurrence_instances", [instance]);

      await taskRecurrenceApi.softDeleteInstance("i-123");

      const calls = getMock().getMockCalls("task_recurrence_instances");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // GET EXCEPTION DATES
  // ============================================================================

  describe("getExceptionDates", () => {
    it("should return dates of deleted instances", async () => {
      const deleted1 = createRecurrenceInstance({
        recurrence_rule_id: "rule-123",
        original_date: "2025-01-13",
        is_deleted: true
      });
      const deleted2 = createRecurrenceInstance({
        recurrence_rule_id: "rule-123",
        original_date: "2025-01-20",
        is_deleted: true
      });
      getMock().setMockData("task_recurrence_instances", [deleted1, deleted2]);

      const result = await taskRecurrenceApi.getExceptionDates("rule-123");

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Date);
    });

    it("should return empty array when no exceptions", async () => {
      getMock().setMockData("task_recurrence_instances", []);

      const result = await taskRecurrenceApi.getExceptionDates("rule-123");

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // RPC FUNCTIONS
  // ============================================================================

  describe("getTaskRecurrenceInfo", () => {
    it("should call RPC with task ID", async () => {
      getMock().setMockRpcResult("get_task_recurrence_info", [
        { task_id: "task-123", master_task_id: "master-123", recurrence_rule_id: "rule-123" }
      ]);

      const result = await taskRecurrenceApi.getTaskRecurrenceInfo("task-123");

      expect(result).not.toBeNull();
      expect(result!.master_task_id).toBe("master-123");
    });

    it("should return null when no info found", async () => {
      getMock().setMockRpcResult("get_task_recurrence_info", []);

      const result = await taskRecurrenceApi.getTaskRecurrenceInfo("task-123");

      expect(result).toBeNull();
    });
  });

  describe("isRecurringTask", () => {
    it("should return true for recurring task", async () => {
      getMock().setMockRpcResult("is_recurring_task", true);

      const result = await taskRecurrenceApi.isRecurringTask("task-123");

      expect(result).toBe(true);
    });

    it("should return false for non-recurring task", async () => {
      getMock().setMockRpcResult("is_recurring_task", false);

      const result = await taskRecurrenceApi.isRecurringTask("task-123");

      expect(result).toBe(false);
    });
  });

  describe("getMasterTaskId", () => {
    it("should return master task ID", async () => {
      getMock().setMockRpcResult("get_recurring_master_task", "master-456");

      const result = await taskRecurrenceApi.getMasterTaskId("task-123");

      expect(result).toBe("master-456");
    });

    it("should return same ID if not recurring", async () => {
      getMock().setMockRpcResult("get_recurring_master_task", null);

      const result = await taskRecurrenceApi.getMasterTaskId("task-123");

      expect(result).toBe("task-123");
    });
  });

  // ============================================================================
  // GET RECURRING TASKS
  // ============================================================================

  describe("getRecurringTasks", () => {
    it("should fetch recurring master tasks for a plan", async () => {
      const task1 = { id: "t-1", plan_id: "plan-123", is_recurring: true };
      const task2 = { id: "t-2", plan_id: "plan-123", is_recurring: true };
      getMock().setMockData("tasks", [task1, task2]);

      const result = await taskRecurrenceApi.getRecurringTasks("plan-123");

      expect(result).toHaveLength(2);
    });

    it("should filter by is_recurring=true", async () => {
      getMock().setMockData("tasks", []);

      await taskRecurrenceApi.getRecurringTasks("plan-123");

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "is_recurring")).toBe(true);
    });

    it("should order by created_at descending", async () => {
      getMock().setMockData("tasks", []);

      await taskRecurrenceApi.getRecurringTasks("plan-123");

      const calls = getMock().getMockCalls("tasks");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "created_at")).toBe(true);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getRecurrenceRule fails", async () => {
      getMock().setMockError("task_recurrence_rules", new Error("Database error"));

      await expect(taskRecurrenceApi.getRecurrenceRule("task-123")).rejects.toThrow();
    });

    it("should throw error when createRecurrenceRule fails", async () => {
      getMock().setMockError("task_recurrence_rules", new Error("Database error"));

      await expect(
        taskRecurrenceApi.createRecurrenceRule({
          task_id: "task-123",
          rrule: "FREQ=DAILY",
          frequency: "daily",
          interval_value: 1,
          start_date: "2025-01-01",
          end_type: "never",
          generation_limit: 10,
        })
      ).rejects.toThrow();
    });

    it("should throw error when deleteRecurrenceRule fails", async () => {
      getMock().setMockError("task_recurrence_rules", new Error("Database error"));

      await expect(taskRecurrenceApi.deleteRecurrenceRule("rule-123")).rejects.toThrow();
    });

    it("should throw error when getRecurrenceInstances fails", async () => {
      getMock().setMockError("task_recurrence_instances", new Error("Database error"));

      await expect(taskRecurrenceApi.getRecurrenceInstances("rule-123")).rejects.toThrow();
    });

    it("should throw error when markInstanceAsException fails", async () => {
      getMock().setMockError("task_recurrence_instances", new Error("Database error"));

      await expect(taskRecurrenceApi.markInstanceAsException("i-123")).rejects.toThrow();
    });

    it("should throw error when getTaskRecurrenceInfo RPC fails", async () => {
      getMock().setMockRpcError("get_task_recurrence_info", new Error("RPC error"));

      await expect(taskRecurrenceApi.getTaskRecurrenceInfo("task-123")).rejects.toThrow();
    });

    it("should throw error when isRecurringTask RPC fails", async () => {
      getMock().setMockRpcError("is_recurring_task", new Error("RPC error"));

      await expect(taskRecurrenceApi.isRecurringTask("task-123")).rejects.toThrow();
    });
  });
});
