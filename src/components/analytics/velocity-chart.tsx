"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Formatter } from "recharts/types/component/DefaultTooltipContent";
import { ExpandableCard } from "@/components/ui/expandable-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Zap } from "lucide-react";
import {
  format,
  eachWeekOfInterval,
  endOfWeek,
  subWeeks,
  isWithinInterval,
  differenceInDays,
} from "date-fns";
import type { Task } from "@/lib/supabase/types";

interface VelocityChartProps {
  tasks: Task[];
}

type ChartType = "line" | "area";

export function VelocityChart({ tasks }: VelocityChartProps) {
  const [weeksToShow, setWeeksToShow] = useState<string>("12");
  const [chartType, setChartType] = useState<ChartType>("area");

  const { chartData, stats } = useMemo(() => {
    const now = new Date();
    const weeks = parseInt(weeksToShow);
    const startDate = subWeeks(now, weeks - 1);

    const weekIntervals = eachWeekOfInterval(
      { start: startDate, end: now },
      { weekStartsOn: 0 }
    );

    const completedTasks = tasks.filter(
      (t) => t.status === "completed" && t.completed_at
    );

    // Calculate velocity for each week
    const data = weekIntervals.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

      // Tasks completed in this week
      const weekCompleted = completedTasks.filter((t) => {
        const completedDate = new Date(t.completed_at!);
        return isWithinInterval(completedDate, { start: weekStart, end: weekEnd });
      });

      // Tasks created in this week
      const weekCreated = tasks.filter((t) => {
        const createdDate = new Date(t.created_at);
        return isWithinInterval(createdDate, { start: weekStart, end: weekEnd });
      });

      // Calculate avg completion time for tasks completed this week
      let avgCompletionDays = 0;
      const tasksWithCompletionTime = weekCompleted.filter((t) => t.created_at);
      if (tasksWithCompletionTime.length > 0) {
        const totalDays = tasksWithCompletionTime.reduce((sum, t) => {
          return sum + differenceInDays(new Date(t.completed_at!), new Date(t.created_at));
        }, 0);
        avgCompletionDays = totalDays / tasksWithCompletionTime.length;
      }

      return {
        label: format(weekStart, "MMM d"),
        fullLabel: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        completed: weekCompleted.length,
        created: weekCreated.length,
        netVelocity: weekCompleted.length - weekCreated.length,
        avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
      };
    });

    // Calculate stats
    const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
    const avgVelocity = data.length > 0 ? totalCompleted / data.length : 0;
    const peakVelocity = Math.max(...data.map((d) => d.completed));

    // Trend: compare last 4 weeks avg to previous 4 weeks avg
    let trend: "up" | "down" | "stable" = "stable";
    if (data.length >= 8) {
      const recent4Avg = data.slice(-4).reduce((s, d) => s + d.completed, 0) / 4;
      const prev4Avg = data.slice(-8, -4).reduce((s, d) => s + d.completed, 0) / 4;
      if (recent4Avg > prev4Avg * 1.1) trend = "up";
      else if (recent4Avg < prev4Avg * 0.9) trend = "down";
    }

    return {
      chartData: data,
      stats: {
        avgVelocity: Math.round(avgVelocity * 10) / 10,
        peakVelocity,
        totalCompleted,
        trend,
      },
    };
  }, [tasks, weeksToShow]);

  const renderChartContent = (height: number) => {
    const ChartComponent = chartType === "area" ? AreaChart : LineChart;

    return (
      <>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                formatter={((value, name) => {
                  if (typeof value !== "number") return null;
                  const labels: Record<string, string> = {
                    completed: "Completed",
                    created: "Created",
                    netVelocity: "Net Change",
                  };
                  return [value, labels[name as string] || name];
                }) as Formatter<number, string>}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullLabel;
                  }
                  return "";
                }}
              />
              <ReferenceLine y={stats.avgVelocity} stroke="var(--text-muted)" strokeDasharray="3 3" />
              {chartType === "area" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stroke="var(--text-muted)"
                    fill="var(--text-muted)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ fill: "var(--accent)", strokeWidth: 0, r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="created"
                    stroke="var(--text-muted)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ fill: "var(--text-muted)", strokeWidth: 0, r: 3 }}
                  />
                </>
              )}
            </ChartComponent>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-xs text-text-muted">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-text-muted" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--text-muted) 0px, var(--text-muted) 4px, transparent 4px, transparent 8px)" }} />
            <span className="text-xs text-text-muted">Created</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0 border-t border-dashed border-text-muted" />
            <span className="text-xs text-text-muted">Avg ({stats.avgVelocity}/wk)</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border-soft">
          <div className="text-center">
            <p className="text-2xl font-bold font-heading">{stats.avgVelocity}</p>
            <p className="text-xs text-text-muted">Avg per week</p>
          </div>
          <div className="w-px h-8 bg-border-soft" />
          <div className="text-center">
            <p className="text-2xl font-bold font-heading">{stats.peakVelocity}</p>
            <p className="text-xs text-text-muted">Peak week</p>
          </div>
          <div className="w-px h-8 bg-border-soft" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-2xl font-bold font-heading">{stats.totalCompleted}</p>
              {stats.trend === "up" && <TrendingUp className="w-4 h-4 text-status-success" />}
              {stats.trend === "down" && <TrendingUp className="w-4 h-4 text-status-danger rotate-180" />}
            </div>
            <p className="text-xs text-text-muted">Total completed</p>
          </div>
        </div>
      </>
    );
  };

  const headerActions = (
    <>
      <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
        <SelectTrigger className="w-24 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="area">Area</SelectItem>
          <SelectItem value="line">Line</SelectItem>
        </SelectContent>
      </Select>
      <Select value={weeksToShow} onValueChange={setWeeksToShow}>
        <SelectTrigger className="w-28 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="4">4 weeks</SelectItem>
          <SelectItem value="8">8 weeks</SelectItem>
          <SelectItem value="12">12 weeks</SelectItem>
          <SelectItem value="26">26 weeks</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <ExpandableCard
      title="Task Velocity"
      icon={<Zap className="w-4 h-4 text-text-muted" />}
      headerActions={headerActions}
      fullscreenContent={renderChartContent(500)}
    >
      {renderChartContent(250)}
    </ExpandableCard>
  );
}
