"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getQueryKeysToInvalidate, DEFAULT_REALTIME_TABLES } from "./invalidation-map";
import type { RealtimeTable, RealtimeEvent, PresenceState } from "./types";

interface UseRealtimeSyncOptions {
  planId: string;
  userId?: string;
  userEmail?: string;
  userFullName?: string | null;
  tables?: RealtimeTable[];
  enabled?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
  onConnectionChange?: (status: "connected" | "disconnected" | "reconnecting") => void;
}

interface UseRealtimeSyncReturn {
  isConnected: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  onlineUsers: PresenceState[];
  trackPresence: (page?: string) => void;
}

/**
 * Hook for subscribing to real-time database changes for a plan.
 * Automatically invalidates React Query cache when data changes.
 */
export function useRealtimeSync({
  planId,
  userId,
  userEmail,
  userFullName,
  tables = DEFAULT_REALTIME_TABLES,
  enabled = true,
  onEvent,
  onConnectionChange,
}: UseRealtimeSyncOptions): UseRealtimeSyncReturn {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("disconnected");
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const currentPageRef = useRef<string | undefined>(undefined);

  // Handle incoming database changes
  const handleDatabaseChange = useCallback(
    (
      table: RealtimeTable,
      payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ) => {
      const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";

      // Get query keys to invalidate
      const queryKeysToInvalidate = getQueryKeysToInvalidate(
        table,
        eventType,
        payload,
        planId
      );

      // Invalidate each query key
      queryKeysToInvalidate.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
      });

      // Call custom event handler if provided
      if (onEvent) {
        onEvent({
          table,
          eventType,
          new: payload.new as Record<string, unknown> | null,
          old: payload.old as Record<string, unknown> | null,
          schema: payload.schema,
          commit_timestamp: payload.commit_timestamp,
        });
      }
    },
    [planId, queryClient, onEvent]
  );

  // Track user presence on a specific page
  const trackPresence = useCallback(
    (page?: string) => {
      currentPageRef.current = page;
      if (channelRef.current && userId) {
        channelRef.current.track({
          oduserId: userId,
          email: userEmail || "",
          fullName: userFullName || null,
          avatarUrl: null,
          onlineAt: new Date().toISOString(),
          currentPage: page,
        });
      }
    },
    [userId, userEmail, userFullName]
  );

  // Set up subscriptions
  useEffect(() => {
    if (!enabled || !planId) {
      return;
    }

    const supabase = createClient();
    const channelName = `plan:${planId}`;

    // Create the channel
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId || "anonymous",
        },
      },
    });

    // Subscribe to postgres changes for each table
    tables.forEach((table) => {
      // For tables with plan_id column, filter by plan_id
      const tablesWithPlanId = [
        "objectives",
        "tasks",
        "plan_members",
        "activity_events",
        "dashboards",
        "tags",
        "weekly_reviews",
      ];

      if (tablesWithPlanId.includes(table)) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `plan_id=eq.${planId}`,
          },
          (payload) => handleDatabaseChange(table, payload)
        );
      } else {
        // For tables without plan_id (annual_krs, quarter_targets, check_ins, dashboard_widgets)
        // We subscribe to all changes and filter client-side based on related data
        // This is less efficient but necessary due to schema design
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          (payload) => {
            // For these tables, we still process all events for now
            // In a production app, you might use database functions to filter
            handleDatabaseChange(table, payload);
          }
        );
      }
    });

    // Set up presence tracking
    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const users: PresenceState[] = [];

        Object.values(presenceState).forEach((presences) => {
          if (Array.isArray(presences)) {
            presences.forEach((presence) => {
              // Cast to unknown first, then to our type
              const p = presence as unknown as PresenceState;
              if (p.oduserId) {
                users.push(p);
              }
            });
          }
        });

        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, () => {
        // Handle user joining - presence sync will update the list
      })
      .on("presence", { event: "leave" }, () => {
        // Handle user leaving - presence sync will update the list
      });

    // Subscribe and track connection status
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setConnectionStatus("connected");
        onConnectionChange?.("connected");

        // Track presence after subscription
        if (userId) {
          await channel.track({
            oduserId: userId,
            email: userEmail || "",
            fullName: userFullName || null,
            avatarUrl: null,
            onlineAt: new Date().toISOString(),
            currentPage: currentPageRef.current,
          });
        }
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setConnectionStatus("disconnected");
        onConnectionChange?.("disconnected");
      } else if (status === "TIMED_OUT") {
        setConnectionStatus("reconnecting");
        onConnectionChange?.("reconnecting");
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setConnectionStatus("disconnected");
      setOnlineUsers([]);
    };
  }, [
    planId,
    userId,
    userEmail,
    userFullName,
    tables,
    enabled,
    handleDatabaseChange,
    onConnectionChange,
  ]);

  return {
    isConnected: connectionStatus === "connected",
    connectionStatus,
    onlineUsers,
    trackPresence,
  };
}
