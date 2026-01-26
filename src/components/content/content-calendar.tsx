"use client";

import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarMonthView } from "./calendar-month-view";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarListView } from "./calendar-list-view";
import { CalendarFilters, type CalendarFiltersState, defaultCalendarFilters } from "./calendar-filters";

// Lazy load heavy modal component
const PostDetailModal = lazy(() =>
  import("./post-detail-modal").then((mod) => ({ default: mod.PostDetailModal }))
);
import { useCalendarData, useAccountsWithPlatform, useGoals } from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import type { ContentCalendarEntry, ContentAccountWithPlatform } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

export type CalendarViewMode = "month" | "week" | "day" | "list";

interface ContentCalendarProps {
  planId: string;
}

export interface CalendarEntryGroup {
  time: string;
  entries: ContentCalendarEntry[];
}

export interface DayData {
  date: Date;
  entries: ContentCalendarEntry[];
  isCurrentMonth?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDateRange(date: Date, viewMode: CalendarViewMode) {
  switch (viewMode) {
    case "month": {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      // Include full weeks
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
      };
    }
    case "week": {
      return {
        start: startOfWeek(date, { weekStartsOn: 0 }),
        end: endOfWeek(date, { weekStartsOn: 0 }),
      };
    }
    case "day":
    case "list": {
      // For list view, show 30 days from current date
      return {
        start: date,
        end: viewMode === "list" ? addDays(date, 30) : date,
      };
    }
  }
}

function groupEntriesByDay(
  entries: ContentCalendarEntry[],
  startDate: Date,
  endDate: Date
): Map<string, ContentCalendarEntry[]> {
  const grouped = new Map<string, ContentCalendarEntry[]>();

  // Initialize all days in range
  let currentDate = startDate;
  while (currentDate <= endDate) {
    grouped.set(format(currentDate, "yyyy-MM-dd"), []);
    currentDate = addDays(currentDate, 1);
  }

  // Group entries by day
  entries.forEach((entry) => {
    if (entry.scheduled_at) {
      const dayKey = format(parseISO(entry.scheduled_at), "yyyy-MM-dd");
      const dayEntries = grouped.get(dayKey);
      if (dayEntries) {
        dayEntries.push(entry);
      }
    }
  });

  // Sort entries within each day by time
  grouped.forEach((dayEntries) => {
    dayEntries.sort((a, b) => {
      const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return timeA - timeB;
    });
  });

  return grouped;
}

