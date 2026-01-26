/**
 * Weekly Reviews API Unit Tests
 *
 * Tests for weekly review CRUD operations, settings, and analytics.
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
import * as weeklyReviewsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST HELPERS
// ============================================================================

function createWeeklyReview(overrides: Partial<{
  id: string;
  plan_id: string;
  year: number;
  week_number: number;
  week_start: string;
  week_end: string;
  status: "open" | "complete" | "late" | "pending";
  started_at: string | null;
  completed_at: string | null;
  reflection_what_went_well: string | null;
  reflection_what_to_improve: string | null;
  week_rating: number | null;
  created_at: string;
}> = {}) {
  return {
    id: overrides.id || `review-${Math.random().toString(36).slice(2)}`,
    plan_id: overrides.plan_id || "plan-123",
    year: overrides.year || 2025,
    week_number: overrides.week_number || 1,
    week_start: overrides.week_start || "2025-01-06",
    week_end: overrides.week_end || "2025-01-12",
    status: overrides.status || "open",
    started_at: overrides.started_at || null,
    completed_at: overrides.completed_at || null,
    reflection_what_went_well: overrides.reflection_what_went_well || null,
    reflection_what_to_improve: overrides.reflection_what_to_improve || null,
    week_rating: overrides.week_rating || null,
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

function createWeeklyReviewSettings(overrides: Partial<{
  id: string;
  plan_id: string;
  reminder_enabled: boolean;
  reminder_day: number;
  reminder_time: string;
  auto_create_reviews: boolean;
}> = {}) {
  return {
    id: overrides.id || `settings-${Math.random().toString(36).slice(2)}`,
    plan_id: overrides.plan_id || "plan-123",
    reminder_enabled: overrides.reminder_enabled ?? true,
    reminder_day: overrides.reminder_day || 5,
    reminder_time: overrides.reminder_time || "17:00",
    auto_create_reviews: overrides.auto_create_reviews ?? true,
  };
}

function createKrUpdate(overrides: Partial<{
  id: string;
  weekly_review_id: string;
  annual_kr_id: string;
  previous_value: number;
  new_value: number;
  notes: string | null;
}> = {}) {
  return {
    id: overrides.id || `update-${Math.random().toString(36).slice(2)}`,
    weekly_review_id: overrides.weekly_review_id || "review-123",
    annual_kr_id: overrides.annual_kr_id || "kr-123",
    previous_value: overrides.previous_value || 0,
    new_value: overrides.new_value || 10,
    notes: overrides.notes || null,
  };
}

function createTaskSnapshot(overrides: Partial<{
  id: string;
  weekly_review_id: string;
  task_id: string;
  status_at_review: string;
  completed_this_week: boolean;
}> = {}) {
  return {
    id: overrides.id || `snapshot-${Math.random().toString(36).slice(2)}`,
    weekly_review_id: overrides.weekly_review_id || "review-123",
    task_id: overrides.task_id || "task-123",
    status_at_review: overrides.status_at_review || "completed",
    completed_this_week: overrides.completed_this_week ?? true,
  };
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Weekly Reviews API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET WEEKLY REVIEWS
  // ============================================================================

  describe("getWeeklyReviews", () => {
    it("should fetch all reviews for a plan", async () => {
      const review1 = createWeeklyReview({ id: "r-1", plan_id: "plan-123", week_number: 1 });
      const review2 = createWeeklyReview({ id: "r-2", plan_id: "plan-123", week_number: 2 });
      getMock().setMockData("weekly_reviews", [review1, review2]);

      const result = await weeklyReviewsApi.getWeeklyReviews("plan-123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no reviews exist", async () => {
      getMock().setMockData("weekly_reviews", []);

      const result = await weeklyReviewsApi.getWeeklyReviews("plan-123");

      expect(result).toEqual([]);
    });

    it("should order by year and week_number descending", async () => {
      getMock().setMockData("weekly_reviews", []);

      await weeklyReviewsApi.getWeeklyReviews("plan-123");

      const calls = getMock().getMockCalls("weekly_reviews");
      expect(calls.filter((c) => c.method === "order")).toHaveLength(2);
      expect(calls.some((c) => c.method === "order" && c.args[0] === "year")).toBe(true);
      expect(calls.some((c) => c.method === "order" && c.args[0] === "week_number")).toBe(true);
    });
  });

  // ============================================================================
  // GET WEEKLY REVIEW SUMMARIES
  // ============================================================================

  describe("getWeeklyReviewSummaries", () => {
    it("should fetch summaries from view", async () => {
      const summaries = [
        { id: "r-1", plan_id: "plan-123", week_number: 1, total_krs_updated: 5 },
        { id: "r-2", plan_id: "plan-123", week_number: 2, total_krs_updated: 3 },
      ];
      getMock().setMockData("v_weekly_review_summary", summaries);

      const result = await weeklyReviewsApi.getWeeklyReviewSummaries("plan-123");

      expect(result).toHaveLength(2);
    });

    it("should filter by plan_id", async () => {
      getMock().setMockData("v_weekly_review_summary", []);

      await weeklyReviewsApi.getWeeklyReviewSummaries("plan-123");

      const calls = getMock().getMockCalls("v_weekly_review_summary");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
    });
  });

  // ============================================================================
  // GET SINGLE WEEKLY REVIEW
  // ============================================================================

  describe("getWeeklyReview", () => {
    it("should fetch a single review by ID", async () => {
      const review = createWeeklyReview({ id: "review-123" });
      getMock().setMockData("weekly_reviews", [review]);

      const result = await weeklyReviewsApi.getWeeklyReview("review-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("review-123");
    });

    it("should return null when review not found", async () => {
      getMock().setMockData("weekly_reviews", []);

      const result = await weeklyReviewsApi.getWeeklyReview("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // GET WEEKLY REVIEW BY WEEK
  // ============================================================================

  describe("getWeeklyReviewByWeek", () => {
    it("should fetch review for specific week", async () => {
      const review = createWeeklyReview({
        id: "r-1",
        plan_id: "plan-123",
        year: 2025,
        week_number: 5
      });
      getMock().setMockData("weekly_reviews", [review]);

      const result = await weeklyReviewsApi.getWeeklyReviewByWeek("plan-123", 2025, 5);

      expect(result).not.toBeNull();
      expect(result!.week_number).toBe(5);
    });

    it("should return null when week not found", async () => {
      getMock().setMockData("weekly_reviews", []);

      const result = await weeklyReviewsApi.getWeeklyReviewByWeek("plan-123", 2025, 99);

      expect(result).toBeNull();
    });

    it("should filter by plan_id, year, and week_number", async () => {
      getMock().setMockData("weekly_reviews", []);

      await weeklyReviewsApi.getWeeklyReviewByWeek("plan-123", 2025, 10);

      const calls = getMock().getMockCalls("weekly_reviews");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "year")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "week_number")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE WEEKLY REVIEW
  // ============================================================================

  describe("createWeeklyReview", () => {
    it("should create a review", async () => {
      const newReview = {
        plan_id: "plan-123",
        year: 2025,
        week_number: 5,
        week_start: "2025-01-27",
        week_end: "2025-02-02",
        status: "open" as const,
      };
      getMock().setMockData("weekly_reviews", []);

      const result = await weeklyReviewsApi.createWeeklyReview(newReview);

      expect(result.plan_id).toBe("plan-123");
      expect(result.week_number).toBe(5);
    });

    it("should make insert and select calls", async () => {
      const newReview = {
        plan_id: "plan-123",
        year: 2025,
        week_number: 5,
        week_start: "2025-01-27",
        week_end: "2025-02-02",
        status: "open" as const,
      };
      getMock().setMockData("weekly_reviews", []);

      await weeklyReviewsApi.createWeeklyReview(newReview);

      const calls = getMock().getMockCalls("weekly_reviews");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE WEEKLY REVIEW
  // ============================================================================

  describe("updateWeeklyReview", () => {
    it("should update a review", async () => {
      const existingReview = createWeeklyReview({ id: "review-123" });
      getMock().setMockData("weekly_reviews", [existingReview]);

      const result = await weeklyReviewsApi.updateWeeklyReview("review-123", {
        reflection_what_went_well: "Great progress!",
      });

      expect(result.reflection_what_went_well).toBe("Great progress!");
    });

    it("should make update, eq, select, and single calls", async () => {
      const existingReview = createWeeklyReview({ id: "review-123" });
      getMock().setMockData("weekly_reviews", [existingReview]);

      await weeklyReviewsApi.updateWeeklyReview("review-123", { week_rating: 4 });

      const calls = getMock().getMockCalls("weekly_reviews");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // START WEEKLY REVIEW
  // ============================================================================

  describe("startWeeklyReview", () => {
    it("should set started_at timestamp", async () => {
      const existingReview = createWeeklyReview({ id: "review-123", started_at: null });
      getMock().setMockData("weekly_reviews", [existingReview]);

      const result = await weeklyReviewsApi.startWeeklyReview("review-123");

      expect(result.started_at).not.toBeNull();
    });
  });

  // ============================================================================
  // DELETE WEEKLY REVIEW
  // ============================================================================

  describe("deleteWeeklyReview", () => {
    it("should delete a review", async () => {
      const existingReview = createWeeklyReview({ id: "review-123" });
      getMock().setMockData("weekly_reviews", [existingReview]);

      await weeklyReviewsApi.deleteWeeklyReview("review-123");

      const calls = getMock().getMockCalls("weekly_reviews");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // SETTINGS
  // ============================================================================

  describe("getWeeklyReviewSettings", () => {
    it("should fetch settings for a plan", async () => {
      const settings = createWeeklyReviewSettings({ plan_id: "plan-123" });
      getMock().setMockData("weekly_review_settings", [settings]);

      const result = await weeklyReviewsApi.getWeeklyReviewSettings("plan-123");

      expect(result).not.toBeNull();
      expect(result!.plan_id).toBe("plan-123");
    });

    it("should return null when no settings exist", async () => {
      getMock().setMockData("weekly_review_settings", []);

      const result = await weeklyReviewsApi.getWeeklyReviewSettings("plan-123");

      expect(result).toBeNull();
    });
  });

  describe("getOrCreateWeeklyReviewSettings", () => {
    it("should return existing settings", async () => {
      const settings = createWeeklyReviewSettings({
        plan_id: "plan-123",
        reminder_day: 4
      });
      getMock().setMockData("weekly_review_settings", [settings]);

      const result = await weeklyReviewsApi.getOrCreateWeeklyReviewSettings("plan-123");

      expect(result.reminder_day).toBe(4);
    });

    it("should create default settings when none exist", async () => {
      getMock().setMockData("weekly_review_settings", []);

      const result = await weeklyReviewsApi.getOrCreateWeeklyReviewSettings("plan-123");

      expect(result.plan_id).toBe("plan-123");
      expect(result.reminder_enabled).toBe(true);
      expect(result.reminder_day).toBe(5); // Friday
    });
  });

  describe("updateWeeklyReviewSettings", () => {
    it("should update settings", async () => {
      const settings = createWeeklyReviewSettings({ plan_id: "plan-123" });
      getMock().setMockData("weekly_review_settings", [settings]);

      const result = await weeklyReviewsApi.updateWeeklyReviewSettings("plan-123", {
        reminder_enabled: false,
      });

      expect(result.reminder_enabled).toBe(false);
    });
  });

  // ============================================================================
  // KR UPDATES
  // ============================================================================

  describe("getWeeklyReviewKrUpdates", () => {
    it("should fetch KR updates for a review", async () => {
      const update1 = createKrUpdate({ id: "u-1", weekly_review_id: "review-123" });
      const update2 = createKrUpdate({ id: "u-2", weekly_review_id: "review-123" });
      getMock().setMockData("weekly_review_kr_updates", [update1, update2]);

      const result = await weeklyReviewsApi.getWeeklyReviewKrUpdates("review-123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no updates", async () => {
      getMock().setMockData("weekly_review_kr_updates", []);

      const result = await weeklyReviewsApi.getWeeklyReviewKrUpdates("review-123");

      expect(result).toEqual([]);
    });
  });

  describe("createWeeklyReviewKrUpdate", () => {
    it("should create a KR update", async () => {
      const newUpdate = {
        weekly_review_id: "review-123",
        annual_kr_id: "kr-456",
        previous_value: 10,
        new_value: 25,
      };
      getMock().setMockData("weekly_review_kr_updates", []);

      const result = await weeklyReviewsApi.createWeeklyReviewKrUpdate(newUpdate);

      expect(result.annual_kr_id).toBe("kr-456");
      expect(result.new_value).toBe(25);
    });

    it("should make upsert call", async () => {
      const newUpdate = {
        weekly_review_id: "review-123",
        annual_kr_id: "kr-456",
        previous_value: 10,
        new_value: 25,
      };
      getMock().setMockData("weekly_review_kr_updates", []);

      await weeklyReviewsApi.createWeeklyReviewKrUpdate(newUpdate);

      const calls = getMock().getMockCalls("weekly_review_kr_updates");
      expect(calls.some((c) => c.method === "upsert")).toBe(true);
    });
  });

  // ============================================================================
  // TASK SNAPSHOTS
  // ============================================================================

  describe("getWeeklyReviewTasks", () => {
    it("should fetch task snapshots for a review", async () => {
      const snapshot1 = createTaskSnapshot({ id: "s-1", weekly_review_id: "review-123" });
      const snapshot2 = createTaskSnapshot({ id: "s-2", weekly_review_id: "review-123" });
      getMock().setMockData("weekly_review_tasks", [snapshot1, snapshot2]);

      const result = await weeklyReviewsApi.getWeeklyReviewTasks("review-123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no snapshots", async () => {
      getMock().setMockData("weekly_review_tasks", []);

      const result = await weeklyReviewsApi.getWeeklyReviewTasks("review-123");

      expect(result).toEqual([]);
    });
  });

  describe("createWeeklyReviewTaskSnapshot", () => {
    it("should create a task snapshot", async () => {
      const snapshot = {
        weekly_review_id: "review-123",
        task_id: "task-456",
        status_at_review: "completed",
        completed_this_week: true,
      };
      getMock().setMockData("weekly_review_tasks", []);

      const result = await weeklyReviewsApi.createWeeklyReviewTaskSnapshot(snapshot);

      expect(result.task_id).toBe("task-456");
      expect(result.completed_this_week).toBe(true);
    });
  });

  describe("createWeeklyReviewTaskSnapshots", () => {
    it("should create multiple snapshots", async () => {
      const snapshots = [
        { weekly_review_id: "review-123", task_id: "task-1", status_at_review: "completed", completed_this_week: true },
        { weekly_review_id: "review-123", task_id: "task-2", status_at_review: "pending", completed_this_week: false },
      ];
      getMock().setMockData("weekly_review_tasks", []);

      const result = await weeklyReviewsApi.createWeeklyReviewTaskSnapshots(snapshots);

      expect(result).toHaveLength(2);
    });

    it("should return empty array when input is empty", async () => {
      const result = await weeklyReviewsApi.createWeeklyReviewTaskSnapshots([]);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // STATS & ANALYTICS
  // ============================================================================

  describe("getPlanReviewStats", () => {
    it("should fetch stats from view", async () => {
      const stats = {
        plan_id: "plan-123",
        total_reviews: 10,
        completed_reviews: 8,
        avg_rating: 4.2,
      };
      getMock().setMockData("v_plan_review_stats", [stats]);

      const result = await weeklyReviewsApi.getPlanReviewStats("plan-123");

      expect(result).not.toBeNull();
      expect(result!.total_reviews).toBe(10);
    });

    it("should return null when no stats", async () => {
      getMock().setMockData("v_plan_review_stats", []);

      const result = await weeklyReviewsApi.getPlanReviewStats("plan-123");

      expect(result).toBeNull();
    });
  });

  describe("getPendingReviews", () => {
    it("should fetch pending reviews", async () => {
      const openReview = createWeeklyReview({ id: "r-1", status: "open", plan_id: "plan-123" });
      const pendingReview = createWeeklyReview({ id: "r-2", status: "pending", plan_id: "plan-123" });
      const completeReview = createWeeklyReview({ id: "r-3", status: "complete", plan_id: "plan-123" });
      getMock().setMockData("weekly_reviews", [openReview, pendingReview, completeReview]);

      const result = await weeklyReviewsApi.getPendingReviews("plan-123");

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.status === "open" || r.status === "pending")).toBe(true);
    });

    it("should use IN filter for status", async () => {
      getMock().setMockData("weekly_reviews", []);

      await weeklyReviewsApi.getPendingReviews("plan-123");

      const calls = getMock().getMockCalls("weekly_reviews");
      expect(calls.some((c) => c.method === "in" && c.args[0] === "status")).toBe(true);
    });

    it("should order by year and week ascending", async () => {
      getMock().setMockData("weekly_reviews", []);

      await weeklyReviewsApi.getPendingReviews("plan-123");

      const calls = getMock().getMockCalls("weekly_reviews");
      const orderCalls = calls.filter((c) => c.method === "order");
      expect(orderCalls.length).toBe(2);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getWeeklyReviews fails", async () => {
      getMock().setMockError("weekly_reviews", new Error("Database error"));

      await expect(weeklyReviewsApi.getWeeklyReviews("plan-123")).rejects.toThrow();
    });

    it("should throw error when getWeeklyReviewSummaries fails", async () => {
      getMock().setMockError("v_weekly_review_summary", new Error("Database error"));

      await expect(weeklyReviewsApi.getWeeklyReviewSummaries("plan-123")).rejects.toThrow();
    });

    it("should throw error when createWeeklyReview fails", async () => {
      getMock().setMockError("weekly_reviews", new Error("Database error"));

      await expect(
        weeklyReviewsApi.createWeeklyReview({
          plan_id: "plan-123",
          year: 2025,
          week_number: 1,
          week_start: "2025-01-06",
          week_end: "2025-01-12",
          status: "open",
        })
      ).rejects.toThrow();
    });

    it("should throw error when updateWeeklyReview fails", async () => {
      getMock().setMockError("weekly_reviews", new Error("Database error"));

      await expect(
        weeklyReviewsApi.updateWeeklyReview("review-123", { week_rating: 5 })
      ).rejects.toThrow();
    });

    it("should throw error when deleteWeeklyReview fails", async () => {
      getMock().setMockError("weekly_reviews", new Error("Database error"));

      await expect(weeklyReviewsApi.deleteWeeklyReview("review-123")).rejects.toThrow();
    });

    it("should throw error when getWeeklyReviewKrUpdates fails", async () => {
      getMock().setMockError("weekly_review_kr_updates", new Error("Database error"));

      await expect(weeklyReviewsApi.getWeeklyReviewKrUpdates("review-123")).rejects.toThrow();
    });

    it("should throw error when getWeeklyReviewTasks fails", async () => {
      getMock().setMockError("weekly_review_tasks", new Error("Database error"));

      await expect(weeklyReviewsApi.getWeeklyReviewTasks("review-123")).rejects.toThrow();
    });
  });
});
