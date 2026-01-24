/**
 * Objectives Hooks Unit Tests
 *
 * Tests for React Query hooks wrapping the objectives API.
 * Uses renderHook with QueryClientProvider for testing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createObjective, createAnnualKr } from "@/test/factories";

// Mock the API module
vi.mock("./api", () => ({
  getObjectives: vi.fn(),
  getObjectivesWithKrs: vi.fn(),
  getObjectiveProgress: vi.fn(),
  getObjective: vi.fn(),
  createObjective: vi.fn(),
  updateObjective: vi.fn(),
  deleteObjective: vi.fn(),
  reorderObjectives: vi.fn(),
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
  useObjectives,
  useObjectivesWithKrs,
  useObjectiveProgress,
  useObjective,
  useCreateObjective,
  useUpdateObjective,
  useDeleteObjective,
  useReorderObjectives,
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

describe("Objectives Query Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useObjectives", () => {
    it("should fetch objectives for a plan", async () => {
      const mockObjectives = [
        createObjective({ id: "obj-1", name: "Objective A", plan_id: "plan-123" }),
        createObjective({ id: "obj-2", name: "Objective B", plan_id: "plan-123" }),
      ];
      vi.mocked(api.getObjectives).mockResolvedValue(mockObjectives);

      const { result } = renderHook(() => useObjectives("plan-123"), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockObjectives);
      expect(api.getObjectives).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useObjectives(""), {
        wrapper: createWrapper(),
      });

      // Should be idle (not fetching) when disabled
      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getObjectives).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch objectives");
      vi.mocked(api.getObjectives).mockRejectedValue(error);

      const { result } = renderHook(() => useObjectives("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useObjectivesWithKrs", () => {
    it("should fetch objectives with their KRs", async () => {
      const mockObjectivesWithKrs = [
        {
          ...createObjective({ id: "obj-1", name: "Objective A" }),
          annual_krs: [
            createAnnualKr({ id: "kr-1", name: "KR 1" }),
            createAnnualKr({ id: "kr-2", name: "KR 2" }),
          ],
          progress: 50,
        },
      ];
      vi.mocked(api.getObjectivesWithKrs).mockResolvedValue(mockObjectivesWithKrs);

      const { result } = renderHook(() => useObjectivesWithKrs("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockObjectivesWithKrs);
      expect(result.current.data?.[0].annual_krs).toHaveLength(2);
      expect(api.getObjectivesWithKrs).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useObjectivesWithKrs(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getObjectivesWithKrs).not.toHaveBeenCalled();
    });
  });

  describe("useObjectiveProgress", () => {
    it("should fetch objective progress from view", async () => {
      const mockProgress = [
        { id: "obj-1", code: "O1", name: "Objective A", progress: 75, kr_count: 3 },
        { id: "obj-2", code: "O2", name: "Objective B", progress: 50, kr_count: 2 },
      ];
      vi.mocked(api.getObjectiveProgress).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useObjectiveProgress("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProgress);
      expect(result.current.data?.[0].progress).toBe(75);
      expect(api.getObjectiveProgress).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useObjectiveProgress(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getObjectiveProgress).not.toHaveBeenCalled();
    });
  });

  describe("useObjective", () => {
    it("should fetch single objective", async () => {
      const mockObjective = createObjective({ id: "obj-123", name: "Test Objective" });
      vi.mocked(api.getObjective).mockResolvedValue(mockObjective);

      const { result } = renderHook(() => useObjective("obj-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockObjective);
      expect(api.getObjective).toHaveBeenCalledWith("obj-123");
    });

    it("should not fetch when objectiveId is empty", async () => {
      const { result } = renderHook(() => useObjective(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getObjective).not.toHaveBeenCalled();
    });

    it("should return null for non-existent objective", async () => {
      vi.mocked(api.getObjective).mockResolvedValue(null);

      const { result } = renderHook(() => useObjective("non-existent"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });
});

// ============================================================================
// MUTATION HOOKS TESTS
// ============================================================================

describe("Objectives Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreateObjective", () => {
    it("should create an objective", async () => {
      const newObjective = createObjective({ id: "new-obj", name: "New Objective", plan_id: "plan-123" });
      vi.mocked(api.createObjective).mockResolvedValue(newObjective);

      const { result } = renderHook(() => useCreateObjective(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        plan_id: "plan-123",
        name: "New Objective",
        code: "O1",
        year: 2026,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createObjective).toHaveBeenCalledWith({
        plan_id: "plan-123",
        name: "New Objective",
        code: "O1",
        year: 2026,
      });
      expect(result.current.data).toEqual(newObjective);
    });

    it("should handle creation error", async () => {
      const error = new Error("Creation failed");
      vi.mocked(api.createObjective).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateObjective(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        plan_id: "plan-123",
        name: "New Objective",
        code: "O1",
        year: 2026,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useUpdateObjective", () => {
    it("should update an objective", async () => {
      const updatedObjective = createObjective({ id: "obj-123", name: "Updated Name", plan_id: "plan-123" });
      vi.mocked(api.updateObjective).mockResolvedValue(updatedObjective);

      const { result } = renderHook(() => useUpdateObjective(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        objectiveId: "obj-123",
        updates: { name: "Updated Name" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateObjective).toHaveBeenCalledWith("obj-123", { name: "Updated Name" });
    });

    it("should handle update error", async () => {
      const error = new Error("Update failed");
      vi.mocked(api.updateObjective).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateObjective(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        objectiveId: "obj-123",
        updates: { name: "Updated Name" },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useDeleteObjective", () => {
    it("should delete an objective", async () => {
      vi.mocked(api.deleteObjective).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteObjective(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ objectiveId: "obj-123", planId: "plan-123" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.deleteObjective).toHaveBeenCalledWith("obj-123");
    });

    it("should handle delete error", async () => {
      const error = new Error("Delete failed");
      vi.mocked(api.deleteObjective).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteObjective(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ objectiveId: "obj-123", planId: "plan-123" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useReorderObjectives", () => {
    it("should reorder objectives", async () => {
      vi.mocked(api.reorderObjectives).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReorderObjectives(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        planId: "plan-123",
        objectiveIds: ["obj-3", "obj-1", "obj-2"],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.reorderObjectives).toHaveBeenCalledWith("plan-123", ["obj-3", "obj-1", "obj-2"]);
    });

    it("should handle reorder error", async () => {
      const error = new Error("Reorder failed");
      vi.mocked(api.reorderObjectives).mockRejectedValue(error);

      const { result } = renderHook(() => useReorderObjectives(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        planId: "plan-123",
        objectiveIds: ["obj-3", "obj-1", "obj-2"],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });
});
