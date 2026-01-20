"use client";

import { memo, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useDashboardData } from "../dashboard-data-provider";
import { cn } from "@/lib/utils";
import { format, eachWeekOfInterval, startOfYear } from "date-fns";

interface ProgressChartWidgetProps {
  config: Record<string, unknown>;
}

// Color palette for multiple KRs
const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
];

export const ProgressChartWidget = memo(function ProgressChartWidget({ config: _config }: ProgressChartWidgetProps) {
  const { annualKrs, checkIns, year } = useDashboardData();

  // Filter to chartable KRs (metric/count)
  const chartableKrs = annualKrs.filter(
    (kr) => kr.kr_type === "metric" || kr.kr_type === "count"
  );

  // Default: select first 3 KRs
  const [selectedKrIds, setSelectedKrIds] = useState<Set<string>>(() => {
    return new Set(chartableKrs.slice(0, 3).map((kr) => kr.id));
  });

  // Build chart data
  const chartData = useMemo(() => {
    const selectedKrs = chartableKrs.filter((kr) => selectedKrIds.has(kr.id));
    if (selectedKrs.length === 0) return [];

    const now = new Date();
    const yearStart = startOfYear(new Date(year, 0, 1));

    // Get weekly intervals
    const intervals = eachWeekOfInterval(
      { start: yearStart, end: now },
      { weekStartsOn: 0 }
    );

    // Build data points
    const data: Record<string, number | string>[] = intervals.map((date) => {
      const point: Record<string, number | string> = {
        date: format(date, "yyyy-MM-dd"),
        label: format(date, "MMM d"),
      };

      selectedKrs.forEach((kr) => {
        // Find the latest check-in on or before this date
        const krCheckIns = checkIns
          .filter((ci) => ci.annual_kr_id === kr.id)
          .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

        const checkInsUpToDate = krCheckIns.filter(
          (ci) => new Date(ci.recorded_at) <= date
        );

        if (checkInsUpToDate.length > 0) {
          const lastCheckIn = checkInsUpToDate[checkInsUpToDate.length - 1];
          point[`kr_${kr.id}`] = lastCheckIn.value;
        } else {
          point[`kr_${kr.id}`] = kr.start_value;
        }
      });

      return point;
    });

    return data;
  }, [chartableKrs, checkIns, selectedKrIds, year]);

  // Toggle KR selection
  const toggleKr = (krId: string) => {
    const newSelected = new Set(selectedKrIds);
    if (newSelected.has(krId)) {
      newSelected.delete(krId);
    } else if (newSelected.size < 5) {
      newSelected.add(krId);
    }
    setSelectedKrIds(newSelected);
  };

  if (chartableKrs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <TrendingUp className="w-8 h-8 text-text-subtle mb-2" />
        <p className="text-body-sm text-text-muted">No metric KRs to chart</p>
        <p className="text-xs text-text-subtle mt-1">
          Add metric or count KRs to see progress
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* KR Selection */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {chartableKrs.slice(0, 8).map((kr) => {
          const isSelected = selectedKrIds.has(kr.id);
          const colorIndex = [...selectedKrIds].indexOf(kr.id);
          const color = isSelected && colorIndex >= 0 ? CHART_COLORS[colorIndex % CHART_COLORS.length] : undefined;

          return (
            <button
              key={kr.id}
              onClick={() => toggleKr(kr.id)}
              className={cn(
                "px-2 py-0.5 rounded-pill text-[10px] font-medium transition-all border truncate max-w-[120px]",
                isSelected
                  ? "border-transparent text-white"
                  : "border-border-soft bg-bg-1 text-text-muted hover:bg-bg-2"
              )}
              style={isSelected ? { backgroundColor: color } : undefined}
              title={kr.name}
            >
              {kr.name}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {selectedKrIds.size === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-muted">
            Select a KR to view chart
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                tickLine={{ stroke: "var(--border-soft)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                tickLine={{ stroke: "var(--border-soft)" }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={((value: number, name: string) => {
                  const krId = name.replace("kr_", "");
                  const kr = chartableKrs.find((k) => k.id === krId);
                  return [
                    `${value.toLocaleString()}${kr?.unit ? ` ${kr.unit}` : ""}`,
                    kr?.name ?? "KR"
                  ];
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any}
              />

              {[...selectedKrIds].map((krId, index) => {
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                  <Line
                    key={`kr_${krId}`}
                    type="monotone"
                    dataKey={`kr_${krId}`}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 1.5, fill: color }}
                    activeDot={{ r: 3 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      {selectedKrIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-border-soft">
          {[...selectedKrIds].map((krId, index) => {
            const kr = chartableKrs.find((k) => k.id === krId);
            const color = CHART_COLORS[index % CHART_COLORS.length];
            return (
              <div key={krId} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-text-muted truncate max-w-[100px]" title={kr?.name}>
                  {kr?.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
