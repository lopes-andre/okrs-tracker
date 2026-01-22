"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
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
    refetchInterval: 60 * 1000, // Refetch every minute
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
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
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
// SOUND PLAYER HOOK
// ============================================================================

export function useReminderSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: "normal" | "urgent" = "normal") => {
    try {
      // Create audio context on demand
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Resume audio context if suspended (browser policy)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === "urgent") {
        // Urgent: Higher pitch, longer duration, double beep
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);

        // Second beep
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(880, ctx.currentTime);
          osc2.type = "sine";
          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.3);
        }, 350);
      } else {
        // Normal: Pleasant notification sound
        oscillator.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
      }
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }, []);

  return { playSound };
}

// ============================================================================
// IN-APP NOTIFICATION CONTEXT
// ============================================================================

export interface ReminderNotification {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "urgent";
  taskId?: string;
  planId?: string;
  timestamp: Date;
  isRead: boolean;
}

interface ReminderNotificationContextValue {
  notifications: ReminderNotification[];
  addNotification: (notification: Omit<ReminderNotification, "id" | "timestamp" | "isRead">) => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

const ReminderNotificationContext = createContext<ReminderNotificationContextValue | null>(null);

export function useReminderNotifications() {
  const context = useContext(ReminderNotificationContext);
  if (!context) {
    throw new Error("useReminderNotifications must be used within ReminderNotificationProvider");
  }
  return context;
}

export { ReminderNotificationContext };

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
  const { playSound } = useReminderSound();
  const { toast } = useToast();

  const sendNotification = useCallback(
    async (
      title: string,
      options: NotificationOptions & { soundEnabled?: boolean; soundType?: "normal" | "urgent" } = {}
    ) => {
      const { soundEnabled = true, soundType = "normal", ...notifOptions } = options;

      // Play sound if enabled
      if (soundEnabled) {
        playSound(soundType);
      }

      // Always show in-app toast notification (highest priority)
      toast({
        title,
        description: notifOptions.body,
        variant: soundType === "urgent" ? "destructive" : "default",
        duration: soundType === "urgent" ? 10000 : 5000, // Longer for urgent
      });

      // Also send system notification if permission granted
      if (isGranted) {
        const defaultOptions: NotificationOptions = {
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          requireInteraction: soundType === "urgent",
          silent: true, // We handle sound ourselves
          ...notifOptions,
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
          console.error("Failed to send system notification:", error);
        }
      }

      return true; // In-app notification always succeeds
    },
    [registration, isGranted, playSound, toast]
  );

  return { sendNotification, isReady: true }; // Always ready for in-app notifications
}

// ============================================================================
// REMINDER SCHEDULER HOOK
// ============================================================================

interface ReminderSchedulerOptions {
  planId: string;
  enabled: boolean;
  settings: ReturnType<typeof useTaskReminderSettings>["data"];
}

// Time window constants (in milliseconds)
const CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

