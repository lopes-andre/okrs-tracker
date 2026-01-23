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

export function useTaskReminderSettings(planId: string) {
  return useQuery({
    queryKey: taskReminderKeys.settings(planId),
    queryFn: () => api.getOrCreateTaskReminderSettings(planId),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateTaskReminderSettings(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (updates: TaskReminderSettingsUpdate) =>
      api.updateTaskReminderSettings(planId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskReminderKeys.settings(planId) });
      toast({ title: "Settings saved", variant: "success" });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// TASK SUMMARY HOOKS
// ============================================================================

export function useTasksDueSummary(planId: string) {
  return useQuery({
    queryKey: taskReminderKeys.dueSummary(planId),
    queryFn: () => api.getTasksDueSummary(planId),
    enabled: !!planId,
    refetchInterval: 5 * 60 * 1000, // Every 5 minutes is enough for summary
  });
}

export function useTasksWithDueTime(planId: string) {
  return useQuery({
    queryKey: taskReminderKeys.tasksWithTime(planId),
    queryFn: () => api.getTasksWithDueTime(planId),
    enabled: !!planId,
    refetchInterval: 2 * 60 * 1000, // Every 2 minutes - we schedule timeouts from this
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
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const playBeep = (frequency: number, startTime: number, duration: number, volume: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      if (type === "urgent") {
        // Double beep for urgent notifications
        playBeep(880, ctx.currentTime, 0.15, 0.3);
        playBeep(880, ctx.currentTime + 0.2, 0.15, 0.3);
      } else {
        // Single pleasant beep
        playBeep(587.33, ctx.currentTime, 0.2, 0.2);
      }
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }, []);

  return { playSound };
}

// ============================================================================
// IN-APP NOTIFICATION CONTEXT (for future use)
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

      // Always show in-app toast (works regardless of system permission)
      // duration: 0 means it won't auto-dismiss - user must close it manually
      toast({
        title,
        description: notifOptions.body,
        variant: soundType === "urgent" ? "destructive" : "default",
        duration: 0,
      });

      // Also send system notification if permission granted
      if (isGranted) {
        const defaultOptions: NotificationOptions = {
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          requireInteraction: true, // Always require user to dismiss
          silent: true, // We handle sound ourselves
          ...notifOptions,
        };

        try {
          if (registration) {
            await registration.showNotification(title, defaultOptions);
          } else {
            new Notification(title, defaultOptions);
          }
        } catch (error) {
          console.error("Failed to send system notification:", error);
        }
      }

      return true;
    },
    [registration, isGranted, playSound, toast]
  );

  return { sendNotification, isReady: true };
}

// ============================================================================
// REMINDER SCHEDULER HOOK - EFFICIENT TIMEOUT-BASED APPROACH
// ============================================================================

interface ReminderSchedulerOptions {
  planId: string;
  enabled: boolean;
  settings: ReturnType<typeof useTaskReminderSettings>["data"];
}

// Reminder offsets in minutes (positive = before, negative = after due time)
const REMINDER_TYPES = [
  { key: "15min", offsetMinutes: 15, label: "15 minutes", urgent: false },
  { key: "10min", offsetMinutes: 10, label: "10 minutes", urgent: false },
  { key: "5min", offsetMinutes: 5, label: "5 minutes", urgent: true },
  { key: "ontime", offsetMinutes: 0, label: "now", urgent: true },
  { key: "overdue30", offsetMinutes: -30, label: "30 minutes late", urgent: true },
] as const;

type ReminderKey = typeof REMINDER_TYPES[number]["key"];

export function useReminderScheduler({ planId, enabled, settings }: ReminderSchedulerOptions) {
  const { sendNotification } = useNotificationSender();
  const { data: dueSummary } = useTasksDueSummary(planId);
  const { data: tasksWithTime } = useTasksWithDueTime(planId);

  // Track scheduled timeouts and sent reminders
  const scheduledTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const sentReminders = useRef<Set<string>>(new Set());

  // Check if a reminder type is enabled in settings
  const isReminderEnabled = useCallback((key: ReminderKey): boolean => {
    if (!settings) return false;
    switch (key) {
      case "15min": return settings.time_reminder_15min;
      case "10min": return settings.time_reminder_10min;
      case "5min": return settings.time_reminder_5min;
      case "ontime": return settings.time_reminder_on_time ?? true;
      case "overdue30": return settings.time_reminder_overdue_30min;
      default: return false;
    }
  }, [settings]);

  // Schedule reminders for a single task - EFFICIENT: only sets timeouts, no polling
  const scheduleTaskReminders = useCallback((task: { id: string; title: string; due_time: string }) => {
    if (!settings) return;

    // Capture settings values for the closure
    const capturedSettings = {
      sound_enabled: settings.sound_enabled,
      business_hours_enabled: settings.business_hours_enabled,
      business_hours_start: settings.business_hours_start,
      business_hours_end: settings.business_hours_end,
      business_days: settings.business_days,
    };

    const now = new Date();
    const today = now.toDateString();
    const [hours, minutes] = task.due_time.split(":").map(Number);
    const dueTime = new Date();
    dueTime.setHours(hours, minutes, 0, 0);

    REMINDER_TYPES.forEach((reminder) => {
      if (!isReminderEnabled(reminder.key)) return;

      const reminderKey = `${reminder.key}-${task.id}-${today}`;

      // Skip if already sent or already scheduled
      if (sentReminders.current.has(reminderKey)) return;
      if (scheduledTimeouts.current.has(reminderKey)) return;

      // Calculate when this reminder should fire
      const reminderTime = new Date(dueTime.getTime() - reminder.offsetMinutes * 60 * 1000);
      const msUntilReminder = reminderTime.getTime() - now.getTime();

      // Only schedule if reminder is in the future (with 5 second grace period for near-misses)
      if (msUntilReminder > -5000) {
        const delay = Math.max(0, msUntilReminder);

        const timeout = setTimeout(() => {
          // Double-check we haven't sent this already
          if (sentReminders.current.has(reminderKey)) return;
          sentReminders.current.add(reminderKey);
          scheduledTimeouts.current.delete(reminderKey);

          // Check business hours at fire time
          if (capturedSettings.business_hours_enabled && !isWithinBusinessHours(capturedSettings)) {
            return;
          }

          // Build notification message
          let title: string;
          let body: string;

          if (reminder.key === "ontime") {
            title = `"${task.title}" is due NOW!`;
            body = "This task is due right now!";
          } else if (reminder.key === "overdue30") {
            title = `"${task.title}" is 30 minutes LATE!`;
            body = "This task is overdue - please complete it or reschedule";
          } else {
            title = `"${task.title}" is due in ${reminder.label}`;
            body = `Task reminder - ${reminder.label} left`;
          }

          sendNotification(title, {
            body,
            tag: `task-${task.id}-${reminder.key}`,
            soundEnabled: capturedSettings.sound_enabled,
            soundType: reminder.urgent ? "urgent" : "normal",
            requireInteraction: true,
            data: { url: `/plans/${planId}/tasks`, taskId: task.id },
          });
        }, delay);

        scheduledTimeouts.current.set(reminderKey, timeout);
      }
    });
  }, [settings, isReminderEnabled, sendNotification, planId]);

  // Schedule reminders when tasks data changes
  useEffect(() => {
    if (!enabled || !settings || !tasksWithTime?.length) {
      return;
    }

    // Schedule reminders for all tasks with due times
    tasksWithTime.forEach(scheduleTaskReminders);

    // Cleanup function: clear all scheduled timeouts
    return () => {
      scheduledTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      scheduledTimeouts.current.clear();
    };
  }, [enabled, settings, tasksWithTime, scheduleTaskReminders]);

  // Hourly summary reminder (still uses interval, but only checks once per minute)
  useEffect(() => {
    if (!enabled || !settings?.hourly_reminders_enabled || !dueSummary) {
      return;
    }

    const checkHourlySummary = () => {
      const now = new Date();

      // Only send at the top of the hour (first 2 minutes)
      if (now.getMinutes() > 1) return;

      // Check business hours
      if (settings.business_hours_enabled && !isWithinBusinessHours(settings)) {
        return;
      }

      const summaryKey = `hourly-${now.toDateString()}-${now.getHours()}`;
      if (sentReminders.current.has(summaryKey)) return;

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

    checkHourlySummary();
    // Check once per minute - minimal overhead
    const interval = setInterval(checkHourlySummary, 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, settings, dueSummary, planId, sendNotification]);

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
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

  if (!settings.business_days.includes(dayOfWeek)) {
    return false;
  }

  const [startHour, startMin] = settings.business_hours_start.split(":").map(Number);
  const [endHour, endMin] = settings.business_hours_end.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
