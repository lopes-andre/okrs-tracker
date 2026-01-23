"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
import { ListTodo, TrendingDown } from "lucide-react";
import {
  format,
  eachWeekOfInterval,
  startOfWeek,
  subWeeks,
  isBefore,
} from "date-fns";
import type { Task } from "@/lib/supabase/types";

interface PriorityBurndownChartProps {
  tasks: Task[];
}

type ViewMode = "stacked" | "separate";

const PRIORITY_COLORS = {
  high: "#EF4444", // red
  medium: "#F59E0B", // amber
  low: "#22C55E", // green
};

const PRIORITY_ORDER = ["high", "medium", "low"] as const;

export function PriorityBurndownChart({ tasks }: PriorityBurndownChartProps) {
  const [weeksToShow, setWeeksToShow] = useState<string>("12");
  const [viewMode, setViewMode] = useState<ViewMode>("stacked");

  const { chartData, stats } = useMemo(() => {
    const now = new Date();
    const weeks = parseInt(weeksToShow);
    const startDate = subWeeks(now, weeks - 1);
    const chartStartDate = startOfWeek(startDate, { weekStartsOn: 0 });

    const weekIntervals = eachWeekOfInterval(
      { start: chartStartDate, end: now },
      { weekStartsOn: 0 }
    );

    // For each week, calculate remaining active tasks by priority at that point in time
    const data = weekIntervals.map((weekStart) => {
      // Tasks that existed and were not completed/cancelled by this date
      const remainingByPriority: Record<string, number> = {
        high: 0,
        medium: 0,
        low: 0,
      };

      tasks.forEach((t) => {
        const createdAt = new Date(t.created_at);

        // Task must have been created before or during this week
        if (isBefore(weekStart, createdAt)) return;

        // Check if task was completed/cancelled before this week
        if (t.status === "completed" && t.completed_at) {
          const completedAt = new Date(t.completed_at);
          if (isBefore(completedAt, weekStart)) return;
        }
        if (t.status === "cancelled") return;

        const priority = t.priority || "medium";
        remainingByPriority[priority] = (remainingByPriority[priority] || 0) + 1;
      });

      return {
        label: format(weekStart, "MMM d"),
        fullLabel: format(weekStart, "MMM d, yyyy"),
        high: remainingByPriority.high,
        medium: remainingByPriority.medium,
        low: remainingByPriority.low,
        total: remainingByPriority.high + remainingByPriority.medium + remainingByPriority.low,
      };
    });

    // Calculate stats
    const firstWeek = data[0];
    const lastWeek = data[data.length - 1];
    const burndownRate = data.length > 1 ? (firstWeek.total - lastWeek.total) / data.length : 0;

    // Calculate burn rate per priority
    const highBurned = firstWeek.high - lastWeek.high;
    const mediumBurned = firstWeek.medium - lastWeek.medium;
    const lowBurned = firstWeek.low - lastWeek.low;

    return {
      chartData: data,
      stats: {
        startTotal: firstWeek.total,
        currentTotal: lastWeek.total,
        burnedTotal: firstWeek.total - lastWeek.total,
        burndownRate: Math.round(burndownRate * 10) / 10,
        highBurned,
        mediumBurned,
        lowBurned,
        currentHigh: lastWeek.high,
        currentMedium: lastWeek.medium,
        currentLow: lastWeek.low,
      },
    };
  }, [tasks, weeksToShow]);

  const renderChartContent = (height: number) => (
    <>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                  high: "High Priority",
                  medium: "Medium Priority",
                  low: "Low Priority",
                  total: "Total",
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
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  high: "High",
                  medium: "Medium",
                  low: "Low",
                };
                return <span className="text-xs">{labels[value] || value}</span>;
              }}
            />
            {viewMode === "stacked" ? (
              <>
                {PRIORITY_ORDER.map((priority) => (
                  <Area
                    key={priority}
                    type="monotone"
                    dataKey={priority}
                    stackId="1"
                    stroke={PRIORITY_COLORS[priority]}
                    fill={PRIORITY_COLORS[priority]}
                    fillOpacity={0.6}
                  />
                ))}
              </>
            ) : (
              <>
                {PRIORITY_ORDER.map((priority) => (
                  <Area
                    key={priority}
                    type="monotone"
                    dataKey={priority}
                    stroke={PRIORITY_COLORS[priority]}
                    fill={PRIORITY_COLORS[priority]}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ))}
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border-soft">
        <div className="text-center p-3 bg-bg-1 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="w-4 h-4 text-status-success" />
            <p className="text-xl font-bold font-heading">{stats.burnedTotal}</p>
          </div>
          <p className="text-xs text-text-muted">Tasks Burned Down</p>
        </div>

        <div className="text-center p-3 bg-bg-1 rounded-lg">
          <p className="text-xl font-bold font-heading">{stats.currentTotal}</p>
          <p className="text-xs text-text-muted">Remaining Tasks</p>
        </div>

        <div className="text-center p-3 bg-bg-1 rounded-lg">
          <p className="text-xl font-bold font-heading">{stats.burndownRate}/wk</p>
          <p className="text-xs text-text-muted">Burn Rate</p>
        </div>

        <div className="text-center p-3 bg-bg-1 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.high }} />
            <span className="text-sm font-medium">{stats.currentHigh}</span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.medium }} />
            <span className="text-sm font-medium">{stats.currentMedium}</span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.low }} />
            <span className="text-sm font-medium">{stats.currentLow}</span>
          </div>
          <p className="text-xs text-text-muted mt-1">By Priority</p>
        </div>
      </div>
    </>
  );

  const headerActions = (
    <>
      <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <SelectTrigger className="w-28 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="stacked">Stacked</SelectItem>
          <SelectItem value="separate">Separate</SelectItem>
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
      title="Task Burndown by Priority"
      icon={<ListTodo className="w-4 h-4 text-text-muted" />}
      headerActions={headerActions}
      fullscreenContent={renderChartContent(500)}
    >
      {renderChartContent(280)}
    </ExpandableCard>
  );
}
