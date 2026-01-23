"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRealtimeSync } from "./use-realtime-sync";
import type { PresenceState, RealtimeEvent, EditableEntityType } from "./types";

interface RealtimeContextValue {
  isConnected: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  onlineUsers: PresenceState[];
  trackPresence: (page?: string) => void;
  trackEditing: (entityType: EditableEntityType | null, entityId: string | null) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
  planId: string;
  userId?: string;
  userEmail?: string;
  userFullName?: string | null;
  enabled?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
}

/**
 * Provider component that sets up real-time subscriptions for a plan.
 * Wrap plan pages with this to enable real-time collaboration features.
 */
export function RealtimeProvider({
  children,
  planId,
  userId,
  userEmail,
  userFullName,
  enabled = true,
  onEvent,
}: RealtimeProviderProps) {
  const [showReconnecting, setShowReconnecting] = useState(false);

  // Stable callback for connection status changes
  const handleConnectionChange = useCallback((status: "connected" | "disconnected" | "reconnecting") => {
    if (status === "reconnecting") {
      setShowReconnecting(true);
    } else {
      setShowReconnecting(false);
    }
  }, []);

  const {
    isConnected,
    connectionStatus,
    onlineUsers,
    trackPresence,
    trackEditing,
  } = useRealtimeSync({
    planId,
    userId,
    userEmail,
    userFullName,
    enabled,
    onEvent,
    onConnectionChange: handleConnectionChange,
  });

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isConnected,
      connectionStatus,
      onlineUsers,
      trackPresence,
      trackEditing,
    }),
    [isConnected, connectionStatus, onlineUsers, trackPresence, trackEditing]
  );

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
      {/* Connection status indicator */}
      {showReconnecting && (
        <div className="fixed bottom-4 left-4 z-50 bg-status-warning text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Reconnecting...
        </div>
      )}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to access real-time context values.
 * Must be used within a RealtimeProvider.
 */
export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);

  if (!context) {
    // Return a default value if not within provider
    // This allows the hook to be used safely outside the provider
    return {
      isConnected: false,
      connectionStatus: "disconnected",
      onlineUsers: [],
      trackPresence: () => {},
      trackEditing: () => {},
    };
  }

  return context;
}

/**
 * Hook to track the current page for presence.
 * Call this in page components to update presence with current location.
 */
export function usePresenceTracking(page: string) {
  const { trackPresence } = useRealtime();

  useEffect(() => {
    trackPresence(page);
  }, [page, trackPresence]);
}

/**
 * Hook to track editing state for an entity.
 * Automatically clears editing state when the component unmounts.
 *
 * @param entityType - The type of entity being edited (or null to stop tracking)
 * @param entityId - The ID of the entity being edited (or null to stop tracking)
 */
export function useEditingTracker(
  entityType: EditableEntityType | null,
  entityId: string | null
) {
  const { trackEditing } = useRealtime();

  useEffect(() => {
    if (entityType && entityId) {
      trackEditing(entityType, entityId);
    }

    // Clear editing state when unmounting or when entity changes
    return () => {
      trackEditing(null, null);
    };
  }, [entityType, entityId, trackEditing]);
}

/**
 * Hook to get users currently editing a specific entity.
 * Returns an array of users (excluding the current user) who are editing the entity.
 *
 * @param entityType - The type of entity to check
 * @param entityId - The ID of the entity to check
 * @param currentUserId - The current user's ID (to exclude from results)
 */
export function useEditingUsers(
  entityType: EditableEntityType,
  entityId: string,
  currentUserId?: string
): PresenceState[] {
  const { onlineUsers } = useRealtime();

  return useMemo(() => {
    return onlineUsers.filter((user) => {
      // Exclude current user
      if (currentUserId && user.oduserId === currentUserId) {
        return false;
      }
      // Check if editing this entity
      return (
        user.editing?.entityType === entityType &&
        user.editing?.entityId === entityId
      );
    });
  }, [onlineUsers, entityType, entityId, currentUserId]);
}
