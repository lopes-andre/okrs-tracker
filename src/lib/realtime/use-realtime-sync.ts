"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
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
  tables,
  enabled = true,
  onEvent,
  onConnectionChange,
}: UseRealtimeSyncOptions): UseRealtimeSyncReturn {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">("disconnected");
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const currentPageRef = useRef<string | undefined>(undefined);

  // Use refs for callbacks to avoid dependency changes
  const onEventRef = useRef(onEvent);
  const onConnectionChangeRef = useRef(onConnectionChange);

  // Update refs when callbacks change
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  // Memoize tables to prevent re-subscriptions
  const tablesToSubscribe = useMemo(
    () => tables || DEFAULT_REALTIME_TABLES,
    // Only recreate if tables array reference changes and it's provided
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tables ? tables.join(",") : "default"]
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

    // Handle incoming database changes - defined inside useEffect to use current refs
    const handleDatabaseChange = (
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

      // Call custom event handler if provided (using ref)
      if (onEventRef.current) {
        onEventRef.current({
          table,
          eventType,
          new: payload.new as Record<string, unknown> | null,
          old: payload.old as Record<string, unknown> | null,
          schema: payload.schema,
          commit_timestamp: payload.commit_timestamp,
        });
      }
    };

    // Create the channel
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId || "anonymous",
        },
      },
    });

    // Subscribe to postgres changes for each table
    tablesToSubscribe.forEach((table) => {
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
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          (payload) => handleDatabaseChange(table, payload)
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
        onConnectionChangeRef.current?.("connected");

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
        onConnectionChangeRef.current?.("disconnected");
      } else if (status === "TIMED_OUT") {
        setConnectionStatus("reconnecting");
        onConnectionChangeRef.current?.("reconnecting");
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      const currentChannel = channelRef.current;
      if (currentChannel) {
        supabase.removeChannel(currentChannel);
        channelRef.current = null;
      }
      setConnectionStatus("disconnected");
      setOnlineUsers([]);
    };
  }, [planId, userId, userEmail, userFullName, tablesToSubscribe, enabled, queryClient]);

  return {
    isConnected: connectionStatus === "connected",
    connectionStatus,
    onlineUsers,
    trackPresence,
  };
}
