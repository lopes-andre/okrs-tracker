"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Calendar } from "lucide-react";
import { format, endOfWeek, eachWeekOfInterval, subWeeks, isWithinInterval } from "date-fns";
import type { CheckIn } from "@/lib/supabase/types";

interface ActivityBarChartProps {
  checkIns: CheckIn[];
  year: number;
}

type ViewMode = "weekly" | "monthly";

export function ActivityBarChart({ checkIns, year }: ActivityBarChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [weeksToShow, setWeeksToShow] = useState<string>("12");

  const chartData = useMemo(() => {
    const now = new Date();
    
    if (viewMode === "weekly") {
      const weeks = parseInt(weeksToShow);
      const startDate = subWeeks(now, weeks - 1);
      
      const weekIntervals = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 0 }
      );

      return weekIntervals.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
        const weekCheckIns = checkIns.filter((ci) => {
          const date = new Date(ci.recorded_at);
          return isWithinInterval(date, { start: weekStart, end: weekEnd });
        });

        return {
          label: format(weekStart, "MMM d"),
          fullLabel: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
          count: weekCheckIns.length,
          weekStart,
        };
      });
    } else {
      // Monthly view
      const months = [];
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(year, i, 1);
        const monthEnd = new Date(year, i + 1, 0);
        
        if (monthStart > now) break;
        
        const monthCheckIns = checkIns.filter((ci) => {
          const date = new Date(ci.recorded_at);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        });

        months.push({
          label: format(monthStart, "MMM"),
          fullLabel: format(monthStart, "MMMM yyyy"),
          count: monthCheckIns.length,
        });
      }
      return months;
    }
  }, [checkIns, viewMode, weeksToShow, year]);

  // Calculate average
  const average = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length
    : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-text-muted" />
            Check-in Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {viewMode === "weekly" && (
              <Select value={weeksToShow} onValueChange={setWeeksToShow}>
                <SelectTrigger className="w-28 h-8">
                  <Calendar className="w-3 h-3 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                  <SelectItem value="12">12 weeks</SelectItem>
                  <SelectItem value="26">26 weeks</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border-soft)" }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number) => [`${value} check-ins`, ""]) as any}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullLabel;
                  }
                  return "";
                }}
              />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.count >= average ? "var(--accent)" : "var(--border)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border-soft">
          <div className="text-center">
            <p className="text-2xl font-bold font-heading">
              {checkIns.length}
            </p>
            <p className="text-xs text-text-muted">Total check-ins</p>
          </div>
          <div className="w-px h-8 bg-border-soft" />
          <div className="text-center">
            <p className="text-2xl font-bold font-heading">
              {average.toFixed(1)}
            </p>
            <p className="text-xs text-text-muted">Avg per {viewMode === "weekly" ? "week" : "month"}</p>
          </div>
          <div className="w-px h-8 bg-border-soft" />
          <div className="text-center">
            <p className="text-2xl font-bold font-heading">
              {chartData.length > 0 ? Math.max(...chartData.map(d => d.count)) : 0}
            </p>
            <p className="text-xs text-text-muted">Best {viewMode === "weekly" ? "week" : "month"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
