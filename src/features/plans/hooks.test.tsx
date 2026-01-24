/**
 * Plans Hooks Unit Tests
 *
 * Tests for React Query hooks wrapping the plans API.
 * Uses renderHook with QueryClientProvider for testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createPlan, createPlanMember, createPlanInvite } from "@/test/factories";

// Mock the API module
vi.mock("./api", () => ({
  getPlans: vi.fn(),
  getPlan: vi.fn(),
  getPlanRole: vi.fn(),
  getPlanStats: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  getPlanMembers: vi.fn(),
  updateMemberRole: vi.fn(),
  removePlanMember: vi.fn(),
  leavePlan: vi.fn(),
  getPlanInvites: vi.fn(),
  createPlanInvite: vi.fn(),
  deletePlanInvite: vi.fn(),
  getMyPendingInvites: vi.fn(),
  acceptPlanInvite: vi.fn(),
  declinePlanInvite: vi.fn(),
  getCurrentUserId: vi.fn(),
}));

// Mock the toast hook
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Import after mocking
import * as api from "./api";
import {
  usePlans,
  usePlan,
  usePlanRole,
  usePlanStats,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  usePlanMembers,
  useUpdateMemberRole,
  useRemovePlanMember,
  useLeavePlan,
  usePlanInvites,
  useCreatePlanInvite,
  useDeletePlanInvite,
  useMyPendingInvites,
  useAcceptPlanInvite,
  useDeclinePlanInvite,
  useCurrentUserId,
} from "./hooks";

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// ============================================================================
// QUERY HOOKS TESTS
// ============================================================================

describe("Plans Query Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("usePlans", () => {
    it("should fetch plans on mount", async () => {
      const mockPlans = [
        { ...createPlan({ id: "plan-1", name: "Plan A" }), role: "owner" as const },
        { ...createPlan({ id: "plan-2", name: "Plan B" }), role: "editor" as const },
      ];
      vi.mocked(api.getPlans).mockResolvedValue(mockPlans);

      const { result } = renderHook(() => usePlans(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPlans);
      expect(api.getPlans).toHaveBeenCalledTimes(1);
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch plans");
      vi.mocked(api.getPlans).mockRejectedValue(error);

      const { result } = renderHook(() => usePlans(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("usePlan", () => {
    it("should fetch single plan", async () => {
      const mockPlan = createPlan({ id: "plan-123", name: "Test Plan" });
      vi.mocked(api.getPlan).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => usePlan("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPlan);
      expect(api.getPlan).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => usePlan(""), {
        wrapper: createWrapper(),
      });

      // Should be idle (not fetching) when disabled
      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getPlan).not.toHaveBeenCalled();
    });
  });

  describe("usePlanRole", () => {
    it("should fetch user role for plan", async () => {
      vi.mocked(api.getPlanRole).mockResolvedValue("editor");

      const { result } = renderHook(() => usePlanRole("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe("editor");
    });

    it("should return null when not a member", async () => {
      vi.mocked(api.getPlanRole).mockResolvedValue(null);

      const { result } = renderHook(() => usePlanRole("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("usePlanStats", () => {
    it("should fetch plan statistics", async () => {
      const mockStats = {
        plan_id: "plan-123",
        objective_count: 3,
        kr_count: 9,
        task_count: 25,
        completed_task_count: 15,
        check_in_count: 42,
      };
      vi.mocked(api.getPlanStats).mockResolvedValue(mockStats);

      const { result } = renderHook(() => usePlanStats("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
    });
  });

  describe("usePlanMembers", () => {
    it("should fetch plan members", async () => {
      const mockMembers = [
        createPlanMember({ user_id: "user-1", role: "owner" }),
        createPlanMember({ user_id: "user-2", role: "editor" }),
      ];
      vi.mocked(api.getPlanMembers).mockResolvedValue(mockMembers);

      const { result } = renderHook(() => usePlanMembers("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });
  });

  describe("usePlanInvites", () => {
    it("should fetch pending invites", async () => {
      const mockInvites = [
        createPlanInvite({ email: "user1@example.com" }),
        createPlanInvite({ email: "user2@example.com" }),
      ];
      vi.mocked(api.getPlanInvites).mockResolvedValue(mockInvites);

      const { result } = renderHook(() => usePlanInvites("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
    });
  });

  describe("useMyPendingInvites", () => {
    it("should fetch current user pending invites", async () => {
      const mockInvites = [
        { ...createPlanInvite(), plan: createPlan({ name: "Invited Plan" }) },
      ];
      vi.mocked(api.getMyPendingInvites).mockResolvedValue(mockInvites);

      const { result } = renderHook(() => useMyPendingInvites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
    });
  });

  describe("useCurrentUserId", () => {
    it("should fetch current user ID", async () => {
      vi.mocked(api.getCurrentUserId).mockResolvedValue("user-123");

      const { result } = renderHook(() => useCurrentUserId(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe("user-123");
    });
  });
});

// ============================================================================
// MUTATION HOOKS TESTS
// ============================================================================

describe("Plans Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreatePlan", () => {
    it("should create a plan", async () => {
      const newPlan = createPlan({ id: "new-plan-id", name: "New Plan", year: 2026 });
      vi.mocked(api.createPlan).mockResolvedValue(newPlan);

      const { result } = renderHook(() => useCreatePlan(), {
        wrapper: createWrapper(),
      });

      // Trigger mutation
      result.current.mutate({ name: "New Plan", year: 2026 });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createPlan).toHaveBeenCalledWith({ name: "New Plan", year: 2026 });
      expect(result.current.data).toEqual(newPlan);
    });

    it("should handle creation error", async () => {
      const error = new Error("Creation failed");
      vi.mocked(api.createPlan).mockRejectedValue(error);

      const { result } = renderHook(() => useCreatePlan(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "New Plan", year: 2026 });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useUpdatePlan", () => {
    it("should update a plan", async () => {
      const updatedPlan = createPlan({ id: "plan-123", name: "Updated Plan" });
      vi.mocked(api.updatePlan).mockResolvedValue(updatedPlan);

      const { result } = renderHook(() => useUpdatePlan(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ planId: "plan-123", updates: { name: "Updated Plan" } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updatePlan).toHaveBeenCalledWith("plan-123", { name: "Updated Plan" });
    });
  });

  describe("useDeletePlan", () => {
    it("should delete a plan", async () => {
      vi.mocked(api.deletePlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePlan(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("plan-123");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.deletePlan).toHaveBeenCalledWith("plan-123");
    });
  });

  describe("useUpdateMemberRole", () => {
    it("should update member role", async () => {
      const updatedMember = createPlanMember({ user_id: "user-1", role: "viewer" });
      vi.mocked(api.updateMemberRole).mockResolvedValue(updatedMember);

      const { result } = renderHook(() => useUpdateMemberRole(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ planId: "plan-123", userId: "user-1", role: "viewer" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateMemberRole).toHaveBeenCalledWith("plan-123", "user-1", "viewer");
    });
  });

  describe("useRemovePlanMember", () => {
    it("should remove a member", async () => {
      vi.mocked(api.removePlanMember).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRemovePlanMember(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ planId: "plan-123", userId: "user-1" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.removePlanMember).toHaveBeenCalledWith("plan-123", "user-1");
    });
  });

  describe("useLeavePlan", () => {
    it("should leave a plan", async () => {
      vi.mocked(api.leavePlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeavePlan(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("plan-123");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.leavePlan).toHaveBeenCalledWith("plan-123");
    });
  });

  describe("useCreatePlanInvite", () => {
    it("should create an invite", async () => {
      const newInvite = createPlanInvite({ email: "new@example.com", role: "editor" });
      vi.mocked(api.createPlanInvite).mockResolvedValue(newInvite);

      const { result } = renderHook(() => useCreatePlanInvite(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ planId: "plan-123", email: "new@example.com", role: "editor" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createPlanInvite).toHaveBeenCalledWith("plan-123", "new@example.com", "editor");
    });
  });

  describe("useDeletePlanInvite", () => {
    it("should delete an invite", async () => {
      vi.mocked(api.deletePlanInvite).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePlanInvite(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ inviteId: "invite-123", planId: "plan-123" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.deletePlanInvite).toHaveBeenCalledWith("invite-123");
    });
  });

  describe("useAcceptPlanInvite", () => {
    it("should accept an invite", async () => {
      vi.mocked(api.acceptPlanInvite).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAcceptPlanInvite(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("invite-123");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.acceptPlanInvite).toHaveBeenCalledWith("invite-123");
    });
  });

  describe("useDeclinePlanInvite", () => {
    it("should decline an invite", async () => {
      vi.mocked(api.declinePlanInvite).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeclinePlanInvite(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("invite-123");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.declinePlanInvite).toHaveBeenCalledWith("invite-123");
    });
  });
});
