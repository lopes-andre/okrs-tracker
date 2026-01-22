"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  Clock,
  Loader2,
  Volume2,
  VolumeX,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import {
  useTaskReminderSettings,
  useUpdateTaskReminderSettings,
  useNotificationPermission,
} from "@/features/task-reminders";

interface TaskReminderSettingsProps {
  planId: string;
  isOwner: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function TaskReminderSettings({ planId, isOwner }: TaskReminderSettingsProps) {
  const { data: settings, isLoading: isLoadingSettings } = useTaskReminderSettings(planId);
  const updateSettings = useUpdateTaskReminderSettings(planId);
  const {
    isSupported,
    requestPermission,
    isGranted,
    isDenied,
  } = useNotificationPermission();

  // Local state for form
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [businessHoursStart, setBusinessHoursStart] = useState("09:00");
  const [businessHoursEnd, setBusinessHoursEnd] = useState("17:00");
  const [businessDays, setBusinessDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(true);
  const [dailySummaryTime, setDailySummaryTime] = useState("09:00");
  const [hourlyRemindersEnabled, setHourlyRemindersEnabled] = useState(true);
  const [timeReminder15min, setTimeReminder15min] = useState(true);
  const [timeReminder10min, setTimeReminder10min] = useState(true);
  const [timeReminder5min, setTimeReminder5min] = useState(true);
  const [timeReminderOnTime, setTimeReminderOnTime] = useState(true);
  const [timeReminderOverdue30min, setTimeReminderOverdue30min] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setRemindersEnabled(settings.reminders_enabled);
      setBusinessHoursEnabled(settings.business_hours_enabled);
      setBusinessHoursStart(settings.business_hours_start);
      setBusinessHoursEnd(settings.business_hours_end);
      setBusinessDays(settings.business_days);
      setSoundEnabled(settings.sound_enabled);
      setDailySummaryEnabled(settings.daily_summary_enabled);
      setDailySummaryTime(settings.daily_summary_time);
      setHourlyRemindersEnabled(settings.hourly_reminders_enabled);
      setTimeReminder15min(settings.time_reminder_15min);
      setTimeReminder10min(settings.time_reminder_10min);
      setTimeReminder5min(settings.time_reminder_5min);
      setTimeReminderOnTime(settings.time_reminder_on_time ?? true);
      setTimeReminderOverdue30min(settings.time_reminder_overdue_30min);
      setHasChanges(false);
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (!settings) return;
    const changed =
      remindersEnabled !== settings.reminders_enabled ||
      businessHoursEnabled !== settings.business_hours_enabled ||
      businessHoursStart !== settings.business_hours_start ||
      businessHoursEnd !== settings.business_hours_end ||
      JSON.stringify(businessDays.sort()) !== JSON.stringify([...settings.business_days].sort()) ||
      soundEnabled !== settings.sound_enabled ||
      dailySummaryEnabled !== settings.daily_summary_enabled ||
      dailySummaryTime !== settings.daily_summary_time ||
      hourlyRemindersEnabled !== settings.hourly_reminders_enabled ||
      timeReminder15min !== settings.time_reminder_15min ||
      timeReminder10min !== settings.time_reminder_10min ||
      timeReminder5min !== settings.time_reminder_5min ||
      timeReminderOnTime !== (settings.time_reminder_on_time ?? true) ||
      timeReminderOverdue30min !== settings.time_reminder_overdue_30min;
    setHasChanges(changed);
  }, [
    settings,
    remindersEnabled,
    businessHoursEnabled,
    businessHoursStart,
    businessHoursEnd,
    businessDays,
    soundEnabled,
    dailySummaryEnabled,
    dailySummaryTime,
    hourlyRemindersEnabled,
    timeReminder15min,
    timeReminder10min,
    timeReminder5min,
    timeReminderOnTime,
    timeReminderOverdue30min,
  ]);

