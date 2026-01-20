"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "lucide-react";
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
import type { CheckInsByDay } from "@/features/analytics/api";

interface ActivityHeatmapProps {
  data: CheckInsByDay[];
  year: number;
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

export function ActivityHeatmap({ data, year }: ActivityHeatmapProps) {
  const { grid, maxCount, totalCheckIns, activeDays, longestStreak } = useMemo(() => {
    // Create lookup map
    const dataMap = new Map(data.map((d) => [d.date, d]));
    
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));
    
    // Generate all days of the year
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
      const dayData = dataMap.get(dateStr);
      const count = dayData?.count || 0;
      const isFutureDay = isFuture(day);
      
      // Update stats
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
  }, [data, year]);

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

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          Activity Heatmap
          <span className="text-small font-normal text-text-muted ml-2">
            {year}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="flex items-center gap-6 mb-6 pb-4 border-b border-border-soft">
          <div>
            <p className="text-2xl font-bold font-heading">{totalCheckIns}</p>
            <p className="text-xs text-text-muted">Total check-ins</p>
          </div>
          <div className="w-px h-10 bg-border-soft" />
          <div>
            <p className="text-2xl font-bold font-heading">{activeDays}</p>
            <p className="text-xs text-text-muted">Active days</p>
          </div>
          <div className="w-px h-10 bg-border-soft" />
          <div>
            <p className="text-2xl font-bold font-heading">{longestStreak}</p>
            <p className="text-xs text-text-muted">Longest streak</p>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block">
            {/* Month labels */}
            <div className="flex ml-8 mb-1">
              {monthLabels.map(({ label, weekIndex }, i) => (
                <div
                  key={i}
                  className="text-[10px] text-text-muted"
                  style={{ 
                    marginLeft: i === 0 ? `${weekIndex * 12}px` : undefined,
                    width: i < monthLabels.length - 1 
                      ? `${(monthLabels[i + 1].weekIndex - weekIndex) * 12}px`
                      : undefined,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid with day labels */}
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col gap-[2px] mr-1">
                {dayLabels.map((day, i) => (
                  <div 
                    key={day} 
                    className={cn(
                      "text-[9px] text-text-muted h-[10px] flex items-center",
                      i % 2 === 0 ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              <div className="flex gap-[2px]">
                {grid.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[2px]">
                    {week.map((day, dayIndex) => {
                      const isCurrentDay = isToday(day.date);

                      return (
                        <Tooltip key={dayIndex} delayDuration={100}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-[10px] h-[10px] rounded-[2px] transition-colors",
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
                            <TooltipContent
                              side="top"
                              className="text-xs"
                            >
                              <p className="font-medium">
                                {day.count} check-in{day.count !== 1 ? "s" : ""}
                              </p>
                              <p className="text-text-muted">
                                {format(day.date, "EEEE, MMM d, yyyy")}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-text-muted">
              <span>Less</span>
              <div className="flex gap-[2px]">
                <div className="w-[10px] h-[10px] rounded-[2px] bg-bg-1" />
                <div className="w-[10px] h-[10px] rounded-[2px] bg-status-success/20" />
                <div className="w-[10px] h-[10px] rounded-[2px] bg-status-success/40" />
                <div className="w-[10px] h-[10px] rounded-[2px] bg-status-success/60" />
                <div className="w-[10px] h-[10px] rounded-[2px] bg-status-success" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
