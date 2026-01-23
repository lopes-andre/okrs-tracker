import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type {
  Comment,
  CommentInsert,
  CommentUpdate,
  CommentWithUser,
} from "@/lib/supabase/types";

/**
 * Get all comments for a task with user info and mentions
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
    .order("created_at", { ascending: true });

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
