import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import * as api from "./api";
import * as notificationApi from "@/features/notifications/api";
import type { CommentInsert, CommentUpdate, NotificationInsert } from "@/lib/supabase/types";

/**
 * Hook to fetch comments for a task
 */
export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: taskId ? queryKeys.comments.byTask(taskId) : [],
    queryFn: () => api.getTaskComments(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Hook to fetch comment count for a task
 */
export function useTaskCommentCount(taskId: string | null) {
  return useQuery({
    queryKey: taskId ? queryKeys.comments.count(taskId) : [],
    queryFn: () => api.getTaskCommentCount(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Hook to create a comment
 * Also creates notifications for mentioned users
 */
export function useCreateComment(taskId: string, planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      mentionedUserIds = [],
    }: {
      data: CommentInsert;
      mentionedUserIds?: string[];
    }) => {
      // Create the comment first
      const comment = await api.createComment(data, mentionedUserIds);

      // Create notifications for mentioned users (excluding the commenter)
      const notificationsToCreate: NotificationInsert[] = mentionedUserIds
        .filter((userId) => userId !== data.user_id)
        .map((userId) => ({
          user_id: userId,
          type: "mentioned" as const,
          plan_id: planId,
          task_id: taskId,
          comment_id: comment.id,
          actor_id: data.user_id,
          read: false,
        }));

      if (notificationsToCreate.length > 0) {
        await notificationApi.createNotifications(notificationsToCreate);
      }

      return comment;
    },
    onSuccess: () => {
      // Invalidate comments list and count
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.byTask(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.count(taskId),
      });
    },
  });
}

/**
 * Hook to update a comment
 */
export function useUpdateComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      data,
      mentionedUserIds,
    }: {
      commentId: string;
      data: CommentUpdate;
      mentionedUserIds?: string[];
    }) =>
      Promise.all([
        api.updateComment(commentId, data),
        mentionedUserIds !== undefined
          ? api.updateCommentMentions(commentId, mentionedUserIds)
          : Promise.resolve(),
      ]),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.byTask(taskId),
      });
    },
  });
}

/**
 * Hook to delete a comment
 */
export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => api.deleteComment(commentId),
    onSuccess: () => {
      // Invalidate comments list and count
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.byTask(taskId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.count(taskId),
      });
    },
  });
}

// ============================================================================
// UNREAD TRACKING HOOKS
// ============================================================================

/**
 * Hook to get unread comment count for a single task
 */
export function useTaskUnreadCount(taskId: string | null, userId: string | null) {
  return useQuery({
    queryKey: taskId && userId ? queryKeys.comments.unreadCount(taskId, userId) : [],
    queryFn: () => api.getTaskUnreadCount(taskId!, userId!),
    enabled: !!taskId && !!userId,
  });
}

/**
 * Hook to get comment counts (total and unread) for multiple tasks
 * Used when rendering task list to show badges
 */
export function useTasksCommentCounts(taskIds: string[], userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.comments.unreadCounts(userId) : [],
    queryFn: () => api.getTasksCommentCounts(taskIds, userId!),
    enabled: !!userId && taskIds.length > 0,
    // Keep data fresh but don't refetch too often
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to mark comments on a task as read
 * Called when user opens the comments dialog
 */
export function useMarkTaskCommentsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      api.markTaskCommentsAsRead(taskId, userId),
    onSuccess: (_, { taskId, userId }) => {
      // Invalidate unread counts
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.unreadCount(taskId, userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.unreadCounts(userId),
      });
    },
  });
}
