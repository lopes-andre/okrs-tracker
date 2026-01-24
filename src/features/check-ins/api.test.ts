/**
 * Check-ins API Unit Tests
 *
 * Tests for check-in CRUD operations and queries.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";
import { createCheckIn as createCheckInFactory, createAnnualKr } from "@/test/factories";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

// Import API functions after mocking
import * as checkInsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Check-ins API", () => {
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

  // ============================================================================
  // GET CHECK-INS BY KR
  // ============================================================================

  describe("getCheckInsByKr", () => {
    it("should fetch check-ins for a KR", async () => {
      // Use explicit recorded_at timestamps to ensure deterministic order
      // API orders by recorded_at descending, so newer (checkIn2) comes first
      const checkIn1 = createCheckInFactory({
        id: "ci-1",
        annual_kr_id: "kr-123",
        value: 50,
        recorded_at: "2026-01-20T10:00:00Z",
      });
      const checkIn2 = createCheckInFactory({
        id: "ci-2",
        annual_kr_id: "kr-123",
        value: 75,
        recorded_at: "2026-01-21T10:00:00Z",
      });
      getMock().setMockData("check_ins", [checkIn1, checkIn2]);

      const result = await checkInsApi.getCheckInsByKr("kr-123");

      expect(result).toHaveLength(2);
      // Order is descending by recorded_at, so checkIn2 (newer) comes first
      expect(result[0].value).toBe(75);
      expect(result[1].value).toBe(50);
    });

    it("should return empty array when no check-ins", async () => {
      getMock().setMockData("check_ins", []);

      const result = await checkInsApi.getCheckInsByKr("kr-123");

      expect(result).toEqual([]);
    });

    it("should filter by annual_kr_id", async () => {
      getMock().setMockData("check_ins", []);

      await checkInsApi.getCheckInsByKr("kr-123");

      const calls = getMock().getMockCalls("check_ins");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "annual_kr_id")).toBe(true);
    });

    it("should order by recorded_at descending", async () => {
      getMock().setMockData("check_ins", []);

      await checkInsApi.getCheckInsByKr("kr-123");

      const calls = getMock().getMockCalls("check_ins");
      expect(calls.some((c) =>
        c.method === "order" &&
        c.args[0] === "recorded_at" &&
        c.args[1]?.ascending === false
      )).toBe(true);
    });
  });

  // ============================================================================
  // GET CHECK-INS BY DAY
  // ============================================================================

  describe("getCheckInsByDay", () => {
    it("should fetch aggregated check-ins from view", async () => {
      const dayData = [
        { date: "2026-01-20", check_in_count: 5, total_value_change: 25, plan_id: "plan-123" },
        { date: "2026-01-19", check_in_count: 3, total_value_change: 15, plan_id: "plan-123" },
      ];
      getMock().setMockData("v_plan_checkins_by_day", dayData);

      const result = await checkInsApi.getCheckInsByDay("plan-123");

      expect(result).toHaveLength(2);
      expect(result[0].check_in_count).toBe(5);
      expect(result[1].total_value_change).toBe(15);
    });

    it("should filter by plan_id", async () => {
      getMock().setMockData("v_plan_checkins_by_day", []);

      await checkInsApi.getCheckInsByDay("plan-123");

      const calls = getMock().getMockCalls("v_plan_checkins_by_day");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE CHECK-IN
  // ============================================================================

  describe("createCheckIn", () => {
    it("should create check-in with authenticated user", async () => {
      const newCheckIn = createCheckInFactory({
        id: "new-ci-id",
        annual_kr_id: "kr-123",
        value: 100,
        recorded_by: "test-user-id",
      });
      getMock().setMockData("check_ins", [newCheckIn]);

      const result = await checkInsApi.createCheckIn({
        annual_kr_id: "kr-123",
        value: 100,
        recorded_by: "test-user-id",
        recorded_at: new Date().toISOString(),
      });

      expect(result.value).toBe(100);
      expect(result.annual_kr_id).toBe("kr-123");

      const calls = getMock().getMockCalls("check_ins");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should create check-in with note and evidence", async () => {
      const newCheckIn = createCheckInFactory({
        id: "new-ci-id",
        annual_kr_id: "kr-123",
        value: 100,
        note: "Great progress this week",
        evidence_url: "https://example.com/evidence.png",
        recorded_by: "test-user-id",
      });
      getMock().setMockData("check_ins", [newCheckIn]);

      const result = await checkInsApi.createCheckIn({
        annual_kr_id: "kr-123",
        value: 100,
        note: "Great progress this week",
        evidence_url: "https://example.com/evidence.png",
        recorded_by: "test-user-id",
        recorded_at: new Date().toISOString(),
      });

      expect(result.note).toBe("Great progress this week");
      expect(result.evidence_url).toBe("https://example.com/evidence.png");
    });

    it("should throw when not authenticated", async () => {
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        checkInsApi.createCheckIn({
          annual_kr_id: "kr-123",
          value: 100,
          recorded_by: "",
          recorded_at: new Date().toISOString(),
        })
      ).rejects.toThrow("Not authenticated");
    });
  });

  // ============================================================================
  // QUICK CHECK-IN
  // ============================================================================

  describe("quickCheckIn", () => {
    it("should create simple check-in with value only", async () => {
      const newCheckIn = createCheckInFactory({
        id: "quick-ci-id",
        annual_kr_id: "kr-123",
        value: 50,
        recorded_by: "test-user-id",
      });
      getMock().setMockData("check_ins", [newCheckIn]);

      const result = await checkInsApi.quickCheckIn("kr-123", 50);

      expect(result.value).toBe(50);
      expect(result.annual_kr_id).toBe("kr-123");
    });

    it("should create check-in with note", async () => {
      const newCheckIn = createCheckInFactory({
        id: "quick-ci-id",
        annual_kr_id: "kr-123",
        value: 75,
        note: "Making good progress",
        recorded_by: "test-user-id",
      });
      getMock().setMockData("check_ins", [newCheckIn]);

      const result = await checkInsApi.quickCheckIn("kr-123", 75, "Making good progress");

      expect(result.note).toBe("Making good progress");
    });

    it("should create check-in with evidence URL", async () => {
      const newCheckIn = createCheckInFactory({
        id: "quick-ci-id",
        annual_kr_id: "kr-123",
        value: 75,
        evidence_url: "https://example.com/proof.pdf",
        recorded_by: "test-user-id",
      });
      getMock().setMockData("check_ins", [newCheckIn]);

      const result = await checkInsApi.quickCheckIn(
        "kr-123",
        75,
        undefined,
        "https://example.com/proof.pdf"
      );

      expect(result.evidence_url).toBe("https://example.com/proof.pdf");
    });

    it("should create check-in with quarter target", async () => {
      const newCheckIn = createCheckInFactory({
        id: "quick-ci-id",
        annual_kr_id: "kr-123",
        value: 25,
        quarter_target_id: "qt-q1",
        recorded_by: "test-user-id",
      });
      getMock().setMockData("check_ins", [newCheckIn]);

      const result = await checkInsApi.quickCheckIn(
        "kr-123",
        25,
        undefined,
        undefined,
        "qt-q1"
      );

      expect(result.quarter_target_id).toBe("qt-q1");
    });
  });

  // ============================================================================
  // UPDATE CHECK-IN
  // ============================================================================

  describe("updateCheckIn", () => {
    it("should update check-in note", async () => {
      const updatedCheckIn = createCheckInFactory({
        id: "ci-123",
        note: "Updated note with more details",
      });
      getMock().setMockData("check_ins", [updatedCheckIn]);

      const result = await checkInsApi.updateCheckIn("ci-123", {
        note: "Updated note with more details",
      });

      expect(result.note).toBe("Updated note with more details");

      const calls = getMock().getMockCalls("check_ins");
      expect(calls.some((c) => c.method === "update")).toBe(true);
    });

    it("should update evidence URL", async () => {
      const updatedCheckIn = createCheckInFactory({
        id: "ci-123",
        evidence_url: "https://example.com/new-evidence.pdf",
      });
      getMock().setMockData("check_ins", [updatedCheckIn]);

      const result = await checkInsApi.updateCheckIn("ci-123", {
        evidence_url: "https://example.com/new-evidence.pdf",
      });

      expect(result.evidence_url).toBe("https://example.com/new-evidence.pdf");
    });
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe("Check-ins API - Integration Scenarios", () => {
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

  describe("check-in progress workflow", () => {
    it("should verify check-in creation flow", async () => {
      // Test that creating a check-in works with proper values
      const checkIn = createCheckInFactory({
        id: "ci-1",
        annual_kr_id: "kr-123",
        value: 25,
        recorded_by: "test-user-id",
      });
      getMock().setMockData("check_ins", [checkIn]);

      const created = await checkInsApi.quickCheckIn("kr-123", 25);
      expect(created.value).toBe(25);

      // Verify the insert was called
      const calls = getMock().getMockCalls("check_ins");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should fetch multiple check-ins for a KR", async () => {
      // Test fetching multiple check-ins
      const checkIn1 = createCheckInFactory({ id: "ci-1", annual_kr_id: "kr-123", value: 25 });
      const checkIn2 = createCheckInFactory({ id: "ci-2", annual_kr_id: "kr-123", value: 50 });
      const checkIn3 = createCheckInFactory({ id: "ci-3", annual_kr_id: "kr-123", value: 75 });
      getMock().setMockData("check_ins", [checkIn1, checkIn2, checkIn3]);

      const allCheckIns = await checkInsApi.getCheckInsByKr("kr-123");
      expect(allCheckIns).toHaveLength(3);
      expect(allCheckIns.map(c => c.value)).toContain(25);
      expect(allCheckIns.map(c => c.value)).toContain(50);
      expect(allCheckIns.map(c => c.value)).toContain(75);
    });
  });

  describe("check-in with metadata workflow", () => {
    it("should create and update check-in with full metadata", async () => {
      // Create check-in
      const newCheckIn = createCheckInFactory({
        id: "ci-metadata",
        annual_kr_id: "kr-123",
        value: 75,
        note: "Initial note",
        evidence_url: null,
        recorded_by: "test-user-id",
      });
      getMock().setMockData("check_ins", [newCheckIn]);

      const created = await checkInsApi.quickCheckIn("kr-123", 75, "Initial note");
      expect(created.note).toBe("Initial note");

      // Update with evidence
      const updatedCheckIn = { ...newCheckIn, evidence_url: "https://example.com/evidence.pdf" };
      getMock().setMockData("check_ins", [updatedCheckIn]);

      const updated = await checkInsApi.updateCheckIn("ci-metadata", {
        evidence_url: "https://example.com/evidence.pdf",
      });
      expect(updated.evidence_url).toBe("https://example.com/evidence.pdf");
    });
  });
});
