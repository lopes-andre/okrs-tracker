"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TasksSection } from "@/components/tasks";
import { CheckInDialog, CheckInList } from "@/components/okr";
import { usePlan, usePlanRole } from "@/features/plans/hooks";
import { useObjectives } from "@/features/objectives/hooks";
import { useAnnualKrs } from "@/features/annual-krs/hooks";
import { useRecentCheckIns, useCreateCheckIn } from "@/features/check-ins/hooks";
import type { AnnualKr, QuarterTarget, CheckInInsert } from "@/lib/supabase/types";

export default function PlanOverviewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);

  const { data: plan, isLoading: planLoading } = usePlan(planId);
  const { data: role } = usePlanRole(planId);
  const { data: objectives = [], isLoading: objectivesLoading } = useObjectives(planId);
  const { data: annualKrs = [] } = useAnnualKrs(planId);
  const { data: recentCheckIns = [] } = useRecentCheckIns(planId, 5);
  const createCheckIn = useCreateCheckIn();

  // Dialog state
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkInKr, setCheckInKr] = useState<(AnnualKr & { quarter_targets?: QuarterTarget[] }) | null>(null);
  const [showKrPicker, setShowKrPicker] = useState(false);

  const isLoading = planLoading || objectivesLoading;
  const canEdit = role === "owner" || role === "editor";

  // Handle quick check-in: show KR picker first
  function handleQuickCheckIn() {
    if (annualKrs.length === 1) {
      // Single KR: go directly to check-in
      setCheckInKr(annualKrs[0]);
      setCheckInDialogOpen(true);
    } else if (annualKrs.length > 1) {
      // Multiple KRs: show picker
      setShowKrPicker(true);
    }
  }

  function handleSelectKrForCheckIn(kr: AnnualKr) {
    setCheckInKr(kr);
    setShowKrPicker(false);
    setCheckInDialogOpen(true);
  }

  async function handleCheckInSubmit(checkIn: Omit<CheckInInsert, "recorded_by">) {
    await createCheckIn.mutateAsync(checkIn as CheckInInsert);
  }

  // Calculate stats from real data
  const totalObjectives = objectives.length;
  const totalKrs = annualKrs.length;
  
  // Calculate at-risk KRs (simplified - you can make this more sophisticated)
  const atRiskKrs = annualKrs.filter((kr) => {
    if (!kr.target_value) return false;
    const progress = kr.current_value ? (kr.current_value / kr.target_value) * 100 : 0;
    // Consider at-risk if less than expected based on time elapsed
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const yearProgress = ((now.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())) * 100;
    return progress < yearProgress * 0.75; // Behind by more than 25%
  });

  // Calculate overall progress
  const overallProgress = annualKrs.length > 0
    ? annualKrs.reduce((sum, kr) => {
        if (!kr.target_value) return sum;
        return sum + Math.min((kr.current_value || 0) / kr.target_value * 100, 100);
      }, 0) / annualKrs.length
    : 0;

  // Get current quarter
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  const quarterStart = new Date(new Date().getFullYear(), (currentQuarter - 1) * 3, 1);
  const quarterEnd = new Date(new Date().getFullYear(), currentQuarter * 3, 0);
  const quarterProgress = ((new Date().getTime() - quarterStart.getTime()) / (quarterEnd.getTime() - quarterStart.getTime())) * 100;
  const daysRemaining = Math.ceil((quarterEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={plan?.name || "Plan Overview"}
        description={plan?.description || "Annual OKR tracking dashboard"}
      >
        <Button variant="secondary">Weekly Review</Button>
        <Button onClick={handleQuickCheckIn} disabled={annualKrs.length === 0}>
          Quick Check-in
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-caption text-text-muted mb-1">Overall Progress</p>
            <p className="font-heading text-h2-mobile font-bold text-text-strong">
              {Math.round(overallProgress)}%
            </p>
            <p className="text-small mt-1 flex items-center gap-1 text-text-muted">
              <TrendingUp className="w-3 h-3" />
              Year to date
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-caption text-text-muted mb-1">Objectives</p>
            <p className="font-heading text-h2-mobile font-bold text-text-strong">
              {totalObjectives}
            </p>
            <p className="text-small mt-1 text-text-muted">
              Active objectives
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-caption text-text-muted mb-1">Key Results</p>
            <p className="font-heading text-h2-mobile font-bold text-text-strong">
              {totalKrs}
            </p>
            <p className="text-small mt-1 flex items-center gap-1 text-text-muted">
              Tracking metrics
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-caption text-text-muted mb-1">At Risk</p>
            <p className={`font-heading text-h2-mobile font-bold ${atRiskKrs.length > 0 ? "text-status-danger" : "text-status-success"}`}>
              {atRiskKrs.length}
            </p>
            <p className="text-small mt-1 flex items-center gap-1 text-text-muted">
              {atRiskKrs.length > 0 ? (
                <>
                  <TrendingDown className="w-3 h-3" />
                  Needs attention
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  All on track
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Three Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Objectives List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Objectives</CardTitle>
              <Link href={`/plans/${planId}/okrs`}>
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {objectives.length === 0 ? (
                <div className="text-center py-6">
                  <Target className="w-8 h-8 text-text-subtle mx-auto mb-2" />
                  <p className="text-body-sm text-text-muted mb-3">No objectives yet</p>
                  {canEdit && (
                    <Link href={`/plans/${planId}/okrs`}>
                      <Button variant="secondary" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Objective
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                objectives.slice(0, 3).map((objective) => {
                  // Calculate objective progress from its KRs
                  const objectiveKrs = annualKrs.filter((kr) => kr.objective_id === objective.id);
                  const objectiveProgress = objectiveKrs.length > 0
                    ? objectiveKrs.reduce((sum, kr) => {
                        if (!kr.target_value) return sum;
                        return sum + Math.min((kr.current_value || 0) / kr.target_value * 100, 100);
                      }, 0) / objectiveKrs.length
                    : 0;
                  
                  const isAtRisk = objectiveProgress < quarterProgress * 0.75;

                  return (
                    <Link
                      key={objective.id}
                      href={`/plans/${planId}/okrs`}
                      className="block p-4 rounded-card bg-bg-1/50 border border-border-soft hover:border-border hover:shadow-card-hover transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-button bg-bg-0 flex items-center justify-center border border-border-soft">
                            <Target className="w-5 h-5 text-text-muted" />
                          </div>
                          <div>
                            <h4 className="font-heading font-semibold text-body text-text-strong">
                              {objective.code}: {objective.name}
                            </h4>
                            <p className="text-small text-text-muted">
                              {objectiveKrs.length} Key Result{objectiveKrs.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant={isAtRisk ? "warning" : "success"}>
                          {isAtRisk ? "At Risk" : "On Track"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={objectiveProgress} className="flex-1" />
                        <span className="text-small font-medium w-12 text-right">
                          {Math.round(objectiveProgress)}%
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
              {objectives.length > 3 && (
                <Link href={`/plans/${planId}/okrs`}>
                  <p className="text-small text-text-muted text-center py-2 hover:text-text-strong transition-colors">
                    +{objectives.length - 3} more objectives
                  </p>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Tasks Section */}
          <TasksSection planId={planId} view="summary" />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quarter Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-h5">Q{currentQuarter} Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-small mb-2">
                    <span className="text-text-muted">Days Remaining</span>
                    <span className="font-medium">{Math.max(0, daysRemaining)}</span>
                  </div>
                  <div className="flex justify-between text-small mb-2">
                    <span className="text-text-muted">Quarter Progress</span>
                    <span className="font-medium">{Math.round(quarterProgress)}%</span>
                  </div>
                  <Progress value={quarterProgress} />
                </div>
                <div className="pt-2 border-t border-border-soft">
                  <p className="text-small text-text-muted mb-3">This Week</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-small">
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                      <span>{totalKrs} KRs being tracked</span>
                    </div>
                    <div className="flex items-center gap-2 text-small">
                      <Clock className="w-4 h-4 text-text-muted" />
                      <span>{atRiskKrs.length} KRs need updates</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* At Risk Items */}
          {atRiskKrs.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-warning" />
                  <CardTitle className="text-h5">Needs Attention</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {atRiskKrs.slice(0, 3).map((kr) => {
                    const progress = kr.target_value 
                      ? Math.round((kr.current_value || 0) / kr.target_value * 100)
                      : 0;
                    const expectedProgress = Math.round(quarterProgress);
                    const delta = progress - expectedProgress;

                    return (
                      <div
                        key={kr.id}
                        className="p-3 rounded-button bg-status-warning/5 border border-status-warning/20"
                      >
                        <p className="text-body-sm font-medium text-text-strong mb-1">
                          {kr.name}
                        </p>
                        <p className="text-small text-text-muted">
                          {Math.abs(delta)}% behind target pace
                        </p>
                      </div>
                    );
                  })}
                  {atRiskKrs.length > 3 && (
                    <p className="text-small text-text-muted text-center">
                      +{atRiskKrs.length - 3} more at risk
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Check-ins */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-h5">Recent Check-ins</CardTitle>
              {canEdit && annualKrs.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 gap-1"
                  onClick={handleQuickCheckIn}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <CheckInList 
                checkIns={recentCheckIns} 
                showKrName 
                compact 
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-h5">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/plans/${planId}/okrs`} className="block">
                  <Button variant="secondary" className="w-full justify-start">
                    <Target className="w-4 h-4 mr-2" />
                    Manage OKRs
                  </Button>
                </Link>
                <Link href={`/plans/${planId}/timeline`} className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <Clock className="w-4 h-4 mr-2" />
                    View Timeline
                  </Button>
                </Link>
                <Link href={`/plans/${planId}/analytics`} className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* KR Picker Dialog */}
      {showKrPicker && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowKrPicker(false)}
        >
          <Card 
            className="w-full max-w-md mx-4 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Select Key Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {annualKrs.map((kr) => {
                const progress = kr.target_value 
                  ? Math.round((kr.current_value || 0) / kr.target_value * 100)
                  : 0;
                
                return (
                  <button
                    key={kr.id}
                    onClick={() => handleSelectKrForCheckIn(kr)}
                    className="w-full p-3 rounded-card border border-border-soft bg-bg-0 hover:border-border hover:shadow-card-hover transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-strong truncate">
                          {kr.name}
                        </p>
                        <p className="text-small text-text-muted mt-0.5">
                          {kr.current_value?.toLocaleString()} / {kr.target_value?.toLocaleString()}
                          {kr.unit && ` ${kr.unit}`}
                        </p>
                      </div>
                      <Badge variant={progress >= 70 ? "success" : progress >= 40 ? "warning" : "outline"}>
                        {progress}%
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Check-in Dialog */}
      <CheckInDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        kr={checkInKr}
        onSubmit={handleCheckInSubmit}
      />
    </>
  );
}
