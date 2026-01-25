"use client";

import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from "date-fns";
import { CalendarEntryGroup } from "./calendar-entry";
import { cn } from "@/lib/utils";
import type { ContentCalendarEntry } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CalendarMonthViewProps {
  currentDate: Date;
  entriesByDay: Map<string, ContentCalendarEntry[]>;
  onEntryClick: (entry: ContentCalendarEntry) => void;
  onDayClick: (date: Date) => void;
  onMoreClick?: (date: Date) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ============================================================================
// COMPONENT
// ============================================================================

export function CalendarMonthView({
  currentDate,
  entriesByDay,
  onEntryClick,
  onDayClick,
  onMoreClick,
}: CalendarMonthViewProps) {
  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-bg-1 border-b border-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-small font-medium text-text-muted"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIdx) =>
          week.map((day, dayIdx) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEntries = entriesByDay.get(dayKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            return (
              <div
                key={dayKey}
                className={cn(
                  "min-h-[100px] border-b border-r border-border p-1",
                  !isCurrentMonth && "bg-bg-1/50",
                  dayIdx === 6 && "border-r-0",
                  weekIdx === weeks.length - 1 && "border-b-0"
                )}
              >
                {/* Day Number */}
                <button
                  onClick={() => onDayClick(day)}
                  className={cn(
                    "w-7 h-7 rounded-full text-small font-medium flex items-center justify-center mb-1 transition-colors",
                    !isCurrentMonth && "text-text-muted",
                    isDayToday &&
                      "bg-accent text-white hover:bg-accent-hover",
                    !isDayToday && "hover:bg-bg-1"
                  )}
                >
                  {format(day, "d")}
                </button>

                {/* Entries */}
                <CalendarEntryGroup
                  entries={dayEntries}
                  onClick={onEntryClick}
                  variant="compact"
                  showTime={false}
                  maxVisible={3}
                  onMoreClick={onMoreClick ? () => onMoreClick(day) : undefined}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
