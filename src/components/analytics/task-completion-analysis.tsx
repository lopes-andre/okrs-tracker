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
  PieChart,
  Pie,
} from "recharts";
import type { Formatter } from "recharts/types/component/DefaultTooltipContent";
import { ExpandableCard } from "@/components/ui/expandable-card";
import { CheckCircle2, Clock, Target, AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";
import type { Task } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface TaskCompletionAnalysisProps {
  tasks: Task[];
}

const PRIORITY_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
};

const EFFORT_COLORS = {
  light: "#22C55E",
  moderate: "#F59E0B",
  heavy: "#EF4444",
};

export function TaskCompletionAnalysis({ tasks }: TaskCompletionAnalysisProps) {
  const analysis = useMemo(() => {
    const completedTasks = tasks.filter(
      (t) => t.status === "completed" && t.completed_at
    );
    const activeTasks = tasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );
    const now = new Date();

    // By Priority breakdown
    const byPriority = {
      high: { total: 0, completed: 0, avgDays: 0 },
      medium: { total: 0, completed: 0, avgDays: 0 },
      low: { total: 0, completed: 0, avgDays: 0 },
    };

    // By Effort breakdown
    const byEffort = {
      light: { total: 0, completed: 0, avgDays: 0 },
      moderate: { total: 0, completed: 0, avgDays: 0 },
      heavy: { total: 0, completed: 0, avgDays: 0 },
    };

    // Time to complete distribution
    const timeDistribution = {
      sameDay: 0,
      within3Days: 0,
      within7Days: 0,
      within14Days: 0,
      over14Days: 0,
    };

    // Process completed tasks
    completedTasks.forEach((t) => {
      const priority = (t.priority || "medium") as keyof typeof byPriority;
      const effort = (t.effort || "moderate") as keyof typeof byEffort;
      const days = differenceInDays(new Date(t.completed_at!), new Date(t.created_at));

      byPriority[priority].completed++;
      byPriority[priority].avgDays += days;
      byEffort[effort].completed++;
      byEffort[effort].avgDays += days;

      if (days === 0) timeDistribution.sameDay++;
      else if (days <= 3) timeDistribution.within3Days++;
      else if (days <= 7) timeDistribution.within7Days++;
      else if (days <= 14) timeDistribution.within14Days++;
      else timeDistribution.over14Days++;
    });

    // Process all non-cancelled tasks for totals
    tasks
      .filter((t) => t.status !== "cancelled")
      .forEach((t) => {
        const priority = (t.priority || "medium") as keyof typeof byPriority;
        const effort = (t.effort || "moderate") as keyof typeof byEffort;
        byPriority[priority].total++;
        byEffort[effort].total++;
      });

    // Calculate averages
    Object.keys(byPriority).forEach((key) => {
      const p = byPriority[key as keyof typeof byPriority];
      p.avgDays = p.completed > 0 ? Math.round((p.avgDays / p.completed) * 10) / 10 : 0;
    });
    Object.keys(byEffort).forEach((key) => {
      const e = byEffort[key as keyof typeof byEffort];
      e.avgDays = e.completed > 0 ? Math.round((e.avgDays / e.completed) * 10) / 10 : 0;
    });

    // Overdue analysis
    const overdueTasks = activeTasks.filter((t) => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < now;
    });
    const overdueByPriority = {
      high: overdueTasks.filter((t) => t.priority === "high").length,
      medium: overdueTasks.filter((t) => t.priority === "medium" || !t.priority).length,
      low: overdueTasks.filter((t) => t.priority === "low").length,
    };

    // OKR linkage
    const linkedToOkr = tasks.filter((t) => t.annual_kr_id || t.objective_id).length;
    const linkageRate = tasks.length > 0 ? Math.round((linkedToOkr / tasks.length) * 100) : 0;

    // Completion rate
    const totalCompletable = tasks.filter((t) => t.status !== "cancelled").length;
    const completionRate =
      totalCompletable > 0 ? Math.round((completedTasks.length / totalCompletable) * 100) : 0;

    return {
      byPriority,
      byEffort,
      timeDistribution,
      overdueByPriority,
      overdueTasks: overdueTasks.length,
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      totalTasks: tasks.length,
      completionRate,
      linkageRate,
    };
  }, [tasks]);

  // Prepare chart data
  const priorityChartData = Object.entries(analysis.byPriority).map(([priority, data]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    priority,
    completed: data.completed,
    remaining: data.total - data.completed,
    avgDays: data.avgDays,
    completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
  }));

  const effortChartData = Object.entries(analysis.byEffort).map(([effort, data]) => ({
    name: effort.charAt(0).toUpperCase() + effort.slice(1),
    effort,
    completed: data.completed,
    remaining: data.total - data.completed,
    avgDays: data.avgDays,
    completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
  }));

  const timeChartData = [
    { name: "Same day", value: analysis.timeDistribution.sameDay, color: "#22C55E" },
    { name: "1-3 days", value: analysis.timeDistribution.within3Days, color: "#3B82F6" },
    { name: "4-7 days", value: analysis.timeDistribution.within7Days, color: "#8B5CF6" },
    { name: "8-14 days", value: analysis.timeDistribution.within14Days, color: "#F59E0B" },
    { name: "14+ days", value: analysis.timeDistribution.over14Days, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  const renderContent = (height: number) => (
    <>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle2 className="w-4 h-4 text-status-success" />
            <span className="text-xl font-bold font-heading">{analysis.completionRate}%</span>
          </div>
          <p className="text-xs text-text-muted">Completion Rate</p>
        </div>
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-xl font-bold font-heading">{analysis.linkageRate}%</span>
          </div>
          <p className="text-xs text-text-muted">Linked to OKRs</p>
        </div>
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-text-muted" />
            <span className="text-xl font-bold font-heading">{analysis.activeTasks}</span>
          </div>
          <p className="text-xs text-text-muted">Active Tasks</p>
        </div>
        <div className="bg-bg-1 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className={cn("w-4 h-4", analysis.overdueTasks > 0 ? "text-status-danger" : "text-status-success")} />
            <span className="text-xl font-bold font-heading">{analysis.overdueTasks}</span>
          </div>
          <p className="text-xs text-text-muted">Overdue</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Priority */}
        <div>
          <h4 className="text-sm font-medium mb-3">Completion by Priority</h4>
          <div style={{ height: height * 0.5 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
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
                    if (name === "completed") {
                      return [`${value} (${payload.completionRate}%)`, "Completed"];
                    }
                    return [value, "Remaining"];
                  }) as Formatter<number, string>}
                />
                <Bar dataKey="completed" stackId="a" radius={[0, 0, 0, 0]}>
                  {priorityChartData.map((entry) => (
                    <Cell
                      key={`completed-${entry.priority}`}
                      fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS]}
                    />
                  ))}
                </Bar>
                <Bar dataKey="remaining" stackId="a" radius={[0, 4, 4, 0]}>
                  {priorityChartData.map((entry) => (
                    <Cell key={`remaining-${entry.priority}`} fill="var(--border)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Priority avg days */}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-text-muted">
            {priorityChartData.map((d) => (
              <span key={d.priority}>
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: PRIORITY_COLORS[d.priority as keyof typeof PRIORITY_COLORS] }} />
                {d.name}: {d.avgDays}d avg
              </span>
            ))}
          </div>
        </div>

        {/* By Effort */}
        <div>
          <h4 className="text-sm font-medium mb-3">Completion by Effort</h4>
          <div style={{ height: height * 0.5 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={effortChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} />
                <YAxis
                  dataKey="name"
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
                    if (name === "completed") {
                      return [`${value} (${payload.completionRate}%)`, "Completed"];
                    }
                    return [value, "Remaining"];
                  }) as Formatter<number, string>}
                />
                <Bar dataKey="completed" stackId="a" radius={[0, 0, 0, 0]}>
                  {effortChartData.map((entry) => (
                    <Cell
                      key={`completed-${entry.effort}`}
                      fill={EFFORT_COLORS[entry.effort as keyof typeof EFFORT_COLORS]}
                    />
                  ))}
                </Bar>
                <Bar dataKey="remaining" stackId="a" radius={[0, 4, 4, 0]}>
                  {effortChartData.map((entry) => (
                    <Cell key={`remaining-${entry.effort}`} fill="var(--border)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Effort avg days */}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-text-muted">
            {effortChartData.map((d) => (
              <span key={d.effort}>
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: EFFORT_COLORS[d.effort as keyof typeof EFFORT_COLORS] }} />
                {d.name}: {d.avgDays}d avg
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Time to Complete Distribution */}
      {timeChartData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border-soft">
          <h4 className="text-sm font-medium mb-3">Time to Complete Distribution</h4>
          <div className="flex items-center gap-6">
            <div style={{ width: 120, height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                  >
                    {timeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={((value) => {
                      if (typeof value !== "number") return null;
                      const pct = Math.round((value / analysis.completedTasks) * 100);
                      return [`${value} tasks (${pct}%)`, ""];
                    }) as Formatter<number, string>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {timeChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-sm font-medium">{item.value}</p>
                    <p className="text-xs text-text-muted">{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ExpandableCard
      title="Task Completion Analysis"
      icon={<CheckCircle2 className="w-4 h-4 text-text-muted" />}
      fullscreenContent={renderContent(400)}
    >
      {renderContent(200)}
    </ExpandableCard>
  );
}
