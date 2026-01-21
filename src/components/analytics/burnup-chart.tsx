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
  ReferenceLine,
} from "recharts";
import type { Formatter } from "recharts/types/component/DefaultTooltipContent";
import { Card, CardContent } from "@/components/ui/card";
import { ExpandableCard } from "@/components/ui/expandable-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp } from "lucide-react";
import { format, eachWeekOfInterval, startOfYear, endOfYear, isAfter, isBefore, startOfWeek } from "date-fns";
import type { KrPerformanceRow } from "@/features/analytics/api";
import type { CheckIn } from "@/lib/supabase/types";

interface BurnupChartProps {
  krs: KrPerformanceRow[];
  checkIns: CheckIn[];
  year: number;
}

export function BurnupChart({ krs, checkIns, year }: BurnupChartProps) {
  const [selectedKrId, setSelectedKrId] = useState<string>(() => {
    // Default to first metric/count KR
    const chartableKr = krs.find((kr) => kr.krType === "metric" || kr.krType === "count");
    return chartableKr?.id || "";
  });

  const selectedKr = krs.find((kr) => kr.id === selectedKrId);

  const chartData = useMemo(() => {
    if (!selectedKr) return [];

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));
    const now = new Date();
    const effectiveEnd = isAfter(now, yearEnd) ? yearEnd : now;

    // Get all weeks for the year
    const weeks = eachWeekOfInterval(
      { start: yearStart, end: yearEnd },
      { weekStartsOn: 0 }
    );

    // Get check-ins for this KR
    const krCheckIns = checkIns
      .filter((ci) => ci.annual_kr_id === selectedKr.id)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    // Calculate target line (linear progression)
    const targetDelta = selectedKr.targetValue - selectedKr.startValue;
    const totalWeeks = weeks.length;

    return weeks.map((weekDate, index) => {
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
      const isFuture = isAfter(weekStart, effectiveEnd);
      
      // Target at this point (linear)
      const targetAtWeek = selectedKr.startValue + (targetDelta * ((index + 1) / totalWeeks));
      
      // Actual value: find latest check-in on or before this week
      let actualValue: number | null = null;
      if (!isFuture) {
        const checkInsUpToWeek = krCheckIns.filter((ci) => 
          isBefore(new Date(ci.recorded_at), weekDate) || 
          format(new Date(ci.recorded_at), "yyyy-MM-dd") === format(weekDate, "yyyy-MM-dd")
        );
        
        if (checkInsUpToWeek.length > 0) {
          actualValue = checkInsUpToWeek[checkInsUpToWeek.length - 1].value;
        } else if (index === 0) {
          actualValue = selectedKr.startValue;
        }
      }

      return {
        week: format(weekDate, "MMM d"),
        fullWeek: format(weekDate, "MMM d, yyyy"),
        target: Math.round(targetAtWeek),
        actual: actualValue,
        isFuture,
      };
    });
  }, [selectedKr, checkIns, year]);

  // Calculate scope (total work)
  const scope = selectedKr ? selectedKr.targetValue : 0;

  // Chartable KRs (exclude milestones)
  const chartableKrs = krs.filter((kr) => kr.krType === "metric" || kr.krType === "count");

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
      {!selectedKr ? (
        <div style={{ height }} className="flex items-center justify-center text-text-muted">
          Select a KR to view its burn-up chart
        </div>
      ) : (
        <>
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
                  domain={[selectedKr.startValue, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={((value, name) => {
                    if (typeof value !== "number") return ["—", String(name)];
                    const label = name === "target" ? "Target" : "Actual";
                    return [`${value.toLocaleString()}${selectedKr.unit ? ` ${selectedKr.unit}` : ""}`, label];
                  }) as Formatter<number, string>}
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullWeek;
                    }
                    return "";
                  }}
                />

                {/* Target line */}
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="var(--text-subtle)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="none"
                  dot={false}
                />

                {/* Actual area */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#actualGradient)"
                  dot={{ r: 2, fill: "var(--accent)" }}
                  connectNulls={false}
                />

                {/* Scope line */}
                <ReferenceLine
                  y={scope}
                  stroke="var(--status-success)"
                  strokeDasharray="3 3"
                  label={{
                    value: `Target: ${scope.toLocaleString()}`,
                    position: "right",
                    fill: "var(--status-success)",
                    fontSize: 10,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border-soft text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-accent" />
              <span className="text-text-muted">Actual Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-text-subtle" />
              <span className="text-text-muted">Expected Pace</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-status-success" />
              <span className="text-text-muted">Target ({scope.toLocaleString()})</span>
            </div>
          </div>
        </>
      )}
    </>
  );

  // Header action buttons
  const headerActions = (
    <Select value={selectedKrId} onValueChange={setSelectedKrId}>
      <SelectTrigger className="w-[200px] h-8">
        <SelectValue placeholder="Select KR" />
      </SelectTrigger>
      <SelectContent>
        {chartableKrs.map((kr) => (
          <SelectItem key={kr.id} value={kr.id}>
            {kr.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <ExpandableCard
      title="Burn-Up Chart"
      icon={<TrendingUp className="w-4 h-4 text-text-muted" />}
      headerActions={headerActions}
      fullscreenContent={renderChartContent(500)}
    >
      {renderChartContent(250)}
    </ExpandableCard>
  );
}
