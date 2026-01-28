"use client";

import { memo, useMemo } from "react";
import { ExpandableCard } from "@/components/ui/expandable-card";
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
import type { CheckIn, Task } from "@/lib/supabase/types";

interface ActivityHeatmapProps {
  checkIns: CheckIn[];
  tasks: Task[];
  postedDistributions: { id: string; posted_at: string }[];
  distributionMetrics: { id: string; checked_at: string }[];
  year: number;
}

// Activity breakdown for a single day
interface DayActivity {
  okrCheckIns: number;
  tasksCompleted: number;
  postsShared: number;
  postCheckIns: number;
  total: number;
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

// Format activity breakdown for tooltip
const formatActivityBreakdown = (activity: DayActivity): string => {
  const parts: string[] = [];
  if (activity.okrCheckIns > 0) {
    parts.push(`${activity.okrCheckIns} OKR check-in${activity.okrCheckIns !== 1 ? "s" : ""}`);
  }
  if (activity.tasksCompleted > 0) {
    parts.push(`${activity.tasksCompleted} Task${activity.tasksCompleted !== 1 ? "s" : ""} completed`);
  }
  if (activity.postsShared > 0) {
    parts.push(`${activity.postsShared} Post${activity.postsShared !== 1 ? "s" : ""} shared`);
  }
  if (activity.postCheckIns > 0) {
    parts.push(`${activity.postCheckIns} Post check-in${activity.postCheckIns !== 1 ? "s" : ""}`);
  }
  return parts.join(" | ");
};

export const ActivityHeatmap = memo(function ActivityHeatmap({
  checkIns,
  tasks,
  postedDistributions,
  distributionMetrics,
  year,
}: ActivityHeatmapProps) {
  const { grid, maxCount, totalActivity, activeDays, longestStreak } = useMemo(() => {
    // Aggregate activity by date from all sources with breakdown:
    // 1. OKR Check-ins (by recorded_at)
    // 2. Completed tasks (by completed_at)
    // 3. Posted distributions (by posted_at) - "Posts shared"
    // 4. Distribution metrics (by checked_at) - "Post check-ins"
    const activityByDate = new Map<string, DayActivity>();

    const getOrCreate = (date: string): DayActivity => {
      let activity = activityByDate.get(date);
      if (!activity) {
        activity = { okrCheckIns: 0, tasksCompleted: 0, postsShared: 0, postCheckIns: 0, total: 0 };
        activityByDate.set(date, activity);
      }
      return activity;
    };

    // Count OKR check-ins
    checkIns.forEach((ci) => {
      const date = ci.recorded_at.split("T")[0];
      const activity = getOrCreate(date);
      activity.okrCheckIns++;
      activity.total++;
    });

    // Count completed tasks
    tasks.forEach((task) => {
      if (task.completed_at) {
        const date = task.completed_at.split("T")[0];
        const activity = getOrCreate(date);
        activity.tasksCompleted++;
        activity.total++;
      }
    });

    // Count posted distributions (posts shared)
    postedDistributions.forEach((dist) => {
      if (dist.posted_at) {
        const date = dist.posted_at.split("T")[0];
        const activity = getOrCreate(date);
        activity.postsShared++;
        activity.total++;
      }
    });

    // Count distribution metrics (post check-ins)
    distributionMetrics.forEach((metric) => {
      if (metric.checked_at) {
        const date = metric.checked_at.split("T")[0];
        const activity = getOrCreate(date);
        activity.postCheckIns++;
        activity.total++;
      }
    });

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // Generate all days of the year
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });

    // Find the Sunday before year start to align grid
    const gridStart = startOfWeek(yearStart, { weekStartsOn: 0 });

    // Build grid structure (53 weeks × 7 days)
    const emptyActivity: DayActivity = { okrCheckIns: 0, tasksCompleted: 0, postsShared: 0, postCheckIns: 0, total: 0 };
    const weeks: { date: Date; activity: DayActivity; isYear: boolean; isFuture: boolean }[][] = [];
    let currentWeek: { date: Date; activity: DayActivity; isYear: boolean; isFuture: boolean }[] = [];

    // Add padding days before year start
    const paddingDays = getDay(yearStart);
    for (let i = 0; i < paddingDays; i++) {
      const paddingDate = new Date(gridStart);
      paddingDate.setDate(gridStart.getDate() + i);
      currentWeek.push({
        date: paddingDate,
        activity: emptyActivity,
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
      const activity = activityByDate.get(dateStr) || emptyActivity;
      const isFutureDay = isFuture(day);

      // Update stats
      if (!isFutureDay) {
        if (activity.total > max) max = activity.total;
        total += activity.total;
        if (activity.total > 0) {
          active++;
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      }

      currentWeek.push({
        date: day,
        activity,
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
          activity: emptyActivity,
          isYear: false,
          isFuture: true,
        });
      }
      weeks.push(currentWeek);
    }

    return {
      grid: weeks,
      maxCount: max || 1,
      totalActivity: total,
      activeDays: active,
      longestStreak: maxStreak,
    };
  }, [checkIns, tasks, postedDistributions, distributionMetrics, year]);

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

  // Render heatmap content
  const renderContent = () => (
    <>
      {/* Stats Row */}
      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-border-soft">
        <div>
          <p className="text-2xl font-bold font-heading">{totalActivity}</p>
          <p className="text-xs text-text-muted">Total activities</p>
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
                    const breakdown = formatActivityBreakdown(day.activity);

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
                                  : getColor(day.activity.total, maxCount),
                              isCurrentDay && "ring-1 ring-accent ring-offset-1"
                            )}
                          />
                        </TooltipTrigger>
                        {day.isYear && !day.isFuture && (
                          <TooltipContent
                            side="top"
                            className="text-xs max-w-xs"
                          >
                            <p className="font-medium">
                              {day.activity.total} activit{day.activity.total !== 1 ? "ies" : "y"}
                            </p>
                            {breakdown && (
                              <p className="text-text-muted text-[10px]">
                                {breakdown}
                              </p>
                            )}
                            <p className="text-text-muted mt-1">
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
    </>
  );

  return (
    <ExpandableCard
      title="Activity Heatmap"
      icon={<Calendar className="w-4 h-4 text-text-muted" />}
      headerActions={
        <span className="text-small font-normal text-text-muted">
          {year}
        </span>
      }
    >
      {renderContent()}
    </ExpandableCard>
  );
});
