/**
 * Plans API Unit Tests
 *
 * Tests for plan management, membership, and invite operations.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";
import {
  createPlan,
  createProfile,
  createPlanMember,
  createPlanInvite,
} from "@/test/factories";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockSupabaseRef } = vi.hoisted(() => {
  return {
    mockSupabaseRef: { current: null as ReturnType<typeof createMockSupabase> | null },
  };
});

// Mock the Supabase client - uses getter to access the mock at call time
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockSupabaseRef.current?.mockSupabase,
}));

// Import API functions after mocking
import * as plansApi from "./api";

// Helper to get current mock
const getMock = () => mockSupabaseRef.current!;

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Plans API", () => {
  beforeEach(() => {
    // Create fresh mock for each test
    mockSupabaseRef.current = createMockSupabase();

    // Reset auth mock to default authenticated user
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
  // GET PLANS
  // ============================================================================

  describe("getPlans", () => {
    it("should fetch plans with membership roles", async () => {
      const plan1 = createPlan({ id: "plan-1", name: "Plan A" });
      const plan2 = createPlan({ id: "plan-2", name: "Plan B" });

      getMock().setMockData("plans", [
        { ...plan1, plan_members: [{ role: "owner" }] },
        { ...plan2, plan_members: [{ role: "editor" }] },
      ]);

      const result = await plansApi.getPlans();

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("owner");
      expect(result[1].role).toBe("editor");
    });

    it("should return empty array when no plans", async () => {
      getMock().setMockData("plans", []);

      const result = await plansApi.getPlans();

      expect(result).toEqual([]);
    });

    it("should make correct query calls", async () => {
      getMock().setMockData("plans", []);

      await plansApi.getPlans();

      const calls = getMock().getMockCalls("plans");
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "order")).toBe(true);
    });
  });

  // ============================================================================
  // GET PLAN
  // ============================================================================

  describe("getPlan", () => {
    it("should return plan when found", async () => {
      const plan = createPlan({ id: "plan-123", name: "Test Plan" });
      getMock().setMockData("plans", [plan]);

      const result = await plansApi.getPlan("plan-123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("plan-123");
      expect(result?.name).toBe("Test Plan");
    });

    it("should return null when plan not found", async () => {
      getMock().setMockData("plans", []);

      const result = await plansApi.getPlan("non-existent");

      expect(result).toBeNull();
    });

    it("should query by ID", async () => {
      getMock().setMockData("plans", []);

      await plansApi.getPlan("plan-123");

      const calls = getMock().getMockCalls("plans");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // GET PLAN ROLE
  // ============================================================================

  describe("getPlanRole", () => {
    it("should return role when user is a member", async () => {
      const member = createPlanMember({
        plan_id: "plan-123",
        user_id: "test-user-id",
        role: "editor",
      });
      getMock().setMockData("plan_members", [member]);

      const result = await plansApi.getPlanRole("plan-123");

      expect(result).toBe("editor");
    });

    it("should return null/undefined when user is not a member", async () => {
      getMock().setMockData("plan_members", []);

      const result = await plansApi.getPlanRole("plan-123");

      // NOTE: API signature says `OkrRole | null` but implementation returns
      // `data?.role` which is undefined when data is null. Testing actual behavior.
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // CREATE PLAN
  // ============================================================================

  describe("createPlan", () => {
    it("should create plan with authenticated user as owner", async () => {
      const planData = { name: "New Plan", year: 2026 };

      getMock().setMockData("plans", [
        { id: "new-plan-id", ...planData, created_by: "test-user-id" },
      ]);

      const result = await plansApi.createPlan(planData);

      expect(result.name).toBe("New Plan");
      expect(result.year).toBe(2026);

      // Verify insert was called
      const calls = getMock().getMockCalls("plans");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should throw error when not authenticated", async () => {
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(plansApi.createPlan({ name: "Test", year: 2026 })).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error when auth fails", async () => {
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth failed" },
      });

      await expect(plansApi.createPlan({ name: "Test", year: 2026 })).rejects.toThrow(
        "Authentication failed"
      );
    });
  });

  // ============================================================================
  // UPDATE PLAN
  // ============================================================================

  describe("updatePlan", () => {
    it("should update plan fields", async () => {
      const updatedPlan = createPlan({ id: "plan-123", name: "Updated Name" });
      getMock().setMockData("plans", [updatedPlan]);

      const result = await plansApi.updatePlan("plan-123", { name: "Updated Name" });

      expect(result.name).toBe("Updated Name");

      // Verify update was called
      const calls = getMock().getMockCalls("plans");
      expect(calls.some((c) => c.method === "update")).toBe(true);
    });
  });

  // ============================================================================
  // DELETE PLAN
  // ============================================================================

  describe("deletePlan", () => {
    it("should delete plan", async () => {
      const plan = createPlan({ id: "plan-123" });
      getMock().setMockData("plans", [plan]);

      await plansApi.deletePlan("plan-123");

      // Verify delete was called
      const calls = getMock().getMockCalls("plans");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
    });
  });

  // ============================================================================
  // GET PLAN MEMBERS
  // ============================================================================

  describe("getPlanMembers", () => {
    it("should fetch members with profiles", async () => {
      const profile = createProfile({ id: "user-1", full_name: "Test User" });
      const member = createPlanMember({
        plan_id: "plan-123",
        user_id: "user-1",
        role: "editor",
      });

      getMock().setMockData("plan_members", [{ ...member, profile }]);

      const result = await plansApi.getPlanMembers("plan-123");

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("editor");
    });

    it("should return empty array when no members", async () => {
      getMock().setMockData("plan_members", []);

      const result = await plansApi.getPlanMembers("plan-123");

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // UPDATE MEMBER ROLE
  // ============================================================================

  describe("updateMemberRole", () => {
    it("should update member role", async () => {
      const updatedMember = createPlanMember({
        plan_id: "plan-123",
        user_id: "user-1",
        role: "viewer",
      });
      getMock().setMockData("plan_members", [updatedMember]);

      const result = await plansApi.updateMemberRole("plan-123", "user-1", "viewer");

      expect(result.role).toBe("viewer");

      const calls = getMock().getMockCalls("plan_members");
      expect(calls.some((c) => c.method === "update")).toBe(true);
    });
  });

  // ============================================================================
  // REMOVE PLAN MEMBER
  // ============================================================================

  describe("removePlanMember", () => {
    it("should remove member from plan", async () => {
      const member = createPlanMember({
        plan_id: "plan-123",
        user_id: "user-1",
      });
      getMock().setMockData("plan_members", [member]);

      await plansApi.removePlanMember("plan-123", "user-1");

      const calls = getMock().getMockCalls("plan_members");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
    });
  });

  // ============================================================================
  // LEAVE PLAN
  // ============================================================================

  describe("leavePlan", () => {
    it("should remove current user from plan", async () => {
      const member = createPlanMember({
        plan_id: "plan-123",
        user_id: "test-user-id",
      });
      getMock().setMockData("plan_members", [member]);

      await plansApi.leavePlan("plan-123");

      const calls = getMock().getMockCalls("plan_members");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "user_id")).toBe(true);
    });

    it("should throw error when not authenticated", async () => {
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(plansApi.leavePlan("plan-123")).rejects.toThrow("Not authenticated");
    });
  });

  // ============================================================================
  // GET PLAN INVITES
  // ============================================================================

  describe("getPlanInvites", () => {
    it("should fetch pending invites for plan", async () => {
      const invite = createPlanInvite({
        plan_id: "plan-123",
        email: "invitee@example.com",
        accepted_at: null,
      });
      getMock().setMockData("plan_invites", [invite]);

      const result = await plansApi.getPlanInvites("plan-123");

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("invitee@example.com");
    });

    it("should filter by plan_id", async () => {
      getMock().setMockData("plan_invites", []);

      await plansApi.getPlanInvites("plan-123");

      const calls = getMock().getMockCalls("plan_invites");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE PLAN INVITE
  // ============================================================================

  describe("createPlanInvite", () => {
    it("should create invite with default viewer role", async () => {
      const invite = createPlanInvite({
        plan_id: "plan-123",
        email: "new@example.com",
        role: "viewer",
        invited_by: "test-user-id",
      });
      getMock().setMockData("plan_invites", [invite]);

      const result = await plansApi.createPlanInvite("plan-123", "new@example.com");

      expect(result.email).toBe("new@example.com");
      expect(result.role).toBe("viewer");

      const calls = getMock().getMockCalls("plan_invites");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should create invite with specified role", async () => {
      const invite = createPlanInvite({
        plan_id: "plan-123",
        email: "editor@example.com",
        role: "editor",
        invited_by: "test-user-id",
      });
      getMock().setMockData("plan_invites", [invite]);

      const result = await plansApi.createPlanInvite("plan-123", "editor@example.com", "editor");

      expect(result.role).toBe("editor");
    });

    it("should throw when not authenticated", async () => {
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        plansApi.createPlanInvite("plan-123", "test@example.com")
      ).rejects.toThrow("Not authenticated");
    });
  });

  // ============================================================================
  // DELETE PLAN INVITE
  // ============================================================================

  describe("deletePlanInvite", () => {
    it("should delete invite", async () => {
      const invite = createPlanInvite({ id: "invite-123" });
      getMock().setMockData("plan_invites", [invite]);

      await plansApi.deletePlanInvite("invite-123");

      const calls = getMock().getMockCalls("plan_invites");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
    });
  });

  // ============================================================================
  // GET MY PENDING INVITES
  // ============================================================================

  describe("getMyPendingInvites", () => {
    it("should fetch invites for current user's email", async () => {
      const plan = createPlan({ id: "plan-123", name: "Invited Plan" });
      const invite = createPlanInvite({
        email: "test@example.com",
        accepted_at: null,
      });

      getMock().setMockData("plan_invites", [{ ...invite, plan }]);

      const result = await plansApi.getMyPendingInvites();

      expect(result).toHaveLength(1);
      expect(result[0].plan).toBeDefined();
    });

    it("should throw when not authenticated", async () => {
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(plansApi.getMyPendingInvites()).rejects.toThrow("Not authenticated");
    });
  });

  // ============================================================================
  // ACCEPT PLAN INVITE
  // ============================================================================

  describe("acceptPlanInvite", () => {
    it("should create membership and mark invite as accepted", async () => {
      const invite = createPlanInvite({
        id: "invite-123",
        plan_id: "plan-123",
        role: "editor",
      });
      getMock().setMockData("plan_invites", [invite]);
      getMock().setMockData("plan_members", []);

      await plansApi.acceptPlanInvite("invite-123");

      // Verify invite was fetched
      const inviteCalls = getMock().getMockCalls("plan_invites");
      expect(inviteCalls.some((c) => c.method === "select")).toBe(true);

      // Verify membership was created
      const memberCalls = getMock().getMockCalls("plan_members");
      expect(memberCalls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should throw when not authenticated", async () => {
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(plansApi.acceptPlanInvite("invite-123")).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw when invite not found", async () => {
      getMock().setMockData("plan_invites", []);

      await expect(plansApi.acceptPlanInvite("non-existent")).rejects.toThrow(
        "Invite not found"
      );
    });
  });

  // ============================================================================
  // DECLINE PLAN INVITE
  // ============================================================================

  describe("declinePlanInvite", () => {
    it("should delete the invite", async () => {
      const invite = createPlanInvite({ id: "invite-123" });
      getMock().setMockData("plan_invites", [invite]);

      await plansApi.declinePlanInvite("invite-123");

      const calls = getMock().getMockCalls("plan_invites");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
    });
  });

  // ============================================================================
  // GET PLAN STATS
  // ============================================================================

  describe("getPlanStats", () => {
    it("should fetch plan statistics from view", async () => {
      const stats = {
        plan_id: "plan-123",
        objective_count: 3,
        kr_count: 9,
        task_count: 25,
        completed_task_count: 15,
        check_in_count: 42,
      };
      getMock().setMockData("v_plan_stats", [stats]);

      const result = await plansApi.getPlanStats("plan-123");

      expect(result).not.toBeNull();
      expect(result?.objective_count).toBe(3);
      expect(result?.kr_count).toBe(9);
      expect(result?.task_count).toBe(25);
    });

    it("should return null when no stats found", async () => {
      getMock().setMockData("v_plan_stats", []);

      const result = await plansApi.getPlanStats("non-existent");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // GET CURRENT USER ID
  // ============================================================================

  describe("getCurrentUserId", () => {
    it("should return user ID when authenticated", async () => {
      const result = await plansApi.getCurrentUserId();

      expect(result).toBe("test-user-id");
    });

    it("should return null when not authenticated", async () => {
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await plansApi.getCurrentUserId();

      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe("Plans API - Integration Scenarios", () => {
  beforeEach(() => {
    mockSupabaseRef.current = createMockSupabase();
    getMock().mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    });
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  describe("complete invite flow", () => {
    it("should handle invite creation, acceptance, and membership", async () => {
      // 1. Create invite
      const invite = createPlanInvite({
        id: "invite-flow-1",
        plan_id: "plan-flow-1",
        email: "newmember@example.com",
        role: "editor",
      });
      getMock().setMockData("plan_invites", [invite]);
      getMock().setMockData("plan_members", []);

      // 2. Accept invite (changes auth to invited user)
      getMock().mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "new-user-id", email: "newmember@example.com" } },
        error: null,
      });

      await plansApi.acceptPlanInvite("invite-flow-1");

      // Verify the flow
      const inviteCalls = getMock().getMockCalls("plan_invites");
      const memberCalls = getMock().getMockCalls("plan_members");

      expect(inviteCalls.some((c) => c.method === "select")).toBe(true);
      expect(inviteCalls.some((c) => c.method === "update")).toBe(true);
      expect(memberCalls.some((c) => c.method === "insert")).toBe(true);
    });
  });

  describe("plan CRUD workflow", () => {
    it("should handle create, update, and delete flow", async () => {
      // Create
      const newPlan = createPlan({
        id: "crud-plan-1",
        name: "CRUD Test Plan",
        year: 2026,
      });
      getMock().setMockData("plans", [newPlan]);

      const created = await plansApi.createPlan({ name: "CRUD Test Plan", year: 2026 });
      expect(created.name).toBe("CRUD Test Plan");

      // Update
      const updatedPlan = { ...newPlan, name: "Updated CRUD Plan" };
      getMock().setMockData("plans", [updatedPlan]);

      const updated = await plansApi.updatePlan("crud-plan-1", { name: "Updated CRUD Plan" });
      expect(updated.name).toBe("Updated CRUD Plan");

      // Delete
      await plansApi.deletePlan("crud-plan-1");

      const deleteCalls = getMock().getMockCalls("plans");
      expect(deleteCalls.some((c) => c.method === "delete")).toBe(true);
    });
  });
});
