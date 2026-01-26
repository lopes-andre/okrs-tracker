/**
 * Annual KRs API Unit Tests
 *
 * Tests for annual key result CRUD operations and tag management.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";
import { createAnnualKr as createAnnualKrFactory, createObjective } from "@/test/factories";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

// Import API functions after mocking
import * as annualKrsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Annual KRs API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET ANNUAL KRS
  // ============================================================================

  describe("getAnnualKrs", () => {
    it("should fetch all KRs for a plan via objectives", async () => {
      const objective = createObjective({ id: "obj-1", plan_id: "plan-123" });
      const kr1 = createAnnualKrFactory({ id: "kr-1", objective_id: "obj-1" });
      const kr2 = createAnnualKrFactory({ id: "kr-2", objective_id: "obj-1" });

      getMock().setMockData("objectives", [objective]);
      getMock().setMockData("annual_krs", [kr1, kr2]);

      const result = await annualKrsApi.getAnnualKrs("plan-123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no objectives exist", async () => {
      getMock().setMockData("objectives", []);
      getMock().setMockData("annual_krs", []);

      const result = await annualKrsApi.getAnnualKrs("plan-123");

      expect(result).toEqual([]);
    });

    it("should order KRs by sort_order", async () => {
      const objective = createObjective({ id: "obj-1", plan_id: "plan-123" });
      getMock().setMockData("objectives", [objective]);
      getMock().setMockData("annual_krs", []);

      await annualKrsApi.getAnnualKrs("plan-123");

      const calls = getMock().getMockCalls("annual_krs");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "sort_order")).toBe(true);
    });

    it("should use IN filter for objective IDs", async () => {
      const obj1 = createObjective({ id: "obj-1", plan_id: "plan-123" });
      const obj2 = createObjective({ id: "obj-2", plan_id: "plan-123" });
      getMock().setMockData("objectives", [obj1, obj2]);
      getMock().setMockData("annual_krs", []);

      await annualKrsApi.getAnnualKrs("plan-123");

      const calls = getMock().getMockCalls("annual_krs");
      expect(calls.some((c) => c.method === "in" && c.args[0] === "objective_id")).toBe(true);
    });
  });

  // ============================================================================
  // GET ANNUAL KRS BY OBJECTIVE
  // ============================================================================

  describe("getAnnualKrsByObjective", () => {
    it("should fetch KRs for a specific objective", async () => {
      const kr1 = createAnnualKrFactory({ id: "kr-1", objective_id: "obj-123" });
      const kr2 = createAnnualKrFactory({ id: "kr-2", objective_id: "obj-123" });
      const kr3 = createAnnualKrFactory({ id: "kr-3", objective_id: "other-obj" });
      getMock().setMockData("annual_krs", [kr1, kr2, kr3]);

      const result = await annualKrsApi.getAnnualKrsByObjective("obj-123");

      expect(result).toHaveLength(2);
      expect(result.every((kr) => kr.objective_id === "obj-123")).toBe(true);
    });

    it("should return empty array when no KRs for objective", async () => {
      getMock().setMockData("annual_krs", []);

      const result = await annualKrsApi.getAnnualKrsByObjective("obj-123");

      expect(result).toEqual([]);
    });

    it("should order by sort_order ascending", async () => {
      getMock().setMockData("annual_krs", []);

      await annualKrsApi.getAnnualKrsByObjective("obj-123");

      const calls = getMock().getMockCalls("annual_krs");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "sort_order")).toBe(true);
    });
  });

  // ============================================================================
  // GET KR PROGRESS
  // ============================================================================

  describe("getKrProgress", () => {
    it("should fetch KR progress from view", async () => {
      const krProgress = [
        { id: "kr-1", name: "KR 1", progress: 50, objective_code: "O1", plan_id: "plan-123" },
        { id: "kr-2", name: "KR 2", progress: 75, objective_code: "O2", plan_id: "plan-123" },
      ];
      getMock().setMockData("v_kr_progress", krProgress);

      const result = await annualKrsApi.getKrProgress("plan-123");

      expect(result).toHaveLength(2);
      expect(result[0].progress).toBe(50);
      expect(result[0].objective_code).toBe("O1");
    });

    it("should return empty array when no progress data", async () => {
      getMock().setMockData("v_kr_progress", []);

      const result = await annualKrsApi.getKrProgress("plan-123");

      expect(result).toEqual([]);
    });

    it("should filter by plan_id", async () => {
      getMock().setMockData("v_kr_progress", []);

      await annualKrsApi.getKrProgress("plan-123");

      const calls = getMock().getMockCalls("v_kr_progress");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
    });
  });

  // ============================================================================
  // GET SINGLE ANNUAL KR
  // ============================================================================

  describe("getAnnualKr", () => {
    it("should fetch a single KR by ID", async () => {
      const kr = createAnnualKrFactory({ id: "kr-123", name: "Test KR" });
      getMock().setMockData("annual_krs", [kr]);

      const result = await annualKrsApi.getAnnualKr("kr-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("kr-123");
      expect(result!.name).toBe("Test KR");
    });

    it("should return null when KR not found", async () => {
      getMock().setMockData("annual_krs", []);

      const result = await annualKrsApi.getAnnualKr("kr-nonexistent");

      expect(result).toBeNull();
    });

    it("should make single() call", async () => {
      getMock().setMockData("annual_krs", []);

      await annualKrsApi.getAnnualKr("kr-123");

      const calls = getMock().getMockCalls("annual_krs");
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // GET ANNUAL KR WITH DETAILS
  // ============================================================================

  describe("getAnnualKrWithDetails", () => {
    it("should fetch KR with related data", async () => {
      const kr = createAnnualKrFactory({
        id: "kr-123",
        name: "Detailed KR",
        start_value: 0,
        current_value: 50,
        target_value: 100,
      });
      getMock().setMockData("annual_krs", [{
        ...kr,
        objective: { id: "obj-1", name: "Objective 1" },
        group: null,
        owner: null,
        quarter_targets: [],
        annual_kr_tags: [{ tag: { id: "tag-1", name: "Tag 1" } }],
      }]);

      const result = await annualKrsApi.getAnnualKrWithDetails("kr-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("kr-123");
      expect(result!.tags).toHaveLength(1);
    });

    it("should return null when KR not found", async () => {
      getMock().setMockData("annual_krs", []);

      const result = await annualKrsApi.getAnnualKrWithDetails("kr-nonexistent");

      expect(result).toBeNull();
    });

    it("should calculate progress correctly", async () => {
      const kr = createAnnualKrFactory({
        id: "kr-123",
        start_value: 0,
        current_value: 50,
        target_value: 100,
      });
      getMock().setMockData("annual_krs", [{
        ...kr,
        objective: null,
        group: null,
        owner: null,
        quarter_targets: [],
        annual_kr_tags: [],
      }]);

      const result = await annualKrsApi.getAnnualKrWithDetails("kr-123");

      expect(result!.progress).toBe(50);
    });

    it("should cap progress at 100", async () => {
      const kr = createAnnualKrFactory({
        id: "kr-123",
        start_value: 0,
        current_value: 150,
        target_value: 100,
      });
      getMock().setMockData("annual_krs", [{
        ...kr,
        objective: null,
        group: null,
        owner: null,
        quarter_targets: [],
        annual_kr_tags: [],
      }]);

      const result = await annualKrsApi.getAnnualKrWithDetails("kr-123");

      expect(result!.progress).toBe(100);
    });

    it("should return 0 progress when start equals target", async () => {
      const kr = createAnnualKrFactory({
        id: "kr-123",
        start_value: 100,
        current_value: 50,
        target_value: 100,
      });
      getMock().setMockData("annual_krs", [{
        ...kr,
        objective: null,
        group: null,
        owner: null,
        quarter_targets: [],
        annual_kr_tags: [],
      }]);

      const result = await annualKrsApi.getAnnualKrWithDetails("kr-123");

      expect(result!.progress).toBe(0);
    });
  });

  // ============================================================================
  // CREATE ANNUAL KR
  // ============================================================================

  describe("createAnnualKr", () => {
    it("should create a KR", async () => {
      const newKr = {
        objective_id: "obj-123",
        name: "New KR",
        kr_type: "metric" as const,
        direction: "increase" as const,
        start_value: 0,
        current_value: 0,
        target_value: 100,
        unit: "users",
        sort_order: 0,
      };
      getMock().setMockData("annual_krs", []);

      const result = await annualKrsApi.createAnnualKr(newKr);

      expect(result.name).toBe("New KR");
      expect(result.objective_id).toBe("obj-123");
    });

    it("should make insert and select calls", async () => {
      const newKr = {
        objective_id: "obj-123",
        name: "Test",
        kr_type: "count" as const,
        direction: "increase" as const,
        start_value: 0,
        current_value: 0,
        target_value: 10,
        unit: "items",
        sort_order: 0,
      };
      getMock().setMockData("annual_krs", []);

      await annualKrsApi.createAnnualKr(newKr);

      const calls = getMock().getMockCalls("annual_krs");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE ANNUAL KR
  // ============================================================================

  describe("updateAnnualKr", () => {
    it("should update a KR", async () => {
      const existingKr = createAnnualKrFactory({ id: "kr-123", name: "Old Name" });
      getMock().setMockData("annual_krs", [existingKr]);

      const result = await annualKrsApi.updateAnnualKr("kr-123", { name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("should update current_value", async () => {
      const existingKr = createAnnualKrFactory({ id: "kr-123", current_value: 0 });
      getMock().setMockData("annual_krs", [existingKr]);

      const result = await annualKrsApi.updateAnnualKr("kr-123", { current_value: 50 });

      expect(result.current_value).toBe(50);
    });

    it("should make update, eq, select, and single calls", async () => {
      const existingKr = createAnnualKrFactory({ id: "kr-123" });
      getMock().setMockData("annual_krs", [existingKr]);

      await annualKrsApi.updateAnnualKr("kr-123", { name: "Updated" });

      const calls = getMock().getMockCalls("annual_krs");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // DELETE ANNUAL KR
  // ============================================================================

  describe("deleteAnnualKr", () => {
    it("should delete a KR", async () => {
      const existingKr = createAnnualKrFactory({ id: "kr-123" });
      getMock().setMockData("annual_krs", [existingKr]);

      await annualKrsApi.deleteAnnualKr("kr-123");

      const calls = getMock().getMockCalls("annual_krs");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // REORDER ANNUAL KRS
  // ============================================================================

  describe("reorderAnnualKrs", () => {
    it("should update sort_order for each KR", async () => {
      const kr1 = createAnnualKrFactory({ id: "kr-1", sort_order: 0 });
      const kr2 = createAnnualKrFactory({ id: "kr-2", sort_order: 1 });
      getMock().setMockData("annual_krs", [kr1, kr2]);

      await annualKrsApi.reorderAnnualKrs("obj-123", ["kr-2", "kr-1"]);

      const calls = getMock().getMockCalls("annual_krs");
      expect(calls.filter((c) => c.method === "update").length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // KR TAGS
  // ============================================================================

  describe("addTagToKr", () => {
    it("should add a tag to a KR", async () => {
      getMock().setMockData("annual_kr_tags", []);

      await annualKrsApi.addTagToKr("kr-123", "tag-456");

      const calls = getMock().getMockCalls("annual_kr_tags");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
    });
  });

  describe("removeTagFromKr", () => {
    it("should remove a tag from a KR", async () => {
      getMock().setMockData("annual_kr_tags", [
        { annual_kr_id: "kr-123", tag_id: "tag-456" },
      ]);

      await annualKrsApi.removeTagFromKr("kr-123", "tag-456");

      const calls = getMock().getMockCalls("annual_kr_tags");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "annual_kr_id")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "tag_id")).toBe(true);
    });
  });

  describe("getKrTagIds", () => {
    it("should return tag IDs for a KR", async () => {
      getMock().setMockData("annual_kr_tags", [
        { annual_kr_id: "kr-123", tag_id: "tag-1" },
        { annual_kr_id: "kr-123", tag_id: "tag-2" },
        { annual_kr_id: "other-kr", tag_id: "tag-3" },
      ]);

      const result = await annualKrsApi.getKrTagIds("kr-123");

      expect(result).toHaveLength(2);
      expect(result).toContain("tag-1");
      expect(result).toContain("tag-2");
    });

    it("should return empty array when no tags", async () => {
      getMock().setMockData("annual_kr_tags", []);

      const result = await annualKrsApi.getKrTagIds("kr-123");

      expect(result).toEqual([]);
    });
  });

  describe("setKrTags", () => {
    it("should delete existing tags and insert new ones", async () => {
      getMock().setMockData("annual_kr_tags", [
        { annual_kr_id: "kr-123", tag_id: "old-tag" },
      ]);

      await annualKrsApi.setKrTags("kr-123", ["new-tag-1", "new-tag-2"]);

      const calls = getMock().getMockCalls("annual_kr_tags");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should only delete when new tags array is empty", async () => {
      getMock().setMockData("annual_kr_tags", [
        { annual_kr_id: "kr-123", tag_id: "old-tag" },
      ]);

      await annualKrsApi.setKrTags("kr-123", []);

      const calls = getMock().getMockCalls("annual_kr_tags");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.filter((c) => c.method === "insert")).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getAnnualKrs fails on objectives", async () => {
      getMock().setMockError("objectives", new Error("Database error"));

      await expect(annualKrsApi.getAnnualKrs("plan-123")).rejects.toThrow();
    });

    it("should throw error when getAnnualKrsByObjective fails", async () => {
      getMock().setMockError("annual_krs", new Error("Database error"));

      await expect(annualKrsApi.getAnnualKrsByObjective("obj-123")).rejects.toThrow();
    });

    it("should throw error when getKrProgress fails", async () => {
      getMock().setMockError("v_kr_progress", new Error("Database error"));

      await expect(annualKrsApi.getKrProgress("plan-123")).rejects.toThrow();
    });

    it("should throw error when createAnnualKr fails", async () => {
      getMock().setMockError("annual_krs", new Error("Database error"));

      await expect(
        annualKrsApi.createAnnualKr({
          objective_id: "obj-123",
          name: "Test",
          kr_type: "metric",
          direction: "increase",
          start_value: 0,
          current_value: 0,
          target_value: 100,
          unit: "units",
          sort_order: 0,
        })
      ).rejects.toThrow();
    });

    it("should throw error when updateAnnualKr fails", async () => {
      getMock().setMockError("annual_krs", new Error("Database error"));

      await expect(
        annualKrsApi.updateAnnualKr("kr-123", { name: "Updated" })
      ).rejects.toThrow();
    });

    it("should throw error when deleteAnnualKr fails", async () => {
      getMock().setMockError("annual_krs", new Error("Database error"));

      await expect(annualKrsApi.deleteAnnualKr("kr-123")).rejects.toThrow();
    });

    it("should throw error when addTagToKr fails", async () => {
      getMock().setMockError("annual_kr_tags", new Error("Database error"));

      await expect(annualKrsApi.addTagToKr("kr-123", "tag-456")).rejects.toThrow();
    });

    it("should throw error when removeTagFromKr fails", async () => {
      getMock().setMockError("annual_kr_tags", new Error("Database error"));

      await expect(annualKrsApi.removeTagFromKr("kr-123", "tag-456")).rejects.toThrow();
    });
  });
});
