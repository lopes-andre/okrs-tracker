"use client";

import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePlanReviewStats, useWeeklyReviewSummaries } from "@/features/weekly-reviews";
import { cn } from "@/lib/utils";
import { isCurrentWeek } from "@/lib/weekly-review-engine";
import type { WeeklyReviewStatus } from "@/lib/supabase/types";

interface WeeklyReviewMetricsProps {
  planId: string;
}

const statusColors: Record<WeeklyReviewStatus, string> = {
  complete: "text-status-success",
  late: "text-status-warning",
  open: "text-accent",
  pending: "text-status-danger",
};

const statusBgColors: Record<WeeklyReviewStatus, string> = {
  complete: "bg-status-success/10",
  late: "bg-status-warning/10",
  open: "bg-accent/10",
  pending: "bg-status-danger/10",
};

export function WeeklyReviewMetrics({ planId }: WeeklyReviewMetricsProps) {
  const { data: stats, isLoading: isLoadingStats } = usePlanReviewStats(planId);
  const { data: reviews = [], isLoading: isLoadingReviews } = useWeeklyReviewSummaries(planId);

  const isLoading = isLoadingStats || isLoadingReviews;
  
  // Get recent reviews (last 8 weeks)
  const recentReviews = reviews.slice(0, 8);
  
  // Calculate metrics
  const totalCompleted = stats ? stats.completed_on_time + stats.completed_late : 0;
  const completionRate = stats && stats.total_reviews > 0 
    ? Math.round((totalCompleted / stats.total_reviews) * 100) 
    : 0;
  const onTimeRate = stats && totalCompleted > 0
    ? Math.round((stats.completed_on_time / totalCompleted) * 100)
    : 0;
  const avgRating = stats?.avg_rating ? stats.avg_rating.toFixed(1) : "—";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_reviews === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            Weekly Reviews
          </CardTitle>
          <CardDescription>
            Start completing weekly reviews to see insights here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-text-muted text-sm">
            No weekly reviews completed yet. Go to the Reviews tab to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-bg-1/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-accent/10 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-strong">{stats.total_reviews}</p>
                <p className="text-xs text-text-muted">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-1/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-status-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-strong">{completionRate}%</p>
                <p className="text-xs text-text-muted">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-1/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-status-warning/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-strong">{stats.current_streak}</p>
                <p className="text-xs text-text-muted">Week Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-1/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-status-warning/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-strong">{avgRating}</p>
                <p className="text-xs text-text-muted">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* On-Time Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review Timeliness</CardTitle>
          <CardDescription>How often you complete reviews on time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">On-time completion rate</span>
              <span className="font-bold text-text-strong">{onTimeRate}%</span>
            </div>
            <Progress value={onTimeRate} className="h-2" />
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-status-success">{stats.completed_on_time}</p>
                <p className="text-xs text-text-muted">On Time</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-status-warning">{stats.completed_late}</p>
                <p className="text-xs text-text-muted">Late</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-status-danger">{stats.pending}</p>
                <p className="text-xs text-text-muted">Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Weeks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Weeks</CardTitle>
          <CardDescription>Your last 8 weekly reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {recentReviews.map((review) => {
              const isCurrent = isCurrentWeek(review.year, review.week_number);
              
              return (
                <div
                  key={review.id}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-card border min-w-[72px]",
                    statusBgColors[review.status],
                    isCurrent && "ring-2 ring-accent"
                  )}
                >
                  <span className="text-xs font-medium text-text-strong">
                    W{review.week_number}
                  </span>
                  <div className="mt-1">
                    {review.status === "complete" ? (
                      <CheckCircle2 className={cn("w-4 h-4", statusColors[review.status])} />
                    ) : review.status === "late" ? (
                      <Clock className={cn("w-4 h-4", statusColors[review.status])} />
                    ) : (
                      <AlertCircle className={cn("w-4 h-4", statusColors[review.status])} />
                    )}
                  </div>
                  {review.week_rating && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <Star className="w-3 h-3 text-status-warning fill-status-warning" />
                      <span className="text-[10px] font-medium">{review.week_rating}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Streak */}
      {stats.current_streak > 0 && (
        <div className="flex items-center justify-center gap-2 p-4 rounded-card bg-gradient-to-r from-status-warning/10 to-accent/10 border border-status-warning/20">
          <Flame className="w-6 h-6 text-status-warning" />
          <span className="text-text-strong font-medium">
            Current streak: <strong>{stats.current_streak} weeks</strong>
          </span>
        </div>
      )}
    </div>
  );
}
