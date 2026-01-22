"use client";

import { useEffect } from "react";
import {
  useTaskReminderSettings,
  useReminderScheduler,
  useServiceWorker,
  useNotificationPermission,
} from "@/features/task-reminders";

interface ReminderProviderProps {
  planId: string;
  children: React.ReactNode;
}

/**
 * ReminderProvider wraps the plan pages and handles:
 * - Service worker registration
 * - Reminder scheduling based on settings
 * - Background notification checks
 */
export function ReminderProvider({ planId, children }: ReminderProviderProps) {
  const { data: settings, isLoading } = useTaskReminderSettings(planId);
  const { isRegistered } = useServiceWorker();
  const { isGranted } = useNotificationPermission();

  // Only enable scheduler when:
  // 1. Settings are loaded
  // 2. Reminders are enabled in settings
  // 3. Service worker is registered
  // 4. Notification permission is granted
  const schedulerEnabled =
    !isLoading &&
    !!settings?.reminders_enabled &&
    isRegistered &&
    isGranted;

  // Run the reminder scheduler
  useReminderScheduler({
    planId,
    enabled: schedulerEnabled,
    settings,
  });

  // Log when reminders are active (for debugging, can be removed in production)
  useEffect(() => {
    if (schedulerEnabled) {
      console.log("[Reminders] Scheduler active for plan:", planId);
    }
  }, [schedulerEnabled, planId]);

  return <>{children}</>;
}
