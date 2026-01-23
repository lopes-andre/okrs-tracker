"use client";

import { useState, useEffect, useCallback } from "react";
import { Repeat, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  type RecurrenceConfig,
  getRecurrenceSummary,
  RECURRENCE_PRESETS,
} from "@/lib/recurrence-engine";
import type { RecurrenceFrequency, RecurrenceEndType } from "@/lib/supabase/types";

interface RecurrencePickerProps {
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
  startDate?: Date;
  disabled?: boolean;
}

const WEEKDAYS = [
  { value: 0, label: "S", fullLabel: "Sunday" },
  { value: 1, label: "M", fullLabel: "Monday" },
  { value: 2, label: "T", fullLabel: "Tuesday" },
  { value: 3, label: "W", fullLabel: "Wednesday" },
  { value: 4, label: "T", fullLabel: "Thursday" },
  { value: 5, label: "F", fullLabel: "Friday" },
  { value: 6, label: "S", fullLabel: "Saturday" },
];

const ORDINALS = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function RecurrencePicker({
  value,
  onChange,
  startDate = new Date(),
  disabled = false,
}: RecurrencePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<RecurrenceConfig | null>(value);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Sync internal state with external value
  useEffect(() => {
    setConfig(value);
  }, [value]);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleFrequencyChange = useCallback((frequency: RecurrenceFrequency) => {
    const dayOfWeek = startDate.getDay();
    const dayOfMonth = startDate.getDate();
    const month = startDate.getMonth() + 1;

    let newConfig: RecurrenceConfig;

    switch (frequency) {
      case "daily":
        newConfig = RECURRENCE_PRESETS.daily();
        break;
      case "weekly":
        newConfig = RECURRENCE_PRESETS.weekly(dayOfWeek);
        break;
      case "monthly":
        newConfig = RECURRENCE_PRESETS.monthly(dayOfMonth);
        break;
      case "yearly":
        newConfig = RECURRENCE_PRESETS.yearly(month, dayOfMonth);
        break;
    }

    setConfig(newConfig);
  }, [startDate]);

  const handleIntervalChange = useCallback((interval: string) => {
    if (!config) return;
    const num = parseInt(interval, 10);
    if (isNaN(num) || num < 1) return;
    setConfig({ ...config, interval: num });
  }, [config]);

  const handleDaysOfWeekChange = useCallback((day: number, checked: boolean) => {
    if (!config) return;
    const currentDays = config.daysOfWeek || [];
    const newDays = checked
      ? [...currentDays, day].sort((a, b) => a - b)
      : currentDays.filter((d) => d !== day);
    setConfig({ ...config, daysOfWeek: newDays });
  }, [config]);

  const handleMonthlyTypeChange = useCallback((type: "day" | "relative") => {
    if (!config) return;
    if (type === "day") {
      setConfig({
        ...config,
        dayOfMonth: startDate.getDate(),
        weekOfMonth: undefined,
        dayOfWeekForMonth: undefined,
      });
    } else {
      // Calculate which week of the month and day
      const dayOfMonth = startDate.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7);
      setConfig({
        ...config,
        dayOfMonth: undefined,
        weekOfMonth,
        dayOfWeekForMonth: startDate.getDay(),
      });
    }
  }, [config, startDate]);

  const handleEndTypeChange = useCallback((endType: RecurrenceEndType) => {
    if (!config) return;
    setConfig({
      ...config,
      endType,
      endCount: endType === "count" ? 10 : undefined,
      endDate: endType === "until"
        ? format(new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
        : undefined,
    });
  }, [config, startDate]);

  const handleApply = useCallback(() => {
    onChange(config);
    setIsOpen(false);
  }, [config, onChange]);

  const handleClear = useCallback(() => {
    setConfig(null);
    onChange(null);
    setIsOpen(false);
  }, [onChange]);

  const summary = config ? getRecurrenceSummary(config) : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-text-muted"
          )}
          disabled={disabled}
        >
          <Repeat className="mr-2 h-4 w-4" />
          {summary ? summary.long : "Does not repeat"}
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!config ? "default" : "outline"}
              size="sm"
              onClick={handleClear}
            >
              None
            </Button>
            <Button
              variant={config?.frequency === "daily" && config?.interval === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => handleFrequencyChange("daily")}
            >
              Daily
            </Button>
            <Button
              variant={config?.frequency === "weekly" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFrequencyChange("weekly")}
            >
              Weekly
            </Button>
            <Button
              variant={config?.frequency === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFrequencyChange("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={config?.frequency === "yearly" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFrequencyChange("yearly")}
            >
              Yearly
            </Button>
          </div>

          {config && (
            <>
              {/* Interval */}
              <div className="flex items-center gap-2">
                <Label className="shrink-0">Every</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={config.interval}
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  className="w-16"
                />
                <span className="text-sm text-text-muted">
                  {config.frequency === "daily" && (config.interval === 1 ? "day" : "days")}
                  {config.frequency === "weekly" && (config.interval === 1 ? "week" : "weeks")}
                  {config.frequency === "monthly" && (config.interval === 1 ? "month" : "months")}
                  {config.frequency === "yearly" && (config.interval === 1 ? "year" : "years")}
                </span>
              </div>

              {/* Weekly options - day selection */}
              {config.frequency === "weekly" && (
                <div className="space-y-2">
                  <Label>Repeat on</Label>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((day) => {
                      const isSelected = config.daysOfWeek?.includes(day.value);
                      return (
                        <Button
                          key={day.value}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => handleDaysOfWeekChange(day.value, !isSelected)}
                          title={day.fullLabel}
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly options */}
              {config.frequency === "monthly" && (
                <div className="space-y-3">
                  {/* Day of month */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="monthly-day"
                      checked={config.dayOfMonth !== undefined}
                      onCheckedChange={(checked) => handleMonthlyTypeChange(checked ? "day" : "relative")}
                    />
                    <Label htmlFor="monthly-day" className="flex items-center gap-2">
                      On day
                      <Select
                        value={config.dayOfMonth?.toString() || "1"}
                        onValueChange={(v) => setConfig({ ...config, dayOfMonth: parseInt(v) })}
                        disabled={config.dayOfMonth === undefined}
                      >
                        <SelectTrigger className="w-16 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                  </div>

                  {/* Relative day (e.g., first Monday) */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="monthly-relative"
                      checked={config.weekOfMonth !== undefined}
                      onCheckedChange={(checked) => handleMonthlyTypeChange(checked ? "relative" : "day")}
                    />
                    <Label htmlFor="monthly-relative" className="flex items-center gap-2">
                      On the
                      <Select
                        value={config.weekOfMonth?.toString() || "1"}
                        onValueChange={(v) => setConfig({ ...config, weekOfMonth: parseInt(v) })}
                        disabled={config.weekOfMonth === undefined}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDINALS.map((ord) => (
                            <SelectItem key={ord.value} value={ord.value.toString()}>
                              {ord.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={config.dayOfWeekForMonth?.toString() || "1"}
                        onValueChange={(v) => setConfig({ ...config, dayOfWeekForMonth: parseInt(v) })}
                        disabled={config.weekOfMonth === undefined}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.fullLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                  </div>
                </div>
              )}

              {/* Yearly options */}
              {config.frequency === "yearly" && (
                <div className="flex items-center gap-2">
                  <Label>On</Label>
                  <Select
                    value={config.monthOfYear?.toString() || "1"}
                    onValueChange={(v) => setConfig({ ...config, monthOfYear: parseInt(v) })}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, idx) => (
                        <SelectItem key={idx} value={(idx + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={config.dayOfMonth?.toString() || "1"}
                    onValueChange={(v) => setConfig({ ...config, dayOfMonth: parseInt(v) })}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* End condition */}
              <div className="space-y-2 pt-2 border-t border-border-soft">
                <Label>Ends</Label>
                <div className="space-y-2">
                  {/* Never */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="end-never"
                      checked={config.endType === "never"}
                      onCheckedChange={(checked) => checked && handleEndTypeChange("never")}
                    />
                    <Label htmlFor="end-never">Never</Label>
                  </div>

                  {/* After N occurrences */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="end-count"
                      checked={config.endType === "count"}
                      onCheckedChange={(checked) => checked && handleEndTypeChange("count")}
                    />
                    <Label htmlFor="end-count" className="flex items-center gap-2">
                      After
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={config.endCount || 10}
                        onChange={(e) => setConfig({ ...config, endCount: parseInt(e.target.value) || 10 })}
                        className="w-16 h-8"
                        disabled={config.endType !== "count"}
                      />
                      occurrences
                    </Label>
                  </div>

                  {/* Until date */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="end-until"
                      checked={config.endType === "until"}
                      onCheckedChange={(checked) => checked && handleEndTypeChange("until")}
                    />
                    <Label htmlFor="end-until" className="flex items-center gap-2">
                      On
                      <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={config.endType !== "until"}
                          >
                            <Calendar className="mr-2 h-3 w-3" />
                            {config.endDate
                              ? format(parseISO(config.endDate), "MMM d, yyyy")
                              : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={config.endDate ? parseISO(config.endDate) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setConfig({ ...config, endDate: format(date, "yyyy-MM-dd") });
                              }
                              setEndDateOpen(false);
                            }}
                            disabled={(date) => date < startDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </Label>
                  </div>
                </div>
              </div>

              {/* Summary preview */}
              {summary && (
                <div className="pt-2 border-t border-border-soft">
                  <p className="text-sm text-text-muted">{summary.long}</p>
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Compact display of recurrence info (for task rows)
 */
export function RecurrenceBadge({
  rrule,
  frequency,
  className,
}: {
  rrule?: string | null;
  frequency?: RecurrenceFrequency | null;
  className?: string;
}) {
  if (!frequency) return null;

  const label = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  }[frequency];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-text-muted",
        className
      )}
      title={rrule || undefined}
    >
      <Repeat className="h-3 w-3" />
      {label}
    </span>
  );
}
