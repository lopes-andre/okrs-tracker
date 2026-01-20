"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ExpandableCard } from "@/components/ui/expandable-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Calendar, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, eachDayOfInterval, eachWeekOfInterval } from "date-fns";
import type { KrPerformanceRow } from "@/features/analytics/api";
import type { CheckIn } from "@/lib/supabase/types";

interface ProgressChartProps {
  krs: KrPerformanceRow[];
  checkIns: CheckIn[];
  year: number;
}

// Color palette for multiple KRs
const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

type TimeRange = "ytd" | "q1" | "q2" | "q3" | "q4" | "last30" | "last90";

export function ProgressChart({ krs, checkIns, year }: ProgressChartProps) {
  const [selectedKrIds, setSelectedKrIds] = useState<Set<string>>(() => {
    // Default: select first 3 metric/count KRs
    const metricKrs = krs.filter((kr) => kr.krType === "metric" || kr.krType === "count");
    return new Set(metricKrs.slice(0, 3).map((kr) => kr.id));
  });
  const [timeRange, setTimeRange] = useState<TimeRange>("ytd");
  const [showExpected, setShowExpected] = useState(true);

  // Get date range based on selection
  const dateRange = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(year, 0, 1);
    
    switch (timeRange) {
      case "ytd":
        return { start: yearStart, end: now };
      case "q1":
        return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
      case "q2":
        return { start: new Date(year, 3, 1), end: new Date(year, 5, 30) };
      case "q3":
        return { start: new Date(year, 6, 1), end: new Date(year, 8, 30) };
      case "q4":
        return { start: new Date(year, 9, 1), end: new Date(year, 11, 31) };
      case "last30":
        const thirtyAgo = new Date(now);
        thirtyAgo.setDate(now.getDate() - 30);
        return { start: thirtyAgo, end: now };
      case "last90":
        const ninetyAgo = new Date(now);
        ninetyAgo.setDate(now.getDate() - 90);
        return { start: ninetyAgo, end: now };
      default:
        return { start: yearStart, end: now };
    }
  }, [timeRange, year]);

  // Build chart data
  const chartData = useMemo(() => {
    const selectedKrs = krs.filter((kr) => selectedKrIds.has(kr.id));
    if (selectedKrs.length === 0) return [];

    // Get all check-ins for selected KRs
    const relevantCheckIns = checkIns.filter(
      (ci) => selectedKrIds.has(ci.annual_kr_id) &&
        new Date(ci.recorded_at) >= dateRange.start &&
        new Date(ci.recorded_at) <= dateRange.end
    );

    // Create date buckets (weekly for year, daily for shorter ranges)
    const isShortRange = timeRange === "last30" || timeRange === "last90";
    const intervals = isShortRange
      ? eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
      : eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 0 });

    // Build data points
    const data: Record<string, number | string>[] = intervals.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const point: Record<string, number | string> = {
        date: dateStr,
        label: isShortRange ? format(date, "MMM d") : format(date, "MMM d"),
      };

      selectedKrs.forEach((kr, index) => {
        // Find the latest check-in on or before this date
        const krCheckIns = relevantCheckIns
          .filter((ci) => ci.annual_kr_id === kr.id)
          .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

        // Get cumulative value up to this date
        const checkInsUpToDate = krCheckIns.filter(
          (ci) => new Date(ci.recorded_at) <= date
        );

        if (checkInsUpToDate.length > 0) {
          // Use the last check-in value (for cumulative metrics like followers)
          const lastCheckIn = checkInsUpToDate[checkInsUpToDate.length - 1];
          point[`kr_${kr.id}`] = lastCheckIn.value;
        } else {
          // Before first check-in, use start value
          point[`kr_${kr.id}`] = kr.startValue;
        }

        // Calculate expected value at this point
        if (showExpected) {
          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year, 11, 31);
          const totalDays = (yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
          const daysElapsed = (date.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
          const expectedProgress = Math.min(daysElapsed / totalDays, 1);
          const expectedValue = kr.startValue + (kr.targetValue - kr.startValue) * expectedProgress;
          point[`expected_${kr.id}`] = Math.round(expectedValue);
        }
      });

      return point;
    });

    return data;
  }, [krs, checkIns, selectedKrIds, dateRange, timeRange, showExpected, year]);

  // Toggle KR selection
  const toggleKr = (krId: string) => {
    const newSelected = new Set(selectedKrIds);
    if (newSelected.has(krId)) {
      newSelected.delete(krId);
    } else {
      if (newSelected.size < 5) {
        newSelected.add(krId);
      }
    }
    setSelectedKrIds(newSelected);
  };

  // Filter to only show chartable KRs (metric/count)
  const chartableKrs = krs.filter((kr) => 
    kr.krType === "metric" || kr.krType === "count"
  );

  if (chartableKrs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-text-subtle mb-4" />
          <p className="text-text-muted">No metric or count KRs to chart</p>
        </CardContent>
      </Card>
    );
  }

  // Render chart content with configurable height
  const renderChartContent = (height: number) => (
    <>
      {selectedKrIds.size === 0 ? (
        <div className={`h-[${height}px] flex items-center justify-center text-text-muted`}>
          Select at least one KR to view the chart
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={{ stroke: "var(--border-soft)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={{ stroke: "var(--border-soft)" }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={((value: number, name: string) => {
                  const krId = name.replace("kr_", "").replace("expected_", "");
                  const kr = krs.find((k) => k.id === krId);
                  const isExpected = name.startsWith("expected_");
                  return [
                    `${value.toLocaleString()}${kr?.unit ? ` ${kr.unit}` : ""}`,
                    isExpected ? `${kr?.name ?? "KR"} (Expected)` : kr?.name ?? "KR"
                  ];
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any}
              />

              {/* Actual value lines */}
              {[...selectedKrIds].map((krId, index) => {
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                  <Line
                    key={`kr_${krId}`}
                    type="monotone"
                    dataKey={`kr_${krId}`}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 2, fill: color }}
                    activeDot={{ r: 4 }}
                  />
                );
              })}

              {/* Expected value lines (dashed) */}
              {showExpected && [...selectedKrIds].map((krId, index) => {
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                  <Line
                    key={`expected_${krId}`}
                    type="monotone"
                    dataKey={`expected_${krId}`}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    opacity={0.5}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {selectedKrIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs">
          {[...selectedKrIds].map((krId, index) => {
            const kr = krs.find((k) => k.id === krId);
            const color = CHART_COLORS[index % CHART_COLORS.length];
            return (
              <div key={krId} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-text-muted">{kr?.name}</span>
              </div>
            );
          })}
          {showExpected && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-0 border-t-2 border-dashed border-text-muted" />
              <span className="text-text-subtle">Expected pace</span>
            </div>
          )}
        </div>
      )}
    </>
  );

  // KR selection pills for header
  const krSelectionPills = (
    <div className="flex flex-wrap gap-2 mt-3">
      {chartableKrs.map((kr) => {
        const isSelected = selectedKrIds.has(kr.id);
        const colorIndex = [...selectedKrIds].indexOf(kr.id);
        const color = isSelected && colorIndex >= 0 ? CHART_COLORS[colorIndex % CHART_COLORS.length] : undefined;

        return (
          <button
            key={kr.id}
            onClick={() => toggleKr(kr.id)}
            className={cn(
              "px-2 py-1 rounded-pill text-xs font-medium transition-all border",
              isSelected
                ? "border-transparent text-white"
                : "border-border-soft bg-bg-1 text-text-muted hover:bg-bg-2"
            )}
            style={isSelected ? { backgroundColor: color } : undefined}
          >
            {kr.name}
          </button>
        );
      })}
    </div>
  );

  // Header action buttons
  const headerActions = (
    <>
      <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
        <SelectTrigger className="w-32 h-8">
          <Calendar className="w-3 h-3 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ytd">Year to Date</SelectItem>
          <SelectItem value="q1">Q1</SelectItem>
          <SelectItem value="q2">Q2</SelectItem>
          <SelectItem value="q3">Q3</SelectItem>
          <SelectItem value="q4">Q4</SelectItem>
          <SelectItem value="last30">Last 30 Days</SelectItem>
          <SelectItem value="last90">Last 90 Days</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant={showExpected ? "default" : "outline"}
        size="sm"
        onClick={() => setShowExpected(!showExpected)}
        className="h-8 gap-1"
      >
        {showExpected ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        Expected
      </Button>
    </>
  );

  return (
    <ExpandableCard
      title="Progress Over Time"
      icon={<TrendingUp className="w-4 h-4 text-text-muted" />}
      headerActions={headerActions}
      headerExtra={krSelectionPills}
      fullscreenContent={renderChartContent(500)}
    >
      {renderChartContent(300)}
    </ExpandableCard>
  );
}
