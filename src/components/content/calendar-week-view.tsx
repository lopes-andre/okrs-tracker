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
const START_HOUR = 0; // 12 AM (midnight)
const END_HOUR = 24; // 12 AM next day (full 24 hours)
const DEFAULT_ENTRY_DURATION_MINUTES = 45; // Default duration for overlap detection

// ============================================================================
// TYPES
// ============================================================================

interface PositionedEntry {
  entry: ContentCalendarEntry;
  top: number;
  startMinutes: number;
  endMinutes: number;
  column: number;
  totalColumns: number;
}

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
  const startMinutes = hour * 60 + minutes;
  const endMinutes = startMinutes + DEFAULT_ENTRY_DURATION_MINUTES;

  return { top, hour, minutes, startMinutes, endMinutes };
}

// Check if two entries overlap in time
function entriesOverlap(
  a: { startMinutes: number; endMinutes: number },
  b: { startMinutes: number; endMinutes: number }
): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

// Group overlapping entries and assign columns (Google Calendar style)
function groupOverlappingEntries(entries: ContentCalendarEntry[]): PositionedEntry[] {
  const positioned = entries
    .map((entry) => ({
      entry,
      position: getEntryPosition(entry),
    }))
    .filter((e) => e.position !== null)
    .map(({ entry, position }) => ({
      entry,
      top: position!.top,
      startMinutes: position!.startMinutes,
      endMinutes: position!.endMinutes,
      column: 0,
      totalColumns: 1,
    }));

  // Sort by start time, then by entry ID for stability
  positioned.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return a.entry.distribution_id.localeCompare(b.entry.distribution_id);
  });

  if (positioned.length === 0) return [];

  // Find connected components of overlapping entries (collision groups)
  const visited = new Set<number>();
  const collisionGroups: number[][] = [];

  for (let i = 0; i < positioned.length; i++) {
    if (visited.has(i)) continue;

    // BFS to find all entries in this collision group
    const group: number[] = [];
    const queue: number[] = [i];
    visited.add(i);

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);

      // Find all overlapping entries not yet visited
      for (let j = 0; j < positioned.length; j++) {
        if (visited.has(j)) continue;
        if (entriesOverlap(positioned[current], positioned[j])) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    collisionGroups.push(group);
  }

  // For each collision group, assign columns
  for (const group of collisionGroups) {
    // Sort group by start time
    group.sort((a, b) => positioned[a].startMinutes - positioned[b].startMinutes);

    // Track which columns are occupied at what end times
    const columns: { endMinutes: number }[] = [];

    for (const idx of group) {
      const entry = positioned[idx];

      // Find the first column that's available (no overlap)
      let assignedColumn = -1;
      for (let col = 0; col < columns.length; col++) {
        if (columns[col].endMinutes <= entry.startMinutes) {
          assignedColumn = col;
          columns[col].endMinutes = entry.endMinutes;
          break;
        }
      }

      // No available column, create a new one
      if (assignedColumn === -1) {
        assignedColumn = columns.length;
        columns.push({ endMinutes: entry.endMinutes });
      }

      entry.column = assignedColumn;
    }

    // Set totalColumns for all entries in this group
    const totalColumns = columns.length;
    for (const idx of group) {
      positioned[idx].totalColumns = totalColumns;
    }
  }

  return positioned;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CalendarWeekView({
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
                  {groupOverlappingEntries(dayEntries).map(
                    ({ entry, top, column, totalColumns }) => {
                      // Calculate width and left position for side-by-side layout
                      const widthPercent = 100 / totalColumns;
                      const leftPercent = column * widthPercent;
                      // Add small gaps between columns
                      const gapPx = totalColumns > 1 ? 1 : 0;

                      return (
                        <div
                          key={entry.distribution_id}
                          className="absolute"
                          style={{
                            top,
                            left: `calc(${leftPercent}% + 2px + ${column * gapPx}px)`,
                            width: `calc(${widthPercent}% - 4px - ${gapPx}px)`,
                          }}
                        >
                          <CalendarEntry
                            entry={entry}
                            onClick={() => onEntryClick(entry)}
                            variant="compact"
                            showTime={true}
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
