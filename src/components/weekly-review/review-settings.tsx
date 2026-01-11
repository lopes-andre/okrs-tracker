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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useWeeklyReviewSettings, useUpdateWeeklyReviewSettings, usePlanReviewStats, usePendingReviews } from "@/features/weekly-reviews";
import { getDayName, formatWeekLabel, getCurrentWeekInfo } from "@/lib/weekly-review-engine";
import type { WeeklyReviewSettings } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface ReviewSettingsProps {
  planId: string;
  isOwner: boolean;
}

export function ReviewSettings({ planId, isOwner }: ReviewSettingsProps) {
  const { data: settings, isLoading: isLoadingSettings } = useWeeklyReviewSettings(planId);
  const { data: stats } = usePlanReviewStats(planId);
  const { data: pendingReviews = [] } = usePendingReviews(planId);
  const updateSettings = useUpdateWeeklyReviewSettings();

  // Local state for form
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDay, setReminderDay] = useState(5); // Friday
  const [reminderTime, setReminderTime] = useState("17:00");
  const [autoCreate, setAutoCreate] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setReminderEnabled(settings.reminder_enabled);
      setReminderDay(settings.reminder_day);
      setReminderTime(settings.reminder_time);
      setAutoCreate(settings.auto_create_reviews);
      setHasChanges(false);
    }
  }, [settings]);

  // Track changes
  const checkChanges = (
    enabled: boolean,
    day: number,
    time: string,
    auto: boolean
  ) => {
    if (!settings) return false;
    return (
      enabled !== settings.reminder_enabled ||
      day !== settings.reminder_day ||
      time !== settings.reminder_time ||
      auto !== settings.auto_create_reviews
    );
  };

  const handleReminderEnabledChange = (enabled: boolean) => {
    setReminderEnabled(enabled);
    setHasChanges(checkChanges(enabled, reminderDay, reminderTime, autoCreate));
  };

  const handleReminderDayChange = (day: string) => {
    const dayNum = parseInt(day);
    setReminderDay(dayNum);
    setHasChanges(checkChanges(reminderEnabled, dayNum, reminderTime, autoCreate));
  };

  const handleReminderTimeChange = (time: string) => {
    setReminderTime(time);
    setHasChanges(checkChanges(reminderEnabled, reminderDay, time, autoCreate));
  };

  const handleAutoCreateChange = (auto: boolean) => {
    setAutoCreate(auto);
    setHasChanges(checkChanges(reminderEnabled, reminderDay, reminderTime, auto));
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      planId,
      updates: {
        reminder_enabled: reminderEnabled,
        reminder_day: reminderDay,
        reminder_time: reminderTime,
        auto_create_reviews: autoCreate,
      },
    });
    setHasChanges(false);
  };

  const currentWeek = getCurrentWeekInfo();

  if (isLoadingSettings) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-bg-1/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-accent/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-strong">
                  {stats?.total_reviews || 0}
                </p>
                <p className="text-xs text-text-muted">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-1/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-status-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-strong">
                  {stats ? Math.round(((stats.completed_on_time + stats.completed_late) / Math.max(stats.total_reviews, 1)) * 100) : 0}%
                </p>
                <p className="text-xs text-text-muted">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-1/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-status-warning/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-strong">
                  {stats?.current_streak || 0}
                </p>
                <p className="text-xs text-text-muted">Week Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-1/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-card flex items-center justify-center",
                pendingReviews.length > 0 ? "bg-status-danger/10" : "bg-status-success/10"
              )}>
                <AlertCircle className={cn(
                  "w-5 h-5",
                  pendingReviews.length > 0 ? "text-status-danger" : "text-status-success"
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-strong">
                  {pendingReviews.length}
                </p>
                <p className="text-xs text-text-muted">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Week Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Week</CardTitle>
              <CardDescription>
                {formatWeekLabel(currentWeek.year, currentWeek.weekNumber)}
              </CardDescription>
            </div>
            <Badge variant="outline">
              W{currentWeek.weekNumber}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-card bg-bg-1/50 border border-border-soft">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-accent/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-text-strong">
                  {formatWeekLabel(currentWeek.year, currentWeek.weekNumber)}
                </p>
                <p className="text-sm text-text-muted">
                  {pendingReviews.find(r => r.year === currentWeek.year && r.week_number === currentWeek.weekNumber)
                    ? "Review started but not completed"
                    : "No review created yet"}
                </p>
              </div>
            </div>
            <Button size="sm" asChild>
              <a href={`/plans/${planId}/reviews`}>
                Start Review
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminder Settings
          </CardTitle>
          <CardDescription>
            Configure when you want to be reminded to complete your weekly review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Reminders */}
          <div className="flex items-center justify-between p-4 rounded-card bg-bg-1/30 border border-border-soft">
            <div className="flex items-center gap-3">
              {reminderEnabled ? (
                <Bell className="w-5 h-5 text-accent" />
              ) : (
                <BellOff className="w-5 h-5 text-text-muted" />
              )}
              <div>
                <p className="font-medium text-text-strong">Weekly Reminders</p>
                <p className="text-sm text-text-muted">
                  {reminderEnabled
                    ? "You'll receive reminders to complete your weekly review"
                    : "Reminders are currently disabled"}
                </p>
              </div>
            </div>
            <Button
              variant={reminderEnabled ? "secondary" : "default"}
              size="sm"
              onClick={() => handleReminderEnabledChange(!reminderEnabled)}
              disabled={!isOwner}
            >
              {reminderEnabled ? "Disable" : "Enable"}
            </Button>
          </div>

          {/* Reminder Day & Time */}
          <div className={cn(
            "grid md:grid-cols-2 gap-4 transition-opacity",
            !reminderEnabled && "opacity-50 pointer-events-none"
          )}>
            <div className="space-y-2">
              <Label htmlFor="reminder-day" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-muted" />
                Reminder Day
              </Label>
              <Select
                value={reminderDay.toString()}
                onValueChange={handleReminderDayChange}
                disabled={!isOwner || !reminderEnabled}
              >
                <SelectTrigger id="reminder-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-text-muted">
                Recommended: Friday (end of work week)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-time" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" />
                Reminder Time
              </Label>
              <Select
                value={reminderTime}
                onValueChange={handleReminderTimeChange}
                disabled={!isOwner || !reminderEnabled}
              >
                <SelectTrigger id="reminder-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="13:00">1:00 PM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="15:00">3:00 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-text-muted">
                Recommended: End of day
              </p>
            </div>
          </div>

          {/* Summary */}
          {reminderEnabled && (
            <div className="p-3 rounded-card bg-accent/5 border border-accent/20">
              <p className="text-sm text-accent">
                📅 You'll be reminded every <strong>{getDayName(reminderDay)}</strong> at{" "}
                <strong>{reminderTime}</strong> to complete your weekly review.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Create Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Automation
          </CardTitle>
          <CardDescription>
            Automatic weekly review creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-card bg-bg-1/30 border border-border-soft">
            <div>
              <p className="font-medium text-text-strong">Auto-create Weekly Reviews</p>
              <p className="text-sm text-text-muted">
                {autoCreate
                  ? "A new review will be created automatically each week"
                  : "You'll need to manually create reviews each week"}
              </p>
            </div>
            <Button
              variant={autoCreate ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleAutoCreateChange(!autoCreate)}
              disabled={!isOwner}
            >
              {autoCreate ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {isOwner && hasChanges && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
