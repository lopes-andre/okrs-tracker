"use client";

import { useMemo, useRef, useEffect } from "react";
import {
  format,
  eachDayOfInterval,
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from "date-fns";
import { CalendarEntry } from "./calendar-entry";
import { cn } from "@/lib/utils";
import type { ContentCalendarEntry } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CalendarWeekViewProps {
  currentDate: Date;
  dateRange: { start: Date; end: Date };
  entriesByDay: Map<string, ContentCalendarEntry[]>;
  onEntryClick: (entry: ContentCalendarEntry) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM

// ============================================================================
// HELPERS
// ============================================================================

function getEntryPosition(entry: ContentCalendarEntry) {
  if (!entry.scheduled_at) return null;

  const date = parseISO(entry.scheduled_at);
  const hour = getHours(date);
  const minutes = getMinutes(date);

  // Only show entries within visible hours
  if (hour < START_HOUR || hour >= END_HOUR) return null;

  const top = (hour - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  return { top, hour, minutes };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CalendarWeekView({
  currentDate: _currentDate,
  dateRange,
  entriesByDay,
  onEntryClick,
}: CalendarWeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get days in the week
  const days = useMemo(
    () => eachDayOfInterval({ start: dateRange.start, end: dateRange.end }),
    [dateRange]
  );

  // Generate hours for the time column
  const hours = useMemo(() => {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    return eachHourOfInterval({ start: dayStart, end: dayEnd }).filter(
      (h) => getHours(h) >= START_HOUR && getHours(h) < END_HOUR
    );
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentHour = getHours(now);
      if (currentHour >= START_HOUR && currentHour < END_HOUR) {
        const scrollTop = (currentHour - START_HOUR - 1) * HOUR_HEIGHT;
        scrollRef.current.scrollTop = Math.max(0, scrollTop);
      }
    }
  }, []);

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const hour = getHours(now);
    const minutes = getMinutes(now);

    if (hour < START_HOUR || hour >= END_HOUR) return null;

    return (hour - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  }, []);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header with day names */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-bg-1 border-b border-border sticky top-0 z-10">
        {/* Empty corner */}
        <div className="p-2" />

        {/* Day headers */}
        {days.map((day) => {
          const isDayToday = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 text-center border-l border-border",
                isDayToday && "bg-accent/5"
              )}
            >
              <div className="text-small text-text-muted">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "w-8 h-8 mx-auto rounded-full flex items-center justify-center font-semibold",
                  isDayToday && "bg-accent text-white"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Time column */}
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour.toISOString()}
                className="h-[60px] border-b border-border-soft pr-2 flex items-start justify-end"
              >
                <span className="text-[10px] text-text-muted -mt-2">
                  {format(hour, "h a")}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEntries = entriesByDay.get(dayKey) || [];
            const isDayToday = isToday(day);

            return (
              <div
                key={dayKey}
                className={cn(
                  "relative border-l border-border",
                  isDayToday && "bg-accent/5"
                )}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour.toISOString()}
                    className="h-[60px] border-b border-border-soft"
                  />
                ))}

                {/* Current time indicator */}
                {isDayToday && currentTimePosition !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentTimePosition }}
                  >
                    <div className="relative">
                      <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500" />
                      <div className="h-px bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Entries */}
                <div className="absolute inset-0 p-0.5">
                  {dayEntries.map((entry) => {
                    const position = getEntryPosition(entry);
                    if (!position) return null;

                    return (
                      <div
                        key={entry.distribution_id}
                        className="absolute left-0.5 right-0.5"
                        style={{ top: position.top }}
                      >
                        <CalendarEntry
                          entry={entry}
                          onClick={() => onEntryClick(entry)}
                          variant="compact"
                          showTime={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
