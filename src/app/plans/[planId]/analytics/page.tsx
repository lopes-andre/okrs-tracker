"use client";

import { use } from "react";
import { BarChart3, TrendingUp, Calendar, Download, Loader2, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlan } from "@/features";
import { useCheckIns } from "@/features/check-ins/hooks";
import { 
  useAnalyticsSummary, 
  useKrPerformanceData,
  useCheckInsByDay,
  useTaskMetrics,
  useProductivityStats,
} from "@/features/analytics/hooks";
import { 
  SummaryCards, 
  KrPerformanceTable, 
  ProgressChart,
  PaceAnalysisPanel,
  ActivityBarChart,
  BurnupChart,
  ActivityHeatmap,
  TaskMetricsPanel,
  ProductivityPanel,
} from "@/components/analytics";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  
  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId);
  const planYear = plan?.year || new Date().getFullYear();

  // Analytics data
  const { data: summary, isLoading: isLoadingSummary } = useAnalyticsSummary(planId, planYear);
  const { data: krPerformanceData, isLoading: isLoadingPerformance } = useKrPerformanceData(planId, planYear);
  const { data: allCheckIns = [], isLoading: isLoadingCheckIns } = useCheckIns(planId);
  const { data: checkInsByDay = [], isLoading: isLoadingHeatmap } = useCheckInsByDay(planId);
  const { data: taskMetrics, isLoading: isLoadingTaskMetrics } = useTaskMetrics(planId);
  const { data: productivityStats, isLoading: isLoadingProductivity } = useProductivityStats(planId);

  const isLoading = isLoadingPlan || isLoadingSummary || isLoadingPerformance || isLoadingCheckIns;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-text-muted" />
      </div>
    );
  }

  const hasData = summary && summary.totalKrs > 0;

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
          <TabsTrigger value="performance">KR Performance</TabsTrigger>
          <TabsTrigger value="pace">Pace Analysis</TabsTrigger>
          <TabsTrigger value="heatmap">Activity Heatmap</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {!hasData ? (
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
            <div className="space-y-6">
              {/* Summary Cards */}
              {summary && <SummaryCards summary={summary} />}
              
              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Progress Chart */}
                {krPerformanceData && krPerformanceData.length > 0 && (
                  <ProgressChart 
                    krs={krPerformanceData} 
                    checkIns={allCheckIns}
                    year={planYear}
                  />
                )}
                
                {/* Activity Bar Chart */}
                <ActivityBarChart 
                  checkIns={allCheckIns}
                  year={planYear}
                />
              </div>
              
              {/* Burn-Up Chart */}
              {krPerformanceData && krPerformanceData.length > 0 && (
                <BurnupChart 
                  krs={krPerformanceData} 
                  checkIns={allCheckIns}
                  year={planYear}
                />
              )}
            </div>
          )}
        </TabsContent>

        {/* KR Performance Tab */}
        <TabsContent value="performance">
          {!hasData ? (
            <EmptyState
              icon={BarChart3}
              title="No KRs yet"
              description="Create key results to see performance metrics."
              action={{
                label: "Create KR",
                href: `/plans/${planId}/okrs`,
              }}
            />
          ) : (
            krPerformanceData && (
              <KrPerformanceTable data={krPerformanceData} />
            )
          )}
        </TabsContent>

        {/* Pace Analysis Tab */}
        <TabsContent value="pace">
          {!hasData ? (
            <EmptyState
              icon={TrendingUp}
              title="No KRs yet"
              description="Create key results to see pace analysis."
              action={{
                label: "Create KR",
                href: `/plans/${planId}/okrs`,
              }}
            />
          ) : (
            krPerformanceData && (
              <PaceAnalysisPanel krs={krPerformanceData} year={planYear} />
            )
          )}
        </TabsContent>

        {/* Activity Heatmap Tab */}
        <TabsContent value="heatmap">
          <div className="space-y-6">
            {/* Heatmap Calendar */}
            <ActivityHeatmap data={checkInsByDay} year={planYear} />
            
            {/* Task Metrics & Productivity */}
            <div className="grid lg:grid-cols-2 gap-6">
              {taskMetrics && <TaskMetricsPanel metrics={taskMetrics} />}
              {productivityStats && <ProductivityPanel stats={productivityStats} />}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
