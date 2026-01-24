/**
 * Annual KRs Hooks Unit Tests
 *
 * Tests for React Query hooks wrapping the annual-krs API.
 * Uses renderHook with QueryClientProvider for testing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createAnnualKr, createObjective } from "@/test/factories";

// Mock the API module
vi.mock("./api", () => ({
  getAnnualKrs: vi.fn(),
  getAnnualKrsByObjective: vi.fn(),
  getKrProgress: vi.fn(),
  getAnnualKr: vi.fn(),
  getAnnualKrWithDetails: vi.fn(),
  getKrTagIds: vi.fn(),
  createAnnualKr: vi.fn(),
  updateAnnualKr: vi.fn(),
  deleteAnnualKr: vi.fn(),
  reorderAnnualKrs: vi.fn(),
  setKrTags: vi.fn(),
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
  useAnnualKrs,
  useAnnualKrsByObjective,
  useKrProgress,
  useAnnualKr,
  useAnnualKrWithDetails,
  useKrTagIds,
  useCreateAnnualKr,
  useUpdateAnnualKr,
  useDeleteAnnualKr,
  useReorderAnnualKrs,
  useSetKrTags,
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

describe("Annual KRs Query Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useAnnualKrs", () => {
    it("should fetch KRs for a plan", async () => {
      const mockKrs = [
        createAnnualKr({ id: "kr-1", name: "KR A" }),
        createAnnualKr({ id: "kr-2", name: "KR B" }),
      ];
      vi.mocked(api.getAnnualKrs).mockResolvedValue(mockKrs);

      const { result } = renderHook(() => useAnnualKrs("plan-123"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockKrs);
      expect(api.getAnnualKrs).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useAnnualKrs(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getAnnualKrs).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch KRs");
      vi.mocked(api.getAnnualKrs).mockRejectedValue(error);

      const { result } = renderHook(() => useAnnualKrs("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useAnnualKrsByObjective", () => {
    it("should fetch KRs for an objective", async () => {
      const mockKrs = [
        createAnnualKr({ id: "kr-1", objective_id: "obj-123" }),
        createAnnualKr({ id: "kr-2", objective_id: "obj-123" }),
      ];
      vi.mocked(api.getAnnualKrsByObjective).mockResolvedValue(mockKrs);

      const { result } = renderHook(() => useAnnualKrsByObjective("obj-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(api.getAnnualKrsByObjective).toHaveBeenCalledWith("obj-123");
    });

    it("should not fetch when objectiveId is empty", async () => {
      const { result } = renderHook(() => useAnnualKrsByObjective(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useKrProgress", () => {
    it("should fetch KR progress data", async () => {
      const mockProgress = [
        { id: "kr-1", code: "KR1", name: "KR 1", progress: 50, target_value: 100, current_value: 50 },
        { id: "kr-2", code: "KR2", name: "KR 2", progress: 75, target_value: 200, current_value: 150 },
      ];
      vi.mocked(api.getKrProgress).mockResolvedValue(mockProgress);

      const { result } = renderHook(() => useKrProgress("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].progress).toBe(50);
      expect(api.getKrProgress).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useKrProgress(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useAnnualKr", () => {
    it("should fetch a single KR", async () => {
      const mockKr = createAnnualKr({ id: "kr-123", name: "Test KR" });
      vi.mocked(api.getAnnualKr).mockResolvedValue(mockKr);

      const { result } = renderHook(() => useAnnualKr("kr-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockKr);
      expect(api.getAnnualKr).toHaveBeenCalledWith("kr-123");
    });

    it("should not fetch when krId is empty", async () => {
      const { result } = renderHook(() => useAnnualKr(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });

    it("should return null for non-existent KR", async () => {
      vi.mocked(api.getAnnualKr).mockResolvedValue(null);

      const { result } = renderHook(() => useAnnualKr("non-existent"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("useAnnualKrWithDetails", () => {
    it("should fetch KR with details", async () => {
      const mockKr = {
        ...createAnnualKr({ id: "kr-123" }),
        objective: createObjective({ id: "obj-1" }),
        quarter_targets: [],
        kr_group: null,
      };
      vi.mocked(api.getAnnualKrWithDetails).mockResolvedValue(mockKr);

      const { result } = renderHook(() => useAnnualKrWithDetails("kr-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.objective).toBeDefined();
      expect(api.getAnnualKrWithDetails).toHaveBeenCalledWith("kr-123");
    });

    it("should not fetch when krId is empty", async () => {
      const { result } = renderHook(() => useAnnualKrWithDetails(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useKrTagIds", () => {
    it("should fetch tag IDs for a KR", async () => {
      const mockTagIds = ["tag-1", "tag-2", "tag-3"];
      vi.mocked(api.getKrTagIds).mockResolvedValue(mockTagIds);

      const { result } = renderHook(() => useKrTagIds("kr-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTagIds);
      expect(api.getKrTagIds).toHaveBeenCalledWith("kr-123");
    });

    it("should not fetch when krId is null", async () => {
      const { result } = renderHook(() => useKrTagIds(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });

    it("should return empty array when no tags", async () => {
      vi.mocked(api.getKrTagIds).mockResolvedValue([]);

      const { result } = renderHook(() => useKrTagIds("kr-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });
});

// ============================================================================
// MUTATION HOOKS TESTS
// ============================================================================

describe("Annual KRs Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreateAnnualKr", () => {
    it("should create a KR", async () => {
      const newKr = createAnnualKr({ id: "new-kr", name: "New KR", objective_id: "obj-123" });
      vi.mocked(api.createAnnualKr).mockResolvedValue(newKr);

      const { result } = renderHook(() => useCreateAnnualKr(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        objective_id: "obj-123",
        name: "New KR",
        code: "KR1",
        type: "metric",
        start_value: 0,
        target_value: 100,
        unit: "points",
        year: 2026,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createAnnualKr).toHaveBeenCalledWith({
        objective_id: "obj-123",
        name: "New KR",
        code: "KR1",
        type: "metric",
        start_value: 0,
        target_value: 100,
        unit: "points",
        year: 2026,
      });
    });

    it("should handle creation error", async () => {
      const error = new Error("Creation failed");
      vi.mocked(api.createAnnualKr).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateAnnualKr(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        objective_id: "obj-123",
        name: "New KR",
        code: "KR1",
        type: "metric",
        start_value: 0,
        target_value: 100,
        unit: "points",
        year: 2026,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useUpdateAnnualKr", () => {
    it("should update a KR", async () => {
      const updatedKr = createAnnualKr({ id: "kr-123", name: "Updated KR", objective_id: "obj-123" });
      vi.mocked(api.updateAnnualKr).mockResolvedValue(updatedKr);

      const { result } = renderHook(() => useUpdateAnnualKr(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        krId: "kr-123",
        updates: { name: "Updated KR" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateAnnualKr).toHaveBeenCalledWith("kr-123", { name: "Updated KR" });
    });

    it("should update current_value", async () => {
      const updatedKr = createAnnualKr({ id: "kr-123", current_value: 75, objective_id: "obj-123" });
      vi.mocked(api.updateAnnualKr).mockResolvedValue(updatedKr);

      const { result } = renderHook(() => useUpdateAnnualKr(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        krId: "kr-123",
        updates: { current_value: 75 },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateAnnualKr).toHaveBeenCalledWith("kr-123", { current_value: 75 });
    });

    it("should handle update error", async () => {
      const error = new Error("Update failed");
      vi.mocked(api.updateAnnualKr).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateAnnualKr(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        krId: "kr-123",
        updates: { name: "Updated KR" },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useDeleteAnnualKr", () => {
    it("should delete a KR", async () => {
      vi.mocked(api.deleteAnnualKr).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteAnnualKr(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ krId: "kr-123", objectiveId: "obj-123" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.deleteAnnualKr).toHaveBeenCalledWith("kr-123");
    });

    it("should handle delete error", async () => {
      const error = new Error("Delete failed");
      vi.mocked(api.deleteAnnualKr).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteAnnualKr(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ krId: "kr-123", objectiveId: "obj-123" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useReorderAnnualKrs", () => {
    it("should reorder KRs", async () => {
      vi.mocked(api.reorderAnnualKrs).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReorderAnnualKrs(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        objectiveId: "obj-123",
        krIds: ["kr-3", "kr-1", "kr-2"],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.reorderAnnualKrs).toHaveBeenCalledWith("obj-123", ["kr-3", "kr-1", "kr-2"]);
    });

    it("should handle reorder error", async () => {
      const error = new Error("Reorder failed");
      vi.mocked(api.reorderAnnualKrs).mockRejectedValue(error);

      const { result } = renderHook(() => useReorderAnnualKrs(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        objectiveId: "obj-123",
        krIds: ["kr-3", "kr-1", "kr-2"],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useSetKrTags", () => {
    it("should set tags for a KR", async () => {
      vi.mocked(api.setKrTags).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetKrTags(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        krId: "kr-123",
        tagIds: ["tag-1", "tag-2"],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.setKrTags).toHaveBeenCalledWith("kr-123", ["tag-1", "tag-2"]);
    });

    it("should handle empty tag array", async () => {
      vi.mocked(api.setKrTags).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetKrTags(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        krId: "kr-123",
        tagIds: [],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.setKrTags).toHaveBeenCalledWith("kr-123", []);
    });

    it("should handle set tags error", async () => {
      const error = new Error("Set tags failed");
      vi.mocked(api.setKrTags).mockRejectedValue(error);

      const { result } = renderHook(() => useSetKrTags(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        krId: "kr-123",
        tagIds: ["tag-1"],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
