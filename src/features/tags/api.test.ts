/**
 * Tags API Unit Tests
 *
 * Tests for tag and KR group CRUD operations.
 * Uses the mock Supabase client to verify query construction and data handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabase } from "@/test/mocks/supabase";
import { createTag as createTagFactory, createKrGroup as createKrGroupFactory } from "@/test/factories";

// Use vi.hoisted to create a variable that exists at the hoisted scope
const { mockRef } = vi.hoisted(() => ({
  mockRef: { current: null as ReturnType<typeof createMockSupabase> | null },
}));

// Mock the Supabase client
vi.mock("@/lib/supabase/untyped-client", () => ({
  createUntypedClient: () => mockRef.current?.mockSupabase,
}));

// Import API functions after mocking
import * as tagsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Tags API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET TAGS
  // ============================================================================

  describe("getTags", () => {
    it("should fetch all tags for a plan", async () => {
      const tag1 = createTagFactory({ id: "tag-1", name: "Bug", plan_id: "plan-123" });
      const tag2 = createTagFactory({ id: "tag-2", name: "Feature", plan_id: "plan-123" });
      getMock().setMockData("tags", [tag1, tag2]);

      const result = await tagsApi.getTags("plan-123");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Bug");
      expect(result[1].name).toBe("Feature");
    });

    it("should return empty array when no tags exist", async () => {
      getMock().setMockData("tags", []);

      const result = await tagsApi.getTags("plan-123");

      expect(result).toEqual([]);
    });

    it("should filter by plan_id", async () => {
      const tag1 = createTagFactory({ id: "tag-1", plan_id: "plan-123" });
      const tag2 = createTagFactory({ id: "tag-2", plan_id: "other-plan" });
      getMock().setMockData("tags", [tag1, tag2]);

      const result = await tagsApi.getTags("plan-123");

      expect(result).toHaveLength(1);
      expect(result[0].plan_id).toBe("plan-123");
    });

    it("should make order calls for kind and name", async () => {
      getMock().setMockData("tags", []);

      await tagsApi.getTags("plan-123");

      const calls = getMock().getMockCalls("tags");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "kind")).toBe(true);
      expect(calls.some((c) => c.method === "order" && c.args[0] === "name")).toBe(true);
    });
  });

  // ============================================================================
  // GET TAGS BY KIND
  // ============================================================================

  describe("getTagsByKind", () => {
    it("should fetch tags filtered by kind", async () => {
      const customTag = createTagFactory({ id: "tag-1", kind: "custom", plan_id: "plan-123" });
      const categoryTag = createTagFactory({ id: "tag-2", kind: "category", plan_id: "plan-123" });
      getMock().setMockData("tags", [customTag, categoryTag]);

      const result = await tagsApi.getTagsByKind("plan-123", "custom");

      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe("custom");
    });

    it("should return empty array when no tags of kind exist", async () => {
      getMock().setMockData("tags", []);

      const result = await tagsApi.getTagsByKind("plan-123", "custom");

      expect(result).toEqual([]);
    });

    it("should make eq calls for plan_id and kind", async () => {
      getMock().setMockData("tags", []);

      await tagsApi.getTagsByKind("plan-123", "category");

      const calls = getMock().getMockCalls("tags");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "plan_id")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "kind")).toBe(true);
    });
  });

  // ============================================================================
  // GET SINGLE TAG
  // ============================================================================

  describe("getTag", () => {
    it("should fetch a single tag by ID", async () => {
      const tag = createTagFactory({ id: "tag-123", name: "Important" });
      getMock().setMockData("tags", [tag]);

      const result = await tagsApi.getTag("tag-123");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("tag-123");
      expect(result!.name).toBe("Important");
    });

    it("should return null when tag not found", async () => {
      getMock().setMockData("tags", []);

      const result = await tagsApi.getTag("tag-nonexistent");

      expect(result).toBeNull();
    });

    it("should make single() call", async () => {
      getMock().setMockData("tags", []);

      await tagsApi.getTag("tag-123");

      const calls = getMock().getMockCalls("tags");
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE TAG
  // ============================================================================

  describe("createTag", () => {
    it("should create a tag", async () => {
      const newTag = {
        plan_id: "plan-123",
        name: "New Tag",
        kind: "custom" as const,
        color: "#FF5733",
      };
      getMock().setMockData("tags", []);

      const result = await tagsApi.createTag(newTag);

      expect(result.name).toBe("New Tag");
      expect(result.kind).toBe("custom");
      expect(result.color).toBe("#FF5733");
    });

    it("should make insert and select calls", async () => {
      const newTag = {
        plan_id: "plan-123",
        name: "Test",
        kind: "custom" as const,
        color: "#000000",
      };
      getMock().setMockData("tags", []);

      await tagsApi.createTag(newTag);

      const calls = getMock().getMockCalls("tags");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE TAG
  // ============================================================================

  describe("updateTag", () => {
    it("should update a tag name", async () => {
      const existingTag = createTagFactory({ id: "tag-123", name: "Old Name" });
      getMock().setMockData("tags", [existingTag]);

      const result = await tagsApi.updateTag("tag-123", { name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("should update a tag color", async () => {
      const existingTag = createTagFactory({ id: "tag-123", color: "#000000" });
      getMock().setMockData("tags", [existingTag]);

      const result = await tagsApi.updateTag("tag-123", { color: "#FFFFFF" });

      expect(result.color).toBe("#FFFFFF");
    });

    it("should make update, eq, and select calls", async () => {
      const existingTag = createTagFactory({ id: "tag-123" });
      getMock().setMockData("tags", [existingTag]);

      await tagsApi.updateTag("tag-123", { name: "Updated" });

      const calls = getMock().getMockCalls("tags");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // DELETE TAG
  // ============================================================================

  describe("deleteTag", () => {
    it("should delete a tag", async () => {
      const existingTag = createTagFactory({ id: "tag-123" });
      getMock().setMockData("tags", [existingTag]);

      await tagsApi.deleteTag("tag-123");

      const calls = getMock().getMockCalls("tags");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // GET TAGS WITH USAGE
  // ============================================================================

  describe("getTagsWithUsage", () => {
    // Note: getTagsWithUsage now uses RPC function get_tags_with_usage
    // which returns tags with aggregated task_count and kr_count

    it("should fetch tags with task counts from RPC", async () => {
      getMock().setMockRpcResult("get_tags_with_usage", [
        { id: "tag-1", plan_id: "plan-123", name: "Tag A", kind: "custom", color: null, created_at: new Date().toISOString(), task_count: 2, kr_count: 0 },
        { id: "tag-2", plan_id: "plan-123", name: "Tag B", kind: "custom", color: null, created_at: new Date().toISOString(), task_count: 1, kr_count: 0 },
      ]);

      const result = await tagsApi.getTagsWithUsage("plan-123");

      expect(result).toHaveLength(2);
      expect(result[0].task_count).toBe(2);
      expect(result[1].task_count).toBe(1);
    });

    it("should return 0 count for tags with no tasks from RPC", async () => {
      getMock().setMockRpcResult("get_tags_with_usage", [
        { id: "tag-1", plan_id: "plan-123", name: "Tag A", kind: "custom", color: null, created_at: new Date().toISOString(), task_count: 0, kr_count: 0 },
      ]);

      const result = await tagsApi.getTagsWithUsage("plan-123");

      expect(result).toHaveLength(1);
      expect(result[0].task_count).toBe(0);
    });

    it("should include kr_count from RPC", async () => {
      getMock().setMockRpcResult("get_tags_with_usage", [
        { id: "tag-1", plan_id: "plan-123", name: "Tag A", kind: "custom", color: null, created_at: new Date().toISOString(), task_count: 2, kr_count: 3 },
      ]);

      const result = await tagsApi.getTagsWithUsage("plan-123");

      expect(result[0].kr_count).toBe(3);
    });
  });
});

// ============================================================================
// KR GROUPS API
// ============================================================================

describe("KR Groups API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET KR GROUPS
  // ============================================================================

  describe("getKrGroups", () => {
    it("should fetch all KR groups for a plan", async () => {
      const group1 = createKrGroupFactory({ id: "group-1", name: "Group A", plan_id: "plan-123" });
      const group2 = createKrGroupFactory({ id: "group-2", name: "Group B", plan_id: "plan-123" });
      getMock().setMockData("kr_groups", [group1, group2]);

      const result = await tagsApi.getKrGroups("plan-123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no groups exist", async () => {
      getMock().setMockData("kr_groups", []);

      const result = await tagsApi.getKrGroups("plan-123");

      expect(result).toEqual([]);
    });

    it("should order by sort_order", async () => {
      getMock().setMockData("kr_groups", []);

      await tagsApi.getKrGroups("plan-123");

      const calls = getMock().getMockCalls("kr_groups");
      expect(calls.some((c) => c.method === "order" && c.args[0] === "sort_order")).toBe(true);
    });
  });

  // ============================================================================
  // GET SINGLE KR GROUP
  // ============================================================================

  describe("getKrGroup", () => {
    it("should fetch a single KR group by ID", async () => {
      const group = createKrGroupFactory({ id: "group-123", name: "Test Group" });
      getMock().setMockData("kr_groups", [group]);

      const result = await tagsApi.getKrGroup("group-123");

      expect(result).not.toBeNull();
      expect(result!.name).toBe("Test Group");
    });

    it("should return null when group not found", async () => {
      getMock().setMockData("kr_groups", []);

      const result = await tagsApi.getKrGroup("group-nonexistent");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CREATE KR GROUP
  // ============================================================================

  describe("createKrGroup", () => {
    it("should create a KR group", async () => {
      const newGroup = {
        plan_id: "plan-123",
        name: "New Group",
        color: "#10B981",
        sort_order: 1,
      };
      getMock().setMockData("kr_groups", []);

      const result = await tagsApi.createKrGroup(newGroup);

      expect(result.name).toBe("New Group");
      expect(result.color).toBe("#10B981");
    });

    it("should make insert and select calls", async () => {
      const newGroup = {
        plan_id: "plan-123",
        name: "Test",
        color: "#000000",
        sort_order: 1,
      };
      getMock().setMockData("kr_groups", []);

      await tagsApi.createKrGroup(newGroup);

      const calls = getMock().getMockCalls("kr_groups");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE KR GROUP
  // ============================================================================

  describe("updateKrGroup", () => {
    it("should update a KR group name", async () => {
      const existingGroup = createKrGroupFactory({ id: "group-123", name: "Old Name" });
      getMock().setMockData("kr_groups", [existingGroup]);

      const result = await tagsApi.updateKrGroup("group-123", { name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("should update a KR group description", async () => {
      const existingGroup = createKrGroupFactory({ id: "group-123", description: null });
      getMock().setMockData("kr_groups", [existingGroup]);

      const result = await tagsApi.updateKrGroup("group-123", { description: "New description" });

      expect(result.description).toBe("New description");
    });

    it("should make update, eq, and select calls", async () => {
      const existingGroup = createKrGroupFactory({ id: "group-123" });
      getMock().setMockData("kr_groups", [existingGroup]);

      await tagsApi.updateKrGroup("group-123", { name: "Updated" });

      const calls = getMock().getMockCalls("kr_groups");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
    });
  });

  // ============================================================================
  // DELETE KR GROUP
  // ============================================================================

  describe("deleteKrGroup", () => {
    it("should delete a KR group", async () => {
      const existingGroup = createKrGroupFactory({ id: "group-123" });
      getMock().setMockData("kr_groups", [existingGroup]);

      await tagsApi.deleteKrGroup("group-123");

      const calls = getMock().getMockCalls("kr_groups");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // REORDER KR GROUPS
  // ============================================================================

  describe("reorderKrGroups", () => {
    it("should reorder KR groups", async () => {
      const group1 = createKrGroupFactory({ id: "group-1", sort_order: 0 });
      const group2 = createKrGroupFactory({ id: "group-2", sort_order: 1 });
      getMock().setMockData("kr_groups", [group1, group2]);

      await tagsApi.reorderKrGroups("plan-123", ["group-2", "group-1"]);

      // Should make multiple update calls
      const calls = getMock().getMockCalls("kr_groups");
      expect(calls.filter((c) => c.method === "update").length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getTags fails", async () => {
      getMock().setMockError("tags", new Error("Database error"));

      await expect(tagsApi.getTags("plan-123")).rejects.toThrow();
    });

    it("should throw error when createTag fails", async () => {
      getMock().setMockError("tags", new Error("Database error"));

      await expect(
        tagsApi.createTag({
          plan_id: "plan-123",
          name: "Test",
          kind: "custom",
          color: "#000000",
        })
      ).rejects.toThrow();
    });

    it("should throw error when deleteTag fails", async () => {
      getMock().setMockError("tags", new Error("Database error"));

      await expect(tagsApi.deleteTag("tag-123")).rejects.toThrow();
    });

    it("should throw error when getKrGroups fails", async () => {
      getMock().setMockError("kr_groups", new Error("Database error"));

      await expect(tagsApi.getKrGroups("plan-123")).rejects.toThrow();
    });
  });
});
