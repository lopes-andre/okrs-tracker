"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRealtimeSync } from "./use-realtime-sync";
import type { PresenceState, RealtimeEvent } from "./types";

interface RealtimeContextValue {
  isConnected: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  onlineUsers: PresenceState[];
  trackPresence: (page?: string) => void;
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

  const {
    isConnected,
    connectionStatus,
    onlineUsers,
    trackPresence,
  } = useRealtimeSync({
    planId,
    userId,
    userEmail,
    userFullName,
    enabled,
    onEvent,
    onConnectionChange: (status) => {
      // Show reconnecting indicator after a short delay
      if (status === "reconnecting") {
        setShowReconnecting(true);
      } else {
        setShowReconnecting(false);
      }
    },
  });

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        connectionStatus,
        onlineUsers,
        trackPresence,
      }}
    >
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