  const toggleBusinessDay = (day: number) => {
    setBusinessDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      reminders_enabled: remindersEnabled,
      business_hours_enabled: businessHoursEnabled,
      business_hours_start: businessHoursStart,
      business_hours_end: businessHoursEnd,
      business_days: businessDays,
      sound_enabled: soundEnabled,
      daily_summary_enabled: dailySummaryEnabled,
      daily_summary_time: dailySummaryTime,
      hourly_reminders_enabled: hourlyRemindersEnabled,
      time_reminder_15min: timeReminder15min,
      time_reminder_10min: timeReminder10min,
      time_reminder_5min: timeReminder5min,
      time_reminder_on_time: timeReminderOnTime,
      time_reminder_overdue_30min: timeReminderOverdue30min,
    });
    setHasChanges(false);
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
        </CardContent>
      </Card>
    );
  }

  const canEdit = isOwner;

  return (
    <div className="space-y-6">
      {/* Notification Permission Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Permission
          </CardTitle>
          <CardDescription>
            Allow browser notifications to receive task reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <div className="flex items-center gap-2 text-status-warning">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-body-sm">
                Your browser doesn&apos;t support notifications
              </span>
            </div>
          ) : isGranted ? (
            <div className="flex items-center gap-2 text-status-success">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-body-sm">Notifications are enabled</span>
            </div>
          ) : isDenied ? (
            <div className="flex items-center gap-2 text-status-danger">
              <BellOff className="w-4 h-4" />
              <span className="text-body-sm">
                Notifications are blocked. Please enable them in your browser settings.
              </span>
            </div>
          ) : (
            <Button onClick={requestPermission} variant="outline" className="gap-2">
              <Bell className="w-4 h-4" />
              Enable Notifications
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Task Reminder Settings
              </CardTitle>
              <CardDescription>
                Configure when and how you receive task reminders
              </CardDescription>
            </div>
            <Badge variant={remindersEnabled ? "success" : "secondary"}>
              {remindersEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-bg-1 rounded-card">
            <div className="flex items-center gap-3">
              {remindersEnabled ? (
                <Bell className="w-5 h-5 text-accent" />
              ) : (
                <BellOff className="w-5 h-5 text-text-muted" />
              )}
              <div>
                <p className="font-medium text-text-strong">Task Reminders</p>
                <p className="text-small text-text-muted">
                  Receive notifications for tasks with due dates
                </p>
              </div>
            </div>
            <Button
              variant={remindersEnabled ? "secondary" : "default"}
              size="sm"
              onClick={() => setRemindersEnabled(!remindersEnabled)}
              disabled={!canEdit}
            >
              {remindersEnabled ? "Disable" : "Enable"}
            </Button>
          </div>

          {remindersEnabled && (
            <>
              {/* Business Hours */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="businessHours"
                    checked={businessHoursEnabled}
                    onCheckedChange={(checked) => setBusinessHoursEnabled(checked as boolean)}
                    disabled={!canEdit}
                  />
                  <Label htmlFor="businessHours" className="font-medium">
                    Business Hours Only
                  </Label>
                </div>

                {businessHoursEnabled && (
                  <div className="ml-6 space-y-4 p-4 bg-bg-1 rounded-card">
                    <div className="flex items-center gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-small">Start Time</Label>
                        <Input
                          type="time"
                          value={businessHoursStart}
                          onChange={(e) => setBusinessHoursStart(e.target.value)}
                          disabled={!canEdit}
                          className="w-32"
                        />
                      </div>
                      <span className="text-text-muted mt-6">to</span>
                      <div className="space-y-1.5">
                        <Label className="text-small">End Time</Label>
                        <Input
                          type="time"
                          value={businessHoursEnd}
                          onChange={(e) => setBusinessHoursEnd(e.target.value)}
                          disabled={!canEdit}
                          className="w-32"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-small">Business Days</Label>
                      <div className="flex gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <Button
                            key={day.value}
                            variant={businessDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleBusinessDay(day.value)}
                            disabled={!canEdit}
                            className="w-12"
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sound */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={(checked) => setSoundEnabled(checked as boolean)}
                  disabled={!canEdit}
                />
                <Label htmlFor="sound" className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-text-muted" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-text-muted" />
                  )}
                  Notification Sound
                </Label>
              </div>

              {/* Daily Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dailySummary"
                    checked={dailySummaryEnabled}
                    onCheckedChange={(checked) => setDailySummaryEnabled(checked as boolean)}
                    disabled={!canEdit}
                  />
                  <Label htmlFor="dailySummary" className="font-medium">
                    Daily Summary Notification
                  </Label>
                </div>

                {dailySummaryEnabled && (
                  <div className="ml-6 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-text-muted" />
                    <span className="text-small text-text-muted">Send at</span>
                    <Input
                      type="time"
                      value={dailySummaryTime}
                      onChange={(e) => setDailySummaryTime(e.target.value)}
                      disabled={!canEdit}
                      className="w-32"
                    />
                  </div>
                )}
              </div>

              {/* Hourly Reminders */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hourlyReminders"
                  checked={hourlyRemindersEnabled}
                  onCheckedChange={(checked) => setHourlyRemindersEnabled(checked as boolean)}
                  disabled={!canEdit}
                />
                <Label htmlFor="hourlyReminders" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-muted" />
                  Hourly Summary (tasks due today + late)
                </Label>
              </div>

              {/* Time-Specific Reminders */}
              <div className="space-y-3">
                <Label className="font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-warning" />
                  Time-Specific Task Reminders
                </Label>
                <p className="text-small text-text-muted">
                  For tasks with a specific due time, receive reminders before and after
                </p>
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reminder15"
                      checked={timeReminder15min}
                      onCheckedChange={(checked) => setTimeReminder15min(checked as boolean)}
                      disabled={!canEdit}
                    />
                    <Label htmlFor="reminder15" className="text-small">
                      15 minutes before
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reminder10"
                      checked={timeReminder10min}
                      onCheckedChange={(checked) => setTimeReminder10min(checked as boolean)}
                      disabled={!canEdit}
                    />
                    <Label htmlFor="reminder10" className="text-small">
                      10 minutes before
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reminder5"
                      checked={timeReminder5min}
                      onCheckedChange={(checked) => setTimeReminder5min(checked as boolean)}
                      disabled={!canEdit}
                    />
                    <Label htmlFor="reminder5" className="text-small">
                      5 minutes before
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reminderOnTime"
                      checked={timeReminderOnTime}
                      onCheckedChange={(checked) => setTimeReminderOnTime(checked as boolean)}
                      disabled={!canEdit}
                    />
                    <Label htmlFor="reminderOnTime" className="text-small font-medium text-accent">
                      Right on time (at due time)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reminderOverdue"
                      checked={timeReminderOverdue30min}
                      onCheckedChange={(checked) => setTimeReminderOverdue30min(checked as boolean)}
                      disabled={!canEdit}
                    />
                    <Label htmlFor="reminderOverdue" className="text-small text-status-danger">
                      30 minutes overdue
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          {canEdit && (
            <div className="flex justify-end pt-4 border-t border-border-soft">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateSettings.isPending}
              >
                {updateSettings.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
