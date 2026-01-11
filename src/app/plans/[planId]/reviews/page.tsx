"use client";

import { use, useState, useMemo } from "react";
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  usePlan,
  useWeeklyReviewSummaries,
  usePlanReviewStats,
  useGetOrCreateWeeklyReview,
} from "@/features";
import {
  getCurrentWeekInfo,
  formatWeekLabel,
  formatWeekLabelShort,
  getWeekBounds,
  formatDateString,
  isCurrentWeek,
  isPastWeek,
} from "@/lib/weekly-review-engine";
import type { WeeklyReviewStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ============================================================================
// STATUS HELPERS
// ============================================================================

const statusConfig: Record<WeeklyReviewStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle2;
}> = {
  complete: {
    label: "Complete",
    color: "text-status-success",
    bgColor: "bg-status-success/10",
    icon: CheckCircle2,
  },
  late: {
    label: "Late",
    color: "text-status-warning",
    bgColor: "bg-status-warning/10",
    icon: Clock,
  },
  open: {
    label: "In Progress",
    color: "text-accent",
    bgColor: "bg-accent/10",
    icon: Calendar,
  },
  pending: {
    label: "Pending",
    color: "text-status-danger",
    bgColor: "bg-status-danger/10",
    icon: AlertCircle,
  },
};

