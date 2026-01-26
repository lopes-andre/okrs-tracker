"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { warningMessages } from "./toast-utils";

// ============================================================================
// ONLINE STATUS HOOK
// ============================================================================

/**
 * Hook to detect online/offline status.
 * Returns current status and utilities for checking connection.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state from navigator
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    function handleOnline() {
      setIsOnline(true);
      // Track that we recovered from offline
      setWasOffline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const clearWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    clearWasOffline,
  };
}

// ============================================================================
// ONLINE STATUS CONTEXT
// ============================================================================

interface OnlineStatusContextValue {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  clearWasOffline: () => void;
}

const OnlineStatusContext = createContext<OnlineStatusContextValue | null>(null);

/**
 * Provider for online status context.
 * Shows toast notifications when connection status changes.
 */
export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const { isOnline, isOffline, wasOffline, clearWasOffline } = useOnlineStatus();
  const { toast } = useToast();

  // Show toast when going offline
  useEffect(() => {
    if (isOffline) {
      toast(warningMessages.offline);
    }
  }, [isOffline, toast]);

  // Show toast when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      toast({
        title: "Back online",
        description: "Your connection has been restored.",
        variant: "success",
      });
      clearWasOffline();
    }
  }, [wasOffline, isOnline, toast, clearWasOffline]);

  return (
    <OnlineStatusContext.Provider value={{ isOnline, isOffline, wasOffline, clearWasOffline }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

/**
 * Hook to access online status from context.
 * Must be used within OnlineStatusProvider.
 */
export function useOnlineStatusContext() {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error("useOnlineStatusContext must be used within OnlineStatusProvider");
  }
  return context;
}

// ============================================================================
// OFFLINE INDICATOR COMPONENT
// ============================================================================

/**
 * Offline indicator banner.
 * Shows a persistent warning when the app is offline.
 */
export function OfflineIndicator() {
  const { isOffline } = useOnlineStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-status-warning text-white py-2 px-4 text-center text-sm">
      <span className="inline-flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        You&apos;re offline. Some features may not work until you reconnect.
      </span>
    </div>
  );
}
