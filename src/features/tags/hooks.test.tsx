/**
 * Tags Hooks Unit Tests
 *
 * Tests for React Query hooks wrapping the tags and KR groups API.
 * Uses renderHook with QueryClientProvider for testing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createTag, createKrGroup } from "@/test/factories";

// Mock the API module
vi.mock("./api", () => ({
  getTags: vi.fn(),
  getTagsByKind: vi.fn(),
  getTagsWithUsage: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  getKrGroups: vi.fn(),
  createKrGroup: vi.fn(),
  updateKrGroup: vi.fn(),
  deleteKrGroup: vi.fn(),
  reorderKrGroups: vi.fn(),
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
  useTags,
  useTagsByKind,
  useTagsWithUsage,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useKrGroups,
  useCreateKrGroup,
  useUpdateKrGroup,
  useDeleteKrGroup,
  useReorderKrGroups,
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
// TAG QUERY HOOKS TESTS
// ============================================================================

describe("Tags Query Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useTags", () => {
    it("should fetch tags for a plan", async () => {
      const mockTags = [
        createTag({ id: "tag-1", name: "Tag A", plan_id: "plan-123" }),
        createTag({ id: "tag-2", name: "Tag B", plan_id: "plan-123" }),
      ];
      vi.mocked(api.getTags).mockResolvedValue(mockTags);

      const { result } = renderHook(() => useTags("plan-123"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTags);
      expect(api.getTags).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useTags(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.getTags).not.toHaveBeenCalled();
    });

    it("should handle error state", async () => {
      const error = new Error("Failed to fetch tags");
      vi.mocked(api.getTags).mockRejectedValue(error);

      const { result } = renderHook(() => useTags("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe("useTagsByKind", () => {
    it("should fetch tags by kind", async () => {
      const mockTags = [
        createTag({ id: "tag-1", name: "Tag A", kind: "category" }),
      ];
      vi.mocked(api.getTagsByKind).mockResolvedValue(mockTags);

      const { result } = renderHook(() => useTagsByKind("plan-123", "category"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTags);
      expect(api.getTagsByKind).toHaveBeenCalledWith("plan-123", "category");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useTagsByKind("", "category"), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useTagsWithUsage", () => {
    it("should fetch tags with usage counts", async () => {
      const mockTags = [
        { ...createTag({ id: "tag-1", name: "Tag A" }), task_count: 5 },
        { ...createTag({ id: "tag-2", name: "Tag B" }), task_count: 0 },
      ];
      vi.mocked(api.getTagsWithUsage).mockResolvedValue(mockTags);

      const { result } = renderHook(() => useTagsWithUsage("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].task_count).toBe(5);
      expect(api.getTagsWithUsage).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useTagsWithUsage(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });
});

// ============================================================================
// TAG MUTATION HOOKS TESTS
// ============================================================================

describe("Tags Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreateTag", () => {
    it("should create a tag with planId from hook", async () => {
      const newTag = createTag({ id: "new-tag", name: "New Tag", plan_id: "plan-123" });
      vi.mocked(api.createTag).mockResolvedValue(newTag);

      const { result } = renderHook(() => useCreateTag("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "New Tag", kind: "custom" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createTag).toHaveBeenCalledWith({
        name: "New Tag",
        kind: "custom",
        plan_id: "plan-123",
      });
    });

    it("should create a tag with planId from mutation", async () => {
      const newTag = createTag({ id: "new-tag", name: "New Tag", plan_id: "plan-456" });
      vi.mocked(api.createTag).mockResolvedValue(newTag);

      const { result } = renderHook(() => useCreateTag(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "New Tag", kind: "custom", plan_id: "plan-456" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createTag).toHaveBeenCalledWith({
        name: "New Tag",
        kind: "custom",
        plan_id: "plan-456",
      });
    });

    it("should handle creation error", async () => {
      const error = new Error("Creation failed");
      vi.mocked(api.createTag).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateTag("plan-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "New Tag", kind: "custom" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useUpdateTag", () => {
    it("should update a tag", async () => {
      const updatedTag = createTag({ id: "tag-123", name: "Updated Tag", plan_id: "plan-123" });
      vi.mocked(api.updateTag).mockResolvedValue(updatedTag);

      const { result } = renderHook(() => useUpdateTag(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ tagId: "tag-123", updates: { name: "Updated Tag" } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateTag).toHaveBeenCalledWith("tag-123", { name: "Updated Tag" });
    });

    it("should handle update error", async () => {
      const error = new Error("Update failed");
      vi.mocked(api.updateTag).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateTag(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ tagId: "tag-123", updates: { name: "Updated Tag" } });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useDeleteTag", () => {
    it("should delete a tag", async () => {
      vi.mocked(api.deleteTag).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTag(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ tagId: "tag-123", planId: "plan-123" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.deleteTag).toHaveBeenCalledWith("tag-123");
    });

    it("should handle delete error", async () => {
      const error = new Error("Delete failed");
      vi.mocked(api.deleteTag).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteTag(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ tagId: "tag-123", planId: "plan-123" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});

// ============================================================================
// KR GROUPS QUERY HOOKS TESTS
// ============================================================================

describe("KR Groups Query Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useKrGroups", () => {
    it("should fetch KR groups for a plan", async () => {
      const mockGroups = [
        createKrGroup({ id: "group-1", name: "Group A", plan_id: "plan-123" }),
        createKrGroup({ id: "group-2", name: "Group B", plan_id: "plan-123" }),
      ];
      vi.mocked(api.getKrGroups).mockResolvedValue(mockGroups);

      const { result } = renderHook(() => useKrGroups("plan-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockGroups);
      expect(api.getKrGroups).toHaveBeenCalledWith("plan-123");
    });

    it("should not fetch when planId is empty", async () => {
      const { result } = renderHook(() => useKrGroups(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });
});

// ============================================================================
// KR GROUPS MUTATION HOOKS TESTS
// ============================================================================

describe("KR Groups Mutation Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreateKrGroup", () => {
    it("should create a KR group", async () => {
      const newGroup = createKrGroup({ id: "new-group", name: "New Group", plan_id: "plan-123" });
      vi.mocked(api.createKrGroup).mockResolvedValue(newGroup);

      const { result } = renderHook(() => useCreateKrGroup(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "New Group", plan_id: "plan-123" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.createKrGroup).toHaveBeenCalledWith({ name: "New Group", plan_id: "plan-123" });
    });

    it("should handle creation error", async () => {
      const error = new Error("Creation failed");
      vi.mocked(api.createKrGroup).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateKrGroup(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: "New Group", plan_id: "plan-123" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useUpdateKrGroup", () => {
    it("should update a KR group", async () => {
      const updatedGroup = createKrGroup({ id: "group-123", name: "Updated Group", plan_id: "plan-123" });
      vi.mocked(api.updateKrGroup).mockResolvedValue(updatedGroup);

      const { result } = renderHook(() => useUpdateKrGroup(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ groupId: "group-123", updates: { name: "Updated Group" } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.updateKrGroup).toHaveBeenCalledWith("group-123", { name: "Updated Group" });
    });

    it("should handle update error", async () => {
      const error = new Error("Update failed");
      vi.mocked(api.updateKrGroup).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateKrGroup(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ groupId: "group-123", updates: { name: "Updated Group" } });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useDeleteKrGroup", () => {
    it("should delete a KR group", async () => {
      vi.mocked(api.deleteKrGroup).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteKrGroup(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ groupId: "group-123", planId: "plan-123" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.deleteKrGroup).toHaveBeenCalledWith("group-123");
    });

    it("should handle delete error", async () => {
      const error = new Error("Delete failed");
      vi.mocked(api.deleteKrGroup).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteKrGroup(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ groupId: "group-123", planId: "plan-123" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useReorderKrGroups", () => {
    it("should reorder KR groups", async () => {
      vi.mocked(api.reorderKrGroups).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReorderKrGroups(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        planId: "plan-123",
        groupIds: ["group-3", "group-1", "group-2"],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.reorderKrGroups).toHaveBeenCalledWith("plan-123", ["group-3", "group-1", "group-2"]);
    });

    it("should handle reorder error", async () => {
      const error = new Error("Reorder failed");
      vi.mocked(api.reorderKrGroups).mockRejectedValue(error);

      const { result } = renderHook(() => useReorderKrGroups(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        planId: "plan-123",
        groupIds: ["group-3", "group-1", "group-2"],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
