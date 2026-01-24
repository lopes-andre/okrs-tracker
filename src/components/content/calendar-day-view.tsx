"use client";

import { useMemo, useRef, useEffect } from "react";
import {
  format,
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

interface CalendarDayViewProps {
  currentDate: Date;
  entries: ContentCalendarEntry[];
  onEntryClick: (entry: ContentCalendarEntry) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOUR_HEIGHT = 80; // pixels per hour (larger for day view)
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

// Group overlapping entries
function groupOverlappingEntries(entries: ContentCalendarEntry[]) {
  const positioned = entries
    .map((entry) => ({
      entry,
      position: getEntryPosition(entry),
    }))
    .filter((e) => e.position !== null);

  // Sort by time
  positioned.sort((a, b) => (a.position!.top > b.position!.top ? 1 : -1));

  // Assign columns for overlapping entries
  const result: Array<{
    entry: ContentCalendarEntry;
    top: number;
    column: number;
    totalColumns: number;
  }> = [];

  positioned.forEach(({ entry, position }) => {
    // For simplicity, just stack entries at similar times
    // A more complex implementation would calculate overlaps
    result.push({
      entry,
      top: position!.top,
      column: 0,
      totalColumns: 1,
    });
  });

  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CalendarDayView({
  currentDate,
  entries,
  onEntryClick,
}: CalendarDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDayToday = isToday(currentDate);

  // Generate hours
  const hours = useMemo(() => {
    const dayStart = startOfDay(new Date());
    const dayEnd = endOfDay(new Date());
    return eachHourOfInterval({ start: dayStart, end: dayEnd }).filter(
      (h) => getHours(h) >= START_HOUR && getHours(h) < END_HOUR
    );
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && isDayToday) {
      const now = new Date();
      const currentHour = getHours(now);
      if (currentHour >= START_HOUR && currentHour < END_HOUR) {
        const scrollTop = (currentHour - START_HOUR - 1) * HOUR_HEIGHT;
        scrollRef.current.scrollTop = Math.max(0, scrollTop);
      }
    }
  }, [isDayToday]);

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    if (!isDayToday) return null;

    const now = new Date();
    const hour = getHours(now);
    const minutes = getMinutes(now);

    if (hour < START_HOUR || hour >= END_HOUR) return null;

    return (hour - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  }, [isDayToday]);

  // Position entries
  const positionedEntries = useMemo(
    () => groupOverlappingEntries(entries),
    [entries]
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "p-4 bg-bg-1 border-b border-border text-center",
          isDayToday && "bg-accent/5"
        )}
      >
        <div className="text-small text-text-muted">
          {format(currentDate, "EEEE")}
        </div>
        <div
          className={cn(
            "text-3xl font-semibold",
            isDayToday && "text-accent"
          )}
        >
          {format(currentDate, "d")}
        </div>
        <div className="text-small text-text-muted">
          {format(currentDate, "MMMM yyyy")}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 350px)" }}
      >
        <div className="grid grid-cols-[80px_1fr] relative">
          {/* Time column */}
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour.toISOString()}
                className="border-b border-border-soft pr-3 flex items-start justify-end"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="text-small text-text-muted -mt-2">
                  {format(hour, "h:mm a")}
                </span>
              </div>
            ))}
          </div>

          {/* Events column */}
          <div
            className={cn(
              "relative border-l border-border",
              isDayToday && "bg-accent/5"
            )}
          >
            {/* Hour grid lines */}
            {hours.map((hour) => (
              <div
                key={hour.toISOString()}
                className="border-b border-border-soft"
                style={{ height: HOUR_HEIGHT }}
              />
            ))}

            {/* Current time indicator */}
            {isDayToday && currentTimePosition !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: currentTimePosition }}
              >
                <div className="relative">
                  <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-red-500" />
                  <div className="h-0.5 bg-red-500" />
                </div>
              </div>
            )}

            {/* Entries */}
            <div className="absolute inset-0 p-1">
              {positionedEntries.map(({ entry, top }) => (
                <div
                  key={entry.distribution_id}
                  className="absolute left-2 right-2"
                  style={{ top }}
                >
                  <CalendarEntry
                    entry={entry}
                    onClick={() => onEntryClick(entry)}
                    variant="expanded"
                    showTime={true}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-text-muted">No content scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}
