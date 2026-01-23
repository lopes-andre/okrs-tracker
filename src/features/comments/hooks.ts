import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import * as api from "./api";
import type { CommentInsert, CommentUpdate } from "@/lib/supabase/types";

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
 */
export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      data,
      mentionedUserIds = [],
    }: {
      data: CommentInsert;
      mentionedUserIds?: string[];
    }) => api.createComment(data, mentionedUserIds),
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
