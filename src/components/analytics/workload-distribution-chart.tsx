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
  ReferenceLine,
  Legend,
} from "recharts";
import type { Formatter } from "recharts/types/component/DefaultTooltipContent";
import { ExpandableCard } from "@/components/ui/expandable-card";
import { Users } from "lucide-react";
import type { MemberWorkloadStats } from "@/lib/supabase/types";

interface WorkloadDistributionChartProps {
  data: MemberWorkloadStats[];
}

interface ChartDataItem {
  name: string;
  fullName: string;
  completed: number;
  inProgress: number;
  overdue: number;
  pending: number;
  total: number;
}

export function WorkloadDistributionChart({ data }: WorkloadDistributionChartProps) {
  const chartData = useMemo(() => {
    return data.map((member): ChartDataItem => {
      const displayName = member.full_name || member.email.split("@")[0];
      const pending = member.tasks_assigned - member.tasks_completed - member.tasks_in_progress;

      return {
        name: displayName.length > 12 ? displayName.slice(0, 12) + "..." : displayName,
        fullName: displayName,
        completed: member.tasks_completed,
        inProgress: member.tasks_in_progress,
        overdue: member.tasks_overdue,
        pending: Math.max(0, pending - member.tasks_overdue), // Pending that aren't overdue
        total: member.tasks_assigned,
      };
    }).sort((a, b) => b.total - a.total);
  }, [data]);

  const avgTasks = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, m) => sum + m.tasks_assigned, 0) / data.length;
  }, [data]);

  const renderChartContent = (height: number) => (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-soft)" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            width={100}
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
              const label = name === "completed" ? "Completed"
                : name === "inProgress" ? "In Progress"
                : name === "overdue" ? "Overdue"
                : "Pending";
              return [`${value} tasks`, label];
            }) as Formatter<number, string>}
            labelFormatter={(_, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullName;
              }
              return "";
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                completed: "Completed",
                inProgress: "In Progress",
                overdue: "Overdue",
                pending: "Pending",
              };
              return <span className="text-xs">{labels[value] || value}</span>;
            }}
          />
          <ReferenceLine
            x={avgTasks}
            stroke="var(--text-muted)"
            strokeDasharray="5 5"
            label={{
              value: `Avg: ${avgTasks.toFixed(1)}`,
              position: "top",
              fontSize: 10,
              fill: "var(--text-muted)",
            }}
          />
          <Bar
            dataKey="completed"
            stackId="tasks"
            fill="#22C55E"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="inProgress"
            stackId="tasks"
            fill="#3B82F6"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="overdue"
            stackId="tasks"
            fill="#EF4444"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="pending"
            stackId="tasks"
            fill="#D1D5DB"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <ExpandableCard
      title="Workload Distribution"
      icon={<Users className="w-4 h-4 text-text-muted" />}
      fullscreenContent={renderChartContent(Math.max(400, data.length * 50))}
    >
      {renderChartContent(Math.min(300, Math.max(200, data.length * 40)))}
    </ExpandableCard>
  );
}
