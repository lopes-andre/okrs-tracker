"use client";

import { use, useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Star,
  Target,
  ListTodo,
  Lightbulb,
  AlertTriangle,
  BookOpen,
  Trophy,
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  Square,
  Clock,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MarkdownEditor, MarkdownPreview } from "@/components/ui/markdown-editor";
import {
  usePlan,
  useTasks,
  useWeeklyReview,
  useStartWeeklyReview,
  useUpdateWeeklyReview,
  useCompleteWeeklyReview,
} from "@/features";
import { useObjectivesWithKrs } from "@/features/objectives/hooks";
import { useCheckIns } from "@/features/check-ins/hooks";
import {
  formatWeekLabel,
  isCurrentWeek,
} from "@/lib/weekly-review-engine";
import { computeKrProgress } from "@/lib/progress-engine";
import { cn } from "@/lib/utils";

// ============================================================================
// WIZARD STEPS
// ============================================================================

const STEPS = [
  { id: "overview", label: "Overview", icon: Calendar },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "went-well", label: "What Went Well", icon: Trophy },
  { id: "improve", label: "To Improve", icon: Lightbulb },
  { id: "lessons", label: "Lessons", icon: BookOpen },
  { id: "rating", label: "Rating", icon: Star },
  { id: "summary", label: "Summary", icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ============================================================================
// STEP INDICATOR
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: Set<StepId>;
  onStepClick: (stepIndex: number) => void;
}

