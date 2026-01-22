"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage } from "@/lib/toast-utils";
import * as api from "./api";
import type { TaskReminderSettingsUpdate } from "@/lib/supabase/types";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const taskReminderKeys = {
  all: ["taskReminders"] as const,
  settings: (planId: string) => [...taskReminderKeys.all, "settings", planId] as const,
  dueSummary: (planId: string) => [...taskReminderKeys.all, "dueSummary", planId] as const,
  tasksWithTime: (planId: string) => [...taskReminderKeys.all, "tasksWithTime", planId] as const,
};

// ============================================================================
// SETTINGS HOOKS
// ============================================================================

/**
 * Get task reminder settings for a plan
 */
export function useTaskReminderSettings(planId: string) {
  return useQuery({
    queryKey: taskReminderKeys.settings(planId),
    queryFn: () => api.getOrCreateTaskReminderSettings(planId),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update task reminder settings
 */
export function useUpdateTaskReminderSettings(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (updates: TaskReminderSettingsUpdate) =>
      api.updateTaskReminderSettings(planId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskReminderKeys.settings(planId) });
      toast({
        title: "Settings saved",
        variant: "success",
      });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// TASK SUMMARY HOOKS
// ============================================================================

/**
 * Get tasks due summary for reminders
 */
export function useTasksDueSummary(planId: string) {
  return useQuery({
    queryKey: taskReminderKeys.dueSummary(planId),
    queryFn: () => api.getTasksDueSummary(planId),
    enabled: !!planId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Get tasks with due time
 */
export function useTasksWithDueTime(planId: string) {
  return useQuery({
    queryKey: taskReminderKeys.tasksWithTime(planId),
    queryFn: () => api.getTasksWithDueTime(planId),
    enabled: !!planId,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// ============================================================================
// NOTIFICATION PERMISSION HOOK
// ============================================================================

export type NotificationPermission = "default" | "granted" | "denied";

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = typeof window !== "undefined" && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return "denied" as NotificationPermission;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return "denied" as NotificationPermission;
    }
  }, [isSupported]);

  return {
    permission,
    isSupported,
    requestPermission,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
  };
}

// ============================================================================
// SERVICE WORKER REGISTRATION HOOK
// ============================================================================

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register the service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        setRegistration(reg);
        setIsRegistered(true);
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  }, []);

  return { registration, isRegistered };
}

// ============================================================================
// NOTIFICATION SENDER HOOK
// ============================================================================

interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: Record<string, unknown>;
}

export function useNotificationSender() {
  const { registration } = useServiceWorker();
  const { isGranted } = useNotificationPermission();

  const sendNotification = useCallback(
    async (title: string, options: NotificationOptions = {}) => {
      if (!isGranted) {
        console.warn("Notification permission not granted");
        return false;
      }

      const defaultOptions: NotificationOptions = {
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        requireInteraction: false,
        silent: false,
        ...options,
      };

      try {
        // Try using service worker for persistent notifications
        if (registration) {
          await registration.showNotification(title, defaultOptions);
          return true;
        }

        // Fallback to regular Notification API
        new Notification(title, defaultOptions);
        return true;
      } catch (error) {
        console.error("Failed to send notification:", error);
        return false;
      }
    },
    [registration, isGranted]
  );

  return { sendNotification, isReady: isGranted };
}

// ============================================================================
// REMINDER SCHEDULER HOOK
// ============================================================================

interface ReminderSchedulerOptions {
  planId: string;
  enabled: boolean;
  settings: ReturnType<typeof useTaskReminderSettings>["data"];
}

export function useReminderScheduler({ planId, enabled, settings }: ReminderSchedulerOptions) {
  const { sendNotification, isReady } = useNotificationSender();
  const { data: dueSummary } = useTasksDueSummary(planId);
  const { data: tasksWithTime } = useTasksWithDueTime(planId);

  // Track which reminders have been sent to avoid duplicates
  const sentReminders = useRef<Set<string>>(new Set());

  // Hourly summary reminder
  useEffect(() => {
    if (!enabled || !isReady || !settings?.hourly_reminders_enabled || !dueSummary) {
      return;
    }

    // Check business hours
    if (settings.business_hours_enabled && !isWithinBusinessHours(settings)) {
      return;
    }

    const checkAndSendHourlySummary = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const summaryKey = `hourly-${now.toDateString()}-${currentHour}`;

      // Only send once per hour
      if (sentReminders.current.has(summaryKey)) {
        return;
      }

      const { dueToday, overdue } = dueSummary;
      if (dueToday > 0 || overdue > 0) {
        let body = "";
        if (dueToday > 0 && overdue > 0) {
          body = `You have ${dueToday} task${dueToday > 1 ? "s" : ""} due today, and ${overdue} task${overdue > 1 ? "s" : ""} late!`;
        } else if (dueToday > 0) {
          body = `You have ${dueToday} task${dueToday > 1 ? "s" : ""} due today!`;
        } else {
          body = `You have ${overdue} task${overdue > 1 ? "s" : ""} late!`;
        }

        sendNotification("Task Reminder", {
          body,
          tag: "hourly-summary",
          data: { url: `/plans/${planId}/tasks` },
        });

        sentReminders.current.add(summaryKey);
      }
    };

    // Check immediately
    checkAndSendHourlySummary();

    // Set up interval to check at the start of each hour
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;

    const timeout = setTimeout(() => {
      checkAndSendHourlySummary();
      // Then check every hour
      const interval = setInterval(checkAndSendHourlySummary, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilNextHour);

    return () => clearTimeout(timeout);
  }, [enabled, isReady, settings, dueSummary, planId, sendNotification]);

  // Time-specific task reminders
  useEffect(() => {
    if (!enabled || !isReady || !settings || !tasksWithTime?.length) {
      return;
    }

    // Check business hours
    if (settings.business_hours_enabled && !isWithinBusinessHours(settings)) {
      return;
    }

    const checkTimeReminders = () => {
      const now = new Date();

      tasksWithTime.forEach((task) => {
        const [hours, minutes] = task.due_time.split(":").map(Number);
        const dueTime = new Date();
        dueTime.setHours(hours, minutes, 0, 0);

        const diffMinutes = Math.round((dueTime.getTime() - now.getTime()) / 60000);

        // 15 minutes before
        if (settings.time_reminder_15min && diffMinutes === 15) {
          const key = `15min-${task.id}`;
          if (!sentReminders.current.has(key)) {
            sendNotification(`"${task.title}" is due in 15 minutes`, {
              body: "Task reminder",
              tag: `task-${task.id}-15min`,
              data: { url: `/plans/${planId}/tasks`, taskId: task.id },
            });
            sentReminders.current.add(key);
          }
        }

        // 10 minutes before
        if (settings.time_reminder_10min && diffMinutes === 10) {
          const key = `10min-${task.id}`;
          if (!sentReminders.current.has(key)) {
            sendNotification(`"${task.title}" is due in 10 minutes`, {
              body: "Task reminder",
              tag: `task-${task.id}-10min`,
              data: { url: `/plans/${planId}/tasks`, taskId: task.id },
            });
            sentReminders.current.add(key);
          }
        }

        // 5 minutes before
        if (settings.time_reminder_5min && diffMinutes === 5) {
          const key = `5min-${task.id}`;
          if (!sentReminders.current.has(key)) {
            sendNotification(`"${task.title}" is due in 5 minutes`, {
              body: "Task reminder",
              tag: `task-${task.id}-5min`,
              data: { url: `/plans/${planId}/tasks`, taskId: task.id },
            });
            sentReminders.current.add(key);
          }
        }

        // 30 minutes overdue
        if (settings.time_reminder_overdue_30min && diffMinutes === -30) {
          const key = `overdue30-${task.id}`;
          if (!sentReminders.current.has(key)) {
            sendNotification(`"${task.title}" is 30 minutes late!`, {
              body: "Overdue task reminder",
              tag: `task-${task.id}-overdue`,
              requireInteraction: true,
              data: { url: `/plans/${planId}/tasks`, taskId: task.id },
            });
            sentReminders.current.add(key);
          }
        }
      });
    };

    // Check every minute
    checkTimeReminders();
    const interval = setInterval(checkTimeReminders, 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, isReady, settings, tasksWithTime, planId, sendNotification]);

  // Clear sent reminders at midnight
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

    const timeout = setTimeout(() => {
      sentReminders.current.clear();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isWithinBusinessHours(settings: {
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_days: number[];
}): boolean {
  if (!settings.business_hours_enabled) return true;

  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday from 0 to 7

  // Check if today is a business day
  if (!settings.business_days.includes(dayOfWeek)) {
    return false;
  }

  // Check if current time is within business hours
  const [startHour, startMin] = settings.business_hours_start.split(":").map(Number);
  const [endHour, endMin] = settings.business_hours_end.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
