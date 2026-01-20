"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboardData } from "../dashboard-data-provider";
import { cn } from "@/lib/utils";
import {
  format,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  startOfWeek,
  getDay,
  isToday,
  isFuture,
} from "date-fns";

interface ActivityHeatmapWidgetProps {
  config: Record<string, unknown>;
}

// GitHub-style color scale
const getColor = (count: number, maxCount: number): string => {
  if (count === 0) return "bg-bg-1";
  const intensity = count / maxCount;
  if (intensity <= 0.25) return "bg-status-success/20";
  if (intensity <= 0.5) return "bg-status-success/40";
  if (intensity <= 0.75) return "bg-status-success/60";
  return "bg-status-success";
};

export function ActivityHeatmapWidget({ config }: ActivityHeatmapWidgetProps) {
  const { checkIns, year } = useDashboardData();
  const compact = (config.compact as boolean) ?? true;

  const { grid, maxCount, totalCheckIns, activeDays, longestStreak } = useMemo(() => {
    // Group check-ins by date
    const checkInsByDate = new Map<string, number>();
    checkIns.forEach((ci) => {
      const date = ci.recorded_at.split("T")[0];
      checkInsByDate.set(date, (checkInsByDate.get(date) || 0) + 1);
    });

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });

    // Find the Sunday before year start to align grid
    const gridStart = startOfWeek(yearStart, { weekStartsOn: 0 });

    // Build grid structure (53 weeks × 7 days)
    const weeks: { date: Date; count: number; isYear: boolean; isFuture: boolean }[][] = [];
    let currentWeek: { date: Date; count: number; isYear: boolean; isFuture: boolean }[] = [];

    // Add padding days before year start
    const paddingDays = getDay(yearStart);
    for (let i = 0; i < paddingDays; i++) {
      const paddingDate = new Date(gridStart);
      paddingDate.setDate(gridStart.getDate() + i);
      currentWeek.push({
        date: paddingDate,
        count: 0,
        isYear: false,
        isFuture: false,
      });
    }

    // Track stats
    let max = 0;
    let total = 0;
    let active = 0;
    let currentStreak = 0;
    let maxStreak = 0;

    allDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const count = checkInsByDate.get(dateStr) || 0;
      const isFutureDay = isFuture(day);

      if (!isFutureDay) {
        if (count > max) max = count;
        total += count;
        if (count > 0) {
          active++;
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      }

      currentWeek.push({
        date: day,
        count,
        isYear: true,
        isFuture: isFutureDay,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        const lastDate = currentWeek[currentWeek.length - 1].date;
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);
        currentWeek.push({
          date: nextDate,
          count: 0,
          isYear: false,
          isFuture: true,
        });
      }
      weeks.push(currentWeek);
    }

    return {
      grid: weeks,
      maxCount: max || 1,
      totalCheckIns: total,
      activeDays: active,
      longestStreak: maxStreak,
    };
  }, [checkIns, year]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    grid.forEach((week, weekIndex) => {
      const firstDayOfWeek = week.find((d) => d.isYear);
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            label: format(firstDayOfWeek.date, "MMM"),
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [grid]);

  return (
    <div className="h-full flex flex-col">
      {/* Stats Row */}
      <div className="flex items-center gap-6 mb-4 pb-4 border-b border-border-soft">
        <div>
          <p className="text-2xl font-bold font-heading">{totalCheckIns}</p>
          <p className="text-xs text-text-muted">Check-ins</p>
        </div>
        <div className="w-px h-10 bg-border-soft" />
        <div>
          <p className="text-2xl font-bold font-heading">{activeDays}</p>
          <p className="text-xs text-text-muted">Active days</p>
        </div>
        <div className="w-px h-10 bg-border-soft" />
        <div>
          <p className="text-2xl font-bold font-heading">{longestStreak}</p>
          <p className="text-xs text-text-muted">Best streak</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex-1 overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex ml-6 mb-1">
            {monthLabels.map(({ label, weekIndex }, i) => (
              <div
                key={i}
                className="text-[9px] text-text-muted"
                style={{
                  marginLeft: i === 0 ? `${weekIndex * 10}px` : undefined,
                  width: i < monthLabels.length - 1
                    ? `${(monthLabels[i + 1].weekIndex - weekIndex) * 10}px`
                    : undefined,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Day labels */}
            {!compact && (
              <div className="flex flex-col gap-[2px] mr-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div
                    key={day + i}
                    className={cn(
                      "text-[8px] text-text-muted h-[8px] flex items-center",
                      i % 2 === 0 ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>
            )}

            {/* Weeks */}
            <TooltipProvider delayDuration={100}>
              <div className="flex gap-[2px]">
                {grid.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[2px]">
                    {week.map((day, dayIndex) => {
                      const isCurrentDay = isToday(day.date);

                      return (
                        <Tooltip key={dayIndex}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-[8px] h-[8px] rounded-[1px] transition-colors",
                                day.isFuture
                                  ? "bg-bg-1/50"
                                  : !day.isYear
                                    ? "bg-transparent"
                                    : getColor(day.count, maxCount),
                                isCurrentDay && "ring-1 ring-accent ring-offset-1"
                              )}
                            />
                          </TooltipTrigger>
                          {day.isYear && !day.isFuture && (
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">
                                {day.count} check-in{day.count !== 1 ? "s" : ""}
                              </p>
                              <p className="text-text-muted">
                                {format(day.date, "MMM d, yyyy")}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-text-muted">
            <span>Less</span>
            <div className="flex gap-[2px]">
              <div className="w-[8px] h-[8px] rounded-[1px] bg-bg-1" />
              <div className="w-[8px] h-[8px] rounded-[1px] bg-status-success/20" />
              <div className="w-[8px] h-[8px] rounded-[1px] bg-status-success/40" />
              <div className="w-[8px] h-[8px] rounded-[1px] bg-status-success/60" />
              <div className="w-[8px] h-[8px] rounded-[1px] bg-status-success" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
