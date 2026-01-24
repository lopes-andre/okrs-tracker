"use client";

import { useMemo } from "react";
import { format, isToday, isTomorrow, parseISO, isPast } from "date-fns";
import { CalendarX } from "lucide-react";
import { CalendarEntry } from "./calendar-entry";
import { cn } from "@/lib/utils";
import type { ContentCalendarEntry } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CalendarListViewProps {
  currentDate: Date;
  entriesByDay: Map<string, ContentCalendarEntry[]>;
  onEntryClick: (entry: ContentCalendarEntry) => void;
}

interface DayGroup {
  date: Date;
  dateKey: string;
  label: string;
  entries: ContentCalendarEntry[];
  isPastDay: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CalendarListView({
  currentDate: _currentDate,
  entriesByDay,
  onEntryClick,
}: CalendarListViewProps) {
  // Convert map to sorted array of day groups
  const dayGroups = useMemo(() => {
    const groups: DayGroup[] = [];

    entriesByDay.forEach((entries, dateKey) => {
      const date = parseISO(dateKey);
      const isPastDay = isPast(date) && !isToday(date);

      // Only include days with entries, or today
      if (entries.length > 0 || isToday(date)) {
        groups.push({
          date,
          dateKey,
          label: getDayLabel(date),
          entries,
          isPastDay,
        });
      }
    });

    // Sort by date
    groups.sort((a, b) => a.date.getTime() - b.date.getTime());

    return groups;
  }, [entriesByDay]);

  // Separate past and upcoming
  const { pastDays, upcomingDays } = useMemo(() => {
    const past: DayGroup[] = [];
    const upcoming: DayGroup[] = [];

    dayGroups.forEach((group) => {
      if (group.isPastDay && group.entries.some((e) => e.status !== "posted")) {
        // Only show past days with unposted content
        past.push(group);
      } else if (!group.isPastDay) {
        upcoming.push(group);
      }
    });

    return { pastDays: past, upcomingDays: upcoming };
  }, [dayGroups]);

  const hasContent = pastDays.length > 0 || upcomingDays.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarX className="w-12 h-12 text-text-muted mb-4" />
        <h3 className="font-medium mb-2">No scheduled content</h3>
        <p className="text-small text-text-muted">
          Content scheduled from the Planner will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overdue Section */}
      {pastDays.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-small font-medium text-amber-600 flex items-center gap-2">
            Overdue
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-[10px]">
              {pastDays.reduce((sum, d) => sum + d.entries.length, 0)}
            </span>
          </h3>
          {pastDays.map((group) => (
            <DaySection
              key={group.dateKey}
              group={group}
              onEntryClick={onEntryClick}
              isOverdue
            />
          ))}
        </div>
      )}

      {/* Upcoming Section */}
      {upcomingDays.length > 0 && (
        <div className="space-y-3">
          {pastDays.length > 0 && (
            <h3 className="text-small font-medium text-text-muted">Upcoming</h3>
          )}
          {upcomingDays.map((group) => (
            <DaySection
              key={group.dateKey}
              group={group}
              onEntryClick={onEntryClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DAY SECTION COMPONENT
// ============================================================================

interface DaySectionProps {
  group: DayGroup;
  onEntryClick: (entry: ContentCalendarEntry) => void;
  isOverdue?: boolean;
}

function DaySection({ group, onEntryClick, isOverdue }: DaySectionProps) {
  const isTodayGroup = isToday(group.date);

  return (
    <div
      className={cn(
        "border border-border rounded-lg overflow-hidden",
        isOverdue && "border-amber-200",
        isTodayGroup && "border-accent/30"
      )}
    >
      {/* Day Header */}
      <div
        className={cn(
          "px-4 py-2 bg-bg-1 border-b border-border flex items-center justify-between",
          isOverdue && "bg-amber-50 border-amber-200",
          isTodayGroup && "bg-accent/5 border-accent/20"
        )}
      >
        <div>
          <span
            className={cn(
              "font-medium",
              isTodayGroup && "text-accent",
              isOverdue && "text-amber-700"
            )}
          >
            {group.label}
          </span>
          {!isTodayGroup && !isOverdue && (
            <span className="text-small text-text-muted ml-2">
              {format(group.date, "MMM d")}
            </span>
          )}
        </div>
        {group.entries.length > 0 && (
          <span className="text-small text-text-muted">
            {group.entries.length} item{group.entries.length !== 1 && "s"}
          </span>
        )}
      </div>

      {/* Entries */}
      <div className="p-2 space-y-2">
        {group.entries.length === 0 ? (
          <p className="text-small text-text-muted text-center py-4">
            No content scheduled
          </p>
        ) : (
          group.entries.map((entry) => (
            <CalendarEntry
              key={entry.distribution_id}
              entry={entry}
              onClick={() => onEntryClick(entry)}
              variant="expanded"
              showTime={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
