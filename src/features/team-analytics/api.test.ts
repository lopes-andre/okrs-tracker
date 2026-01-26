/**
 * Team Analytics API Unit Tests
 *
 * Tests for team analytics functions including workload stats and contributions.
 * Uses the mock Supabase client to verify RPC calls and data handling.
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
import * as teamAnalyticsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMemberWorkloadStats(overrides: Partial<{
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_overdue: number;
  check_ins_made: number;
  avg_completion_time_days: number | null;
  last_activity_at: string | null;
}> = {}) {
  return {
    user_id: overrides.user_id || `user-${Math.random().toString(36).slice(2)}`,
    email: overrides.email || "user@example.com",
    full_name: overrides.full_name || "Test User",
    avatar_url: overrides.avatar_url ?? null,
    role: overrides.role || "member",
    tasks_assigned: overrides.tasks_assigned ?? 10,
    tasks_completed: overrides.tasks_completed ?? 5,
    tasks_overdue: overrides.tasks_overdue ?? 1,
    check_ins_made: overrides.check_ins_made ?? 8,
    avg_completion_time_days: overrides.avg_completion_time_days ?? 3.5,
    last_activity_at: overrides.last_activity_at ?? new Date().toISOString(),
  };
}

function createMemberContribution(overrides: Partial<{
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  period_date: string;
  tasks_completed: number;
  check_ins_made: number;
}> = {}) {
  return {
    user_id: overrides.user_id || `user-${Math.random().toString(36).slice(2)}`,
    email: overrides.email || "user@example.com",
    full_name: overrides.full_name || "Test User",
    avatar_url: overrides.avatar_url ?? null,
    period_date: overrides.period_date || new Date().toISOString().slice(0, 10),
    tasks_completed: overrides.tasks_completed ?? 2,
    check_ins_made: overrides.check_ins_made ?? 3,
  };
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Team Analytics API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET MEMBER WORKLOAD STATS
  // ============================================================================

  describe("getMemberWorkloadStats", () => {
    it("should fetch workload stats for all plan members", async () => {
      const stats1 = createMemberWorkloadStats({ user_id: "user-1" });
      const stats2 = createMemberWorkloadStats({ user_id: "user-2" });
      getMock().setMockRpcResult("get_member_workload_stats", [stats1, stats2]);

      const result = await teamAnalyticsApi.getMemberWorkloadStats("plan-123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no members", async () => {
      getMock().setMockRpcResult("get_member_workload_stats", []);

      const result = await teamAnalyticsApi.getMemberWorkloadStats("plan-123");

      expect(result).toEqual([]);
    });

    it("should call RPC with plan_id parameter", async () => {
      getMock().setMockRpcResult("get_member_workload_stats", []);

      await teamAnalyticsApi.getMemberWorkloadStats("plan-123");

      const rpcMock = getMock().mockSupabase.rpc;
      expect(rpcMock).toHaveBeenCalledWith("get_member_workload_stats", { p_plan_id: "plan-123" });
    });

    it("should throw error when RPC fails", async () => {
      getMock().setMockRpcError("get_member_workload_stats", new Error("RPC error"));

      await expect(teamAnalyticsApi.getMemberWorkloadStats("plan-123")).rejects.toThrow();
    });
  });

  // ============================================================================
  // GET MEMBER CONTRIBUTIONS
  // ============================================================================

  describe("getMemberContributions", () => {
    it("should fetch contribution data for plan members", async () => {
      const contrib1 = createMemberContribution({ user_id: "user-1", period_date: "2024-01-01" });
      const contrib2 = createMemberContribution({ user_id: "user-1", period_date: "2024-01-02" });
      getMock().setMockRpcResult("get_member_contributions_by_period", [contrib1, contrib2]);

      const result = await teamAnalyticsApi.getMemberContributions("plan-123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no contributions", async () => {
      getMock().setMockRpcResult("get_member_contributions_by_period", []);

      const result = await teamAnalyticsApi.getMemberContributions("plan-123");

      expect(result).toEqual([]);
    });

    it("should call RPC with plan_id and null dates when not provided", async () => {
      getMock().setMockRpcResult("get_member_contributions_by_period", []);

      await teamAnalyticsApi.getMemberContributions("plan-123");

      const rpcMock = getMock().mockSupabase.rpc;
      expect(rpcMock).toHaveBeenCalledWith("get_member_contributions_by_period", {
        p_plan_id: "plan-123",
        p_date_from: null,
        p_date_to: null,
      });
    });

    it("should call RPC with date range when provided", async () => {
      getMock().setMockRpcResult("get_member_contributions_by_period", []);

      await teamAnalyticsApi.getMemberContributions("plan-123", "2024-01-01", "2024-01-31");

      const rpcMock = getMock().mockSupabase.rpc;
      expect(rpcMock).toHaveBeenCalledWith("get_member_contributions_by_period", {
        p_plan_id: "plan-123",
        p_date_from: "2024-01-01",
        p_date_to: "2024-01-31",
      });
    });

    it("should throw error when RPC fails", async () => {
      getMock().setMockRpcError("get_member_contributions_by_period", new Error("RPC error"));

      await expect(teamAnalyticsApi.getMemberContributions("plan-123")).rejects.toThrow();
    });
  });

  // ============================================================================
  // COMPUTE TEAM SUMMARY
  // ============================================================================

  describe("computeTeamSummary", () => {
    it("should return default values for empty workload stats", () => {
      const result = teamAnalyticsApi.computeTeamSummary([]);

      expect(result).toEqual({
        total_members: 0,
        active_members: 0,
        total_tasks_assigned: 0,
        avg_tasks_per_member: 0,
        workload_balance_score: 100,
        overloaded_members: 0,
        underutilized_members: 0,
        total_check_ins: 0,
      });
    });

    it("should calculate total members correctly", () => {
      const stats = [
        createMemberWorkloadStats({ user_id: "user-1" }),
        createMemberWorkloadStats({ user_id: "user-2" }),
        createMemberWorkloadStats({ user_id: "user-3" }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.total_members).toBe(3);
    });

    it("should calculate total tasks assigned", () => {
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 5 }),
        createMemberWorkloadStats({ tasks_assigned: 10 }),
        createMemberWorkloadStats({ tasks_assigned: 15 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.total_tasks_assigned).toBe(30);
    });

    it("should calculate average tasks per member", () => {
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 6 }),
        createMemberWorkloadStats({ tasks_assigned: 9 }),
        createMemberWorkloadStats({ tasks_assigned: 15 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.avg_tasks_per_member).toBe(10);
    });

    it("should calculate total check-ins", () => {
      const stats = [
        createMemberWorkloadStats({ check_ins_made: 5 }),
        createMemberWorkloadStats({ check_ins_made: 8 }),
        createMemberWorkloadStats({ check_ins_made: 12 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.total_check_ins).toBe(25);
    });

    it("should count active members from last 30 days", () => {
      const now = new Date();
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(now.getDate() - 20);
      const fiftyDaysAgo = new Date(now);
      fiftyDaysAgo.setDate(now.getDate() - 50);

      // Create stats directly to have full control over last_activity_at
      const stats = [
        { ...createMemberWorkloadStats({}), last_activity_at: now.toISOString() },
        { ...createMemberWorkloadStats({}), last_activity_at: twentyDaysAgo.toISOString() },
        { ...createMemberWorkloadStats({}), last_activity_at: fiftyDaysAgo.toISOString() },
        { ...createMemberWorkloadStats({}), last_activity_at: null },
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.active_members).toBe(2);
    });

    it("should calculate workload balance score with perfectly balanced workloads", () => {
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 10 }),
        createMemberWorkloadStats({ tasks_assigned: 10 }),
        createMemberWorkloadStats({ tasks_assigned: 10 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.workload_balance_score).toBe(100);
    });

    it("should calculate workload balance score with imbalanced workloads", () => {
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 5 }),
        createMemberWorkloadStats({ tasks_assigned: 25 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      // With unequal distribution, score should be less than 100
      expect(result.workload_balance_score).toBeLessThan(100);
    });

    it("should identify overloaded members (>150% of average)", () => {
      // Average will be 10 tasks, 150% threshold is 15
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 5 }),
        createMemberWorkloadStats({ tasks_assigned: 10 }),
        createMemberWorkloadStats({ tasks_assigned: 25 }), // Overloaded (>15)
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.overloaded_members).toBe(1);
    });

    it("should identify underutilized members (<50% of average and >0)", () => {
      // Average will be 12 tasks, 50% threshold is 6
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 2 }), // Underutilized (<6 and >0)
        createMemberWorkloadStats({ tasks_assigned: 12 }),
        createMemberWorkloadStats({ tasks_assigned: 22 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.underutilized_members).toBe(1);
    });

    it("should not count zero-task members as underutilized", () => {
      // Members with 0 tasks are not underutilized, they're inactive
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 0 }), // Not underutilized
        createMemberWorkloadStats({ tasks_assigned: 10 }),
        createMemberWorkloadStats({ tasks_assigned: 20 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.underutilized_members).toBe(0);
    });

    it("should handle single member correctly", () => {
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 10, check_ins_made: 5 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.total_members).toBe(1);
      expect(result.total_tasks_assigned).toBe(10);
      expect(result.avg_tasks_per_member).toBe(10);
      expect(result.total_check_ins).toBe(5);
      // With single member, balance score should be 100 (no imbalance possible)
      expect(result.workload_balance_score).toBe(100);
    });

    it("should handle all members with zero tasks", () => {
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 0 }),
        createMemberWorkloadStats({ tasks_assigned: 0 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      expect(result.total_tasks_assigned).toBe(0);
      expect(result.avg_tasks_per_member).toBe(0);
      expect(result.workload_balance_score).toBe(100);
      expect(result.overloaded_members).toBe(0);
      expect(result.underutilized_members).toBe(0);
    });

    it("should round average tasks per member to 1 decimal", () => {
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 7 }),
        createMemberWorkloadStats({ tasks_assigned: 8 }),
        createMemberWorkloadStats({ tasks_assigned: 9 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      // (7+8+9)/3 = 8.0
      expect(result.avg_tasks_per_member).toBe(8);
    });

    it("should round average tasks per member for non-whole numbers", () => {
      const stats = [
        createMemberWorkloadStats({ tasks_assigned: 7 }),
        createMemberWorkloadStats({ tasks_assigned: 8 }),
      ];

      const result = teamAnalyticsApi.computeTeamSummary(stats);

      // (7+8)/2 = 7.5
      expect(result.avg_tasks_per_member).toBe(7.5);
    });
  });
});
