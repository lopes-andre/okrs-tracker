"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
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
import { Activity, TrendingUp } from "lucide-react";
import {
  format,
  eachWeekOfInterval,
  endOfWeek,
  subWeeks,
  isWithinInterval,
} from "date-fns";
import type { CheckIn } from "@/lib/supabase/types";
import type { KrPerformanceRow } from "@/features/analytics/api";

interface CheckInVelocityChartProps {
  checkIns: CheckIn[];
  krs: KrPerformanceRow[];
}

export function CheckInVelocityChart({ checkIns, krs }: CheckInVelocityChartProps) {
  const [weeksToShow, setWeeksToShow] = useState<string>("12");
  const [metric, setMetric] = useState<"count" | "progress">("count");

  const { chartData, stats } = useMemo(() => {
    const now = new Date();
    const weeks = parseInt(weeksToShow);
    const startDate = subWeeks(now, weeks - 1);

    const weekIntervals = eachWeekOfInterval(
      { start: startDate, end: now },
      { weekStartsOn: 0 }
    );

    // Create KR lookup for progress calculations
    const krLookup = new Map(krs.map((kr) => [kr.id, kr]));

    // Calculate data for each week
    const data = weekIntervals.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

      const weekCheckIns = checkIns.filter((ci) => {
        const date = new Date(ci.recorded_at);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      });

      // Calculate total progress contribution this week
      let progressContribution = 0;
      weekCheckIns.forEach((ci) => {
        const kr = krLookup.get(ci.annual_kr_id);
        if (kr && kr.targetValue !== kr.startValue) {
          const valueChange = ci.value - (ci.previous_value || kr.startValue);
          const progressChange = valueChange / (kr.targetValue - kr.startValue);
          progressContribution += Math.abs(progressChange);
        }
      });

      // Unique KRs updated
      const uniqueKrsUpdated = new Set(weekCheckIns.map((ci) => ci.annual_kr_id)).size;

      return {
        label: format(weekStart, "MMM d"),
        fullLabel: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        checkIns: weekCheckIns.length,
        uniqueKrs: uniqueKrsUpdated,
        progressContribution: Math.round(progressContribution * 1000) / 10, // As percentage points
      };
    });

    // Calculate stats
    const totalCheckIns = data.reduce((sum, d) => sum + d.checkIns, 0);
    const avgCheckIns = data.length > 0 ? totalCheckIns / data.length : 0;
    const peakCheckIns = Math.max(...data.map((d) => d.checkIns));
    const totalProgress = data.reduce((sum, d) => sum + d.progressContribution, 0);

    // Trend calculation
    let trend: "up" | "down" | "stable" = "stable";
    if (data.length >= 8) {
      const recent4Avg = data.slice(-4).reduce((s, d) => s + d.checkIns, 0) / 4;
      const prev4Avg = data.slice(-8, -4).reduce((s, d) => s + d.checkIns, 0) / 4;
      if (recent4Avg > prev4Avg * 1.15) trend = "up";
      else if (recent4Avg < prev4Avg * 0.85) trend = "down";
    }

    // Consistency score (weeks with at least 1 check-in / total weeks)
    const weeksWithCheckIns = data.filter((d) => d.checkIns > 0).length;
    const consistencyScore = data.length > 0 ? Math.round((weeksWithCheckIns / data.length) * 100) : 0;

    return {
      chartData: data,
      stats: {
        avgCheckIns: Math.round(avgCheckIns * 10) / 10,
        peakCheckIns,
        totalCheckIns,
        totalProgress: Math.round(totalProgress * 10) / 10,
        trend,
        consistencyScore,
      },
    };
  }, [checkIns, krs, weeksToShow]);

  const renderChartContent = (height: number) => (
    <>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-soft)" }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            {metric === "progress" && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
            )}
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
                  checkIns: "Check-ins",
                  uniqueKrs: "KRs Updated",
                  progressContribution: "Progress Impact",
                };
                if (name === "progressContribution") {
                  return [`${value}%`, labels[name as string]];
                }
                return [value, labels[name as string] || name];
              }) as Formatter<number, string>}
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullLabel;
                }
                return "";
              }}
            />
            <ReferenceLine
              yAxisId="left"
              y={stats.avgCheckIns}
              stroke="var(--text-muted)"
              strokeDasharray="3 3"
            />
            <Bar
              yAxisId="left"
              dataKey="checkIns"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              fillOpacity={0.8}
            />
            {metric === "progress" && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="progressContribution"
                stroke="#22C55E"
                strokeWidth={2}
                dot={{ fill: "#22C55E", strokeWidth: 0, r: 3 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-accent opacity-80" />
          <span className="text-xs text-text-muted">Check-ins</span>
        </div>
        {metric === "progress" && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-success" />
            <span className="text-xs text-text-muted">Progress Impact</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-0 border-t border-dashed border-text-muted" />
          <span className="text-xs text-text-muted">Avg ({stats.avgCheckIns}/wk)</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border-soft">
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <p className="text-xl font-bold font-heading">{stats.avgCheckIns}</p>
            {stats.trend === "up" && <TrendingUp className="w-4 h-4 text-status-success" />}
            {stats.trend === "down" && <TrendingUp className="w-4 h-4 text-status-danger rotate-180" />}
          </div>
          <p className="text-xs text-text-muted">Avg per Week</p>
        </div>

        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <p className="text-xl font-bold font-heading">{stats.peakCheckIns}</p>
          <p className="text-xs text-text-muted">Peak Week</p>
        </div>

        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <p className="text-xl font-bold font-heading">{stats.consistencyScore}%</p>
          <p className="text-xs text-text-muted">Consistency</p>
        </div>

        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <p className="text-xl font-bold font-heading">{stats.totalProgress}%</p>
          <p className="text-xs text-text-muted">Total Impact</p>
        </div>
      </div>
    </>
  );

  const headerActions = (
    <>
      <Select value={metric} onValueChange={(v) => setMetric(v as "count" | "progress")}>
        <SelectTrigger className="w-32 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="count">Count Only</SelectItem>
          <SelectItem value="progress">With Impact</SelectItem>
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
      title="Check-in Velocity"
      icon={<Activity className="w-4 h-4 text-text-muted" />}
      headerActions={headerActions}
      fullscreenContent={renderChartContent(500)}
    >
      {renderChartContent(280)}
    </ExpandableCard>
  );
}