function filterEntries(
  entries: ContentCalendarEntry[],
  filters: CalendarFiltersState,
  accounts: ContentAccountWithPlatform[]
): ContentCalendarEntry[] {
  return entries.filter((entry) => {
    // Status filter
    if (filters.status !== "all") {
      if (filters.status === "scheduled" && entry.status !== "scheduled") return false;
      if (filters.status === "posted" && entry.status !== "posted") return false;
    }

    // Account filter
    if (filters.accountIds.length > 0 && !filters.accountIds.includes(entry.account_id)) {
      return false;
    }

    // Platform filter (derive from accounts)
    if (filters.platformIds.length > 0) {
      const account = accounts.find((a) => a.id === entry.account_id);
      if (!account || !filters.platformIds.includes(account.platform_id)) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ContentCalendar({ planId }: ContentCalendarProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<CalendarFiltersState>(defaultCalendarFilters);

  // Post detail modal state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Calculate date range based on view
  const dateRange = useMemo(
    () => getDateRange(currentDate, viewMode),
    [currentDate, viewMode]
  );

  // Fetch data
  const { data: accounts = [] } = useAccountsWithPlatform(planId);
  const { data: goals = [] } = useGoals(planId);
  const { data: calendarEntries = [], isLoading } = useCalendarData(
    planId,
    format(dateRange.start, "yyyy-MM-dd"),
    format(dateRange.end, "yyyy-MM-dd")
  );

  // Filter entries
  const filteredEntries = useMemo(
    () => filterEntries(calendarEntries, filters, accounts),
    [calendarEntries, filters, accounts]
  );

  // Group entries by day
  const entriesByDay = useMemo(
    () => groupEntriesByDay(filteredEntries, dateRange.start, dateRange.end),
    [filteredEntries, dateRange]
  );

  // Navigation handlers
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    switch (viewMode) {
      case "month":
        setCurrentDate((d) => subMonths(d, 1));
        break;
      case "week":
      case "list":
        setCurrentDate((d) => subWeeks(d, 1));
        break;
      case "day":
        setCurrentDate((d) => subDays(d, 1));
        break;
    }
  }, [viewMode]);

  const goToNext = useCallback(() => {
    switch (viewMode) {
      case "month":
        setCurrentDate((d) => addMonths(d, 1));
        break;
      case "week":
      case "list":
        setCurrentDate((d) => addWeeks(d, 1));
        break;
      case "day":
        setCurrentDate((d) => addDays(d, 1));
        break;
    }
  }, [viewMode]);

  // Handler for clicking a day in month view - navigates to day view
  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  }, []);

  // Entry click handler
  const handleEntryClick = useCallback((entry: ContentCalendarEntry) => {
    setSelectedPostId(entry.post_id);
    setModalOpen(true);
  }, []);

  // Get title based on view mode
  const getTitle = () => {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "week":
        return `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`;
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "list":
        return "Upcoming Content";
    }
  };

  // Get timezone display
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <h2 className="text-lg font-semibold ml-2">{getTitle()}</h2>
        </div>

        {/* View Mode & Filters */}
        <div className="flex items-center gap-2">
          <span className="text-small text-text-muted hidden sm:inline">
            {timezone}
          </span>

          {/* View Mode Selector */}
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-r-none",
                viewMode === "day" && "bg-bg-1"
              )}
              onClick={() => setViewMode("day")}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Day</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none border-x border-border",
                viewMode === "week" && "bg-bg-1"
              )}
              onClick={() => setViewMode("week")}
            >
              <CalendarRange className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Week</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none border-r border-border",
                viewMode === "month" && "bg-bg-1"
              )}
              onClick={() => setViewMode("month")}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Month</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-l-none sm:hidden",
                viewMode === "list" && "bg-bg-1"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <CalendarFilters
        filters={filters}
        onFiltersChange={setFilters}
        accounts={accounts}
      />

      {/* Calendar Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : (
        <>
          {/* Desktop/Tablet Views */}
          <div className={cn(viewMode === "list" ? "hidden" : "hidden sm:block")}>
            {viewMode === "month" && (
              <CalendarMonthView
                currentDate={currentDate}
                entriesByDay={entriesByDay}
                onEntryClick={handleEntryClick}
                onDayClick={handleDayClick}
                onMoreClick={handleDayClick}
              />
            )}
            {viewMode === "week" && (
              <CalendarWeekView
                currentDate={currentDate}
                dateRange={dateRange}
                entriesByDay={entriesByDay}
                onEntryClick={handleEntryClick}
              />
            )}
            {viewMode === "day" && (
              <CalendarDayView
                currentDate={currentDate}
                entries={entriesByDay.get(format(currentDate, "yyyy-MM-dd")) || []}
                onEntryClick={handleEntryClick}
              />
            )}
          </div>

          {/* Mobile List View (always show on mobile, or when list mode selected) */}
          <div className={cn(viewMode === "list" ? "block" : "block sm:hidden")}>
            <CalendarListView
              currentDate={currentDate}
              entriesByDay={entriesByDay}
              onEntryClick={handleEntryClick}
            />
          </div>
        </>
      )}

      {/* Post Detail Modal - Lazy loaded */}
      {modalOpen && (
        <Suspense fallback={null}>
          <PostDetailModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            planId={planId}
            postId={selectedPostId}
            goals={goals}
            accounts={accounts}
          />
        </Suspense>
      )}
    </div>
  );
}
