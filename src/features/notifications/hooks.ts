"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { createClient } from "@/lib/supabase/client";
import * as api from "./api";
import type { NotificationInsert } from "@/lib/supabase/types";

/**
 * Hook to fetch notifications for the current user
 */
export function useNotifications(
  userId: string | null,
  options: { limit?: number; unreadOnly?: boolean } = {}
) {
  return useQuery({
    queryKey: userId ? queryKeys.notifications.list(userId) : [],
    queryFn: () => api.getNotifications(userId!, options),
    enabled: !!userId,
    // Refetch more frequently for notifications
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadNotificationCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.notifications.unreadCount(userId) : [],
    queryFn: () => api.getUnreadCount(userId!),
    enabled: !!userId,
    // Refetch frequently for the badge
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to subscribe to real-time notifications
 * Automatically updates the query cache when new notifications arrive
 */
export function useNotificationsRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    // Subscribe to new notifications for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate queries to refetch with new notification
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.list(userId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.unreadCount(userId),
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch when notifications are marked as read
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.list(userId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.unreadCount(userId),
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch when notifications are deleted
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.list(userId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.unreadCount(userId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * Hook to mark a notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => api.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("No user ID");
      return api.markAllAsRead(userId);
    },
    onSuccess: () => {
      if (!userId) return;
      // Invalidate notification queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.list(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(userId),
      });
    },
  });
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => api.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}

/**
 * Hook to create notifications (used by other features)
 */
export function useCreateNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotificationInsert[]) => api.createNotifications(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}