function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.has(step.id) || index < currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onStepClick(index)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer",
                "hover:ring-2 hover:ring-accent/20 focus:outline-none focus:ring-2 focus:ring-accent/30",
                isActive && "bg-accent text-white ring-2 ring-accent/30",
                isCompleted && !isActive && "bg-status-success/20 text-status-success hover:bg-status-success/30",
                !isActive && !isCompleted && "bg-bg-1 text-text-muted hover:bg-bg-1/80"
              )}
              title={step.label}
            >
              {isCompleted && !isActive ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 h-0.5 mx-1",
                  index < currentStep ? "bg-status-success" : "bg-border-soft"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ReviewWizardPage({
  params,
}: {
  params: Promise<{ planId: string; reviewId: string }>;
}) {
  const { planId, reviewId } = use(params);
  const router = useRouter();

  // Data fetching
  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId);
  const { data: review, isLoading: isLoadingReview } = useWeeklyReview(reviewId);
  const { data: objectives = [], isLoading: isLoadingObjectives } = useObjectivesWithKrs(planId);
  const { data: tasks = [] } = useTasks(planId);
  const { data: checkIns = [], isLoading: isLoadingCheckIns } = useCheckIns(planId);

  // Mutations
  const startReview = useStartWeeklyReview();
  const updateReview = useUpdateWeeklyReview();
  const completeReview = useCompleteWeeklyReview();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());

  // Form state
  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");
  const [lessons, setLessons] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  // Initialize form from existing review data
  useEffect(() => {
    if (review) {
      setWentWell(review.reflection_what_went_well || "");
      setToImprove(review.reflection_what_to_improve || "");
      setLessons(review.reflection_lessons_learned || "");
      setNotes(review.reflection_notes || "");
      setRating(review.week_rating);
    }
  }, [review]);

  // Start review if not started
  useEffect(() => {
    if (review && !review.started_at && !startReview.isPending) {
      startReview.mutate(reviewId);
    }
  }, [review, reviewId, startReview]);

  // Computed data
  const weekTasks = useMemo(() => {
    if (!review) return { completed: [], created: [], overdue: [], dueThisWeek: [] };
    
    // Parse dates as local time (avoid UTC interpretation issues)
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };
    
    const weekStart = parseLocalDate(review.week_start);
    const weekEnd = parseLocalDate(review.week_end);
    weekEnd.setHours(23, 59, 59, 999);
    weekStart.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Tasks completed during this week
    const completed = tasks.filter((t) => {
      if (t.status !== "completed" || !t.completed_at) return false;
      const completedAt = new Date(t.completed_at);
      return completedAt >= weekStart && completedAt <= weekEnd;
    });
    
    // Tasks created during this week
    const created = tasks.filter((t) => {
      const createdAt = new Date(t.created_at);
      return createdAt >= weekStart && createdAt <= weekEnd;
    });
    
    // Truly overdue: due date is BEFORE today (in the past, not today)
    const overdue = tasks.filter((t) => {
      if (t.status === "completed" || t.status === "cancelled" || !t.due_date) return false;
      const dueDate = parseLocalDate(t.due_date);
      return dueDate < today;
    });
    
    // Due this week: due date is today or within this week (but not past)
    const dueThisWeek = tasks.filter((t) => {
      if (t.status === "completed" || t.status === "cancelled" || !t.due_date) return false;
      const dueDate = parseLocalDate(t.due_date);
      // Due today or later this week (not overdue and within week bounds)
      return dueDate >= today && dueDate <= weekEnd;
    });
    
    return { completed, created, overdue, dueThisWeek };
  }, [tasks, review]);

  const progressStats = useMemo(() => {
    if (!review) return { onTrack: 0, atRisk: 0, offTrack: 0, totalKrs: 0, avgProgress: 0, avgProgressBeforeWeek: 0, weeklyGain: 0 };
    
    let onTrack = 0;
    let atRisk = 0;
    let offTrack = 0;
    let totalKrs = 0;
    let totalProgress = 0;
    let totalProgressBeforeWeek = 0;
    const planYear = plan?.year || new Date().getFullYear();
    
    // Parse week start date to filter check-ins
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };
    const weekStart = parseLocalDate(review.week_start);
    weekStart.setHours(0, 0, 0, 0);

    objectives.forEach((obj) => {
      obj.annual_krs?.forEach((kr) => {
        totalKrs++;
        // All check-ins for this KR
        const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
        
        // Check-ins BEFORE this week (to calculate progress before the week started)
        const checkInsBeforeWeek = krCheckIns.filter((ci) => {
          const checkInDate = new Date(ci.recorded_at);
          return checkInDate < weekStart;
        });
        
        // Current progress (with all check-ins)
        const progress = computeKrProgress(kr, krCheckIns, [], planYear);
        totalProgress += progress.progress;
        
        // Progress before this week (without this week's check-ins)
        const progressBefore = computeKrProgress(kr, checkInsBeforeWeek, [], planYear);
        totalProgressBeforeWeek += progressBefore.progress;
        
        if (progress.paceStatus === "ahead" || progress.paceStatus === "on_track") {
          onTrack++;
        } else if (progress.paceStatus === "at_risk") {
          atRisk++;
        } else {
          offTrack++;
        }
      });
    });

    const avgProgress = totalKrs > 0 ? totalProgress / totalKrs : 0;
    const avgProgressBeforeWeek = totalKrs > 0 ? totalProgressBeforeWeek / totalKrs : 0;
    const weeklyGain = Math.max(0, avgProgress - avgProgressBeforeWeek);

    return { onTrack, atRisk, offTrack, totalKrs, avgProgress, avgProgressBeforeWeek, weeklyGain };
  }, [objectives, checkIns, plan?.year, review]);

  // Navigation
  const canGoNext = currentStep < STEPS.length - 1;
  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === STEPS.length - 1;

  const goNext = () => {
    setCompletedSteps((prev) => new Set(prev).add(STEPS[currentStep].id));
    if (canGoNext) setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    if (canGoBack) setCurrentStep((s) => s - 1);
  };

  // Auto-save on step change (not on every keystroke)
  // We use refs to capture latest values without triggering saves on every field change
  const wentWellRef = useRef(wentWell);
  const toImproveRef = useRef(toImprove);
  const lessonsRef = useRef(lessons);
  const notesRef = useRef(notes);
  const ratingRef = useRef(rating);

  // Keep refs in sync with state
  useEffect(() => { wentWellRef.current = wentWell; }, [wentWell]);
  useEffect(() => { toImproveRef.current = toImprove; }, [toImprove]);
  useEffect(() => { lessonsRef.current = lessons; }, [lessons]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { ratingRef.current = rating; }, [rating]);

  useEffect(() => {
    if (!review || currentStep === 0) return;

    const timeoutId = setTimeout(() => {
      updateReview.mutate({
        reviewId,
        updates: {
          reflection_what_went_well: wentWellRef.current || null,
          reflection_what_to_improve: toImproveRef.current || null,
          reflection_lessons_learned: lessonsRef.current || null,
          reflection_notes: notesRef.current || null,
          week_rating: ratingRef.current,
        },
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentStep, review, reviewId, updateReview]);

  // Complete review
  const handleComplete = async () => {
    try {
      await completeReview.mutateAsync({
        reviewId,
        data: {
          reflection_what_went_well: wentWell || undefined,
          reflection_what_to_improve: toImprove || undefined,
          reflection_lessons_learned: lessons || undefined,
          reflection_notes: notes || undefined,
          week_rating: rating || undefined,
          stats_tasks_completed: weekTasks.completed.length,
          stats_tasks_created: weekTasks.created.length,
          stats_objectives_on_track: progressStats.onTrack,
          stats_objectives_at_risk: progressStats.atRisk,
          stats_objectives_off_track: progressStats.offTrack,
          stats_overall_progress: Math.round(progressStats.avgProgress * 100), // Store as 0-100
          stats_total_krs: progressStats.totalKrs,
        },
      });
      router.push(`/plans/${planId}/reviews`);
    } catch {
      // Error handled by mutation's onError callback
    }
  };

  const isLoading = isLoadingPlan || isLoadingReview || isLoadingObjectives || isLoadingCheckIns;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-text-muted">Review not found</p>
      </div>
    );
  }

  const currentStepData = STEPS[currentStep];
  const isCurrent = isCurrentWeek(review.year, review.week_number);
  const isCompleted = review.status === "complete" || review.status === "late";

  // ============================================================================
  // COMPLETED REVIEW - READ-ONLY SUMMARY VIEW
  // ============================================================================
  if (isCompleted) {
    return (
      <>
        <PageHeader
          title={formatWeekLabel(review.year, review.week_number)}
          description={review.completed_at 
            ? `Completed ${new Date(review.completed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
            : "Completed review"
          }
          backHref={`/plans/${planId}/reviews`}
          actions={
            <Badge variant={review.status === "complete" ? "default" : "outline"} className={review.status === "late" ? "bg-status-warning text-white" : ""}>
              {review.status === "complete" ? "Completed" : "Late"}
            </Badge>
          }
        />

        <div className="space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                Week Overview
              </CardTitle>
              <CardDescription>
                {formatWeekLabel(review.year, review.week_number)} • {review.week_start} to {review.week_end}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-bg-1/50 rounded-card">
                  <p className="text-3xl font-bold text-accent">{review.stats_overall_progress || 0}%</p>
                  <p className="text-sm text-text-muted">Overall Progress (YTD)</p>
                </div>
                <div className="text-center p-4 bg-bg-1/50 rounded-card">
                  <p className="text-3xl font-bold text-status-success">{review.stats_tasks_completed || 0}</p>
                  <p className="text-sm text-text-muted">Tasks Completed</p>
                </div>
                <div className="text-center p-4 bg-bg-1/50 rounded-card">
                  <p className="text-3xl font-bold text-text-strong">{review.stats_total_krs || 0}</p>
                  <p className="text-sm text-text-muted">Active KRs</p>
                </div>
                <div className="text-center p-4 bg-bg-1/50 rounded-card">
                  <div className="flex justify-center">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Star
                        key={v}
                        className={cn(
                          "w-6 h-6",
                          review.week_rating && v <= review.week_rating
                            ? "text-status-warning fill-status-warning"
                            : "text-text-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-text-muted mt-1">Week Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KR Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                KR Status at Review Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-status-success/10 rounded-card">
                  <TrendingUp className="w-8 h-8 text-status-success" />
                  <div>
                    <p className="text-2xl font-bold text-status-success">{review.stats_objectives_on_track || 0}</p>
                    <p className="text-sm text-text-muted">On Track</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-status-warning/10 rounded-card">
                  <AlertTriangle className="w-8 h-8 text-status-warning" />
                  <div>
                    <p className="text-2xl font-bold text-status-warning">{review.stats_objectives_at_risk || 0}</p>
                    <p className="text-sm text-text-muted">At Risk</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-status-danger/10 rounded-card">
                  <TrendingDown className="w-8 h-8 text-status-danger" />
                  <div>
                    <p className="text-2xl font-bold text-status-danger">{review.stats_objectives_off_track || 0}</p>
                    <p className="text-sm text-text-muted">Off Track</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-accent" />
                Tasks at Review Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-status-success/10 rounded-card">
                  <CheckSquare className="w-8 h-8 text-status-success" />
                  <div>
                    <p className="text-2xl font-bold text-status-success">{review.stats_tasks_completed || 0}</p>
                    <p className="text-sm text-text-muted">Tasks Completed This Week</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-card">
                  <Square className="w-8 h-8 text-accent" />
                  <div>
                    <p className="text-2xl font-bold text-accent">{review.stats_tasks_created || 0}</p>
                    <p className="text-sm text-text-muted">Tasks Created This Week</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reflections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent" />
                Reflections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-status-success flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4" />
                    What Went Well
                  </h4>
                  {review.reflection_what_went_well ? (
                    <div className="p-3 bg-status-success/5 rounded-card border border-status-success/20">
                      <MarkdownPreview content={review.reflection_what_went_well} className="text-sm" />
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm italic p-3 bg-bg-1/30 rounded-card">Not filled in</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-status-warning flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    To Improve
                  </h4>
                  {review.reflection_what_to_improve ? (
                    <div className="p-3 bg-status-warning/5 rounded-card border border-status-warning/20">
                      <MarkdownPreview content={review.reflection_what_to_improve} className="text-sm" />
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm italic p-3 bg-bg-1/30 rounded-card">Not filled in</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-accent" />
                    Lessons Learned
                  </h4>
                  {review.reflection_lessons_learned ? (
                    <div className="p-3 bg-accent/5 rounded-card border border-accent/20">
                      <MarkdownPreview content={review.reflection_lessons_learned} className="text-sm" />
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm italic p-3 bg-bg-1/30 rounded-card">Not filled in</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2 text-text-muted">
                    Additional Notes
                  </h4>
                  {review.reflection_notes ? (
                    <div className="p-3 bg-bg-1/30 rounded-card border border-border-soft">
                      <MarkdownPreview content={review.reflection_notes} className="text-sm" />
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm italic p-3 bg-bg-1/30 rounded-card">Not filled in</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="flex justify-start pt-2">
            <Button variant="outline" onClick={() => router.push(`/plans/${planId}/reviews`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reviews
            </Button>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // IN-PROGRESS REVIEW - WIZARD VIEW
  // ============================================================================
  
  // Handle step navigation from clicking indicators
  const goToStep = (stepIndex: number) => {
    // Mark all steps up to current as completed when going forward
    if (stepIndex > currentStep) {
      const newCompleted = new Set(completedSteps);
      for (let i = currentStep; i < stepIndex; i++) {
        newCompleted.add(STEPS[i].id);
      }
      setCompletedSteps(newCompleted);
    }
    setCurrentStep(stepIndex);
  };
  
  return (
    <>
      {/* Header with Close Button */}
      <div className="flex items-start justify-between mb-2">
        <PageHeader
          title={formatWeekLabel(review.year, review.week_number)}
          description={isCurrent ? "Current week review" : "Past week review"}
          actions={
            <Badge variant="outline">
              In Progress
            </Badge>
          }
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/plans/${planId}/reviews`)}
          className="shrink-0 mt-1"
          title="Close and return to Reviews"
          aria-label="Close review"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Step Indicator - Clickable */}
      <StepIndicator 
        currentStep={currentStep} 
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* Step Content */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <currentStepData.icon className="w-5 h-5 text-accent" />
            {currentStepData.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Overview */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <p className="text-text-muted">
                Welcome to your weekly review for{" "}
                <strong>{formatWeekLabel(review.year, review.week_number)}</strong>.
                This guided process will help you reflect on your progress and plan for improvement.
              </p>
              
              {/* Year-to-Date Progress with Weekly Gain */}
              <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent" />
                      <span className="font-medium text-text-strong">Year-to-Date Progress</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-accent">
                        {Math.round(progressStats.avgProgress * 100)}%
                      </span>
                      {progressStats.weeklyGain > 0 && (
                        <span className="ml-2 text-sm font-medium text-status-success">
                          +{Math.round(progressStats.weeklyGain * 100)}% this week
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Stacked Progress Bar */}
                  <div className="relative h-4 bg-bg-1 rounded-full overflow-hidden">
                    {/* Weekly gain (highlighted) - rendered FIRST so it's behind */}
                    {progressStats.weeklyGain > 0 && (
                      <div 
                        className="absolute inset-y-0 bg-gradient-to-r from-status-success to-emerald-400 rounded-full transition-all animate-pulse"
                        style={{ 
                          left: 0,
                          width: `${Math.round(progressStats.avgProgress * 100)}%` 
                        }}
                      />
                    )}
                    {/* Base progress (before this week) - rendered SECOND so it's on top */}
                    <div 
                      className="absolute inset-y-0 left-0 bg-accent rounded-full transition-all"
                      style={{ width: `${Math.round(progressStats.avgProgressBeforeWeek * 100)}%` }}
                    />
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-accent/60" />
                        <span className="text-text-muted">Before this week: {Math.round(progressStats.avgProgressBeforeWeek * 100)}%</span>
                      </div>
                      {progressStats.weeklyGain > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-status-success to-emerald-400" />
                          <span className="text-status-success font-medium">This week: +{Math.round(progressStats.weeklyGain * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* KR Status Summary */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-soft text-xs text-text-muted">
                    <span>{progressStats.onTrack} on track</span>
                    <span>{progressStats.atRisk} at risk</span>
                    <span>{progressStats.offTrack} off track</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* This Week Stats */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="bg-bg-1/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Target className="w-8 h-8 text-accent" />
                      <div>
                        <p className="text-2xl font-bold">{progressStats.totalKrs}</p>
                        <p className="text-sm text-text-muted">Active KRs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-bg-1/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="w-8 h-8 text-status-success" />
                      <div>
                        <p className="text-2xl font-bold">{weekTasks.completed.length}</p>
                        <p className="text-sm text-text-muted">Completed This Week</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-bg-1/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-status-warning" />
                      <div>
                        <p className="text-2xl font-bold">{weekTasks.dueThisWeek.length}</p>
                        <p className="text-sm text-text-muted">Due This Week</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-bg-1/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-status-danger" />
                      <div>
                        <p className="text-2xl font-bold">{weekTasks.overdue.length}</p>
                        <p className="text-sm text-text-muted">Overdue</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Progress */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-text-muted mb-4">
                Review the progress of your objectives and key results.
              </p>
              
              {objectives.length === 0 ? (
                <p className="text-text-muted text-center py-8">No objectives found. Create objectives to track progress.</p>
              ) : (
                objectives.map((obj) => {
                  const planYear = plan?.year || new Date().getFullYear();
                  // Compute objective progress from KRs
                  const objKrs = obj.annual_krs || [];
                  let objTotalProgress = 0;
                  objKrs.forEach((kr) => {
                    const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
                    const krProg = computeKrProgress(kr, krCheckIns, [], planYear);
                    objTotalProgress += krProg.progress;
                  });
                  const objProgress = objKrs.length > 0 ? objTotalProgress / objKrs.length : 0;
                  
                  return (
                    <Card key={obj.id} className="bg-bg-1/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge variant="outline" className="mb-1">{obj.code}</Badge>
                            <h4 className="font-medium text-text-strong">{obj.name}</h4>
                          </div>
                          <span className="text-lg font-bold text-accent">
                            {Math.round(objProgress * 100)}%
                          </span>
                        </div>
                        <Progress value={objProgress * 100} className="h-3" />
                        
                        <div className="mt-3 space-y-2">
                          {objKrs.map((kr) => {
                            const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
                            const krProgress = computeKrProgress(kr, krCheckIns, [], planYear);
                            return (
                              <div key={kr.id} className="flex items-center justify-between text-sm py-1">
                                <span className="text-text-muted truncate flex-1 mr-4">{kr.name}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-bg-1 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        krProgress.paceStatus === "ahead" && "bg-status-success",
                                        krProgress.paceStatus === "on_track" && "bg-accent",
                                        krProgress.paceStatus === "at_risk" && "bg-status-warning",
                                        krProgress.paceStatus === "off_track" && "bg-status-danger"
                                      )}
                                      style={{ width: `${Math.min(100, krProgress.progress * 100)}%` }}
                                    />
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs min-w-[48px] justify-center",
                                      krProgress.paceStatus === "ahead" && "text-status-success border-status-success/30",
                                      krProgress.paceStatus === "on_track" && "text-accent border-accent/30",
                                      krProgress.paceStatus === "at_risk" && "text-status-warning border-status-warning/30",
                                      krProgress.paceStatus === "off_track" && "text-status-danger border-status-danger/30"
                                    )}
                                  >
                                    {Math.round(krProgress.progress * 100)}%
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Step 3: Tasks */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Completed This Week */}
              <div>
                <h4 className="font-medium text-status-success flex items-center gap-2 mb-3">
                  <CheckSquare className="w-4 h-4" />
                  Completed This Week ({weekTasks.completed.length})
                </h4>
                {weekTasks.completed.length === 0 ? (
                  <p className="text-text-muted text-sm">No tasks completed this week</p>
                ) : (
                  <div className="space-y-2">
                    {weekTasks.completed.slice(0, 10).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-status-success" />
                        <span className="line-through text-text-muted">{task.title}</span>
                      </div>
                    ))}
                    {weekTasks.completed.length > 10 && (
                      <p className="text-xs text-text-muted">+{weekTasks.completed.length - 10} more</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Due This Week */}
              <div>
                <h4 className="font-medium text-status-warning flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4" />
                  Due This Week ({weekTasks.dueThisWeek.length})
                </h4>
                {weekTasks.dueThisWeek.length === 0 ? (
                  <p className="text-text-muted text-sm">No tasks due this week</p>
                ) : (
                  <div className="space-y-2">
                    {weekTasks.dueThisWeek.map((task) => (
                      <div key={task.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Square className="w-4 h-4 text-status-warning" />
                          <span className="text-text-strong">{task.title}</span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {task.due_date && new Date(task.due_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Overdue */}
              <div>
                <h4 className="font-medium text-status-danger flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  Overdue ({weekTasks.overdue.length})
                </h4>
                {weekTasks.overdue.length === 0 ? (
                  <p className="text-text-muted text-sm">No overdue tasks 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {weekTasks.overdue.map((task) => (
                      <div key={task.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-status-danger" />
                          <span className="text-status-danger">{task.title}</span>
                        </div>
                        <span className="text-xs text-status-danger">
                          {task.due_date && `Due ${new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Created This Week */}
              <div>
                <h4 className="font-medium text-accent flex items-center gap-2 mb-3">
                  <Square className="w-4 h-4" />
                  Created This Week ({weekTasks.created.length})
                </h4>
                {weekTasks.created.length === 0 ? (
                  <p className="text-text-muted text-sm">No tasks created this week</p>
                ) : (
                  <div className="space-y-2">
                    {weekTasks.created.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <Square className="w-4 h-4 text-accent" />
                        <span className="text-text-muted">{task.title}</span>
                      </div>
                    ))}
                    {weekTasks.created.length > 5 && (
                      <p className="text-xs text-text-muted">+{weekTasks.created.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: What Went Well */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-text-muted">
                Celebrate your wins! What went well this week? What are you proud of?
              </p>
              <MarkdownEditor
                value={wentWell}
                onChange={setWentWell}
                placeholder={`- Completed the marketing campaign
- Got positive feedback from stakeholders
- Stayed focused on priorities...`}
                minHeight={200}
                label="What went well?"
                hint="Tip: Use bullet points to list your wins"
              />
            </div>
          )}

          {/* Step 5: Areas to Improve */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-text-muted">
                What could have gone better? What challenges did you face?
              </p>
              <MarkdownEditor
                value={toImprove}
                onChange={setToImprove}
                placeholder={`- Got distracted by email too often
- Didn't make progress on Project X
- Need to better prioritize deep work...`}
                minHeight={200}
                label="What could improve?"
                hint="Be honest - this is for your growth"
              />
            </div>
          )}

          {/* Step 6: Lessons Learned */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <p className="text-text-muted">
                What did you learn this week? What insights will you carry forward?
              </p>
              <MarkdownEditor
                value={lessons}
                onChange={setLessons}
                placeholder={`- Time-blocking works well for focused work
- Need to say no to more meetings
- Morning routine sets the tone for the day...`}
                minHeight={200}
                label="Lessons & Insights"
              />
              <MarkdownEditor
                value={notes}
                onChange={setNotes}
                placeholder="Any other notes, thoughts, or reflections..."
                minHeight={100}
                label="Additional Notes (optional)"
              />
            </div>
          )}

          {/* Step 7: Rating */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <p className="text-text-muted">
                How would you rate this week overall?
              </p>
              
              <div className="flex justify-center gap-2 py-8">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    className={cn(
                      "w-14 h-14 rounded-card border-2 flex items-center justify-center transition-all hover:scale-110",
                      rating === value
                        ? "border-status-warning bg-status-warning/10"
                        : "border-border-soft hover:border-status-warning/50"
                    )}
                  >
                    <Star
                      className={cn(
                        "w-8 h-8",
                        rating !== null && value <= rating
                          ? "text-status-warning fill-status-warning"
                          : "text-text-muted"
                      )}
                    />
                  </button>
                ))}
              </div>
              
              <p className="text-center text-sm text-text-muted">
                {rating === 1 && "Tough week - happens to everyone"}
                {rating === 2 && "Room for improvement"}
                {rating === 3 && "Average week - solid progress"}
                {rating === 4 && "Great week!"}
                {rating === 5 && "Amazing week! 🎉"}
                {!rating && "Click a star to rate"}
              </p>
            </div>
          )}

          {/* Step 8: Summary */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <p className="text-text-muted">
                Here&apos;s a summary of your weekly review. Ready to complete it?
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2 text-status-success flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    What Went Well
                  </h4>
                  {wentWell ? (
                    <MarkdownPreview content={wentWell} className="text-sm" />
                  ) : (
                    <p className="text-text-muted text-sm italic">Not filled in</p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-status-warning flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    To Improve
                  </h4>
                  {toImprove ? (
                    <MarkdownPreview content={toImprove} className="text-sm" />
                  ) : (
                    <p className="text-text-muted text-sm italic">Not filled in</p>
                  )}
                </div>
              </div>
              
              {lessons && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Lessons Learned
                  </h4>
                  <MarkdownPreview content={lessons} className="text-sm" />
                </div>
              )}
              
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-text-strong">
                    {weekTasks.completed.length}
                  </p>
                  <p className="text-sm text-text-muted">Tasks Done</p>
                </div>
                <div className="w-px h-12 bg-border-soft" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-text-strong">
                    {progressStats.onTrack}
                  </p>
                  <p className="text-sm text-text-muted">KRs On Track</p>
                </div>
                <div className="w-px h-12 bg-border-soft" />
                <div className="text-center flex flex-col items-center">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Star
                        key={v}
                        className={cn(
                          "w-5 h-5",
                          rating && v <= rating
                            ? "text-status-warning fill-status-warning"
                            : "text-text-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-text-muted">Week Rating</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between py-4">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={!canGoBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="text-sm text-text-muted">
          Step {currentStep + 1} of {STEPS.length}
        </div>
        
        {isLastStep ? (
          <Button
            onClick={handleComplete}
            disabled={completeReview.isPending}
          >
            {completeReview.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Complete Review
          </Button>
        ) : (
          <Button onClick={goNext}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </>
  );
}