function StatusBadge({ status }: { status: WeeklyReviewStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// WEEK CALENDAR COMPONENT
// ============================================================================

interface WeekCalendarProps {
  year: number;
  reviews: Array<{
    id: string;
    week_number: number;
    status: WeeklyReviewStatus;
    week_rating: number | null;
  }>;
  onWeekClick: (year: number, week: number) => void;
  planCreatedAt: string;
}

function WeekCalendar({ year, reviews, onWeekClick, planCreatedAt }: WeekCalendarProps) {
  const currentWeek = getCurrentWeekInfo();
  const reviewMap = new Map(reviews.map((r) => [r.week_number, r]));
  
  // Get all weeks in the year (ISO weeks can be 52 or 53)
  const totalWeeks = year === 2026 ? 53 : 52; // 2026 has 53 weeks
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  
  // Split into quarters for better display
  const quarters = [
    { name: "Q1", weeks: weeks.filter((w) => w <= 13) },
    { name: "Q2", weeks: weeks.filter((w) => w > 13 && w <= 26) },
    { name: "Q3", weeks: weeks.filter((w) => w > 26 && w <= 39) },
    { name: "Q4", weeks: weeks.filter((w) => w > 39) },
  ];

  // Determine if a week is before plan creation
  const planCreated = new Date(planCreatedAt);
  const isBeforePlan = (weekNum: number) => {
    const { start } = getWeekBounds(year, weekNum);
    return start < planCreated;
  };

  return (
    <div className="space-y-4">
      {quarters.map((quarter) => (
        <div key={quarter.name}>
          <h4 className="text-sm font-medium text-text-muted mb-2">{quarter.name}</h4>
          <div className="flex flex-wrap gap-1.5">
            {quarter.weeks.map((weekNum) => {
              const review = reviewMap.get(weekNum);
              const isCurrent = isCurrentWeek(year, weekNum);
              const isPast = isPastWeek(year, weekNum);
              const beforePlan = isBeforePlan(weekNum);
              
              let bgColor = "bg-bg-1";
              let textColor = "text-text-muted";
              let borderColor = "border-border-soft";
              
              if (beforePlan) {
                bgColor = "bg-bg-0";
                textColor = "text-text-muted/50";
                borderColor = "border-transparent";
              } else if (review) {
                bgColor = statusConfig[review.status].bgColor;
                textColor = statusConfig[review.status].color;
              } else if (isCurrent) {
                bgColor = "bg-accent/20";
                textColor = "text-accent";
                borderColor = "border-accent";
              } else if (isPast) {
                bgColor = "bg-status-danger/10";
                textColor = "text-status-danger/70";
              }

              return (
                <button
                  key={weekNum}
                  onClick={() => !beforePlan && onWeekClick(year, weekNum)}
                  disabled={beforePlan}
                  className={cn(
                    "w-9 h-9 rounded-md border text-xs font-medium transition-all",
                    bgColor,
                    textColor,
                    borderColor,
                    !beforePlan && "hover:scale-105 hover:shadow-sm cursor-pointer",
                    beforePlan && "cursor-not-allowed opacity-50",
                    isCurrent && "ring-2 ring-accent ring-offset-1"
                  )}
                  title={formatWeekLabel(year, weekNum)}
                >
                  {weekNum}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border-soft text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-status-success/30" />
          <span className="text-text-muted">Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-status-warning/30" />
          <span className="text-text-muted">Late</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent/30" />
          <span className="text-text-muted">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-status-danger/30" />
          <span className="text-text-muted">Pending/Missing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-bg-1 border border-border-soft" />
          <span className="text-text-muted">Future</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REVIEW CARD COMPONENT
// ============================================================================

interface ReviewCardProps {
  review: {
    id: string;
    year: number;
    week_number: number;
    week_start: string;
    week_end: string;
    status: WeeklyReviewStatus;
    week_rating: number | null;
    has_reflections: boolean;
    days_overdue: number;
    completed_at: string | null;
  };
  onClick: () => void;
}

function ReviewCard({ review, onClick }: ReviewCardProps) {
  const isCurrent = isCurrentWeek(review.year, review.week_number);
  const config = statusConfig[review.status];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-card hover:border-accent/30",
        isCurrent && "ring-2 ring-accent"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("w-10 h-10 rounded-card flex items-center justify-center", config.bgColor)}>
              <Icon className={cn("w-5 h-5", config.color)} />
            </div>
            <div>
              <h3 className="font-medium text-text-strong">
                {formatWeekLabel(review.year, review.week_number)}
              </h3>
              <p className="text-sm text-text-muted">
                {new Date(review.week_start).toLocaleDateString()} - {new Date(review.week_end).toLocaleDateString()}
              </p>
              {review.has_reflections && (
                <p className="text-xs text-accent mt-1">Has reflections</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={review.status} />
            {review.week_rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-status-warning fill-status-warning" />
                <span className="font-medium">{review.week_rating}/5</span>
              </div>
            )}
            {review.status === "pending" && review.days_overdue > 0 && (
              <span className="text-xs text-status-danger">
                {review.days_overdue} days overdue
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ReviewsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const router = useRouter();
  
  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId);
  const { data: reviews = [], isLoading: isLoadingReviews } = useWeeklyReviewSummaries(planId);
  const { data: stats } = usePlanReviewStats(planId);
  const getOrCreate = useGetOrCreateWeeklyReview();

  // Year navigation
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Filter reviews for selected year
  const yearReviews = useMemo(
    () => reviews.filter((r) => r.year === selectedYear),
    [reviews, selectedYear]
  );

  const handleWeekClick = async (year: number, week: number) => {
    try {
      const review = await getOrCreate.mutateAsync({ planId, year, weekNumber: week });
      router.push(`/plans/${planId}/reviews/${review.id}`);
    } catch (error) {
      console.error("Failed to open review:", error);
    }
  };

  const handleStartCurrentWeek = async () => {
    const current = getCurrentWeekInfo();
    await handleWeekClick(current.year, current.weekNumber);
  };

  const isLoading = isLoadingPlan || isLoadingReviews;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-text-muted" />
      </div>
    );
  }

  const currentWeek = getCurrentWeekInfo();
  const currentWeekReview = reviews.find(
    (r) => r.year === currentWeek.year && r.week_number === currentWeek.weekNumber
  );

  return (
    <>
      <PageHeader
        title="Weekly Reviews"
        description="Reflect on your progress and plan for improvement"
        actions={
          <Button onClick={handleStartCurrentWeek} disabled={getOrCreate.isPending}>
            {getOrCreate.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {currentWeekReview ? "Continue This Week" : "Start This Week"}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-bg-1/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-card bg-accent/10 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-strong">
                    {stats?.total_reviews || 0}
                  </p>
                  <p className="text-xs text-text-muted">Total Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-1/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-card bg-status-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-status-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-strong">
                    {stats?.completed_on_time || 0}
                  </p>
                  <p className="text-xs text-text-muted">On Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-1/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-card bg-status-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-status-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-strong">
                    {stats?.completed_late || 0}
                  </p>
                  <p className="text-xs text-text-muted">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-1/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-card bg-status-danger/10 flex items-center justify-center">
                  <CalendarX className="w-5 h-5 text-status-danger" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-strong">
                    {stats?.pending || 0}
                  </p>
                  <p className="text-xs text-text-muted">Pending</p>
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
                  <p className="text-2xl font-bold text-text-strong">
                    {stats?.current_streak || 0}
                  </p>
                  <p className="text-xs text-text-muted">Week Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Year Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Year Overview</CardTitle>
                <CardDescription>
                  Click on a week to view or create its review
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setSelectedYear((y) => y - 1)}
                  disabled={selectedYear <= 2024}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium text-text-strong w-16 text-center">
                  {selectedYear}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setSelectedYear((y) => y + 1)}
                  disabled={selectedYear >= currentYear + 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeekCalendar
              year={selectedYear}
              reviews={yearReviews}
              onWeekClick={handleWeekClick}
              planCreatedAt={plan?.created_at || new Date().toISOString()}
            />
          </CardContent>
        </Card>

        {/* Recent Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>Your latest weekly reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No reviews yet"
                description="Start your first weekly review to track your progress and reflections."
                action={
                  <Button onClick={handleStartCurrentWeek}>
                    <Plus className="w-4 h-4 mr-2" />
                    Start First Review
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 10).map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onClick={() => router.push(`/plans/${planId}/reviews/${review.id}`)}
                  />
                ))}
                {reviews.length > 10 && (
                  <p className="text-center text-sm text-text-muted pt-2">
                    Showing 10 of {reviews.length} reviews
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
