"use client";

import { use } from "react";
import { BarChart3, TrendingUp, Loader2, Target, ListTodo, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
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
  useAnalyticsData,
} from "@/features/analytics/hooks";
import {
  useTeamWorkload,
  useTeamSummary,
  useTeamContributions,
} from "@/features/team-analytics/hooks";
import { useState } from "react";
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
  SavedViews,
  useSavedViews,
  QuarterlyComparison,
  WeeklyReviewMetrics,
  VelocityChart,
  PriorityBurndownChart,
  TaskCompletionAnalysis,
  CheckInVelocityChart,
  KrTypePerformance,
  TeamSummaryCards,
  TeamMemberCard,
  WorkloadDistributionChart,
  ContributionTimeline,
  type ViewConfig,
} from "@/components/analytics";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  
  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId);
  const planYear = plan?.year || new Date().getFullYear();
  
  // View state
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedQuarter, setSelectedQuarter] = useState("all");
  
  // Saved views
  const { savedViews, saveView, deleteView } = useSavedViews(planId);
  
  const currentConfig: ViewConfig = {
    tab: activeTab,
    quarter: selectedQuarter,
  };
  
  const handleApplyView = (config: ViewConfig) => {
    setActiveTab(config.tab);
    setSelectedQuarter(config.quarter);
  };

  // Analytics data
  const { data: summary, isLoading: isLoadingSummary } = useAnalyticsSummary(planId, planYear);
  const { data: krPerformanceData, isLoading: isLoadingPerformance } = useKrPerformanceData(planId, planYear);
  const { data: allCheckIns = [], isLoading: isLoadingCheckIns } = useCheckIns(planId);
  const { data: checkInsByDay = [] } = useCheckInsByDay(planId);
  const { data: taskMetrics } = useTaskMetrics(planId);
  const { data: productivityStats } = useProductivityStats(planId);
  const { data: analyticsData } = useAnalyticsData(planId, planYear);

  // Team analytics data
  const { data: teamWorkload = [] } = useTeamWorkload(planId);
  const { data: teamSummary } = useTeamSummary(planId);
  const { data: teamContributions = [] } = useTeamContributions(planId);

  // Tasks for advanced analytics
  const tasks = analyticsData?.tasks || [];

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
        <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
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
        <SavedViews
          currentConfig={currentConfig}
          onApplyView={handleApplyView}
          savedViews={savedViews}
          onSaveView={saveView}
          onDeleteView={deleteView}
        />
      </PageHeader>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">KR Performance</TabsTrigger>
          <TabsTrigger value="tasks">Task Analytics</TabsTrigger>
          <TabsTrigger value="pace">Pace Analysis</TabsTrigger>
          <TabsTrigger value="heatmap">Activity</TabsTrigger>
          <TabsTrigger value="reviews">Weekly Reviews</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
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
              
              {/* Bottom Row: Burn-Up + Quarterly Comparison */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Burn-Up Chart */}
                {krPerformanceData && krPerformanceData.length > 0 && (
                  <BurnupChart 
                    krs={krPerformanceData} 
                    checkIns={allCheckIns}
                    year={planYear}
                  />
                )}
                
                {/* Quarterly Comparison */}
                {krPerformanceData && krPerformanceData.length > 0 && (
                  <QuarterlyComparison 
                    krs={krPerformanceData} 
                    checkIns={allCheckIns}
                    year={planYear}
                  />
                )}
              </div>
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
            <div className="space-y-6">
              {krPerformanceData && (
                <>
                  <KrPerformanceTable data={krPerformanceData} />

                  {/* KR Type Performance & Check-in Velocity */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    <KrTypePerformance krs={krPerformanceData} />
                    <CheckInVelocityChart
                      checkIns={allCheckIns}
                      krs={krPerformanceData}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* Task Analytics Tab */}
        <TabsContent value="tasks">
          {tasks.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description="Create tasks to see task analytics and velocity tracking."
              action={{
                label: "Create Task",
                href: `/plans/${planId}/tasks`,
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Velocity & Burndown Row */}
              <div className="grid lg:grid-cols-2 gap-6">
                <VelocityChart tasks={tasks} />
                <PriorityBurndownChart tasks={tasks} />
              </div>

              {/* Task Completion Analysis */}
              <TaskCompletionAnalysis tasks={tasks} />

              {/* Task Metrics & Productivity (also shown in Activity tab) */}
              <div className="grid lg:grid-cols-2 gap-6">
                {taskMetrics && <TaskMetricsPanel metrics={taskMetrics} />}
                {productivityStats && <ProductivityPanel stats={productivityStats} />}
              </div>
            </div>
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

        {/* Weekly Reviews Tab */}
        <TabsContent value="reviews">
          <WeeklyReviewMetrics planId={planId} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          {teamWorkload.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description="Invite team members to see team analytics."
              action={{
                label: "Manage Team",
                href: `/plans/${planId}/settings`,
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Team Summary Cards */}
              {teamSummary && <TeamSummaryCards summary={teamSummary} />}

              {/* Member Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamWorkload.map((member) => (
                  <TeamMemberCard
                    key={member.user_id}
                    member={member}
                    avgTasksPerMember={teamSummary?.avg_tasks_per_member || 0}
                  />
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-6">
                <WorkloadDistributionChart data={teamWorkload} />
                <ContributionTimeline
                  contributions={teamContributions}
                  members={teamWorkload}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
