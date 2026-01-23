"use client";

import { useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import type { Formatter } from "recharts/types/component/DefaultTooltipContent";
import { ExpandableCard } from "@/components/ui/expandable-card";
import { Layers, Target, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import type { KrPerformanceRow } from "@/features/analytics/api";
import { cn } from "@/lib/utils";

interface KrTypePerformanceProps {
  krs: KrPerformanceRow[];
}

const KR_TYPE_LABELS: Record<string, string> = {
  metric: "Metric",
  count: "Count",
  milestone: "Milestone",
  rate: "Rate",
  average: "Average",
};

const KR_TYPE_COLORS: Record<string, string> = {
  metric: "#3B82F6",
  count: "#22C55E",
  milestone: "#8B5CF6",
  rate: "#F59E0B",
  average: "#EC4899",
};

const PACE_STATUS_COLORS: Record<string, string> = {
  ahead: "#22C55E",
  on_track: "#3B82F6",
  at_risk: "#F59E0B",
  off_track: "#EF4444",
};

export function KrTypePerformance({ krs }: KrTypePerformanceProps) {
  const analysis = useMemo(() => {
    const byType: Record<string, {
      count: number;
      avgProgress: number;
      completed: number;
      ahead: number;
      onTrack: number;
      atRisk: number;
      offTrack: number;
      avgCheckIns: number;
      totalProgress: number;
      totalCheckIns: number;
    }> = {};

    // Initialize all types
    Object.keys(KR_TYPE_LABELS).forEach((type) => {
      byType[type] = {
        count: 0,
        avgProgress: 0,
        completed: 0,
        ahead: 0,
        onTrack: 0,
        atRisk: 0,
        offTrack: 0,
        avgCheckIns: 0,
        totalProgress: 0,
        totalCheckIns: 0,
      };
    });

    // Aggregate data by type
    krs.forEach((kr) => {
      const type = kr.krType;
      if (!byType[type]) return;

      byType[type].count++;
      byType[type].totalProgress += kr.progress;
      byType[type].totalCheckIns += kr.checkInCount;

      if (kr.progress >= 1) byType[type].completed++;

      switch (kr.paceStatus) {
        case "ahead":
          byType[type].ahead++;
          break;
        case "on_track":
          byType[type].onTrack++;
          break;
        case "at_risk":
          byType[type].atRisk++;
          break;
        case "off_track":
          byType[type].offTrack++;
          break;
      }
    });

    // Calculate averages
    Object.keys(byType).forEach((type) => {
      const data = byType[type];
      if (data.count > 0) {
        data.avgProgress = Math.round((data.totalProgress / data.count) * 100);
        data.avgCheckIns = Math.round((data.totalCheckIns / data.count) * 10) / 10;
      }
    });

    // Summary stats
    const totalKrs = krs.length;
    const avgOverallProgress = totalKrs > 0
      ? Math.round((krs.reduce((s, k) => s + k.progress, 0) / totalKrs) * 100)
      : 0;
    const completedKrs = krs.filter((k) => k.progress >= 1).length;
    const atRiskOrBehind = krs.filter((k) => k.paceStatus === "at_risk" || k.paceStatus === "off_track").length;

    // Find best and worst performing types
    const typesWithData = Object.entries(byType).filter(([, d]) => d.count > 0);
    const bestType = typesWithData.length > 0
      ? typesWithData.reduce((best, [type, data]) =>
          data.avgProgress > byType[best].avgProgress ? type : best
        , typesWithData[0][0])
      : null;
    const worstType = typesWithData.length > 0
      ? typesWithData.reduce((worst, [type, data]) =>
          data.avgProgress < byType[worst].avgProgress ? type : worst
        , typesWithData[0][0])
      : null;

    return {
      byType,
      summary: {
        totalKrs,
        avgOverallProgress,
        completedKrs,
        atRiskOrBehind,
        bestType,
        worstType,
      },
    };
  }, [krs]);

  // Prepare chart data
  const radarData = Object.entries(analysis.byType)
    .filter(([, data]) => data.count > 0)
    .map(([type, data]) => ({
      type: KR_TYPE_LABELS[type] || type,
      progress: data.avgProgress,
      fullMark: 100,
    }));

  const barData = Object.entries(analysis.byType)
    .filter(([, data]) => data.count > 0)
    .map(([type, data]) => ({
      type: KR_TYPE_LABELS[type] || type,
      typeKey: type,
      count: data.count,
      avgProgress: data.avgProgress,
      completed: data.completed,
      ahead: data.ahead,
      onTrack: data.onTrack,
      atRisk: data.atRisk,
      offTrack: data.offTrack,
      avgCheckIns: data.avgCheckIns,
    }))
    .sort((a, b) => b.avgProgress - a.avgProgress);

  const renderContent = (height: number) => (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-xl font-bold font-heading">{analysis.summary.totalKrs}</span>
          </div>
          <p className="text-xs text-text-muted">Total KRs</p>
        </div>
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-status-success" />
            <span className="text-xl font-bold font-heading">{analysis.summary.avgOverallProgress}%</span>
          </div>
          <p className="text-xs text-text-muted">Avg Progress</p>
        </div>
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle2 className="w-4 h-4 text-status-success" />
            <span className="text-xl font-bold font-heading">{analysis.summary.completedKrs}</span>
          </div>
          <p className="text-xs text-text-muted">Completed</p>
        </div>
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertCircle className={cn("w-4 h-4", analysis.summary.atRiskOrBehind > 0 ? "text-status-warning" : "text-status-success")} />
            <span className="text-xl font-bold font-heading">{analysis.summary.atRiskOrBehind}</span>
          </div>
          <p className="text-xs text-text-muted">At Risk / Behind</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        {radarData.length > 2 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Progress by KR Type</h4>
            <div style={{ height: height * 0.7 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid stroke="var(--border-soft)" />
                  <PolarAngleAxis
                    dataKey="type"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Radar
                    name="Progress"
                    dataKey="progress"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bar Chart with Pace Status */}
        <div>
          <h4 className="text-sm font-medium mb-3">KR Count &amp; Progress by Type</h4>
          <div style={{ height: height * 0.7 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  dataKey="type"
                  type="category"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={((value, name, props) => {
                    if (typeof value !== "number") return null;
                    const payload = props.payload;
                    return [
                      `${value}% avg progress (${payload.count} KRs)`,
                      "",
                    ];
                  }) as Formatter<number, string>}
                />
                <Bar dataKey="avgProgress" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {barData.map((entry) => (
                    <Cell
                      key={`cell-${entry.typeKey}`}
                      fill={KR_TYPE_COLORS[entry.typeKey]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pace Status Breakdown by Type */}
      <div className="mt-6 pt-4 border-t border-border-soft">
        <h4 className="text-sm font-medium mb-3">Pace Status by Type</h4>
        <div className="space-y-3">
          {barData.map((item) => (
            <div key={item.typeKey} className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium" style={{ color: KR_TYPE_COLORS[item.typeKey] }}>
                {item.type}
              </div>
              <div className="flex-1 flex items-center h-6 bg-bg-1 rounded overflow-hidden">
                {item.ahead > 0 && (
                  <div
                    className="h-full flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      width: `${(item.ahead / item.count) * 100}%`,
                      backgroundColor: PACE_STATUS_COLORS.ahead,
                      minWidth: item.ahead > 0 ? "24px" : 0,
                    }}
                  >
                    {item.ahead}
                  </div>
                )}
                {item.onTrack > 0 && (
                  <div
                    className="h-full flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      width: `${(item.onTrack / item.count) * 100}%`,
                      backgroundColor: PACE_STATUS_COLORS.on_track,
                      minWidth: item.onTrack > 0 ? "24px" : 0,
                    }}
                  >
                    {item.onTrack}
                  </div>
                )}
                {item.atRisk > 0 && (
                  <div
                    className="h-full flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      width: `${(item.atRisk / item.count) * 100}%`,
                      backgroundColor: PACE_STATUS_COLORS.at_risk,
                      minWidth: item.atRisk > 0 ? "24px" : 0,
                    }}
                  >
                    {item.atRisk}
                  </div>
                )}
                {item.offTrack > 0 && (
                  <div
                    className="h-full flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      width: `${(item.offTrack / item.count) * 100}%`,
                      backgroundColor: PACE_STATUS_COLORS.off_track,
                      minWidth: item.offTrack > 0 ? "24px" : 0,
                    }}
                  >
                    {item.offTrack}
                  </div>
                )}
              </div>
              <div className="w-16 text-right text-xs text-text-muted">
                {item.avgCheckIns} avg
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border-soft">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PACE_STATUS_COLORS.ahead }} />
            <span className="text-xs text-text-muted">Ahead</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PACE_STATUS_COLORS.on_track }} />
            <span className="text-xs text-text-muted">On Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PACE_STATUS_COLORS.at_risk }} />
            <span className="text-xs text-text-muted">At Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PACE_STATUS_COLORS.off_track }} />
            <span className="text-xs text-text-muted">Off Track</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      {(analysis.summary.bestType || analysis.summary.worstType) && (
        <div className="mt-4 p-3 bg-bg-1 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Insights</h4>
          <ul className="text-sm text-text-muted space-y-1">
            {analysis.summary.bestType && analysis.byType[analysis.summary.bestType].count > 0 && (
              <li>
                <span className="font-medium" style={{ color: KR_TYPE_COLORS[analysis.summary.bestType] }}>
                  {KR_TYPE_LABELS[analysis.summary.bestType]}
                </span>{" "}
                KRs are performing best with {analysis.byType[analysis.summary.bestType].avgProgress}% avg progress
              </li>
            )}
            {analysis.summary.worstType && analysis.summary.worstType !== analysis.summary.bestType && analysis.byType[analysis.summary.worstType].count > 0 && (
              <li>
                <span className="font-medium" style={{ color: KR_TYPE_COLORS[analysis.summary.worstType] }}>
                  {KR_TYPE_LABELS[analysis.summary.worstType]}
                </span>{" "}
                KRs may need attention at {analysis.byType[analysis.summary.worstType].avgProgress}% avg progress
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <ExpandableCard
      title="KR Type Performance"
      icon={<Layers className="w-4 h-4 text-text-muted" />}
      fullscreenContent={renderContent(400)}
    >
      {renderContent(200)}
    </ExpandableCard>
  );
}
