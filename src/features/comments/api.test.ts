/**
 * Comments API Unit Tests
 *
 * Tests for comment CRUD operations, mentions, and unread tracking.
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
import * as commentsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST HELPERS
// ============================================================================

function createComment(overrides: Partial<{
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: overrides.id || `comment-${Math.random().toString(36).slice(2)}`,
    task_id: overrides.task_id || "task-123",
    user_id: overrides.user_id || "user-123",
    content: overrides.content || "This is a comment",
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  };
}

function createCommentWithUser(overrides: Partial<{
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}> = {}) {
  const comment = createComment(overrides);
  return {
    ...comment,
    user: {
      id: comment.user_id,
      email: "user@example.com",
      full_name: "Test User",
      avatar_url: null,
    },
    mentions: [],
  };
}

function createCommentRead(overrides: Partial<{
  id: string;
  task_id: string;
  user_id: string;
  last_read_at: string;
}> = {}) {
  return {
    id: overrides.id || `read-${Math.random().toString(36).slice(2)}`,
    task_id: overrides.task_id || "task-123",
    user_id: overrides.user_id || "user-123",
    last_read_at: overrides.last_read_at || new Date().toISOString(),
  };
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Comments API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET TASK COMMENTS
  // ============================================================================

  describe("getTaskComments", () => {
    it("should fetch comments for a task with user info", async () => {
      const comment1 = createCommentWithUser({ id: "c-1", task_id: "task-123" });
      const comment2 = createCommentWithUser({ id: "c-2", task_id: "task-123" });
      getMock().setMockData("comments", [comment1, comment2]);

      const result = await commentsApi.getTaskComments("task-123");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("user");
      expect(result[0]).toHaveProperty("mentions");
    });

    it("should return empty array when no comments exist", async () => {
      getMock().setMockData("comments", []);

      const result = await commentsApi.getTaskComments("task-123");

      expect(result).toEqual([]);
    });

    it("should make correct query calls", async () => {
      getMock().setMockData("comments", []);

      await commentsApi.getTaskComments("task-123");

      const calls = getMock().getMockCalls("comments");
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "task_id")).toBe(true);
      expect(calls.some((c) => c.method === "order" && c.args[0] === "created_at")).toBe(true);
    });

    it("should order comments by created_at descending", async () => {
      getMock().setMockData("comments", []);

      await commentsApi.getTaskComments("task-123");

      const calls = getMock().getMockCalls("comments");
      const orderCall = calls.find((c) => c.method === "order");
      expect(orderCall?.args[0]).toBe("created_at");
      expect(orderCall?.args[1]).toEqual({ ascending: false });
    });
  });

  // ============================================================================
  // GET TASK COMMENT COUNT
  // ============================================================================

  describe("getTaskCommentCount", () => {
    it("should return comment count for a task", async () => {
      getMock().setMockData("comments", [
        createComment({ id: "c-1" }),
        createComment({ id: "c-2" }),
        createComment({ id: "c-3" }),
      ]);

      const result = await commentsApi.getTaskCommentCount("task-123");

      expect(result).toBe(3);
    });

    it("should return 0 when no comments exist", async () => {
      getMock().setMockData("comments", []);

      const result = await commentsApi.getTaskCommentCount("task-123");

      expect(result).toBe(0);
    });

    it("should make head query with count", async () => {
      getMock().setMockData("comments", []);

      await commentsApi.getTaskCommentCount("task-123");

      const calls = getMock().getMockCalls("comments");
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "task_id")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE COMMENT
  // ============================================================================

  describe("createComment", () => {
    it("should create a comment", async () => {
      const newComment = {
        task_id: "task-123",
        user_id: "user-123",
        content: "New comment content",
      };
      getMock().setMockData("comments", []);

      const result = await commentsApi.createComment(newComment);

      expect(result.content).toBe("New comment content");
      expect(result.task_id).toBe("task-123");
    });

    it("should make insert and select calls", async () => {
      const newComment = {
        task_id: "task-123",
        user_id: "user-123",
        content: "Test content",
      };
      getMock().setMockData("comments", []);

      await commentsApi.createComment(newComment);

      const calls = getMock().getMockCalls("comments");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });

    it("should create mentions when provided", async () => {
      const newComment = {
        task_id: "task-123",
        user_id: "user-123",
        content: "@john @jane test",
      };
      getMock().setMockData("comments", []);
      getMock().setMockData("comment_mentions", []);

      await commentsApi.createComment(newComment, ["user-john", "user-jane"]);

      const mentionCalls = getMock().getMockCalls("comment_mentions");
      expect(mentionCalls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should not create mentions when array is empty", async () => {
      const newComment = {
        task_id: "task-123",
        user_id: "user-123",
        content: "No mentions here",
      };
      getMock().setMockData("comments", []);
      getMock().setMockData("comment_mentions", []);

      await commentsApi.createComment(newComment, []);

      const mentionCalls = getMock().getMockCalls("comment_mentions");
      expect(mentionCalls.some((c) => c.method === "insert")).toBe(false);
    });
  });

  // ============================================================================
  // UPDATE COMMENT
  // ============================================================================

  describe("updateComment", () => {
    it("should update a comment", async () => {
      const existingComment = createComment({ id: "c-123", content: "Old content" });
      getMock().setMockData("comments", [existingComment]);

      const result = await commentsApi.updateComment("c-123", { content: "Updated content" });

      expect(result.content).toBe("Updated content");
    });

    it("should make update, eq, select, and single calls", async () => {
      const existingComment = createComment({ id: "c-123" });
      getMock().setMockData("comments", [existingComment]);

      await commentsApi.updateComment("c-123", { content: "New content" });

      const calls = getMock().getMockCalls("comments");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // DELETE COMMENT
  // ============================================================================

  describe("deleteComment", () => {
    it("should delete a comment", async () => {
      const existingComment = createComment({ id: "c-123" });
      getMock().setMockData("comments", [existingComment]);

      await commentsApi.deleteComment("c-123");

      const calls = getMock().getMockCalls("comments");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE COMMENT MENTIONS
  // ============================================================================

  describe("updateCommentMentions", () => {
    it("should delete existing mentions and create new ones", async () => {
      getMock().setMockData("comment_mentions", [
        { id: "m-1", comment_id: "c-123", user_id: "user-old" },
      ]);

      await commentsApi.updateCommentMentions("c-123", ["user-new-1", "user-new-2"]);

      const calls = getMock().getMockCalls("comment_mentions");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "comment_id")).toBe(true);
      expect(calls.some((c) => c.method === "insert")).toBe(true);
    });

    it("should only delete when new mentions list is empty", async () => {
      getMock().setMockData("comment_mentions", [
        { id: "m-1", comment_id: "c-123", user_id: "user-1" },
      ]);

      await commentsApi.updateCommentMentions("c-123", []);

      const calls = getMock().getMockCalls("comment_mentions");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.filter((c) => c.method === "insert")).toHaveLength(0);
    });
  });

  // ============================================================================
  // GET TASK LAST READ
  // ============================================================================

  describe("getTaskLastRead", () => {
    it("should return last read record", async () => {
      const lastRead = createCommentRead({
        task_id: "task-123",
        user_id: "user-123",
        last_read_at: "2025-01-20T10:00:00Z",
      });
      getMock().setMockData("comment_reads", [lastRead]);

      const result = await commentsApi.getTaskLastRead("task-123", "user-123");

      expect(result).not.toBeNull();
      expect(result!.task_id).toBe("task-123");
      expect(result!.user_id).toBe("user-123");
    });

    it("should return null when no read record exists", async () => {
      getMock().setMockData("comment_reads", []);

      const result = await commentsApi.getTaskLastRead("task-123", "user-123");

      expect(result).toBeNull();
    });

    it("should filter by task_id and user_id", async () => {
      getMock().setMockData("comment_reads", []);

      await commentsApi.getTaskLastRead("task-123", "user-123");

      const calls = getMock().getMockCalls("comment_reads");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "task_id")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "user_id")).toBe(true);
    });
  });

  // ============================================================================
  // GET TASK UNREAD COUNT
  // ============================================================================

  describe("getTaskUnreadCount", () => {
    it("should return all comments as unread when never read", async () => {
      getMock().setMockData("comment_reads", []); // Never read
      getMock().setMockData("comments", [
        createComment({ id: "c-1" }),
        createComment({ id: "c-2" }),
      ]);

      const result = await commentsApi.getTaskUnreadCount("task-123", "user-123");

      expect(result).toBe(2);
    });

    it("should return 0 when all comments are read", async () => {
      const now = new Date();
      const lastRead = createCommentRead({
        task_id: "task-123",
        user_id: "user-123",
        last_read_at: now.toISOString(),
      });
      getMock().setMockData("comment_reads", [lastRead]);

      // Comments created before last read
      const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago
      getMock().setMockData("comments", [
        createComment({ id: "c-1", created_at: pastDate.toISOString() }),
      ]);

      const result = await commentsApi.getTaskUnreadCount("task-123", "user-123");

      // With our mock, this will filter correctly - 0 comments after last_read_at
      expect(result).toBe(0);
    });

    it("should query comments with gt filter when last read exists", async () => {
      const lastRead = createCommentRead({
        task_id: "task-123",
        user_id: "user-123",
        last_read_at: "2025-01-20T10:00:00Z",
      });
      getMock().setMockData("comment_reads", [lastRead]);
      getMock().setMockData("comments", []);

      await commentsApi.getTaskUnreadCount("task-123", "user-123");

      const calls = getMock().getMockCalls("comments");
      expect(calls.some((c) => c.method === "gt" && c.args[0] === "created_at")).toBe(true);
    });
  });

  // ============================================================================
  // HAS UNREAD COMMENTS
  // ============================================================================

  describe("hasUnreadComments", () => {
    it("should return true when there are unread comments", async () => {
      getMock().setMockData("comment_reads", []); // Never read
      getMock().setMockData("comments", [createComment({ id: "c-1" })]);

      const result = await commentsApi.hasUnreadComments("task-123", "user-123");

      expect(result).toBe(true);
    });

    it("should return false when there are no unread comments", async () => {
      getMock().setMockData("comment_reads", []);
      getMock().setMockData("comments", []);

      const result = await commentsApi.hasUnreadComments("task-123", "user-123");

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // MARK TASK COMMENTS AS READ
  // ============================================================================

  describe("markTaskCommentsAsRead", () => {
    it("should upsert comment read record", async () => {
      getMock().setMockData("comment_reads", []);

      await commentsApi.markTaskCommentsAsRead("task-123", "user-123");

      const calls = getMock().getMockCalls("comment_reads");
      expect(calls.some((c) => c.method === "upsert")).toBe(true);
    });

    it("should include task_id, user_id, and last_read_at in upsert", async () => {
      getMock().setMockData("comment_reads", []);

      await commentsApi.markTaskCommentsAsRead("task-123", "user-123");

      const calls = getMock().getMockCalls("comment_reads");
      const upsertCall = calls.find((c) => c.method === "upsert");
      expect(upsertCall).toBeDefined();
      expect(upsertCall?.args[0]).toMatchObject({
        task_id: "task-123",
        user_id: "user-123",
      });
      expect(upsertCall?.args[0]).toHaveProperty("last_read_at");
    });
  });

  // ============================================================================
  // GET TASKS COMMENT COUNTS
  // ============================================================================

  describe("getTasksCommentCounts", () => {
    it("should return empty record for empty task IDs array", async () => {
      const result = await commentsApi.getTasksCommentCounts([], "user-123");

      expect(result).toEqual({});
    });

    it("should call RPC with task IDs and user ID", async () => {
      getMock().setMockRpcResult("get_tasks_comment_counts", [
        { task_id: "task-1", total_count: 5, unread_count: 2 },
        { task_id: "task-2", total_count: 3, unread_count: 0 },
      ]);

      const result = await commentsApi.getTasksCommentCounts(["task-1", "task-2"], "user-123");

      expect(result["task-1"]).toEqual({ total: 5, unread: 2 });
      expect(result["task-2"]).toEqual({ total: 3, unread: 0 });
    });

    it("should convert RPC result to record keyed by task_id", async () => {
      getMock().setMockRpcResult("get_tasks_comment_counts", [
        { task_id: "task-abc", total_count: 10, unread_count: 5 },
      ]);

      const result = await commentsApi.getTasksCommentCounts(["task-abc"], "user-123");

      expect(Object.keys(result)).toContain("task-abc");
      expect(result["task-abc"].total).toBe(10);
      expect(result["task-abc"].unread).toBe(5);
    });

    it("should handle RPC returning empty array", async () => {
      getMock().setMockRpcResult("get_tasks_comment_counts", []);

      const result = await commentsApi.getTasksCommentCounts(["task-1"], "user-123");

      expect(result).toEqual({});
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getTaskComments fails", async () => {
      getMock().setMockError("comments", new Error("Database error"));

      await expect(commentsApi.getTaskComments("task-123")).rejects.toThrow();
    });

    it("should throw error when getTaskCommentCount fails", async () => {
      getMock().setMockError("comments", new Error("Database error"));

      await expect(commentsApi.getTaskCommentCount("task-123")).rejects.toThrow();
    });

    it("should throw error when createComment fails", async () => {
      getMock().setMockError("comments", new Error("Database error"));

      await expect(
        commentsApi.createComment({
          task_id: "task-123",
          user_id: "user-123",
          content: "Test",
        })
      ).rejects.toThrow();
    });

    it("should throw error when updateComment fails", async () => {
      getMock().setMockError("comments", new Error("Database error"));

      await expect(
        commentsApi.updateComment("c-123", { content: "Updated" })
      ).rejects.toThrow();
    });

    it("should throw error when deleteComment fails", async () => {
      getMock().setMockError("comments", new Error("Database error"));

      await expect(commentsApi.deleteComment("c-123")).rejects.toThrow();
    });

    it("should throw error when markTaskCommentsAsRead fails", async () => {
      getMock().setMockError("comment_reads", new Error("Database error"));

      await expect(
        commentsApi.markTaskCommentsAsRead("task-123", "user-123")
      ).rejects.toThrow();
    });

    it("should throw error when getTasksCommentCounts RPC fails", async () => {
      getMock().setMockRpcError("get_tasks_comment_counts", new Error("RPC error"));

      await expect(
        commentsApi.getTasksCommentCounts(["task-1"], "user-123")
      ).rejects.toThrow();
    });
  });
});
