"use client";

import { useEffect, useState } from "react";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * - Notification permission banner
 */
export function ReminderProvider({ planId, children }: ReminderProviderProps) {
  const { data: settings, isLoading } = useTaskReminderSettings(planId);
  const { isRegistered } = useServiceWorker();
  const { isGranted, isDenied, isSupported, requestPermission } = useNotificationPermission();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Enable scheduler when settings are loaded and reminders are enabled
  // DO NOT require notification permission - in-app toasts work without it
  // DO NOT require service worker - it's only for background notifications
  const schedulerEnabled =
    !isLoading &&
    !!settings?.reminders_enabled;

  // Run the reminder scheduler
  useReminderScheduler({
    planId,
    enabled: schedulerEnabled,
    settings,
  });

  // Debug logging
  useEffect(() => {
    console.log("[Reminders] Provider state:", {
      isLoading,
      settingsLoaded: !!settings,
      remindersEnabled: settings?.reminders_enabled,
      serviceWorkerRegistered: isRegistered,
      notificationPermission: isGranted ? "granted" : isDenied ? "denied" : "default",
      schedulerEnabled,
    });
  }, [isLoading, settings, isRegistered, isGranted, isDenied, schedulerEnabled]);

  useEffect(() => {
    if (schedulerEnabled) {
      console.log("[Reminders] Scheduler is now ACTIVE for plan:", planId);
    }
  }, [schedulerEnabled, planId]);

  // Show notification permission banner if:
  // - Notifications are supported
  // - Permission not yet granted or denied
  // - Banner not dismissed
  // - Reminders are enabled in settings
  const showBanner =
    isSupported &&
    !isGranted &&
    !isDenied &&
    !bannerDismissed &&
    settings?.reminders_enabled;

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === "granted") {
      setBannerDismissed(true);
    }
  };

  return (
    <>
      {showBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-bg-0 border border-border rounded-card shadow-lg p-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-strong">Enable Notifications</p>
              <p className="text-small text-text-muted mt-1">
                Get notified when tasks are due. You&apos;ll receive reminders 15, 10, 5 minutes before, and at the due time.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleEnableNotifications}>
                  Enable
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setBannerDismissed(true)}
                >
                  Not now
                </Button>
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="flex-shrink-0 text-text-muted hover:text-text-strong"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
