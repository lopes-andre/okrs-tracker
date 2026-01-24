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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import {
  TrendingUp,
  Eye,
  Heart,
  Send,
  CheckCircle,
  Loader2,
  BarChart3,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "./platform-icon";
import { useContentAnalytics } from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import type { ContentAnalyticsData } from "@/features/content/api";

// ============================================================================
// TYPES
// ============================================================================

interface ContentAnalyticsProps {
  planId: string;
}

// ============================================================================
// COLORS
// ============================================================================

const CHART_COLORS = [
  "#2563EB", // Blue
  "#7C3AED", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Green
  "#EF4444", // Red
];

// ============================================================================
// SUMMARY CARDS
// ============================================================================

function SummaryCards({ data }: { data: ContentAnalyticsData }) {
  const totalImpressions = useMemo(() => {
    return data.platformMetrics.reduce((sum, p) => sum + p.totalImpressions, 0);
  }, [data.platformMetrics]);

  const totalEngagement = useMemo(() => {
    return data.platformMetrics.reduce((sum, p) => sum + p.totalEngagement, 0);
  }, [data.platformMetrics]);

  const avgEngagementRate = useMemo(() => {
    if (totalImpressions === 0) return 0;
    return (totalEngagement / totalImpressions) * 100;
  }, [totalImpressions, totalEngagement]);

  const cards = [
    {
      title: "Total Posts",
      value: data.totalPosts,
      subValue: `${data.postedCount} posted`,
      icon: Send,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Total Impressions",
      value: totalImpressions.toLocaleString(),
      subValue: `Across ${data.postedDistributions} distributions`,
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Total Engagement",
      value: totalEngagement.toLocaleString(),
      subValue: "Likes, comments, shares",
      icon: Heart,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
    },
    {
      title: "Avg Engagement Rate",
      value: `${avgEngagementRate.toFixed(2)}%`,
      subValue: "Engagement / Impressions",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-small text-text-muted">{card.title}</p>
                <p className="text-2xl font-semibold mt-1">{card.value}</p>
                <p className="text-[10px] text-text-muted mt-1">{card.subValue}</p>
              </div>
              <div className={cn("p-2 rounded-lg", card.bgColor)}>
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// PLATFORM PERFORMANCE CHART
// ============================================================================

function PlatformPerformanceChart({ data }: { data: ContentAnalyticsData }) {
  const chartData = useMemo(() => {
    return data.platformMetrics.map((p) => ({
      name: p.platformName,
      impressions: p.totalImpressions,
      engagement: p.totalEngagement,
      posts: p.postedCount,
    }));
  }, [data.platformMetrics]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Platform Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-text-muted">No platform data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Platform Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
                contentStyle={{
                  backgroundColor: "var(--bg-0)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="impressions" fill="#2563EB" name="Impressions" radius={[0, 4, 4, 0]} />
              <Bar dataKey="engagement" fill="#EC4899" name="Engagement" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ENGAGEMENT DISTRIBUTION PIE CHART
// ============================================================================

function EngagementDistributionChart({ data }: { data: ContentAnalyticsData }) {
  const chartData = useMemo(() => {
    return data.platformMetrics
      .filter((p) => p.totalEngagement > 0)
      .map((p, i) => ({
        name: p.platformName,
        value: p.totalEngagement,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [data.platformMetrics]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Engagement by Platform
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-text-muted">No engagement data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Engagement by Platform
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
                contentStyle={{
                  backgroundColor: "var(--bg-0)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TOP PERFORMING POSTS
// ============================================================================

function TopPerformingPosts({ data }: { data: ContentAnalyticsData }) {
  if (data.topPosts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top Performing Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-text-muted">No post metrics available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Top Performing Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.topPosts.slice(0, 5).map((post, index) => (
            <div
              key={post.postId}
              className="flex items-center gap-3 p-3 rounded-lg bg-bg-1"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-small font-medium",
                  index === 0 && "bg-amber-100 text-amber-800 dark:bg-amber-900/30",
                  index === 1 && "bg-gray-100 text-gray-800 dark:bg-gray-800",
                  index === 2 && "bg-orange-100 text-orange-800 dark:bg-orange-900/30",
                  index > 2 && "bg-bg-2 text-text-muted"
                )}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{post.postTitle}</p>
                <div className="flex items-center gap-4 text-small text-text-muted mt-0.5">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {post.totalImpressions.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {post.totalEngagement.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Send className="w-3 h-3" />
                    {post.distributionCount} platforms
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

function RecentActivity({ data }: { data: ContentAnalyticsData }) {
  if (data.recentMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-text-muted">No recent check-ins</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Check-ins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.recentMetrics.slice(0, 5).map((metric) => {
            const metrics = metric.metrics;
            const impressions = metrics.impressions || metrics.views || 0;
            const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);

            return (
              <div
                key={metric.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-1"
              >
                <PlatformIcon platformName={metric.platform_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{metric.post_title}</p>
                  <p className="text-small text-text-muted">
                    {metric.account_name} · {format(parseISO(metric.checked_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-small font-medium">{impressions.toLocaleString()} imp</p>
                  <p className="text-[10px] text-text-muted">{engagement} eng</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContentAnalytics({ planId }: ContentAnalyticsProps) {
  const { data, isLoading, error } = useContentAnalytics(planId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-status-danger">Failed to load analytics</p>
        <p className="text-small text-text-muted mt-2">{(error as Error).message}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Empty state
  if (data.totalPosts === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-text-muted" />
        <h3 className="font-medium mb-2">No Analytics Data</h3>
        <p className="text-small text-text-muted max-w-sm mx-auto">
          Create and post content to see performance analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards data={data} />

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PlatformPerformanceChart data={data} />
        <EngagementDistributionChart data={data} />
      </div>

      {/* Lists Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TopPerformingPosts data={data} />
        <RecentActivity data={data} />
      </div>
    </div>
  );
}
