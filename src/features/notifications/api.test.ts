/**
 * Notifications API Unit Tests
 *
 * Tests for notification CRUD operations and read status tracking.
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
import * as notificationsApi from "./api";

// Helper to get current mock
const getMock = () => mockRef.current!;

// ============================================================================
// TEST HELPERS
// ============================================================================

function createNotification(overrides: Partial<{
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actor_id: string | null;
  task_id: string | null;
  comment_id: string | null;
  created_at: string;
}> = {}) {
  return {
    id: overrides.id || `notif-${Math.random().toString(36).slice(2)}`,
    user_id: overrides.user_id || "user-123",
    type: overrides.type || "mention",
    title: overrides.title || "New notification",
    message: overrides.message || "You have a new notification",
    read: overrides.read ?? false,
    actor_id: overrides.actor_id || null,
    task_id: overrides.task_id || null,
    comment_id: overrides.comment_id || null,
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

function createNotificationWithDetails(overrides: Partial<{
  id: string;
  user_id: string;
  type: string;
  read: boolean;
}> = {}) {
  const notification = createNotification(overrides);
  return {
    ...notification,
    actor: notification.actor_id ? {
      id: notification.actor_id,
      email: "actor@example.com",
      full_name: "Actor User",
      avatar_url: null,
    } : null,
    task: notification.task_id ? {
      id: notification.task_id,
      title: "Task Title",
    } : null,
    comment: notification.comment_id ? {
      id: notification.comment_id,
      content: "Comment content",
    } : null,
  };
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Notifications API", () => {
  beforeEach(() => {
    mockRef.current = createMockSupabase();
  });

  afterEach(() => {
    getMock().clearMocks();
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET NOTIFICATIONS
  // ============================================================================

  describe("getNotifications", () => {
    it("should fetch notifications for a user", async () => {
      const notif1 = createNotificationWithDetails({ id: "n-1", user_id: "user-123" });
      const notif2 = createNotificationWithDetails({ id: "n-2", user_id: "user-123" });
      getMock().setMockData("notifications", [notif1, notif2]);

      const result = await notificationsApi.getNotifications("user-123");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no notifications", async () => {
      getMock().setMockData("notifications", []);

      const result = await notificationsApi.getNotifications("user-123");

      expect(result).toEqual([]);
    });

    it("should filter by user_id", async () => {
      const userNotif = createNotificationWithDetails({ id: "n-1", user_id: "user-123" });
      const otherNotif = createNotificationWithDetails({ id: "n-2", user_id: "other-user" });
      getMock().setMockData("notifications", [userNotif, otherNotif]);

      const result = await notificationsApi.getNotifications("user-123");

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe("user-123");
    });

    it("should apply limit", async () => {
      getMock().setMockData("notifications", []);

      await notificationsApi.getNotifications("user-123", { limit: 10 });

      const calls = getMock().getMockCalls("notifications");
      expect(calls.some((c) => c.method === "limit" && c.args[0] === 10)).toBe(true);
    });

    it("should use default limit of 50", async () => {
      getMock().setMockData("notifications", []);

      await notificationsApi.getNotifications("user-123");

      const calls = getMock().getMockCalls("notifications");
      expect(calls.some((c) => c.method === "limit" && c.args[0] === 50)).toBe(true);
    });

    it("should filter unread only when specified", async () => {
      const unreadNotif = createNotificationWithDetails({ id: "n-1", user_id: "user-123", read: false });
      const readNotif = createNotificationWithDetails({ id: "n-2", user_id: "user-123", read: true });
      getMock().setMockData("notifications", [unreadNotif, readNotif]);

      const result = await notificationsApi.getNotifications("user-123", { unreadOnly: true });

      expect(result).toHaveLength(1);
      expect(result[0].read).toBe(false);
    });

    it("should order by created_at descending", async () => {
      getMock().setMockData("notifications", []);

      await notificationsApi.getNotifications("user-123");

      const calls = getMock().getMockCalls("notifications");
      const orderCall = calls.find((c) => c.method === "order");
      expect(orderCall?.args[0]).toBe("created_at");
      expect(orderCall?.args[1]).toEqual({ ascending: false });
    });
  });

  // ============================================================================
  // GET UNREAD COUNT
  // ============================================================================

  describe("getUnreadCount", () => {
    it("should return count of unread notifications", async () => {
      getMock().setMockData("notifications", [
        createNotification({ id: "n-1", user_id: "user-123", read: false }),
        createNotification({ id: "n-2", user_id: "user-123", read: false }),
        createNotification({ id: "n-3", user_id: "user-123", read: true }),
      ]);

      const result = await notificationsApi.getUnreadCount("user-123");

      expect(result).toBe(2);
    });

    it("should return 0 when no unread notifications", async () => {
      getMock().setMockData("notifications", [
        createNotification({ id: "n-1", user_id: "user-123", read: true }),
      ]);

      const result = await notificationsApi.getUnreadCount("user-123");

      expect(result).toBe(0);
    });

    it("should filter by user_id and read=false", async () => {
      getMock().setMockData("notifications", []);

      await notificationsApi.getUnreadCount("user-123");

      const calls = getMock().getMockCalls("notifications");
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "user_id")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "read" && c.args[1] === false)).toBe(true);
    });
  });

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  describe("markAsRead", () => {
    it("should mark a notification as read", async () => {
      const notification = createNotification({ id: "n-123", read: false });
      getMock().setMockData("notifications", [notification]);

      await notificationsApi.markAsRead("n-123");

      const calls = getMock().getMockCalls("notifications");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // MARK ALL AS READ
  // ============================================================================

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read for a user", async () => {
      const unread1 = createNotification({ id: "n-1", user_id: "user-123", read: false });
      const unread2 = createNotification({ id: "n-2", user_id: "user-123", read: false });
      getMock().setMockData("notifications", [unread1, unread2]);

      await notificationsApi.markAllAsRead("user-123");

      const calls = getMock().getMockCalls("notifications");
      expect(calls.some((c) => c.method === "update")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "user_id")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "read" && c.args[1] === false)).toBe(true);
    });
  });

  // ============================================================================
  // DELETE NOTIFICATION
  // ============================================================================

  describe("deleteNotification", () => {
    it("should delete a notification", async () => {
      const notification = createNotification({ id: "n-123" });
      getMock().setMockData("notifications", [notification]);

      await notificationsApi.deleteNotification("n-123");

      const calls = getMock().getMockCalls("notifications");
      expect(calls.some((c) => c.method === "delete")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "id")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE NOTIFICATION
  // ============================================================================

  describe("createNotification", () => {
    it("should create a notification", async () => {
      const newNotification = {
        user_id: "user-123",
        type: "mention",
        title: "You were mentioned",
        message: "Someone mentioned you in a comment",
      };
      getMock().setMockData("notifications", []);

      const result = await notificationsApi.createNotification(newNotification);

      expect(result.user_id).toBe("user-123");
      expect(result.type).toBe("mention");
    });

    it("should make insert and select calls", async () => {
      const newNotification = {
        user_id: "user-123",
        type: "assignment",
        title: "Task assigned",
        message: "A task was assigned to you",
      };
      getMock().setMockData("notifications", []);

      await notificationsApi.createNotification(newNotification);

      const calls = getMock().getMockCalls("notifications");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "select")).toBe(true);
      expect(calls.some((c) => c.method === "single")).toBe(true);
    });
  });

  // ============================================================================
  // CREATE NOTIFICATIONS (BULK)
  // ============================================================================

  describe("createNotifications", () => {
    it("should create multiple notifications", async () => {
      const notifications = [
        { user_id: "user-1", type: "mention", title: "Mention 1", message: "Message 1" },
        { user_id: "user-2", type: "mention", title: "Mention 2", message: "Message 2" },
      ];
      getMock().setMockData("notifications", []);

      // Function returns void, not the created notifications
      await expect(notificationsApi.createNotifications(notifications)).resolves.toBeUndefined();
    });

    it("should return early when input is empty", async () => {
      // Should not throw and return undefined
      await expect(notificationsApi.createNotifications([])).resolves.toBeUndefined();
    });

    it("should make insert call (not select, due to RLS)", async () => {
      const notifications = [
        { user_id: "user-1", type: "mention", title: "Test", message: "Test message" },
      ];
      getMock().setMockData("notifications", []);

      await notificationsApi.createNotifications(notifications);

      const calls = getMock().getMockCalls("notifications");
      expect(calls.some((c) => c.method === "insert")).toBe(true);
      // No select call - RLS prevents reading notifications for other users
      expect(calls.some((c) => c.method === "select")).toBe(false);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when getNotifications fails", async () => {
      getMock().setMockError("notifications", new Error("Database error"));

      await expect(notificationsApi.getNotifications("user-123")).rejects.toThrow();
    });

    it("should throw error when getUnreadCount fails", async () => {
      getMock().setMockError("notifications", new Error("Database error"));

      await expect(notificationsApi.getUnreadCount("user-123")).rejects.toThrow();
    });

    it("should throw error when markAsRead fails", async () => {
      getMock().setMockError("notifications", new Error("Database error"));

      await expect(notificationsApi.markAsRead("n-123")).rejects.toThrow();
    });

    it("should throw error when markAllAsRead fails", async () => {
      getMock().setMockError("notifications", new Error("Database error"));

      await expect(notificationsApi.markAllAsRead("user-123")).rejects.toThrow();
    });

    it("should throw error when deleteNotification fails", async () => {
      getMock().setMockError("notifications", new Error("Database error"));

      await expect(notificationsApi.deleteNotification("n-123")).rejects.toThrow();
    });

    it("should throw error when createNotification fails", async () => {
      getMock().setMockError("notifications", new Error("Database error"));

      await expect(
        notificationsApi.createNotification({
          user_id: "user-123",
          type: "mention",
          title: "Test",
          message: "Test message",
        })
      ).rejects.toThrow();
    });

    it("should throw error when createNotifications fails", async () => {
      getMock().setMockError("notifications", new Error("Database error"));

      await expect(
        notificationsApi.createNotifications([
          { user_id: "user-123", type: "mention", title: "Test", message: "Test" },
        ])
      ).rejects.toThrow();
    });
  });
});
