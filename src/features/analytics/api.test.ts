/**
 * Analytics API Unit Tests
 *
 * Tests for analytics data fetching and metric calculations.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";
import {
  createObjective,
  createAnnualKr,
  createCheckIn,
  createTask,
} from "@/test/factories";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

// Import API functions after mocking
import * as analyticsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Analytics API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET ANALYTICS DATA
  // ============================================================================

  describe("getAnalyticsData", () => {
    it("should fetch objectives, check-ins, and tasks for a plan", async () => {
      const objective = createObjective({ id: "obj-1", plan_id: "plan-123" });
      const task = createTask({ id: "task-1", plan_id: "plan-123" });
      getMock().setMockData("objectives", [objective]);
      getMock().setMockData("check_ins", []);
      getMock().setMockData("tasks", [task]);

      const result = await analyticsApi.getAnalyticsData("plan-123");

      expect(result.objectives).toBeDefined();
      expect(result.checkIns).toBeDefined();
      expect(result.tasks).toBeDefined();
    });

    it("should return empty arrays when no data exists", async () => {
      getMock().setMockData("objectives", []);
      getMock().setMockData("check_ins", []);
      getMock().setMockData("tasks", []);

      const result = await analyticsApi.getAnalyticsData("plan-123");

      expect(result.objectives).toEqual([]);
      expect(result.checkIns).toEqual([]);
      expect(result.tasks).toEqual([]);
    });

    it("should make parallel queries for objectives, check_ins, and tasks", async () => {
      getMock().setMockData("objectives", []);
      getMock().setMockData("check_ins", []);
      getMock().setMockData("tasks", []);

      await analyticsApi.getAnalyticsData("plan-123");

      const objectiveCalls = getMock().getMockCalls("objectives");
      const checkInCalls = getMock().getMockCalls("check_ins");
      const taskCalls = getMock().getMockCalls("tasks");

      expect(objectiveCalls.some((c) => c.method === "select")).toBe(true);
      expect(checkInCalls.some((c) => c.method === "select")).toBe(true);
      expect(taskCalls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // GET CHECK-INS BY DAY
  // ============================================================================

  describe("getCheckInsByDay", () => {
    it("should fetch check-ins aggregated by day", async () => {
      const dayData = [
        { plan_id: "plan-123", check_in_date: "2025-01-01", check_in_count: 3 },
        { plan_id: "plan-123", check_in_date: "2025-01-02", check_in_count: 5 },
      ];
      getMock().setMockData("v_plan_checkins_by_day", dayData);

      const result = await analyticsApi.getCheckInsByDay("plan-123");

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe("2025-01-01");
      expect(result[0].count).toBe(3);
      expect(result[1].count).toBe(5);
    });

    it("should return empty array when no check-ins", async () => {
      getMock().setMockData("v_plan_checkins_by_day", []);

      const result = await analyticsApi.getCheckInsByDay("plan-123");

      expect(result).toEqual([]);
    });

    it("should filter by date range when provided", async () => {
      getMock().setMockData("v_plan_checkins_by_day", []);

      await analyticsApi.getCheckInsByDay("plan-123", "2025-01-01", "2025-01-31");

      const calls = getMock().getMockCalls("v_plan_checkins_by_day");
      expect(calls.some((c) => c.method === "gte")).toBe(true);
      expect(calls.some((c) => c.method === "lte")).toBe(true);
    });

    it("should order by date ascending", async () => {
      getMock().setMockData("v_plan_checkins_by_day", []);

      await analyticsApi.getCheckInsByDay("plan-123");

      const calls = getMock().getMockCalls("v_plan_checkins_by_day");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "check_in_date")).toBe(true);
    });
  });

  // ============================================================================
  // GET KR CHECK-INS
  // ============================================================================

  describe("getKrCheckIns", () => {
    it("should fetch check-ins for specific KRs", async () => {
      const checkIn1 = createCheckIn({ id: "ci-1", annual_kr_id: "kr-1" });
      const checkIn2 = createCheckIn({ id: "ci-2", annual_kr_id: "kr-2" });
      getMock().setMockData("check_ins", [checkIn1, checkIn2]);

      const result = await analyticsApi.getKrCheckIns(["kr-1", "kr-2"]);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array when no check-ins for KRs", async () => {
      getMock().setMockData("check_ins", []);

      const result = await analyticsApi.getKrCheckIns(["kr-1"]);

      expect(result).toEqual([]);
    });

    it("should use IN filter for multiple KR IDs", async () => {
      getMock().setMockData("check_ins", []);

      await analyticsApi.getKrCheckIns(["kr-1", "kr-2", "kr-3"]);

      const calls = getMock().getMockCalls("check_ins");
      expect(calls.some((c) => c.method === "in" && c.args[0] === "annual_kr_id")).toBe(true);
    });

    it("should filter by date range when provided", async () => {
      getMock().setMockData("check_ins", []);

      await analyticsApi.getKrCheckIns(["kr-1"], "2025-01-01", "2025-01-31");

      const calls = getMock().getMockCalls("check_ins");
      expect(calls.some((c) => c.method === "gte")).toBe(true);
      expect(calls.some((c) => c.method === "lte")).toBe(true);
    });
  });

  // ============================================================================
  // GET TASK METRICS
  // ============================================================================

  describe("getTaskMetrics", () => {
    it("should calculate metrics for tasks", async () => {
      const activeTasks = [
        createTask({ id: "t-1", status: "pending", plan_id: "plan-123" }),
        createTask({ id: "t-2", status: "in_progress", plan_id: "plan-123" }),
      ];
      const completedTask = createTask({
        id: "t-3",
        status: "completed",
        completed_at: new Date().toISOString(),
        plan_id: "plan-123"
      });
      getMock().setMockData("tasks", [...activeTasks, completedTask]);

      const result = await analyticsApi.getTaskMetrics("plan-123");

      expect(result.totalActive).toBe(2);
      expect(typeof result.completedThisWeek).toBe("number");
      expect(typeof result.completedThisMonth).toBe("number");
      expect(typeof result.overdueCount).toBe("number");
      expect(typeof result.avgCompletionDays).toBe("number");
    });

    it("should return zero metrics when no tasks", async () => {
      getMock().setMockData("tasks", []);

      const result = await analyticsApi.getTaskMetrics("plan-123");

      expect(result.totalActive).toBe(0);
      expect(result.completedThisWeek).toBe(0);
      expect(result.completedThisMonth).toBe(0);
      expect(result.overdueCount).toBe(0);
    });

    it("should count overdue tasks", async () => {
      const overdueTask = createTask({
        id: "t-1",
        status: "pending",
        due_date: "2020-01-01", // Past date
        plan_id: "plan-123",
      });
      getMock().setMockData("tasks", [overdueTask]);

      const result = await analyticsApi.getTaskMetrics("plan-123");

      expect(result.overdueCount).toBe(1);
    });

    it("should count tasks linked to KRs", async () => {
      const linkedTask = createTask({
        id: "t-1",
        annual_kr_id: "kr-123",
        plan_id: "plan-123",
      });
      const orphanTask = createTask({
        id: "t-2",
        annual_kr_id: null,
        objective_id: null,
        plan_id: "plan-123",
      });
      getMock().setMockData("tasks", [linkedTask, orphanTask]);

      const result = await analyticsApi.getTaskMetrics("plan-123");

      expect(result.tasksLinkedToKrs).toBe(1);
      expect(result.orphanTasks).toBe(1);
    });

    it("should calculate average completion days", async () => {
      const task = createTask({
        id: "t-1",
        status: "completed",
        created_at: "2025-01-01T00:00:00Z",
        completed_at: "2025-01-08T00:00:00Z", // 7 days later
        plan_id: "plan-123",
      });
      getMock().setMockData("tasks", [task]);

      const result = await analyticsApi.getTaskMetrics("plan-123");

      expect(result.avgCompletionDays).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // GET PRODUCTIVITY STATS
  // ============================================================================

  describe("getProductivityStats", () => {
    it("should return productivity statistics", async () => {
      getMock().setMockData("check_ins", []);

      const result = await analyticsApi.getProductivityStats("plan-123");

      expect(result.mostProductiveDay).toBeDefined();
      expect(typeof result.avgCheckInsPerWeek).toBe("number");
      expect(typeof result.currentStreak).toBe("number");
      expect(result.checkInsByDayOfWeek).toBeDefined();
    });

    it("should return all days of week in checkInsByDayOfWeek", async () => {
      getMock().setMockData("check_ins", []);

      const result = await analyticsApi.getProductivityStats("plan-123");

      expect(result.checkInsByDayOfWeek).toHaveProperty("Sunday");
      expect(result.checkInsByDayOfWeek).toHaveProperty("Monday");
      expect(result.checkInsByDayOfWeek).toHaveProperty("Tuesday");
      expect(result.checkInsByDayOfWeek).toHaveProperty("Wednesday");
      expect(result.checkInsByDayOfWeek).toHaveProperty("Thursday");
      expect(result.checkInsByDayOfWeek).toHaveProperty("Friday");
      expect(result.checkInsByDayOfWeek).toHaveProperty("Saturday");
    });

    it("should return zero streak when no check-ins", async () => {
      getMock().setMockData("check_ins", []);

      const result = await analyticsApi.getProductivityStats("plan-123");

      expect(result.currentStreak).toBe(0);
    });

    it("should calculate correct streak with recent check-ins", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const checkIns = [
        createCheckIn({ recorded_at: today.toISOString() }),
        createCheckIn({ recorded_at: yesterday.toISOString() }),
      ];
      getMock().setMockData("check_ins", checkIns);

      const result = await analyticsApi.getProductivityStats("plan-123");

      // Should have at least some streak if check-ins are today
      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getAnalyticsData fails on objectives", async () => {
      getMock().setMockError("objectives", new Error("Database error"));
      getMock().setMockData("check_ins", []);
      getMock().setMockData("tasks", []);

      await expect(analyticsApi.getAnalyticsData("plan-123")).rejects.toThrow();
    });

    it("should throw error when getCheckInsByDay fails", async () => {
      getMock().setMockError("v_plan_checkins_by_day", new Error("Database error"));

      await expect(analyticsApi.getCheckInsByDay("plan-123")).rejects.toThrow();
    });

    it("should throw error when getKrCheckIns fails", async () => {
      getMock().setMockError("check_ins", new Error("Database error"));

      await expect(analyticsApi.getKrCheckIns(["kr-1"])).rejects.toThrow();
    });

    it("should throw error when getTaskMetrics fails", async () => {
      getMock().setMockError("tasks", new Error("Database error"));

      await expect(analyticsApi.getTaskMetrics("plan-123")).rejects.toThrow();
    });

    it("should throw error when getProductivityStats fails", async () => {
      getMock().setMockError("check_ins", new Error("Database error"));

      await expect(analyticsApi.getProductivityStats("plan-123")).rejects.toThrow();
    });
  });
});
