"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  startOfQuarter, 
  endOfQuarter, 
  isWithinInterval,
  isBefore,
  isAfter,
  getQuarter,
} from "date-fns";
import type { KrPerformanceRow } from "@/features/analytics/api";
import type { CheckIn } from "@/lib/supabase/types";

interface QuarterlyComparisonProps {
  krs: KrPerformanceRow[];
  checkIns: CheckIn[];
  year: number;
}

interface QuarterData {
  quarter: string;
  label: string;
  targetProgress: number; // Expected progress by end of quarter
  actualProgress: number;
  checkInCount: number;
  krsOnTrack: number;
  totalKrs: number;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
}

const QUARTER_COLORS = {
  target: "var(--text-subtle)",
  past: "var(--status-success)",
  current: "var(--accent)",
  future: "var(--border)",
};

export function QuarterlyComparison({ krs, checkIns, year }: QuarterlyComparisonProps) {
  const quarterData = useMemo(() => {
    const now = new Date();
    const currentQuarter = getQuarter(now);
    const quarters: QuarterData[] = [];

    for (let q = 1; q <= 4; q++) {
      const quarterStart = startOfQuarter(new Date(year, (q - 1) * 3, 1));
      const quarterEnd = endOfQuarter(new Date(year, (q - 1) * 3, 1));
      
      const isPast = isBefore(quarterEnd, now);
      const isFuture = isAfter(quarterStart, now);
      const isCurrent = !isPast && !isFuture;

      // Calculate expected progress (linear, 25% per quarter)
      const targetProgress = q * 25;

      // Calculate actual progress from KRs
      let totalProgress = 0;
      let krsOnTrack = 0;
      
      krs.forEach((kr) => {
        // For past/current quarters, use actual progress
        // For future, use 0
        if (!isFuture) {
          const progress = Math.min(kr.progress * 100, 100);
          // Cap progress at quarter's expected max
          const cappedProgress = Math.min(progress, targetProgress);
          totalProgress += cappedProgress;
          
          // KR is on track if progress >= expected for this quarter
          if (progress >= targetProgress * 0.9) {
            krsOnTrack++;
          }
        }
      });

      const actualProgress = krs.length > 0 && !isFuture
        ? totalProgress / krs.length
        : 0;

      // Count check-ins in this quarter
      const quarterCheckIns = checkIns.filter((ci) => {
        const date = new Date(ci.occurred_at);
        return isWithinInterval(date, { start: quarterStart, end: quarterEnd });
      });

      quarters.push({
        quarter: `Q${q}`,
        label: `Q${q} ${year}`,
        targetProgress,
        actualProgress,
        checkInCount: quarterCheckIns.length,
        krsOnTrack,
        totalKrs: krs.length,
        isCurrent,
        isPast,
        isFuture,
      });
    }

    return quarters;
  }, [krs, checkIns, year]);

  // Calculate YoY equivalent (if we had previous year data, we'd compare)
  const currentQ = quarterData.find((q) => q.isCurrent);
  const completedQuarters = quarterData.filter((q) => q.isPast);
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          Quarterly Comparison
          <Badge variant="outline" className="ml-2 text-[10px]">
            {year}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bar Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={quarterData} 
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
              <XAxis 
                dataKey="quarter" 
                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border-soft)" }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => {
                  const label = name === "targetProgress" ? "Target" : "Actual";
                  return [`${value.toFixed(1)}%`, label];
                }}
              />
              
              {/* Target bars (background) */}
              <Bar 
                dataKey="targetProgress" 
                fill="var(--border)" 
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                opacity={0.3}
              />
              
              {/* Actual bars */}
              <Bar 
                dataKey="actualProgress" 
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              >
                {quarterData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={
                      entry.isCurrent 
                        ? QUARTER_COLORS.current
                        : entry.isPast
                          ? QUARTER_COLORS.past
                          : QUARTER_COLORS.future
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quarter Details Grid */}
        <div className="grid grid-cols-4 gap-3">
          {quarterData.map((q) => {
            const delta = q.actualProgress - q.targetProgress;
            const isAhead = delta >= 0;
            
            return (
              <div
                key={q.quarter}
                className={cn(
                  "p-3 rounded-card border text-center",
                  q.isCurrent && "border-accent bg-accent/5",
                  q.isPast && "border-status-success/30 bg-status-success/5",
                  q.isFuture && "border-border-soft bg-bg-1/30 opacity-60"
                )}
              >
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className={cn(
                    "font-bold text-lg",
                    q.isCurrent && "text-accent",
                    q.isPast && "text-status-success",
                    q.isFuture && "text-text-subtle"
                  )}>
                    {q.quarter}
                  </span>
                  {q.isCurrent && (
                    <Badge variant="secondary" className="text-[8px] px-1">
                      NOW
                    </Badge>
                  )}
                </div>
                
                {!q.isFuture ? (
                  <>
                    <p className="text-2xl font-bold font-heading">
                      {q.actualProgress.toFixed(0)}%
                    </p>
                    <div className={cn(
                      "flex items-center justify-center gap-1 text-xs mt-1",
                      isAhead ? "text-status-success" : "text-status-danger"
                    )}>
                      {isAhead ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{isAhead ? "+" : ""}{delta.toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-2">
                      {q.checkInCount} check-ins
                    </p>
                  </>
                ) : (
                  <p className="text-lg text-text-subtle">—</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-soft">
          <div className="text-center">
            <p className="text-xs text-text-muted mb-1">Quarters Completed</p>
            <p className="text-xl font-bold">
              {completedQuarters.length}/4
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted mb-1">Avg Quarter Progress</p>
            <p className="text-xl font-bold">
              {completedQuarters.length > 0
                ? (completedQuarters.reduce((sum, q) => sum + q.actualProgress, 0) / completedQuarters.length).toFixed(0)
                : 0}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted mb-1">Total Check-ins</p>
            <p className="text-xl font-bold">
              {quarterData.reduce((sum, q) => sum + q.checkInCount, 0)}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-border/30" />
            <span>Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-status-success" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-border" />
            <span>Upcoming</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
