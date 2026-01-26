"use client";

import { ReactNode } from "react";
import { OnlineStatusProvider, OfflineIndicator } from "@/lib/use-online-status";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers that need to be at the app root.
 * Includes online status detection and other client-only features.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <OnlineStatusProvider>
      {children}
      <OfflineIndicator />
    </OnlineStatusProvider>
  );
}
