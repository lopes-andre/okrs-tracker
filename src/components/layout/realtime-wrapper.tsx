"use client";

import { type ReactNode } from "react";
import { RealtimeProvider } from "@/lib/realtime";

interface RealtimeWrapperProps {
  children: ReactNode;
  planId: string;
  userId?: string;
  userEmail?: string;
  userFullName?: string | null;
}

/**
 * Client wrapper for RealtimeProvider to be used in server component layouts.
 * Enables real-time collaboration features for all pages within a plan.
 */
export function RealtimeWrapper({
  children,
  planId,
  userId,
  userEmail,
  userFullName,
}: RealtimeWrapperProps) {
  return (
    <RealtimeProvider
      planId={planId}
      userId={userId}
      userEmail={userEmail}
      userFullName={userFullName}
      enabled={!!userId} // Only enable if user is logged in
    >
      {children}
    </RealtimeProvider>
  );
}
