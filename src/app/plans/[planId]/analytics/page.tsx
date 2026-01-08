"use client";

import { use, useMemo } from "react";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, Loader2, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { usePlanStats, useObjectivesWithKrs, usePlan } from "@/features";
import { useActivityStats } from "@/features/timeline/hooks";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  
  const { data: plan } = usePlan(planId);
  const { data: planStats, isLoading: isLoadingStats } = usePlanStats(planId);
  const { data: objectives = [], isLoading: isLoadingObjectives } = useObjectivesWithKrs(planId);
  const { data: activityStats } = useActivityStats(planId);

  // Calculate additional stats
  const objectiveStats = useMemo(() => {
    if (!objectives.length) return [];
    
    return objectives.map((obj) => {
      const krs = obj.annual_krs || [];
      const totalKrs = krs.length;
      const completedKrs = krs.filter((kr) => {
        const progress = kr.target_value > kr.start_value
          ? ((kr.current_value - kr.start_value) / (kr.target_value - kr.start_value)) * 100
          : 0;
        return progress >= 100;
      }).length;
      
      return {
        id: obj.id,
        name: obj.name,
        code: obj.code,
        progress: obj.progress || 0,
        totalKrs,
        completedKrs,
      };
    }).sort((a, b) => b.progress - a.progress);
  }, [objectives]);

  // Determine the current year from the plan
  const planYear = plan?.year || new Date().getFullYear();

  if (isLoadingStats || isLoadingObjectives) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-text-muted" />
      </div>
    );
  }

  const overallProgress = planStats?.overall_progress || 0;
  const projectedYearEnd = Math.min(overallProgress * 4, 100); // Simple projection based on Q1 pace
  const checkInsThisMonth = activityStats?.total || 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Insights and visualizations for your OKR progress"
      >
        <Select defaultValue="all">
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Year</SelectItem>
            <SelectItem value="q1">Q1 {planYear}</SelectItem>
            <SelectItem value="q2">Q2 {planYear}</SelectItem>
            <SelectItem value="q3">Q3 {planYear}</SelectItem>
            <SelectItem value="q4">Q4 {planYear}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" className="gap-2" disabled>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </PageHeader>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="pace">Pace Analysis</TabsTrigger>
          <TabsTrigger value="heatmap">Activity Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {objectives.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No data yet"
              description="Create objectives and key results to see analytics."
              action={{
                label: "Create Objective",
                href: `/plans/${planId}/okrs`,
              }}
            />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Year-to-Date Progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2">
                      <span className="font-heading text-h1-mobile font-bold">
                        {overallProgress.toFixed(0)}%
                      </span>
                      {planStats?.trend && planStats.trend > 0 ? (
                        <span className="text-status-success text-small flex items-center gap-1 mb-2">
                          <TrendingUp className="w-3 h-3" />
                          +{planStats.trend.toFixed(0)}%
                        </span>
                      ) : planStats?.trend && planStats.trend < 0 ? (
                        <span className="text-status-danger text-small flex items-center gap-1 mb-2">
                          <TrendingDown className="w-3 h-3" />
                          {planStats.trend.toFixed(0)}%
                        </span>
                      ) : null}
                    </div>
                    <p className="text-small text-text-muted">
                      {planStats?.current_quarter_progress
                        ? `Q${Math.floor((new Date().getMonth() / 3) + 1)} at ${planStats.current_quarter_progress.toFixed(0)}%`
                        : "No quarter data"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Projected Year-End</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2">
                      <span className="font-heading text-h1-mobile font-bold">
                        {projectedYearEnd.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-small text-text-muted">
                      Based on current pace
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Activity This Month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2">
                      <span className="font-heading text-h1-mobile font-bold">
                        {checkInsThisMonth}
                      </span>
                    </div>
                    <p className="text-small text-text-muted">
                      Events across {planStats?.kr_count || 0} key results
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Objectives Breakdown */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Objective Progress</CardTitle>
                  <CardDescription>
                    Progress breakdown by objective
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {objectiveStats.map((obj) => (
                      <div key={obj.id}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{obj.code}</Badge>
                            <span className="font-medium text-body-sm">
                              {obj.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-small text-text-muted">
                              {obj.completedKrs}/{obj.totalKrs} KRs complete
                            </span>
                            <span className="font-medium text-body-sm w-12 text-right">
                              {obj.progress.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <Progress value={obj.progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chart Placeholders */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Progress Over Time</CardTitle>
                    <CardDescription>
                      Cumulative progress for all objectives
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-bg-1/50 rounded-card border border-border-soft">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 text-text-subtle mx-auto mb-3" />
                        <p className="text-body-sm text-text-muted">
                          Line chart coming soon
                        </p>
                        <p className="text-small text-text-subtle">
                          Powered by Recharts
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>KR Status Distribution</CardTitle>
                    <CardDescription>
                      Key results by completion status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex flex-col justify-center gap-4 px-4">
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full bg-status-success" />
                        <span className="text-body-sm flex-1">On Track</span>
                        <span className="font-medium">
                          {planStats?.on_track_krs || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full bg-status-warning" />
                        <span className="text-body-sm flex-1">At Risk</span>
                        <span className="font-medium">
                          {planStats?.at_risk_krs || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full bg-status-danger" />
                        <span className="text-body-sm flex-1">Behind</span>
                        <span className="font-medium">
                          {(planStats?.kr_count || 0) -
                            (planStats?.on_track_krs || 0) -
                            (planStats?.at_risk_krs || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="progress">
          <EmptyState
            icon={BarChart3}
            title="Progress Charts Coming Soon"
            description="Detailed progress tracking with cumulative lines, weekly bars, and threshold trackers."
          />
        </TabsContent>

        <TabsContent value="pace">
          <EmptyState
            icon={TrendingUp}
            title="Pace Analysis Coming Soon"
            description="See where you should be today vs. where you are, with forecasts and recommendations."
          />
        </TabsContent>

        <TabsContent value="heatmap">
          <EmptyState
            icon={Calendar}
            title="Activity Heatmap Coming Soon"
            description="Visualize your check-in activity, workouts, deep work, and weekly review completion."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
