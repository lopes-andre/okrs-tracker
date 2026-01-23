import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type {
  Comment,
  CommentInsert,
  CommentUpdate,
  CommentWithUser,
  CommentRead,
} from "@/lib/supabase/types";

/**
 * Get all comments for a task with user info and mentions
 * Sorted by most recent first
 */
export async function getTaskComments(taskId: string): Promise<CommentWithUser[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(`
      *,
      user:profiles!comments_user_id_fkey(id, email, full_name, avatar_url),
      mentions:comment_mentions(
        id,
        user_id,
        user:profiles!comment_mentions_user_id_fkey(id, email, full_name, avatar_url)
      )
    `)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as CommentWithUser[];
}

/**
 * Get comment count for a task
 */
export async function getTaskCommentCount(taskId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("task_id", taskId);

  if (error) throw error;
  return count || 0;
}

/**
 * Create a new comment with optional mentions
 */
export async function createComment(
  data: CommentInsert,
  mentionedUserIds: string[] = []
): Promise<Comment> {
  const supabase = createClient();

  // Create the comment
  const { data: comment, error } = await supabase
    .from("comments")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  if (!comment) throw new Error("Failed to create comment");

  // Create mentions if any
  if (mentionedUserIds.length > 0) {
    const mentions = mentionedUserIds.map((userId) => ({
      comment_id: comment.id,
      user_id: userId,
    }));

    await supabase.from("comment_mentions").insert(mentions);
  }

  return comment as Comment;
}

/**
 * Update a comment (own comments only)
 */
export async function updateComment(
  commentId: string,
  data: CommentUpdate
): Promise<Comment> {
  const supabase = createClient();

  const { data: comment, error } = await supabase
    .from("comments")
    .update(data)
    .eq("id", commentId)
    .select()
    .single();

  if (error) throw error;
  if (!comment) throw new Error("Comment not found");

  return comment as Comment;
}

/**
 * Delete a comment (own comments or plan owner)
 */
export async function deleteComment(commentId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
}

/**
 * Update mentions for a comment (when editing)
 */
export async function updateCommentMentions(
  commentId: string,
  mentionedUserIds: string[]
): Promise<void> {
  const supabase = createClient();

  // Delete existing mentions
  await supabase
    .from("comment_mentions")
    .delete()
    .eq("comment_id", commentId);

  // Create new mentions
  if (mentionedUserIds.length > 0) {
    const mentions = mentionedUserIds.map((userId) => ({
      comment_id: commentId,
      user_id: userId,
    }));

    await supabase.from("comment_mentions").insert(mentions);
  }
}

// ============================================================================
// UNREAD TRACKING
// ============================================================================

/**
 * Get the user's last read timestamp for a task
 */
export async function getTaskLastRead(
  taskId: string,
  userId: string
): Promise<CommentRead | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("comment_reads")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data as CommentRead | null;
}

/**
 * Get count of unread comments for a task
 * Comments created after the user's last read timestamp are considered unread
 */
export async function getTaskUnreadCount(
  taskId: string,
  userId: string
): Promise<number> {
  const supabase = createClient();

  // Get last read timestamp
  const lastRead = await getTaskLastRead(taskId, userId);

  if (!lastRead) {
    // User has never viewed this task's comments - all are unread
    const { count, error } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("task_id", taskId);

    if (error) throw error;
    return count || 0;
  }

  // Count comments created after last read
  const { count, error } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("task_id", taskId)
    .gt("created_at", lastRead.last_read_at);

  if (error) throw error;
  return count || 0;
}

/**
 * Check if a task has any unread comments for a user
 */
export async function hasUnreadComments(
  taskId: string,
  userId: string
): Promise<boolean> {
  const count = await getTaskUnreadCount(taskId, userId);
  return count > 0;
}

/**
 * Mark all comments on a task as read for a user
 * Called when user opens the comments dialog
 */
export async function markTaskCommentsAsRead(
  taskId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("comment_reads")
    .upsert(
      {
        task_id: taskId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "task_id,user_id" }
    );

  if (error) throw error;
}

/**
 * Comment counts for a task
 */
export interface TaskCommentCounts {
  total: number;
  unread: number;
}

/**
 * Get comment counts (total and unread) for multiple tasks at once
 * Uses a server-side SQL function for efficient aggregation
 */
export async function getTasksCommentCounts(
  taskIds: string[],
  userId: string
): Promise<Record<string, TaskCommentCounts>> {
  if (taskIds.length === 0) return {};

  const supabase = createClient();

  // Call the server-side function that does efficient SQL aggregation
  const { data, error } = await supabase.rpc("get_tasks_comment_counts", {
    p_task_ids: taskIds,
    p_user_id: userId,
  });

  if (error) throw error;

  // Convert array result to record keyed by task_id
  const counts: Record<string, TaskCommentCounts> = {};
  for (const row of data || []) {
    counts[row.task_id] = {
      total: Number(row.total_count),
      unread: Number(row.unread_count),
    };
  }

  return counts;
}
