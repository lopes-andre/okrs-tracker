"use client";

import {
  Zap,
  Flame,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductivityStats } from "@/features/analytics/api";

interface ProductivityPanelProps {
  stats: ProductivityStats;
}

export function ProductivityPanel({ stats }: ProductivityPanelProps) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Find max for normalization
  const maxDayCount = Math.max(...Object.values(stats.checkInsByDayOfWeek), 1);
  
  // Calculate weekday vs weekend
  const weekdayTotal = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    .reduce((sum, day) => sum + (stats.checkInsByDayOfWeek[day] || 0), 0);
  const weekendTotal = ["Saturday", "Sunday"]
    .reduce((sum, day) => sum + (stats.checkInsByDayOfWeek[day] || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-status-warning" />
          Productivity Patterns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-4">
          {/* Streak */}
          <div className="text-center p-4 rounded-card bg-status-warning/5 border border-status-warning/20">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Flame className="w-5 h-5 text-status-warning" />
            </div>
            <p className="text-2xl font-bold font-heading">{stats.currentStreak}</p>
            <p className="text-xs text-text-muted">Day streak</p>
          </div>
          
          {/* Best Day */}
          <div className="text-center p-4 rounded-card bg-accent/5 border border-accent/20">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <p className="text-lg font-bold font-heading">{stats.mostProductiveDay}</p>
            <p className="text-xs text-text-muted">Best day</p>
          </div>
          
          {/* Avg per week */}
          <div className="text-center p-4 rounded-card bg-status-success/5 border border-status-success/20">
            <div className="flex items-center justify-center gap-1 mb-2">
              <TrendingUp className="w-5 h-5 text-status-success" />
            </div>
            <p className="text-2xl font-bold font-heading">{stats.avgCheckInsPerWeek}</p>
            <p className="text-xs text-text-muted">Check-ins/week</p>
          </div>
        </div>

        {/* Day of Week Distribution */}
        <div>
          <h4 className="text-small font-medium mb-3">Activity by Day of Week</h4>
          <div className="space-y-2">
            {dayNames.map((day, index) => {
              const count = stats.checkInsByDayOfWeek[day] || 0;
              const percentage = (count / maxDayCount) * 100;
              const isTopDay = day === stats.mostProductiveDay;
              const isWeekend = day === "Saturday" || day === "Sunday";
              
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className={cn(
                    "w-8 text-xs",
                    isWeekend ? "text-text-subtle" : "text-text-muted"
                  )}>
                    {shortDayNames[index]}
                  </span>
                  <div className="flex-1 h-5 bg-bg-1 rounded-button overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-button transition-all",
                        isTopDay ? "bg-accent" : isWeekend ? "bg-text-subtle/30" : "bg-status-success/50"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className={cn(
                    "w-8 text-xs text-right font-medium",
                    isTopDay ? "text-accent" : "text-text-muted"
                  )}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekday vs Weekend */}
        <div className="pt-4 border-t border-border-soft">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-lg font-bold">{weekdayTotal}</p>
              <p className="text-xs text-text-muted">Weekday check-ins</p>
            </div>
            <div className="w-px h-10 bg-border-soft" />
            <div className="text-center flex-1">
              <p className="text-lg font-bold">{weekendTotal}</p>
              <p className="text-xs text-text-muted">Weekend check-ins</p>
            </div>
            <div className="w-px h-10 bg-border-soft" />
            <div className="text-center flex-1">
              <Badge 
                variant={weekdayTotal > weekendTotal * 2 ? "success" : "secondary"}
                className="text-[10px]"
              >
                {weekdayTotal > 0 
                  ? `${((weekdayTotal / (weekdayTotal + weekendTotal)) * 100).toFixed(0)}% weekday`
                  : "No data"
                }
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
