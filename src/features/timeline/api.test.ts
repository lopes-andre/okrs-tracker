/**
 * Timeline API Unit Tests
 *
 * Tests for activity event queries and filtering.
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
import * as timelineApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST HELPERS
// ============================================================================

function createActivityEvent(overrides: Partial<{
  id: string;
  plan_id: string;
  user_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}> = {}) {
  return {
    id: overrides.id || `event-${Math.random().toString(36).slice(2)}`,
    plan_id: overrides.plan_id || "plan-123",
    user_id: overrides.user_id || "user-123",
    event_type: overrides.event_type || "created",
    entity_type: overrides.entity_type || "task",
    entity_id: overrides.entity_id || "entity-123",
    metadata: overrides.metadata || {},
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

function createActivityEventWithUser(overrides: Partial<{
  id: string;
  plan_id: string;
  user_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}> = {}) {
  const event = createActivityEvent(overrides);
  return {
    ...event,
    user: {
      id: event.user_id,
      email: "user@example.com",
      full_name: "Test User",
      avatar_url: null,
    },
  };
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Timeline API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET TIMELINE
  // ============================================================================

  describe("getTimeline", () => {
    it("should fetch activity events for a plan", async () => {
      const event1 = createActivityEventWithUser({ id: "e-1", plan_id: "plan-123" });
      const event2 = createActivityEventWithUser({ id: "e-2", plan_id: "plan-123" });
      getMock().setMockData("activity_events", [event1, event2]);

      const result = await timelineApi.getTimeline("plan-123");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("user");
    });

    it("should return empty array when no events exist", async () => {
      getMock().setMockData("activity_events", []);

      const result = await timelineApi.getTimeline("plan-123");

      expect(result).toEqual([]);
    });

    it("should filter by entity_type", async () => {
      const taskEvent = createActivityEventWithUser({ id: "e-1", entity_type: "task", plan_id: "plan-123" });
      const krEvent = createActivityEventWithUser({ id: "e-2", entity_type: "annual_kr", plan_id: "plan-123" });
      getMock().setMockData("activity_events", [taskEvent, krEvent]);

      const result = await timelineApi.getTimeline("plan-123", { entity_type: "task" });

      expect(result).toHaveLength(1);
      expect(result[0].entity_type).toBe("task");
    });

    it("should filter by multiple entity_types", async () => {
      const taskEvent = createActivityEventWithUser({ id: "e-1", entity_type: "task", plan_id: "plan-123" });
      const krEvent = createActivityEventWithUser({ id: "e-2", entity_type: "annual_kr", plan_id: "plan-123" });
      const objEvent = createActivityEventWithUser({ id: "e-3", entity_type: "objective", plan_id: "plan-123" });
      getMock().setMockData("activity_events", [taskEvent, krEvent, objEvent]);

      const result = await timelineApi.getTimeline("plan-123", { entity_type: ["task", "annual_kr"] });

      expect(result).toHaveLength(2);
    });

    it("should filter by event_type", async () => {
      const createdEvent = createActivityEventWithUser({ id: "e-1", event_type: "created", plan_id: "plan-123" });
      const updatedEvent = createActivityEventWithUser({ id: "e-2", event_type: "updated", plan_id: "plan-123" });
      getMock().setMockData("activity_events", [createdEvent, updatedEvent]);

      const result = await timelineApi.getTimeline("plan-123", { event_type: "created" });

      expect(result).toHaveLength(1);
      expect(result[0].event_type).toBe("created");
    });

    it("should filter by user_id", async () => {
      const user1Event = createActivityEventWithUser({ id: "e-1", user_id: "user-1", plan_id: "plan-123" });
      const user2Event = createActivityEventWithUser({ id: "e-2", user_id: "user-2", plan_id: "plan-123" });
      getMock().setMockData("activity_events", [user1Event, user2Event]);

      const result = await timelineApi.getTimeline("plan-123", { user_id: "user-1" });

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe("user-1");
    });

    it("should filter by date range", async () => {
      getMock().setMockData("activity_events", []);

      await timelineApi.getTimeline("plan-123", {
        date_from: "2025-01-01",
        date_to: "2025-01-31",
      });

      const calls = getMock().getMockCalls("activity_events");
      expect(calls.some((c) => c.method === "gte" && c.args[0] === "created_at")).toBe(true);
      expect(calls.some((c) => c.method === "lte" && c.args[0] === "created_at")).toBe(true);
    });

    it("should order by created_at descending", async () => {
      getMock().setMockData("activity_events", []);

      await timelineApi.getTimeline("plan-123");

      const calls = getMock().getMockCalls("activity_events");
      const orderCall = calls.find((c) => c.method === "order");
      expect(orderCall?.args[0]).toBe("created_at");
      expect(orderCall?.args[1]).toEqual({ ascending: false });
    });
  });

  // ============================================================================
  // GET RECENT ACTIVITY
  // ============================================================================

  describe("getRecentActivity", () => {
    it("should fetch recent activity with limit", async () => {
      const events = Array.from({ length: 25 }, (_, i) =>
        createActivityEventWithUser({ id: `e-${i}`, plan_id: "plan-123" })
      );
      getMock().setMockData("activity_events", events);

      await timelineApi.getRecentActivity("plan-123", 10);

      const calls = getMock().getMockCalls("activity_events");
      expect(calls.some((c) => c.method === "limit" && c.args[0] === 10)).toBe(true);
    });

    it("should use default limit of 20", async () => {
      getMock().setMockData("activity_events", []);

      await timelineApi.getRecentActivity("plan-123");

      const calls = getMock().getMockCalls("activity_events");
      expect(calls.some((c) => c.method === "limit" && c.args[0] === 20)).toBe(true);
    });

    it("should order by created_at descending", async () => {
      getMock().setMockData("activity_events", []);

      await timelineApi.getRecentActivity("plan-123");

      const calls = getMock().getMockCalls("activity_events");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "created_at")).toBe(true);
    });
  });

  // ============================================================================
  // GET TIMELINE PAGINATED
  // ============================================================================

  describe("getTimelinePaginated", () => {
    it("should return paginated result", async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createActivityEventWithUser({ id: `e-${i}`, plan_id: "plan-123" })
      );
      getMock().setMockData("activity_events", events);

      const result = await timelineApi.getTimelinePaginated("plan-123", 1, 10);

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("totalPages");
      expect(result).toHaveProperty("hasMore");
    });

    it("should apply pagination range", async () => {
      getMock().setMockData("activity_events", []);

      await timelineApi.getTimelinePaginated("plan-123", 2, 10);

      const calls = getMock().getMockCalls("activity_events");
      expect(calls.some((c) => c.method === "range")).toBe(true);
    });

    it("should apply filters in paginated query", async () => {
      getMock().setMockData("activity_events", []);

      await timelineApi.getTimelinePaginated("plan-123", 1, 10, {
        entity_type: "task",
        event_type: "created",
      });

      const calls = getMock().getMockCalls("activity_events");
      expect(calls.some((c) => c.method === "in" && c.args[0] === "entity_type")).toBe(true);
      expect(calls.some((c) => c.method === "in" && c.args[0] === "event_type")).toBe(true);
    });
  });

  // ============================================================================
  // GET ENTITY ACTIVITY
  // ============================================================================

  describe("getEntityActivity", () => {
    it("should fetch activity for a specific entity", async () => {
      const taskEvent = createActivityEvent({ id: "e-1", entity_type: "task", entity_id: "task-123", plan_id: "plan-123" });
      getMock().setMockData("activity_events", [taskEvent]);

      const result = await timelineApi.getEntityActivity("plan-123", "task", "task-123");

      expect(result).toHaveLength(1);
      expect(result[0].entity_id).toBe("task-123");
    });

    it("should filter by entity_type and entity_id", async () => {
      getMock().setMockData("activity_events", []);

      await timelineApi.getEntityActivity("plan-123", "task", "task-123");

      const calls = getMock().getMockCalls("activity_events");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "entity_type")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "entity_id")).toBe(true);
    });

    it("should return empty array when no activity for entity", async () => {
      getMock().setMockData("activity_events", []);

      const result = await timelineApi.getEntityActivity("plan-123", "task", "nonexistent");

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // GET ACTIVITY BY DATE
  // ============================================================================

  describe("getActivityByDate", () => {
    it("should group events by date", async () => {
      const event1 = createActivityEventWithUser({ id: "e-1", created_at: "2025-01-15T10:00:00Z", plan_id: "plan-123" });
      const event2 = createActivityEventWithUser({ id: "e-2", created_at: "2025-01-15T14:00:00Z", plan_id: "plan-123" });
      const event3 = createActivityEventWithUser({ id: "e-3", created_at: "2025-01-14T09:00:00Z", plan_id: "plan-123" });
      getMock().setMockData("activity_events", [event1, event2, event3]);

      const result = await timelineApi.getActivityByDate("plan-123");

      expect(result.length).toBeGreaterThanOrEqual(2);
      // Find the groups
      const jan15Group = result.find((g) => g.date === "2025-01-15");
      const jan14Group = result.find((g) => g.date === "2025-01-14");
      expect(jan15Group?.events).toHaveLength(2);
      expect(jan14Group?.events).toHaveLength(1);
    });

    it("should sort dates descending", async () => {
      const event1 = createActivityEventWithUser({ id: "e-1", created_at: "2025-01-10T10:00:00Z", plan_id: "plan-123" });
      const event2 = createActivityEventWithUser({ id: "e-2", created_at: "2025-01-15T10:00:00Z", plan_id: "plan-123" });
      getMock().setMockData("activity_events", [event1, event2]);

      const result = await timelineApi.getActivityByDate("plan-123");

      expect(result[0].date).toBe("2025-01-15");
      expect(result[1].date).toBe("2025-01-10");
    });

    it("should use RPC when date range provided", async () => {
      // When both dateFrom and dateTo are provided, the function uses RPC
      getMock().setMockRpcResult("get_activity_by_date", [
        { activity_date: "2025-01-15", event_count: 2, events: [] },
      ]);

      const result = await timelineApi.getActivityByDate("plan-123", "2025-01-01", "2025-01-31");

      expect(getMock().mockSupabase.rpc).toHaveBeenCalledWith("get_activity_by_date", {
        p_plan_id: "plan-123",
        p_start_date: "2025-01-01",
        p_end_date: "2025-01-31",
      });
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2025-01-15");
    });

    it("should return empty array when no events", async () => {
      getMock().setMockData("activity_events", []);

      const result = await timelineApi.getActivityByDate("plan-123");

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // GET ACTIVITY STATS
  // ============================================================================

  describe("getActivityStats", () => {
    // Note: getActivityStats now uses RPC function get_activity_stats
    // which returns aggregated data: [{ entity_type, event_type, event_count }]

    it("should calculate total events from RPC response", async () => {
      getMock().setMockRpcResult("get_activity_stats", [
        { entity_type: "task", event_type: "created", event_count: 2 },
        { entity_type: "task", event_type: "updated", event_count: 1 },
      ]);

      const result = await timelineApi.getActivityStats("plan-123");

      expect(result.total_events).toBe(3);
    });

    it("should count events by type from RPC response", async () => {
      getMock().setMockRpcResult("get_activity_stats", [
        { entity_type: "task", event_type: "created", event_count: 2 },
        { entity_type: "objective", event_type: "created", event_count: 1 },
        { entity_type: "task", event_type: "updated", event_count: 1 },
      ]);

      const result = await timelineApi.getActivityStats("plan-123");

      expect(result.events_by_type["created"]).toBe(3);
      expect(result.events_by_type["updated"]).toBe(1);
    });

    it("should count events by entity type from RPC response", async () => {
      getMock().setMockRpcResult("get_activity_stats", [
        { entity_type: "task", event_type: "created", event_count: 2 },
        { entity_type: "task", event_type: "updated", event_count: 1 },
        { entity_type: "objective", event_type: "created", event_count: 1 },
      ]);

      const result = await timelineApi.getActivityStats("plan-123");

      expect(result.events_by_entity["task"]).toBe(3);
      expect(result.events_by_entity["objective"]).toBe(1);
    });

    it("should return zero for active_users (not tracked by RPC)", async () => {
      // Note: The RPC function doesn't return user counts, so active_users is always 0
      getMock().setMockRpcResult("get_activity_stats", [
        { entity_type: "task", event_type: "created", event_count: 3 },
      ]);

      const result = await timelineApi.getActivityStats("plan-123");

      expect(result.active_users).toBe(0);
    });

    it("should pass date range to RPC function", async () => {
      getMock().setMockRpcResult("get_activity_stats", []);

      await timelineApi.getActivityStats("plan-123", "2025-01-01", "2025-01-31");

      // RPC function is called with the date params
      expect(getMock().mockSupabase.rpc).toHaveBeenCalledWith("get_activity_stats", {
        p_plan_id: "plan-123",
        p_start_date: "2025-01-01",
        p_end_date: "2025-01-31",
      });
    });

    it("should return zero stats when RPC returns empty", async () => {
      getMock().setMockRpcResult("get_activity_stats", []);

      const result = await timelineApi.getActivityStats("plan-123");

      expect(result.total_events).toBe(0);
      expect(result.active_users).toBe(0);
      expect(Object.keys(result.events_by_type)).toHaveLength(0);
      expect(Object.keys(result.events_by_entity)).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getTimeline fails", async () => {
      getMock().setMockError("activity_events", new Error("Database error"));

      await expect(timelineApi.getTimeline("plan-123")).rejects.toThrow();
    });

    it("should throw error when getRecentActivity fails", async () => {
      getMock().setMockError("activity_events", new Error("Database error"));

      await expect(timelineApi.getRecentActivity("plan-123")).rejects.toThrow();
    });

    it("should throw error when getTimelinePaginated fails", async () => {
      getMock().setMockError("activity_events", new Error("Database error"));

      await expect(timelineApi.getTimelinePaginated("plan-123")).rejects.toThrow();
    });

    it("should throw error when getEntityActivity fails", async () => {
      getMock().setMockError("activity_events", new Error("Database error"));

      await expect(timelineApi.getEntityActivity("plan-123", "task", "task-123")).rejects.toThrow();
    });

    it("should throw error when getActivityByDate fails", async () => {
      // Without date range, uses table query
      getMock().setMockError("activity_events", new Error("Database error"));

      await expect(timelineApi.getActivityByDate("plan-123")).rejects.toThrow();
    });

    it("should throw error when getActivityByDate with date range fails", async () => {
      // With date range, uses RPC
      getMock().setMockRpcError("get_activity_by_date", new Error("Database error"));

      await expect(
        timelineApi.getActivityByDate("plan-123", "2024-01-01", "2024-01-31")
      ).rejects.toThrow();
    });

    it("should throw error when getActivityStats fails", async () => {
      // Uses RPC function
      getMock().setMockRpcError("get_activity_stats", new Error("Database error"));

      await expect(timelineApi.getActivityStats("plan-123")).rejects.toThrow();
    });
  });
});
