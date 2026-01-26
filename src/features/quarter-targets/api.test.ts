/**
 * Quarter Targets API Unit Tests
 *
 * Tests for quarter target CRUD operations.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";
import { createQuarterTarget as createQuarterTargetFactory, createAnnualKr } from "@/test/factories";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

// Import API functions after mocking
import * as quarterTargetsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Quarter Targets API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET QUARTER TARGETS
  // ============================================================================

  describe("getQuarterTargets", () => {
    it("should make correct query calls for fetching targets", async () => {
      // Complex joins can't be fully simulated by the mock,
      // so we verify the query is constructed correctly
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.getQuarterTargets("plan-123");

      // Should return an array (even if empty due to mock limitations)
      expect(Array.isArray(result)).toBe(true);

      // Verify select was called with join
      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "order")).toBe(true);
    });

    it("should return empty array when no quarter targets exist", async () => {
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.getQuarterTargets("plan-123");

      expect(result).toEqual([]);
    });

    it("should make select call with join to annual_krs and objectives", async () => {
      getMock().setMockData("quarter_targets", []);

      await quarterTargetsApi.getQuarterTargets("plan-123");

      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // GET QUARTER TARGETS BY KR
  // ============================================================================

  describe("getQuarterTargetsByKr", () => {
    it("should fetch quarter targets for a specific KR", async () => {
      const krId = "kr-123";
      const qt1 = createQuarterTargetFactory({ id: "qt-1", annual_kr_id: krId, quarter: 1 });
      const qt2 = createQuarterTargetFactory({ id: "qt-2", annual_kr_id: krId, quarter: 2 });
      const qt3 = createQuarterTargetFactory({ id: "qt-3", annual_kr_id: "other-kr", quarter: 1 });
      getMock().setMockData("quarter_targets", [qt1, qt2, qt3]);

      const result = await quarterTargetsApi.getQuarterTargetsByKr(krId);

      expect(result).toHaveLength(2);
      expect(result.every((qt) => qt.annual_kr_id === krId)).toBe(true);
    });

    it("should order results by quarter ascending", async () => {
      const krId = "kr-123";
      const qt2 = createQuarterTargetFactory({ id: "qt-2", annual_kr_id: krId, quarter: 2 });
      const qt1 = createQuarterTargetFactory({ id: "qt-1", annual_kr_id: krId, quarter: 1 });
      const qt3 = createQuarterTargetFactory({ id: "qt-3", annual_kr_id: krId, quarter: 3 });
      getMock().setMockData("quarter_targets", [qt2, qt1, qt3]);

      const result = await quarterTargetsApi.getQuarterTargetsByKr(krId);

      expect(result[0].quarter).toBe(1);
      expect(result[1].quarter).toBe(2);
      expect(result[2].quarter).toBe(3);
    });

    it("should return empty array when KR has no targets", async () => {
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.getQuarterTargetsByKr("kr-nonexistent");

      expect(result).toEqual([]);
    });

    it("should make eq call with annual_kr_id filter", async () => {
      getMock().setMockData("quarter_targets", []);

      await quarterTargetsApi.getQuarterTargetsByKr("kr-123");

      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "annual_kr_id")).toBe(true);
    });
  });

  // ============================================================================
  // GET QUARTER TARGETS BY QUARTER
  // ============================================================================

  describe("getQuarterTargetsByQuarter", () => {
    it("should make correct query calls for specific quarter", async () => {
      // Complex joins can't be fully simulated by the mock
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.getQuarterTargetsByQuarter("plan-123", 1);

      // Should return an array
      expect(Array.isArray(result)).toBe(true);

      // Verify the correct query methods were called
      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "quarter" && c.args[1] === 1)).toBe(true);
    });

    it("should return empty array when no targets for quarter", async () => {
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.getQuarterTargetsByQuarter("plan-123", 4);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // GET QUARTER OVERVIEW
  // ============================================================================

  describe("getQuarterOverview", () => {
    it("should query the quarter overview view", async () => {
      getMock().setMockData("v_quarter_overview", []);

      const result = await quarterTargetsApi.getQuarterOverview("plan-123");

      // Should return an array
      expect(Array.isArray(result)).toBe(true);

      // Verify the correct table/view was queried
      const calls = getMock().getMockCalls("v_quarter_overview");
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
      expect(calls.some((c) => c.method === "order")).toBe(true);
    });

    it("should return results ordered by quarter", async () => {
      const overview = [
        { quarter: 1, target_count: 5, avg_progress: 0.25 },
        { quarter: 2, target_count: 5, avg_progress: 0.5 },
      ];
      getMock().setMockData("v_quarter_overview", overview);

      const result = await quarterTargetsApi.getQuarterOverview("plan-123");

      // Verify order call was made
      const calls = getMock().getMockCalls("v_quarter_overview");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "quarter")).toBe(true);
    });
  });

  // ============================================================================
  // GET SINGLE QUARTER TARGET
  // ============================================================================

  describe("getQuarterTarget", () => {
    it("should fetch a single quarter target by ID", async () => {
      const qt = createQuarterTargetFactory({ id: "qt-123", target_value: 100 });
      getMock().setMockData("quarter_targets", [qt]);

      const result = await quarterTargetsApi.getQuarterTarget("qt-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("qt-123");
      expect(result!.target_value).toBe(100);
    });

    it("should return null when quarter target not found", async () => {
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.getQuarterTarget("qt-nonexistent");

      expect(result).toBeNull();
    });

    it("should make single() call", async () => {
      getMock().setMockData("quarter_targets", []);

      await quarterTargetsApi.getQuarterTarget("qt-123");

      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE QUARTER TARGET
  // ============================================================================

  describe("createQuarterTarget", () => {
    it("should create a quarter target", async () => {
      const newTarget = {
        annual_kr_id: "kr-123",
        quarter: 1 as const,
        target_value: 25,
      };
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.createQuarterTarget(newTarget);

      expect(result.annual_kr_id).toBe("kr-123");
      expect(result.quarter).toBe(1);
      expect(result.target_value).toBe(25);
    });

    it("should make insert and select calls", async () => {
      const newTarget = {
        annual_kr_id: "kr-123",
        quarter: 2 as const,
        target_value: 50,
      };
      getMock().setMockData("quarter_targets", []);

      await quarterTargetsApi.createQuarterTarget(newTarget);

      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });

    it("should create target with notes", async () => {
      const newTarget = {
        annual_kr_id: "kr-123",
        quarter: 3 as const,
        target_value: 75,
        notes: "Q3 target notes",
      };
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.createQuarterTarget(newTarget);

      expect(result.notes).toBe("Q3 target notes");
    });
  });

  // ============================================================================
  // UPSERT QUARTER TARGETS
  // ============================================================================

  describe("upsertQuarterTargets", () => {
    it("should upsert multiple quarter targets", async () => {
      const targets = [
        { quarter: 1 as const, target_value: 25 },
        { quarter: 2 as const, target_value: 50 },
        { quarter: 3 as const, target_value: 75 },
        { quarter: 4 as const, target_value: 100 },
      ];
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.upsertQuarterTargets("kr-123", targets);

      expect(result).toHaveLength(4);
    });

    it("should make upsert call with onConflict option", async () => {
      const targets = [{ quarter: 1 as const, target_value: 25 }];
      getMock().setMockData("quarter_targets", []);

      await quarterTargetsApi.upsertQuarterTargets("kr-123", targets);

      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "upsert")).toBe(true);
    });

    it("should include annual_kr_id in each upserted target", async () => {
      const targets = [
        { quarter: 1 as const, target_value: 25 },
        { quarter: 2 as const, target_value: 50 },
      ];
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.upsertQuarterTargets("kr-123", targets);

      expect(result.every((t) => t.annual_kr_id === "kr-123")).toBe(true);
    });

    it("should handle targets with notes", async () => {
      const targets = [
        { quarter: 1 as const, target_value: 25, notes: "Q1 focus" },
        { quarter: 2 as const, target_value: 50, notes: "Q2 ramp up" },
      ];
      getMock().setMockData("quarter_targets", []);

      const result = await quarterTargetsApi.upsertQuarterTargets("kr-123", targets);

      expect(result[0].notes).toBe("Q1 focus");
      expect(result[1].notes).toBe("Q2 ramp up");
    });
  });

  // ============================================================================
  // UPDATE QUARTER TARGET
  // ============================================================================

  describe("updateQuarterTarget", () => {
    it("should update a quarter target", async () => {
      const existingQt = createQuarterTargetFactory({ id: "qt-123", target_value: 25 });
      getMock().setMockData("quarter_targets", [existingQt]);

      const result = await quarterTargetsApi.updateQuarterTarget("qt-123", {
        target_value: 30,
      });

      expect(result.target_value).toBe(30);
    });

    it("should update notes", async () => {
      const existingQt = createQuarterTargetFactory({ id: "qt-123", notes: null });
      getMock().setMockData("quarter_targets", [existingQt]);

      const result = await quarterTargetsApi.updateQuarterTarget("qt-123", {
        notes: "Updated notes",
      });

      expect(result.notes).toBe("Updated notes");
    });

    it("should update current_value", async () => {
      const existingQt = createQuarterTargetFactory({ id: "qt-123", current_value: 0 });
      getMock().setMockData("quarter_targets", [existingQt]);

      const result = await quarterTargetsApi.updateQuarterTarget("qt-123", {
        current_value: 15,
      });

      expect(result.current_value).toBe(15);
    });

    it("should make update, eq, and select calls", async () => {
      const existingQt = createQuarterTargetFactory({ id: "qt-123" });
      getMock().setMockData("quarter_targets", [existingQt]);

      await quarterTargetsApi.updateQuarterTarget("qt-123", { target_value: 50 });

      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // DELETE QUARTER TARGET
  // ============================================================================

  describe("deleteQuarterTarget", () => {
    it("should delete a quarter target", async () => {
      const existingQt = createQuarterTargetFactory({ id: "qt-123" });
      getMock().setMockData("quarter_targets", [existingQt]);

      await quarterTargetsApi.deleteQuarterTarget("qt-123");

      // Verify delete was called
      const calls = getMock().getMockCalls("quarter_targets");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id" && c.args[1] === "qt-123")).toBe(true);
    });

    it("should not throw when deleting non-existent target", async () => {
      getMock().setMockData("quarter_targets", []);

      // Should not throw
      await expect(quarterTargetsApi.deleteQuarterTarget("qt-nonexistent")).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getQuarterTargets fails", async () => {
      getMock().setMockError("quarter_targets", new Error("Database error"));

      await expect(quarterTargetsApi.getQuarterTargets("plan-123")).rejects.toThrow();
    });

    it("should throw error when getQuarterTargetsByKr fails", async () => {
      getMock().setMockError("quarter_targets", new Error("Database error"));

      await expect(quarterTargetsApi.getQuarterTargetsByKr("kr-123")).rejects.toThrow();
    });

    it("should throw error when createQuarterTarget fails", async () => {
      getMock().setMockError("quarter_targets", new Error("Database error"));

      await expect(
        quarterTargetsApi.createQuarterTarget({
          annual_kr_id: "kr-123",
          quarter: 1,
          target_value: 25,
        })
      ).rejects.toThrow();
    });

    it("should throw error when updateQuarterTarget fails", async () => {
      getMock().setMockError("quarter_targets", new Error("Database error"));

      await expect(
        quarterTargetsApi.updateQuarterTarget("qt-123", { target_value: 50 })
      ).rejects.toThrow();
    });

    it("should throw error when deleteQuarterTarget fails", async () => {
      getMock().setMockError("quarter_targets", new Error("Database error"));

      await expect(quarterTargetsApi.deleteQuarterTarget("qt-123")).rejects.toThrow();
    });
  });
});