export function useReminderScheduler({ planId, enabled, settings }: ReminderSchedulerOptions) {
  const { sendNotification } = useNotificationSender();
  const { data: dueSummary } = useTasksDueSummary(planId);
  const { refetch: refetchTasks } = useTasksWithDueTime(planId);

  // Track which reminders have been sent to avoid duplicates
  // Key format: "{reminderType}-{taskId}-{date}"
  const sentReminders = useRef<Set<string>>(new Set());
  const lastCheckTime = useRef<number>(0);

  // Hourly summary reminder
  useEffect(() => {
    if (!enabled || !settings?.hourly_reminders_enabled || !dueSummary) {
      return;
    }

    // Check business hours
    if (settings.business_hours_enabled && !isWithinBusinessHours(settings)) {
      return;
    }

    const checkAndSendHourlySummary = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const today = now.toDateString();
      const summaryKey = `hourly-${today}-${currentHour}`;

      // Only send once per hour
      if (sentReminders.current.has(summaryKey)) {
        return;
      }

      // Only send at the top of the hour (within first minute)
      if (now.getMinutes() > 1) {
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
          soundEnabled: settings.sound_enabled,
          soundType: overdue > 0 ? "urgent" : "normal",
          data: { url: `/plans/${planId}/tasks` },
        });

        sentReminders.current.add(summaryKey);
      }
    };

    // Check immediately
    checkAndSendHourlySummary();

    // Check every minute for hourly summaries
    const interval = setInterval(checkAndSendHourlySummary, 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, settings, dueSummary, planId, sendNotification]);

  // Time-specific task reminders
  useEffect(() => {
    if (!enabled || !settings) {
      return;
    }

    const checkTimeReminders = async () => {
      const now = Date.now();

      // Prevent checking too frequently
      if (now - lastCheckTime.current < CHECK_INTERVAL - 1000) {
        return;
      }
      lastCheckTime.current = now;

      // Refetch tasks to get fresh data
      const { data: freshTasks } = await refetchTasks();
      if (!freshTasks?.length) {
        return;
      }

      // Check business hours
      if (settings.business_hours_enabled && !isWithinBusinessHours(settings)) {
        return;
      }

      const nowDate = new Date();
      const today = nowDate.toDateString();

      freshTasks.forEach((task) => {
        const [hours, minutes] = task.due_time.split(":").map(Number);
        const dueTime = new Date();
        dueTime.setHours(hours, minutes, 0, 0);

        const diffMs = dueTime.getTime() - nowDate.getTime();
        const diffMinutes = diffMs / 60000;

        // Helper to check if we should send a reminder
        const shouldSendReminder = (
          targetMinutes: number,
          settingEnabled: boolean,
          keyPrefix: string
        ): boolean => {
          if (!settingEnabled) return false;

          const key = `${keyPrefix}-${task.id}-${today}`;
          if (sentReminders.current.has(key)) return false;

          // Check if we're within the time window for this reminder
          // e.g., for 15-minute reminder: between 14.5 and 15.5 minutes before
          const lowerBound = targetMinutes - 0.5;
          const upperBound = targetMinutes + 0.5;

          if (diffMinutes >= lowerBound && diffMinutes <= upperBound) {
            sentReminders.current.add(key);
            return true;
          }

          return false;
        };

        // 15 minutes before
        if (shouldSendReminder(15, settings.time_reminder_15min, "15min")) {
          sendNotification(`"${task.title}" is due in 15 minutes`, {
            body: "Task reminder - 15 minutes left",
            tag: `task-${task.id}-15min`,
            soundEnabled: settings.sound_enabled,
            soundType: "normal",
            data: { url: `/plans/${planId}/tasks`, taskId: task.id },
          });
        }

        // 10 minutes before
        if (shouldSendReminder(10, settings.time_reminder_10min, "10min")) {
          sendNotification(`"${task.title}" is due in 10 minutes`, {
            body: "Task reminder - 10 minutes left",
            tag: `task-${task.id}-10min`,
            soundEnabled: settings.sound_enabled,
            soundType: "normal",
            data: { url: `/plans/${planId}/tasks`, taskId: task.id },
          });
        }

        // 5 minutes before
        if (shouldSendReminder(5, settings.time_reminder_5min, "5min")) {
          sendNotification(`"${task.title}" is due in 5 minutes`, {
            body: "Task reminder - 5 minutes left!",
            tag: `task-${task.id}-5min`,
            soundEnabled: settings.sound_enabled,
            soundType: "urgent",
            data: { url: `/plans/${planId}/tasks`, taskId: task.id },
          });
        }

        // Right on time (0 minutes)
        if (shouldSendReminder(0, settings.time_reminder_on_time ?? true, "ontime")) {
          sendNotification(`"${task.title}" is due NOW!`, {
            body: "This task is due right now!",
            tag: `task-${task.id}-ontime`,
            soundEnabled: settings.sound_enabled,
            soundType: "urgent",
            requireInteraction: true,
            data: { url: `/plans/${planId}/tasks`, taskId: task.id },
          });
        }

        // 30 minutes overdue (diffMinutes will be negative)
        if (shouldSendReminder(-30, settings.time_reminder_overdue_30min, "overdue30")) {
          sendNotification(`"${task.title}" is 30 minutes LATE!`, {
            body: "This task is overdue - please complete it or reschedule",
            tag: `task-${task.id}-overdue`,
            soundEnabled: settings.sound_enabled,
            soundType: "urgent",
            requireInteraction: true,
            data: { url: `/plans/${planId}/tasks`, taskId: task.id },
          });
        }
      });
    };

    // Check immediately
    checkTimeReminders();

    // Check every 10 seconds for precise timing
    const interval = setInterval(checkTimeReminders, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, settings, planId, sendNotification, refetchTasks]);

  // Clear sent reminders at midnight
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

    const timeout = setTimeout(() => {
      sentReminders.current.clear();
      console.log("[Reminders] Cleared sent reminders at midnight");
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  // Debug: Log when scheduler is active
  useEffect(() => {
    if (enabled) {
      console.log("[Reminders] Scheduler active for plan:", planId);
      console.log("[Reminders] Settings:", {
        sound: settings?.sound_enabled,
        hourly: settings?.hourly_reminders_enabled,
        "15min": settings?.time_reminder_15min,
        "10min": settings?.time_reminder_10min,
        "5min": settings?.time_reminder_5min,
        onTime: settings?.time_reminder_on_time,
        "30min overdue": settings?.time_reminder_overdue_30min,
      });
    }
  }, [enabled, planId, settings]);
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
