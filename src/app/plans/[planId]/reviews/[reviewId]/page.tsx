"use client";

import { use, useState, useEffect, useMemo } from "react";
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
  useObjectives,
  useTasks,
  useWeeklyReview,
  useStartWeeklyReview,
  useUpdateWeeklyReview,
  useCompleteWeeklyReview,
} from "@/features";
import { useCheckIns } from "@/features/check-ins/hooks";
import {
  formatWeekLabel,
  getCurrentWeekInfo,
  isCurrentWeek,
} from "@/lib/weekly-review-engine";
import { computeKrProgress, computeObjectiveProgress } from "@/lib/progress-engine";
import type { WeeklyReviewStatus } from "@/lib/supabase/types";
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
}

function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.has(step.id) || index < currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                isActive && "bg-accent text-white ring-2 ring-accent/30",
                isCompleted && !isActive && "bg-status-success/20 text-status-success",
                !isActive && !isCompleted && "bg-bg-1 text-text-muted"
              )}
              title={step.label}
            >
              {isCompleted && !isActive ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
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
  const { data: objectives = [] } = useObjectives(planId);
  const { data: tasks = [] } = useTasks(planId);
  const { data: checkIns = [] } = useCheckIns(planId);

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
    
    const weekStart = new Date(review.week_start);
    const weekEnd = new Date(review.week_end);
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
    
    // Truly overdue: due date is BEFORE today (not just before week end)
    const overdue = tasks.filter((t) => {
      if (t.status === "completed" || t.status === "cancelled" || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
    
    // Due this week: due date is within this week but not overdue
    const dueThisWeek = tasks.filter((t) => {
      if (t.status === "completed" || t.status === "cancelled" || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= weekEnd;
    });
    
    return { completed, created, overdue, dueThisWeek };
  }, [tasks, review]);

  const progressStats = useMemo(() => {
    let onTrack = 0;
    let atRisk = 0;
    let offTrack = 0;
    let totalKrs = 0;
    let totalProgress = 0;
    const planYear = plan?.year || new Date().getFullYear();

    objectives.forEach((obj) => {
      obj.annual_krs?.forEach((kr) => {
        totalKrs++;
        // Filter check-ins for this specific KR
        const krCheckIns = checkIns.filter((ci) => ci.annual_kr_id === kr.id);
        const progress = computeKrProgress(kr, krCheckIns, [], planYear);
        totalProgress += progress.progress;
        if (progress.paceStatus === "ahead" || progress.paceStatus === "on-track") {
          onTrack++;
        } else if (progress.paceStatus === "at-risk") {
          atRisk++;
        } else {
          offTrack++;
        }
      });
    });

    const avgProgress = totalKrs > 0 ? totalProgress / totalKrs : 0;

    return { onTrack, atRisk, offTrack, totalKrs, avgProgress };
  }, [objectives, checkIns, plan?.year]);

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

  // Auto-save on step change
  useEffect(() => {
    if (!review || currentStep === 0) return;
    
    const timeoutId = setTimeout(() => {
      updateReview.mutate({
        reviewId,
        updates: {
          reflection_what_went_well: wentWell || null,
          reflection_what_to_improve: toImprove || null,
          reflection_lessons_learned: lessons || null,
          reflection_notes: notes || null,
          week_rating: rating,
        },
      });
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [currentStep]);

  // Complete review
  const handleComplete = async () => {
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
      },
    });
    router.push(`/plans/${planId}/reviews`);
  };

  const isLoading = isLoadingPlan || isLoadingReview;

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

  return (
    <>
      <PageHeader
        title={formatWeekLabel(review.year, review.week_number)}
        description={isCurrent ? "Current week review" : "Past week review"}
        backHref={`/plans/${planId}/reviews`}
        actions={
          <Badge variant={review.status === "complete" ? "default" : "outline"}>
            {review.status === "complete"
              ? "Completed"
              : review.status === "late"
              ? "Late"
              : "In Progress"}
          </Badge>
        }
      />

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

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
              
              {/* Year-to-Date Progress */}
              <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent" />
                      <span className="font-medium text-text-strong">Year-to-Date Progress</span>
                    </div>
                    <span className="text-2xl font-bold text-accent">
                      {Math.round(progressStats.avgProgress * 100)}%
                    </span>
                  </div>
                  <Progress value={progressStats.avgProgress * 100} className="h-3" />
                  <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
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
                        <p className="text-sm text-text-muted">Completed</p>
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
                                        krProgress.paceStatus === "on-track" && "bg-accent",
                                        krProgress.paceStatus === "at-risk" && "bg-status-warning",
                                        krProgress.paceStatus === "off-track" && "bg-status-danger"
                                      )}
                                      style={{ width: `${Math.min(100, krProgress.progress * 100)}%` }}
                                    />
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs min-w-[48px] justify-center",
                                      krProgress.paceStatus === "ahead" && "text-status-success border-status-success/30",
                                      krProgress.paceStatus === "on-track" && "text-accent border-accent/30",
                                      krProgress.paceStatus === "at-risk" && "text-status-warning border-status-warning/30",
                                      krProgress.paceStatus === "off-track" && "text-status-danger border-status-danger/30"
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
                Here's a summary of your weekly review. Ready to complete it?
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
