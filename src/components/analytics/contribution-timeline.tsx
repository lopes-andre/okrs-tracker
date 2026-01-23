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
import { ExpandableCard } from "@/components/ui/expandable-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Calendar } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import type { MemberContributionByPeriod, MemberWorkloadStats } from "@/lib/supabase/types";

interface ContributionTimelineProps {
  contributions: MemberContributionByPeriod[];
  members: MemberWorkloadStats[];
}

// Color palette for different members
const MEMBER_COLORS = [
  "#3B82F6", // Blue
  "#22C55E", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Orange
];

function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

export function ContributionTimeline({ contributions, members }: ContributionTimelineProps) {
  const [daysToShow, setDaysToShow] = useState<string>("30");

  // Build a map of user IDs to display names
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => {
      const name = m.full_name || m.email.split("@")[0];
      map.set(m.user_id, name);
    });
    return map;
  }, [members]);

  // Get unique member IDs from contributions
  const memberIds = useMemo(() => {
    const ids = new Set<string>();
    contributions.forEach((c) => ids.add(c.user_id));
    return Array.from(ids);
  }, [contributions]);

  const chartData = useMemo(() => {
    const days = parseInt(daysToShow);
    const startDate = subDays(new Date(), days);

    // Create a map of date -> member activities
    const dateMap = new Map<string, Record<string, number>>();

    // Initialize all dates
    for (let i = 0; i <= days; i++) {
      const date = format(subDays(new Date(), days - i), "yyyy-MM-dd");
      const record: Record<string, number> = {};
      memberIds.forEach((id) => {
        record[id] = 0;
      });
      dateMap.set(date, record);
    }

    // Fill in contribution data
    contributions.forEach((c) => {
      const dateStr = c.period_date.split("T")[0];
      const record = dateMap.get(dateStr);
      if (record && parseISO(dateStr) >= startDate) {
        record[c.user_id] = c.total_activity;
      }
    });

    // Convert to chart data array
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        dateLabel: format(parseISO(date), "MMM d"),
        ...values,
      }));
  }, [contributions, memberIds, daysToShow]);

  const renderChartContent = (height: number) => (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-soft)" }}
            interval="preserveStartEnd"
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
            labelFormatter={(label) => `Date: ${label}`}
            formatter={(value, name) => {
              if (typeof value !== "number") return null;
              const memberName = memberNameMap.get(String(name)) || name;
              return [value, memberName];
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const name = memberNameMap.get(value) || value;
              return <span className="text-xs">{name}</span>;
            }}
          />
          {memberIds.map((memberId, index) => (
            <Area
              key={memberId}
              type="monotone"
              dataKey={memberId}
              stackId="1"
              stroke={getMemberColor(index)}
              fill={getMemberColor(index)}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const headerActions = (
    <Select value={daysToShow} onValueChange={setDaysToShow}>
      <SelectTrigger className="w-28 h-8">
        <Calendar className="w-3 h-3 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">7 days</SelectItem>
        <SelectItem value="30">30 days</SelectItem>
        <SelectItem value="90">90 days</SelectItem>
      </SelectContent>
    </Select>
  );

  if (memberIds.length === 0) {
    return (
      <ExpandableCard
        title="Contribution Timeline"
        icon={<Activity className="w-4 h-4 text-text-muted" />}
        headerActions={headerActions}
      >
        <div className="flex items-center justify-center h-48 text-text-muted text-sm">
          No activity data available for this period
        </div>
      </ExpandableCard>
    );
  }

  return (
    <ExpandableCard
      title="Contribution Timeline"
      icon={<Activity className="w-4 h-4 text-text-muted" />}
      headerActions={headerActions}
      fullscreenContent={renderChartContent(400)}
    >
      {renderChartContent(250)}
    </ExpandableCard>
  );
}
