import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type {
  Notification,
  NotificationInsert,
  NotificationWithDetails,
} from "@/lib/supabase/types";

/**
 * Get notifications for a user with related details
 */
export async function getNotifications(
  userId: string,
  options: {
    limit?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<NotificationWithDetails[]> {
  const supabase = createClient();
  const { limit = 50, unreadOnly = false } = options;

  let query = supabase
    .from("notifications")
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(id, email, full_name, avatar_url),
      task:tasks(id, title),
      comment:comments(id, content)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as NotificationWithDetails[];
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
  return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
}

/**
 * Create a notification
 * Used internally when events occur (comments, assignments, etc.)
 */
export async function createNotification(
  data: NotificationInsert
): Promise<Notification> {
  const supabase = createClient();

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return notification as Notification;
}

/**
 * Create multiple notifications at once
 * Used when an action affects multiple users (e.g., comment on task with multiple assignees)
 * Note: Does not return created notifications because RLS prevents reading
 * notifications for other users.
 */
export async function createNotifications(
  data: NotificationInsert[]
): Promise<void> {
  if (data.length === 0) return;

  const supabase = createClient();

  // Don't use .select() - the creator can't read notifications for other users
  const { error } = await supabase
    .from("notifications")
    .insert(data);

  if (error) throw error;
}
